const http = require('http');
const fs = require('fs');
const path = require('path');
const express = require('express');
const { providerManager } = require('./providers');
const RateLimiter = require('./middleware/rateLimiter');
const { parseJsonBody, validateChatInput } = require('./middleware/validator');
const { 
  classifyDomain, 
  getDomainRefusalResponse, 
  ALLOWED_DOMAINS, 
  DOMAIN_METADATA 
} = require('./middleware/domainClassifier');
const { sendErrorResponse } = require('./utils/errors');
const { getFlashcards, getQuizQuestions } = require('./utils/studyData');
const { getSoundscapes, getMusicTheory } = require('./utils/musicData');
const { getMovies, getMovieDetails, MOVIE_CATEGORIES, CINEMA_PROMPTS } = require('./utils/movieData');

// ===================================================
// 1. ENVIRONMENT VARIABLE LOADER (Zero-Dependency)
// ===================================================
function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const result = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const separatorIdx = trimmed.indexOf('=');
      if (separatorIdx !== -1) {
        const key = trimmed.slice(0, separatorIdx).trim();
        let value = trimmed.slice(separatorIdx + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        result[key] = value;
      }
    }
    return result;
  } catch (err) {
    return {};
  }
}

function loadEnvironmentVariables() {
  if (process.env.VERCEL) return;
  const envPath = path.join(__dirname, '.env');
  const envExamplePath = path.join(__dirname, '.env.example');

  // Auto-seed .env from .env.example if missing
  if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
    try {
      fs.copyFileSync(envExamplePath, envPath);
      console.log('[Env] Auto-initialized .env from .env.example');
    } catch (e) {}
  }

  // Load from .env first, then fallback to .env.example for any unset keys
  const envParsed = parseEnvFile(envPath);
  const exampleParsed = parseEnvFile(envExamplePath);

  const combined = { ...exampleParsed, ...envParsed };
  for (const [key, val] of Object.entries(combined)) {
    if (process.env[key] === undefined && val !== '') {
      process.env[key] = val;
    }
  }
}

loadEnvironmentVariables();

// ===================================================
// 2. CENTRALIZED CONFIGURATION & RATE LIMITER
// ===================================================
const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  appName: process.env.APP_NAME || 'NEXORA AI',
  appVersion: process.env.APP_VERSION || 'v2.4',
  appTagline: process.env.APP_TAGLINE || 'Let’s make learning easier.',
  
  // AI Provider Strategy ('auto', 'gemini', 'openai', 'anthropic', 'groq', 'ollama', 'simulation')
  aiProvider: (process.env.AI_PROVIDER || 'auto').trim(),

  // Google Gemini Configuration
  geminiApiKey: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',

  // OpenAI Configuration
  openaiApiKey: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.trim() : '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  openaiBaseUrl: process.env.OPENAI_BASE_URL ? process.env.OPENAI_BASE_URL.trim() : '',

  // Anthropic Claude Configuration
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.trim() : '',
  anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',

  // Groq LPU Configuration
  groqApiKey: process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.trim() : '',
  groqModel: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',

  // Ollama Local LLM Configuration
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL ? process.env.OLLAMA_BASE_URL.trim() : '',
  ollamaModel: process.env.OLLAMA_MODEL || 'llama3.2',

  // TMDB (The Movie Database) Configuration
  tmdbApiKey: process.env.TMDB_API_KEY ? process.env.TMDB_API_KEY.trim() : '',

  // Supabase (Cloud Sync, Auth & Row Level Security)
  supabaseUrl: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.trim() : '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ? process.env.SUPABASE_ANON_KEY.trim() : '',

  // Feature Toggles
  enableAudioSynth: process.env.ENABLE_AUDIO_SYNTH !== 'false',
  enableVoiceDictation: process.env.ENABLE_VOICE_DICTATION !== 'false',
  enableOfflineSimulation: process.env.ENABLE_OFFLINE_SIMULATION !== 'false',
  
  // Academic Defaults
  defaultTopic: process.env.DEFAULT_TOPIC || 'Science',
  defaultTier: process.env.DEFAULT_TIER || 'Undergrad',
  defaultLanguage: process.env.DEFAULT_LANGUAGE || 'Hinglish',
  
  // Rate Limiting & Timeouts
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE, 10) || 60,
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
  providerTimeoutMs: parseInt(process.env.PROVIDER_TIMEOUT_MS, 10) || 18000,
  serverTimeoutMs: parseInt(process.env.SERVER_TIMEOUT_MS, 10) || 35000,
  maxBodySizeBytes: parseInt(process.env.MAX_BODY_SIZE_BYTES, 10) || 64 * 1024,

  // Security
  corsOrigin: process.env.CORS_ORIGIN || '*'
};

// Initialize In-Memory Sliding-Window Rate Limiter
const rateLimiter = new RateLimiter({
  maxRequests: config.rateLimitMaxRequests,
  windowMs: config.rateLimitWindowMs
});

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
};

// Helper to locate static files across root (__dirname), process.cwd(), and dist/
function resolveStaticFile(relPath) {
  if (!relPath) return null;
  const cleanRelative = relPath.replace(/^\/+/, '');
  if (cleanRelative.includes('..')) return null;

  const candidates = [
    path.join(__dirname, cleanRelative),
    path.join(process.cwd(), cleanRelative),
    path.join(__dirname, 'dist', cleanRelative),
    path.join(process.cwd(), 'dist', cleanRelative)
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      try {
        const stat = fs.statSync(candidate);
        if (stat.isFile()) return candidate;
      } catch (e) {}
    }
  }
  return null;
}

// ===================================================
// 3. HTTP SERVER & REST / STREAMING API ROUTES
// ===================================================
const expressApp = express();

// A. CORS & Preflight middleware for all incoming requests
expressApp.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', config.corsOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Expose-Headers', 'RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset, Retry-After');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  next();
});

// B. Explicit handler for GET / to serve index.html
expressApp.get('/', (req, res) => {
  const target = resolveStaticFile('index.html');
  if (target) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    fs.createReadStream(target).pipe(res);
  } else {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('404 Not Found');
  }
});

// C. Serve static assets via express.static from root (__dirname) and dist/
expressApp.use(express.static(path.join(__dirname), { index: 'index.html' }));
expressApp.use(express.static(path.join(__dirname, 'dist'), { index: 'index.html' }));

// D. API Routes & Dynamic Request Handler
expressApp.use(async (req, res) => {
  const [reqPath] = req.url.split('?');
  const decodedPath = decodeURI(reqPath);

  try {
    // -------------------------------------------------
    // RATE LIMITING PROTECTION FOR ALL API ROUTES
    // -------------------------------------------------
    if (decodedPath.startsWith('/api/')) {
      rateLimiter.check(req, res);
    }

    // -------------------------------------------------
    // API Route: /api/chat (Streaming SSE via Provider Abstraction)
    // -------------------------------------------------
    if (decodedPath === '/api/chat') {
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.setHeader('Allow', 'POST');
        res.end(JSON.stringify({ error: 'Method Not Allowed', message: 'Use POST for /api/chat' }));
        return;
      }

      // Parse JSON body with strict size limit (64 KB)
      const rawPayload = await parseJsonBody(req, { maxSizeBytes: config.maxBodySizeBytes });

      // Validate & sanitize input parameters
      const sanitized = validateChatInput(rawPayload, {
        defaultTopic: config.defaultTopic,
        defaultTier: config.defaultTier,
        defaultLanguage: config.defaultLanguage
      });

      // -------------------------------------------------
      // SERVER-SIDE DOMAIN CLASSIFIER ENFORCEMENT
      // Strictly enforce Study, Music, or Movies only
      // -------------------------------------------------
      const classification = classifyDomain(sanitized.message, {
        contextTopic: sanitized.topic,
        activeDomain: sanitized.domain
      });

      console.log(`[DomainClassifier] Query: "${sanitized.message.slice(0, 45)}..." -> Domain: ${classification.domain.toUpperCase()} (allowed=${classification.isAllowed}, conf=${classification.confidence.toFixed(2)})`);

      // Refuse out-of-domain queries at the server level (block AI provider token generation)
      if (!classification.isAllowed || classification.domain === 'unsupported') {
        const refusal = getDomainRefusalResponse(sanitized.message, classification);

        // If client requests raw JSON
        const acceptHeader = req.headers['accept'] || '';
        if (acceptHeader.includes('application/json') && !acceptHeader.includes('text/event-stream')) {
          res.statusCode = 403;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({
            error: 'DomainRefusalError',
            code: 'OUT_OF_DOMAIN',
            message: 'Query falls outside permitted domains (Study, Music, Movies only).',
            domain: 'unsupported',
            isAllowed: false,
            classification,
            refusal
          }, null, 2));
          return;
        }

        // Stream structured refusal via SSE to match UI card architecture
        res.writeHead(200, {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no'
        });

        const words = refusal.fullText.split(' ');
        let wordIdx = 0;
        const refusalInterval = setInterval(() => {
          if (wordIdx < words.length) {
            const chunk = (wordIdx === 0 ? '' : ' ') + words[wordIdx];
            res.write(`data: ${JSON.stringify({ chunk, done: false, domain: 'unsupported' })}\n\n`);
            wordIdx++;
          } else {
            clearInterval(refusalInterval);
            res.write(`data: ${JSON.stringify({
              done: true,
              fullText: refusal.fullText,
              title: refusal.title,
              equation: refusal.equation,
              flashcard: refusal.flashcard,
              suggestions: refusal.suggestions,
              source: 'domain-classifier',
              provider: 'server-guardrail',
              model: 'domain-enforcer',
              domain: 'unsupported',
              isAllowed: false,
              classification
            })}\n\n`);
            res.end();
          }
        }, 15);

        req.on('close', () => clearInterval(refusalInterval));
        return;
      }

      // Set Server-Sent Events (SSE) Streaming Headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      });

      // Set server timeout to prevent hanging connections
      req.setTimeout(config.serverTimeoutMs, () => {
        console.warn(`[Server] Request timeout (${config.serverTimeoutMs}ms) on /api/chat`);
        req.destroy();
      });

      await providerManager.streamChat({
        userMessage: sanitized.message,
        topic: sanitized.topic,
        tier: sanitized.tier,
        language: sanitized.language,
        requestedProvider: sanitized.provider,
        requestedModel: sanitized.model,
        domain: classification.domain, // ENFORCED DOMAIN PASSED TO AI PROVIDER
        config,
        res
      });
      return;
    }

    // -------------------------------------------------
    // API Route: /api/providers (Provider Abstraction Info)
    // -------------------------------------------------
    if (decodedPath === '/api/providers' && req.method === 'GET') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(providerManager.getPublicProvidersInfo(config), null, 2));
      return;
    }

    // -------------------------------------------------
    // API Route: /api/classify (Direct Domain Verification)
    // -------------------------------------------------
    if (decodedPath === '/api/classify') {
      let queryText = '';
      let contextTopic = config.defaultTopic;
      let activeDomain = '';

      if (req.method === 'POST') {
        const body = await parseJsonBody(req, { maxSizeBytes: config.maxBodySizeBytes });
        queryText = body.message || body.query || body.text || '';
        contextTopic = body.topic || contextTopic;
        activeDomain = body.domain || activeDomain;
      } else if (req.method === 'GET') {
        const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        queryText = urlObj.searchParams.get('q') || urlObj.searchParams.get('message') || '';
        contextTopic = urlObj.searchParams.get('topic') || contextTopic;
        activeDomain = urlObj.searchParams.get('domain') || activeDomain;
      } else {
        res.statusCode = 405;
        res.setHeader('Allow', 'GET, POST');
        res.end(JSON.stringify({ error: 'Method Not Allowed', message: 'Use GET or POST for /api/classify' }));
        return;
      }

      const classification = classifyDomain(queryText, { contextTopic, activeDomain });
      const refusal = !classification.isAllowed ? getDomainRefusalResponse(queryText, classification) : null;

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({
        query: queryText,
        domain: classification.domain,
        isAllowed: classification.isAllowed,
        confidence: classification.confidence,
        label: classification.label,
        reason: classification.reason || null,
        allowedDomains: ALLOWED_DOMAINS,
        metadata: DOMAIN_METADATA[classification.domain] || null,
        refusal
      }, null, 2));
      return;
    }

    // -------------------------------------------------
    // API Route: /api/domains (Supported Domains Metadata)
    // -------------------------------------------------
    if (decodedPath === '/api/domains' && req.method === 'GET') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({
        enforced: true,
        allowedDomains: ALLOWED_DOMAINS,
        domains: DOMAIN_METADATA
      }, null, 2));
      return;
    }

    // -------------------------------------------------
    // API Route: /api/quiz (Curated Multi-Subject Quiz)
    // -------------------------------------------------
    if (decodedPath === '/api/quiz') {
      let topic = config.defaultTopic;
      let tier = config.defaultTier;
      let count = 5;

      if (req.method === 'POST') {
        const body = await parseJsonBody(req, { maxSizeBytes: config.maxBodySizeBytes });
        topic = body.topic || topic;
        tier = body.tier || tier;
        count = parseInt(body.count, 10) || count;
      } else if (req.method === 'GET') {
        const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        topic = urlObj.searchParams.get('topic') || topic;
        tier = urlObj.searchParams.get('tier') || tier;
        count = parseInt(urlObj.searchParams.get('count'), 10) || count;
      } else {
        res.statusCode = 405;
        res.setHeader('Allow', 'GET, POST');
        res.end(JSON.stringify({ error: 'Method Not Allowed' }));
        return;
      }

      const questions = getQuizQuestions({ topic, tier, count });
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({
        topic,
        tier,
        count: questions.length,
        questions
      }, null, 2));
      return;
    }

    // -------------------------------------------------
    // API Route: /api/flashcards (Study Flashcards Deck)
    // -------------------------------------------------
    if (decodedPath === '/api/flashcards') {
      let topic = null;
      let tier = null;
      let limit = null;

      if (req.method === 'POST') {
        const body = await parseJsonBody(req, { maxSizeBytes: config.maxBodySizeBytes });
        topic = body.topic || topic;
        tier = body.tier || tier;
        limit = parseInt(body.limit, 10) || limit;
      } else if (req.method === 'GET') {
        const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        topic = urlObj.searchParams.get('topic') || topic;
        tier = urlObj.searchParams.get('tier') || tier;
        limit = parseInt(urlObj.searchParams.get('limit'), 10) || limit;
      } else {
        res.statusCode = 405;
        res.setHeader('Allow', 'GET, POST');
        res.end(JSON.stringify({ error: 'Method Not Allowed' }));
        return;
      }

      const cards = getFlashcards({ topic, tier, limit });
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({
        topic: topic || 'All',
        tier: tier || 'All',
        count: cards.length,
        flashcards: cards
      }, null, 2));
      return;
    }

    // -------------------------------------------------
    // API Route: /api/music/soundscapes (Audio Neuro-Stimulation)
    // -------------------------------------------------
    if (decodedPath === '/api/music/soundscapes' && req.method === 'GET') {
      const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const category = urlObj.searchParams.get('category');
      const soundscapes = getSoundscapes({ category });

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({
        category: category || 'All',
        count: soundscapes.length,
        soundscapes
      }, null, 2));
      return;
    }

    // -------------------------------------------------
    // API Route: /api/music/theory (Music Theory & Acoustic Physics)
    // -------------------------------------------------
    if (decodedPath === '/api/music/theory' && req.method === 'GET') {
      const theory = getMusicTheory();
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(theory, null, 2));
      return;
    }

    // -------------------------------------------------
    // API Route: /api/movies (Movie Mode & TMDB Integration)
    // -------------------------------------------------
    if (decodedPath === '/api/movies' && req.method === 'GET') {
      const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const category = urlObj.searchParams.get('category') || 'all';
      const search = urlObj.searchParams.get('search') || '';
      const page = parseInt(urlObj.searchParams.get('page'), 10) || 1;
      
      const moviePayload = await getMovies({ category, search, page, tmdbApiKey: config.tmdbApiKey });
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(moviePayload, null, 2));
      return;
    }

    // -------------------------------------------------
    // API Route: /api/movies/details (Movie Craft & Details)
    // -------------------------------------------------
    if (decodedPath === '/api/movies/details' && req.method === 'GET') {
      const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const id = urlObj.searchParams.get('id');
      if (!id) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: 'Movie ID required' }));
        return;
      }
      const details = await getMovieDetails(id, { tmdbApiKey: config.tmdbApiKey });
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(details, null, 2));
      return;
    }

    // -------------------------------------------------
    // API Route: /api/movies/categories (Movie Collections & Prompts)
    // -------------------------------------------------
    if (decodedPath === '/api/movies/categories' && req.method === 'GET') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({
        categories: MOVIE_CATEGORIES,
        prompts: CINEMA_PROMPTS
      }, null, 2));
      return;
    }

    // -------------------------------------------------
    // API Route: /api/config (Public Configuration)
    // -------------------------------------------------
    if (decodedPath === '/api/config' && req.method === 'GET') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({
        appName: config.appName,
        appVersion: config.appVersion,
        appTagline: config.appTagline,
        aiProviderConfig: config.aiProvider,
        providersInfo: providerManager.getPublicProvidersInfo(config),
        hasGeminiApiKey: Boolean(config.geminiApiKey),
        hasOpenAiApiKey: Boolean(config.openaiApiKey),
        hasAnthropicApiKey: Boolean(config.anthropicApiKey),
        hasGroqApiKey: Boolean(config.groqApiKey),
        hasTmdbApiKey: Boolean(config.tmdbApiKey),
        tmdbConfigured: Boolean(config.tmdbApiKey),
        hasSupabaseConfig: Boolean(config.supabaseUrl && config.supabaseAnonKey),
        supabaseConfigured: Boolean(config.supabaseUrl && config.supabaseAnonKey),
        supabaseUrl: config.supabaseUrl || '',
        supabaseAnonKey: config.supabaseAnonKey || '',
        rateLimiting: {
          maxRequestsPerMinute: config.rateLimitMaxRequests,
          windowMs: config.rateLimitWindowMs
        },
        timeouts: {
          providerTimeoutMs: config.providerTimeoutMs,
          serverTimeoutMs: config.serverTimeoutMs
        },
        allowedDomains: ALLOWED_DOMAINS,
        domainClassifier: {
          enforced: true,
          supportedDomains: ALLOWED_DOMAINS
        },
        enableAudioSynth: config.enableAudioSynth,
        enableVoiceDictation: config.enableVoiceDictation,
        enableOfflineSimulation: config.enableOfflineSimulation,
        defaultTopic: config.defaultTopic,
        defaultTier: config.defaultTier,
        defaultLanguage: config.defaultLanguage,
        environment: config.nodeEnv
      }, null, 2));
      return;
    }

    // -------------------------------------------------
    // API Route: /api/health (Health & Status)
    // -------------------------------------------------
    if (decodedPath === '/api/health' && req.method === 'GET') {
      const activeInfo = providerManager.resolveProvider({ config });
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({
        ok: true,
        status: 'ok',
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        appName: config.appName,
        appVersion: config.appVersion,
        activeProvider: {
          id: activeInfo.id,
          name: activeInfo.name,
          defaultModel: activeInfo.defaultModel
        },
        domainClassifier: {
          status: 'active',
          enforced: true,
          supportedDomains: ALLOWED_DOMAINS
        },
        rateLimiter: {
          activeIpCount: rateLimiter.hits.size
        }
      }, null, 2));
      return;
    }

    // -------------------------------------------------
    // Static Files Fallback Handler
    // -------------------------------------------------
    if (decodedPath.includes('..')) {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('403 Forbidden');
      return;
    }

    const cleanPath = decodedPath === '/' ? 'index.html' : decodedPath;
    const targetFile = resolveStaticFile(cleanPath);

    if (!targetFile) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(targetFile).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);
    fs.createReadStream(targetFile).pipe(res);

  } catch (err) {
    sendErrorResponse(res, err, config);
  }
});

function app(req, res, next) {
  return expressApp(req, res, next);
}

const server = http.createServer(app);

// ===================================================
// 4. PROCESS SAFETY & UNHANDLED ERROR HANDLERS
// ===================================================
process.on('uncaughtException', (err) => {
  console.error('[Process Fatal] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Process Warning] Unhandled Rejection at:', promise, 'reason:', reason);
});

// ===================================================
// 5. SERVER INITIALIZATION & DIAGNOSTICS BANNER
// ===================================================
function startServer(port = config.port, host = config.host) {
  return new Promise((resolve) => {
    server.listen(port, host, () => {
      const active = providerManager.resolveProvider({ config });
      const configured = providerManager.getConfiguredProviders(config).map(p => p.name);

      console.log('===================================================');
      console.log(`  🚀 ${config.appName} ${config.appVersion} Server Running`);
      console.log(`  🌐 URL: http://${host}:${port}/`);
      console.log(`  📡 Streaming Route: POST http://${host}:${port}/api/chat`);
      console.log(`  🛡️  Rate Limiter: ${config.rateLimitMaxRequests} req/min sliding window`);
      console.log(`  ⏱️  Timeouts: Provider ${config.providerTimeoutMs}ms • Server ${config.serverTimeoutMs}ms`);
      console.log(`  🔌 Providers: ${providerManager.getAllProviders().length} Registered`);
      console.log(`  🤖 Active Provider: ${active.name} (${active.defaultModel})`);
      console.log(`  🎯 Domain Classifier: Enforced (${ALLOWED_DOMAINS.join(', ')} only)`);
      console.log(`  ✅ Configured: ${configured.join(', ')}`);
      console.log(`  ⚙️  Environment: ${config.nodeEnv}`);
      console.log('===================================================');
      resolve(server);
    });
  });
}

// Express/Serverless compatibility helpers attached to app
app.listen = (...args) => server.listen(...args);
app.server = server;
app.config = config;
app.rateLimiter = rateLimiter;
app.startServer = startServer;

// Start HTTP server only when running locally (not on Vercel serverless)
if (!process.env.VERCEL) {
  if (require.main === module) {
    startServer(config.port, config.host);
  }
}

// Export app for Vercel Serverless Functions and backwards-compatible test imports
module.exports = app;



