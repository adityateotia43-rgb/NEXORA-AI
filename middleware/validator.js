/**
 * Input Validation & Sanitization Middleware
 */

const { ValidationError, PayloadTooLargeError } = require('../utils/errors');

const ALLOWED_TOPICS = ['Science', 'Mathematics', 'CS', 'English', 'GK', 'General'];
const ALLOWED_TIERS = ['High School', 'Undergrad', 'Competitive', 'Graduate', 'General'];
const ALLOWED_LANGUAGES = ['Hinglish', 'EN', 'HI', 'English', 'Hindi'];
const ALLOWED_PROVIDERS = ['auto', 'gemini', 'openai', 'anthropic', 'groq', 'ollama', 'simulation'];
const ALLOWED_DOMAINS = ['study', 'music', 'movies', 'auto'];
const MODEL_REGEX = /^[a-zA-Z0-9.:_-]{1,64}$/;

const MAX_MESSAGE_LENGTH = 4000;
const MAX_BODY_SIZE_BYTES = 64 * 1024; // 64 KB

/**
 * Safely parse JSON request body with size limits and Content-Type verification
 * @param {import('http').IncomingMessage} req
 * @param {Object} [options]
 * @param {number} [options.maxSizeBytes]
 * @returns {Promise<Object>}
 */
function parseJsonBody(req, options = {}) {
  const maxBytes = options.maxSizeBytes || MAX_BODY_SIZE_BYTES;

  return new Promise((resolve, reject) => {
    const contentType = req.headers['content-type'] || '';
    if (req.method === 'POST' && contentType && !contentType.includes('application/json')) {
      return reject(new ValidationError(`Unsupported Media Type: Expected 'application/json', received '${contentType}'`));
    }

    let rawData = '';
    let bytesReceived = 0;
    let exceeded = false;

    req.on('data', chunk => {
      bytesReceived += chunk.length;
      if (bytesReceived > maxBytes) {
        if (!exceeded) {
          exceeded = true;
          req.pause();
          reject(new PayloadTooLargeError(`Payload exceeds limit of ${Math.round(maxBytes / 1024)} KB`));
        }
        return;
      }
      rawData += chunk.toString('utf8');
    });

    req.on('end', () => {
      if (!rawData || rawData.trim().length === 0) {
        return resolve({});
      }

      try {
        const parsed = JSON.parse(rawData);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          return reject(new ValidationError('Request body must be a JSON object'));
        }
        resolve(parsed);
      } catch (err) {
        reject(new ValidationError('Malformed JSON in request body: ' + err.message));
      }
    });

    req.on('error', err => {
      reject(err);
    });
  });
}

/**
 * Validate and sanitize chat query payload
 * @param {Object} payload
 * @param {Object} defaults
 * @returns {{ message: string, topic: string, tier: string, language: string, provider: string|undefined, model: string|undefined, domain?: string }}
 */
function validateChatInput(payload = {}, defaults = {}) {
  const errors = [];

  // 1. Message Validation
  if (payload.message === undefined || payload.message === null) {
    errors.push({ field: 'message', message: 'Field "message" is required' });
  } else if (typeof payload.message !== 'string') {
    errors.push({ field: 'message', message: 'Field "message" must be a string' });
  }

  let sanitizedMessage = '';
  if (typeof payload.message === 'string') {
    sanitizedMessage = payload.message.replace(/\0/g, '').trim();
    if (sanitizedMessage.length === 0) {
      errors.push({ field: 'message', message: 'Query message cannot be empty or whitespace only' });
    } else if (sanitizedMessage.length > MAX_MESSAGE_LENGTH) {
      errors.push({ 
        field: 'message', 
        message: `Query message exceeds maximum allowed length of ${MAX_MESSAGE_LENGTH} characters (provided ${sanitizedMessage.length})` 
      });
    }
  }

  // 2. Topic Validation
  let topic = defaults.defaultTopic || 'Science';
  if (payload.topic !== undefined) {
    if (typeof payload.topic !== 'string') {
      errors.push({ field: 'topic', message: 'Field "topic" must be a string' });
    } else {
      const match = ALLOWED_TOPICS.find(t => t.toLowerCase() === payload.topic.trim().toLowerCase());
      if (match) {
        topic = match;
      } else {
        // Fallback or accept sanitized alphanumeric
        topic = payload.topic.slice(0, 32).trim() || topic;
      }
    }
  }

  // 3. Academic Tier Validation
  let tier = defaults.defaultTier || 'Undergrad';
  if (payload.tier !== undefined) {
    if (typeof payload.tier !== 'string') {
      errors.push({ field: 'tier', message: 'Field "tier" must be a string' });
    } else {
      const match = ALLOWED_TIERS.find(t => t.toLowerCase() === payload.tier.trim().toLowerCase());
      if (match) {
        tier = match;
      } else {
        tier = payload.tier.slice(0, 32).trim() || tier;
      }
    }
  }

  // 4. Language Validation
  let language = defaults.defaultLanguage || 'Hinglish';
  if (payload.language !== undefined) {
    if (typeof payload.language !== 'string') {
      errors.push({ field: 'language', message: 'Field "language" must be a string' });
    } else {
      const match = ALLOWED_LANGUAGES.find(l => l.toLowerCase() === payload.language.trim().toLowerCase());
      if (match) {
        language = match;
      } else {
        language = payload.language.slice(0, 20).trim() || language;
      }
    }
  }

  // 5. Provider Validation (Optional)
  let provider = undefined;
  if (payload.provider !== undefined && payload.provider !== null && payload.provider !== '') {
    if (typeof payload.provider !== 'string') {
      errors.push({ field: 'provider', message: 'Field "provider" must be a string' });
    } else {
      const p = payload.provider.toLowerCase().trim();
      if (!ALLOWED_PROVIDERS.includes(p)) {
        errors.push({ 
          field: 'provider', 
          message: `Unknown provider "${payload.provider}". Allowed: ${ALLOWED_PROVIDERS.join(', ')}` 
        });
      } else {
        provider = p;
      }
    }
  }

  // 6. Model Validation (Optional)
  let model = undefined;
  if (payload.model !== undefined && payload.model !== null && payload.model !== '') {
    if (typeof payload.model !== 'string') {
      errors.push({ field: 'model', message: 'Field "model" must be a string' });
    } else {
      const m = payload.model.trim();
      if (!MODEL_REGEX.test(m)) {
        errors.push({ field: 'model', message: 'Field "model" contains invalid characters' });
      } else {
        model = m;
      }
    }
  }

  // 7. Domain Validation (Optional)
  let domain = undefined;
  if (payload.domain !== undefined && payload.domain !== null && payload.domain !== '') {
    if (typeof payload.domain !== 'string') {
      errors.push({ field: 'domain', message: 'Field "domain" must be a string' });
    } else {
      const d = payload.domain.toLowerCase().trim();
      if (!ALLOWED_DOMAINS.includes(d)) {
        errors.push({ 
          field: 'domain', 
          message: `Unknown domain "${payload.domain}". Allowed domains are: ${ALLOWED_DOMAINS.slice(0, -1).join(', ')}` 
        });
      } else if (d !== 'auto') {
        domain = d;
      }
    }
  }

  if (errors.length > 0) {
    throw new ValidationError('Validation failed for one or more fields', errors);
  }

  return {
    message: sanitizedMessage,
    topic,
    tier,
    language,
    provider,
    model,
    domain
  };
}

module.exports = {
  parseJsonBody,
  validateChatInput,
  ALLOWED_TOPICS,
  ALLOWED_TIERS,
  ALLOWED_LANGUAGES,
  ALLOWED_PROVIDERS,
  ALLOWED_DOMAINS,
  MAX_MESSAGE_LENGTH,
  MAX_BODY_SIZE_BYTES
};
