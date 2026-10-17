const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { server } = require('../server');

let BASE_URL = process.env.TEST_BASE_URL;

before(async () => {
  if (!BASE_URL) {
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        const port = typeof addr === 'object' && addr ? addr.port : 3000;
        BASE_URL = `http://127.0.0.1:${port}`;
        resolve(undefined);
      });
    });
  }
});

after(async () => {
  if (server.listening) {
    await new Promise((resolve) => server.close(resolve));
  }
});

// Helper for HTTP requests
async function fetchApi(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, options);
  return res;
}

// Helper for raw HTTP requests without client-side WHATWG URL normalization
function rawHttpGet(rawPath) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL);
    const req = http.get({
      host: url.hostname,
      port: url.port,
      path: rawPath
    }, (res) => {
      resolve(res);
    });
    req.on('error', reject);
  });
}

describe('API Routes — Health & System Configuration', () => {
  test('GET /api/health returns 200 with active service status', async () => {
    const res = await fetchApi('/api/health');
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.equal(data.ok, true);
    assert.ok(data.uptimeSeconds >= 0);
    assert.ok(data.appName);
    assert.ok(data.timestamp);
  });

  test('GET /api/config returns 200 with domain policies and provider metadata', async () => {
    const res = await fetchApi('/api/config');
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.appName);
    assert.ok(Array.isArray(data.allowedDomains));
    assert.deepEqual(data.allowedDomains, ['study', 'music', 'movies']);
    assert.equal(data.domainClassifier.enforced, true);
    assert.ok(data.timeouts.serverTimeoutMs);
    assert.ok(data.rateLimiting.maxRequestsPerMinute);
  });

  test('OPTIONS /api/chat returns 204 No Content with CORS headers', async () => {
    const res = await fetchApi('/api/chat', { method: 'OPTIONS' });
    assert.equal(res.status, 204);
    assert.ok(res.headers.get('access-control-allow-origin'));
    assert.ok(res.headers.get('access-control-allow-methods'));
  });
});

describe('API Routes — Domain Restriction & Classification Endpoints', () => {
  test('GET /api/domains returns 200 and tri-domain catalog metadata', async () => {
    const res = await fetchApi('/api/domains');
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.enforced, true);
    assert.deepEqual(data.allowedDomains, ['study', 'music', 'movies']);
    assert.ok(data.domains.study);
    assert.ok(data.domains.music);
    assert.ok(data.domains.movies);
  });

  test('GET /api/classify validates in-domain academic study query', async () => {
    const res = await fetchApi('/api/classify?q=Explain+photosynthesis+and+Calvin+cycle');
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.domain, 'study');
    assert.equal(data.isAllowed, true);
    assert.ok(data.confidence >= 0.65);
    assert.equal(data.refusal, null);
  });

  test('GET /api/classify validates in-domain music flow query', async () => {
    const res = await fetchApi('/api/classify?q=Explain+10+Hz+binaural+beats+and+synth+frequencies');
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.domain, 'music');
    assert.equal(data.isAllowed, true);
  });

  test('GET /api/classify validates in-domain cinema pulse query', async () => {
    const res = await fetchApi('/api/classify?q=Film+noir+cinematography+and+Dutch+angles');
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.domain, 'movies');
    assert.equal(data.isAllowed, true);
  });

  test('GET /api/classify detects and restricts out-of-domain query with refusal card', async () => {
    const res = await fetchApi('/api/classify?q=Where+can+I+buy+cheap+shoes+and+furniture');
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.domain, 'unsupported');
    assert.equal(data.isAllowed, false);
    assert.ok(data.refusal, 'Refusal payload must be populated');
    assert.ok(data.refusal.equation);
    assert.ok(data.refusal.flashcard);
    assert.equal(data.refusal.suggestions.length, 3);
  });

  test('POST /api/classify verifies JSON payload classification', async () => {
    const res = await fetchApi('/api/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'What is the de Broglie wavelength?' })
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.domain, 'study');
    assert.equal(data.isAllowed, true);
  });
});

describe('API Routes — Curated Study & Active Recall Endpoints', () => {
  test('GET /api/flashcards returns study flashcard deck', async () => {
    const res = await fetchApi('/api/flashcards?topic=Science&limit=5');
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.flashcards));
    assert.ok(data.flashcards.length > 0);
    assert.ok(data.flashcards.length <= 5);
    const card = data.flashcards[0];
    assert.ok(card.id !== undefined);
    assert.ok(card.frontTitle);
    assert.ok(card.backAnswer);
    assert.ok(card.topic);
  });

  test('POST /api/flashcards filters flashcards by topic and tier', async () => {
    const res = await fetchApi('/api/flashcards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: 'Mathematics', limit: 3 })
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.flashcards));
    assert.ok(data.flashcards.length <= 3);
    data.flashcards.forEach(c => assert.equal(c.topic, 'Mathematics'));
  });

  test('GET /api/quiz returns structured diagnostic questions with options', async () => {
    const res = await fetchApi('/api/quiz?topic=Science&count=3');
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.topic, 'Science');
    assert.equal(data.count, 3);
    assert.equal(data.questions.length, 3);
    const q = data.questions[0];
    assert.ok(q.question);
    assert.ok(Array.isArray(q.options));
    assert.equal(q.options.length, 4);
    assert.ok(q.options.some(o => o.correct === true));
    assert.ok(q.explanation);
  });

  test('POST /api/quiz handles JSON request', async () => {
    const res = await fetchApi('/api/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: 'CS', count: 2 })
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.count, 2);
    data.questions.forEach(q => assert.equal(q.topic, 'CS'));
  });
});

describe('API Routes — Music Flow & Neuro-Acoustics Endpoints', () => {
  test('GET /api/music/soundscapes returns acoustic audio soundscapes', async () => {
    const res = await fetchApi('/api/music/soundscapes');
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.soundscapes));
    assert.ok(data.soundscapes.length >= 7);
    const s = data.soundscapes[0];
    assert.ok(s.id);
    assert.ok(s.title);
    assert.ok(s.frequency);
    assert.ok(s.category);
  });

  test('GET /api/music/soundscapes filters by category', async () => {
    const res = await fetchApi('/api/music/soundscapes?category=Lo-Fi+Beats');
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.soundscapes.length > 0);
    data.soundscapes.forEach(s => assert.equal(s.category, 'Lo-Fi Beats'));
  });

  test('GET /api/music/theory returns music theory and acoustic physics metadata', async () => {
    const res = await fetchApi('/api/music/theory');
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.theoryItems));
    assert.ok(Array.isArray(data.brainwaveBands));
    assert.ok(Array.isArray(data.soundscapes));
  });
});

describe('API Routes — Cinema Pulse Endpoints', () => {
  test('GET /api/movies returns curated cinema collection', async () => {
    const res = await fetchApi('/api/movies?category=all');
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.movies));
    assert.ok(data.movies.length > 0);
    const m = data.movies[0];
    assert.ok(m.id);
    assert.ok(m.title);
    assert.ok(m.director);
    assert.ok(m.rating);
  });

  test('GET /api/movies filters by search query', async () => {
    const res = await fetchApi('/api/movies?search=Nolan');
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.movies.length > 0);
    data.movies.forEach(m => {
      const match = m.title.toLowerCase().includes('nolan') || m.director.toLowerCase().includes('nolan') || (m.cast || []).some(c => c.toLowerCase().includes('nolan'));
      assert.ok(match, `Movie "${m.title}" should match search "Nolan"`);
    });
  });

  test('GET /api/movies/details returns full technical film analysis', async () => {
    const res = await fetchApi('/api/movies/details?id=157336');
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.id, 157336);
    assert.equal(data.title, 'Interstellar');
    assert.ok(data.cinematography, 'Should include cinematography analysis');
    assert.ok(data.themes);
    assert.ok(data.trailerKey, 'Should include YouTube trailer key');
  });

  test('GET /api/movies/details returns 400 when id is missing', async () => {
    const res = await fetchApi('/api/movies/details');
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.ok(data.error);
  });

  test('GET /api/movies/categories returns collection categories and film prompts', async () => {
    const res = await fetchApi('/api/movies/categories');
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.categories));
    assert.ok(Array.isArray(data.prompts));
  });
});

describe('API Routes — Provider Abstraction Info', () => {
  test('GET /api/providers returns registered AI provider models', async () => {
    const res = await fetchApi('/api/providers');
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.activeProvider);
    assert.ok(Array.isArray(data.providers));
    assert.ok(data.providers.length >= 6);
    const providerIds = data.providers.map(p => p.id);
    assert.ok(providerIds.includes('gemini'));
    assert.ok(providerIds.includes('openai'));
    assert.ok(providerIds.includes('anthropic'));
    assert.ok(providerIds.includes('groq'));
    assert.ok(providerIds.includes('ollama'));
    assert.ok(providerIds.includes('simulation'));
  });
});

describe('API Routes — POST /api/chat Streaming & Domain Restrictions', () => {
  test('POST /api/chat rejects GET method with 405 Method Not Allowed', async () => {
    const res = await fetchApi('/api/chat', { method: 'GET' });
    assert.equal(res.status, 405);
    assert.equal(res.headers.get('allow'), 'POST');
  });

  test('POST /api/chat rejects empty query with 400 Bad Request', async () => {
    const res = await fetchApi('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '   ' })
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.ok(data.message.includes('Validation failed'));
    assert.ok(data.details.some(d => d.field === 'message'));
  });

  test('POST /api/chat refuses out-of-domain queries with 403 when Accept: application/json', async () => {
    const res = await fetchApi('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        message: 'Where can I buy cheap discount furniture and shoes?',
        provider: 'simulation'
      })
    });
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.equal(data.error, 'DomainRefusalError');
    assert.equal(data.code, 'OUT_OF_DOMAIN');
    assert.equal(data.isAllowed, false);
    assert.equal(data.domain, 'unsupported');
    assert.ok(data.refusal);
  });

  test('POST /api/chat streams educational response via SSE for in-domain query', async () => {
    const res = await fetchApi('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Explain light reactions in photosynthesis',
        topic: 'Science',
        tier: 'Undergrad',
        language: 'Hinglish',
        provider: 'simulation'
      })
    });

    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type').includes('text/event-stream'));

    const text = await res.text();
    assert.ok(text.includes('data:'));
    assert.ok(text.includes('"done":true'));
    assert.ok(text.includes('"domain":"study"'));
  });

  test('POST /api/chat streams structured domain refusal SSE when query is out-of-domain', async () => {
    const res = await fetchApi('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({
        message: 'Where can I buy cheap discount furniture and shoes?',
        provider: 'simulation'
      })
    });

    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type').includes('text/event-stream'));

    const text = await res.text();
    assert.ok(text.includes('data:'));
    assert.ok(text.includes('"domain":"unsupported"'));
    assert.ok(text.includes('"isAllowed":false'));
    assert.ok(text.includes('Domain Boundary'));
  });

  test('POST /api/chat streams in-domain Music Flow response via SSE', async () => {
    const res = await fetchApi('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'How do 10 Hz binaural beats stimulate alpha brainwaves in sound synthesis?',
        provider: 'simulation'
      })
    });

    assert.equal(res.status, 200);
    const text = await res.text();
    assert.ok(text.includes('"domain":"music"'));
    assert.ok(text.includes('"done":true'));
  });

  test('POST /api/chat streams in-domain Cinema Pulse response via SSE', async () => {
    const res = await fetchApi('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Explain cinematography lighting and three-act narrative structure',
        provider: 'simulation'
      })
    });

    assert.equal(res.status, 200);
    const text = await res.text();
    assert.ok(text.includes('"domain":"movies"'));
    assert.ok(text.includes('"done":true'));
  });

  test('POST /api/chat rejects malformed JSON with 400 Bad Request', async () => {
    const res = await fetchApi('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"message": "broken json payload'
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.error, 'ValidationError');
    assert.equal(data.code, 'VALIDATION_ERROR');
    assert.ok(data.message.includes('Malformed JSON'));
  });

  test('POST /api/chat rejects payload exceeding 64KB with 413 Payload Too Large', async () => {
    const largeMessage = 'x'.repeat(70 * 1024);
    const res = await fetchApi('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: largeMessage })
    });
    assert.equal(res.status, 413);
    const data = await res.json();
    assert.equal(data.error, 'PayloadTooLargeError');
    assert.equal(data.code, 'PAYLOAD_TOO_LARGE');
  });

  test('POST /api/chat rejects unsupported Content-Type with 400 Validation Error', async () => {
    const res = await fetchApi('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'message=Explain+physics'
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.code, 'VALIDATION_ERROR');
    assert.ok(data.message.includes("Unsupported Media Type"));
  });
});

describe('API Routes — Rate Limiting & Security Headers', () => {
  test('API endpoints attach RateLimit-* headers to responses', async () => {
    const res = await fetchApi('/api/health');
    assert.equal(res.status, 200);
    assert.ok(res.headers.has('ratelimit-limit'), 'Should include RateLimit-Limit header');
    assert.ok(res.headers.has('ratelimit-remaining'), 'Should include RateLimit-Remaining header');
    assert.ok(res.headers.has('ratelimit-reset'), 'Should include RateLimit-Reset header');
  });
});

describe('API Routes — Static File Serving & Directory Traversal Protection', () => {
  test('GET / serves index.html with text/html Content-Type', async () => {
    const res = await fetchApi('/');
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type').includes('text/html'));
    const body = await res.text();
    assert.ok(body.includes('<!DOCTYPE html>') || body.includes('<html'));
  });

  test('GET /styles.css serves stylesheet with text/css Content-Type', async () => {
    const res = await fetchApi('/styles.css');
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type').includes('text/css'));
  });

  test('GET directory traversal attempt returns 403 Forbidden', async () => {
    const res = await rawHttpGet('/%2e%2e/%2e%2e/package.json');
    assert.equal(res.statusCode, 403);
  });

  test('GET non-existent file returns 404 Not Found', async () => {
    const res = await fetchApi('/nonexistent-test-file-99.html');
    assert.equal(res.status, 404);
  });
});
