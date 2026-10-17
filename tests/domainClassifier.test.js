const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  classifyDomain,
  getDomainRefusalResponse,
  ALLOWED_DOMAINS,
  DOMAIN_METADATA,
  DOMAIN_LEXICONS,
  PROHIBITED_PATTERNS,
  OFF_DOMAIN_PATTERNS
} = require('../middleware/domainClassifier');

describe('Domain Classifier — Architecture & Metadata', () => {
  test('ALLOWED_DOMAINS should strictly contain study, music, and movies', () => {
    assert.deepEqual(ALLOWED_DOMAINS, ['study', 'music', 'movies']);
    assert.equal(ALLOWED_DOMAINS.length, 3);
  });

  test('DOMAIN_METADATA has valid configurations for all allowed domains', () => {
    ALLOWED_DOMAINS.forEach(domain => {
      const meta = DOMAIN_METADATA[domain];
      assert.ok(meta, `Metadata for ${domain} should exist`);
      assert.equal(meta.id, domain);
      assert.ok(meta.name);
      assert.ok(meta.icon);
      assert.ok(meta.description);
    });
  });

  test('Lexicons contain comprehensive keyword dictionaries for each domain', () => {
    assert.ok(DOMAIN_LEXICONS.study.length >= 50, 'Study lexicon should have 50+ keywords');
    assert.ok(DOMAIN_LEXICONS.music.length >= 40, 'Music lexicon should have 40+ keywords');
    assert.ok(DOMAIN_LEXICONS.movies.length >= 40, 'Movies lexicon should have 40+ keywords');
  });

  test('PROHIBITED_PATTERNS and OFF_DOMAIN_PATTERNS dictionaries are active', () => {
    assert.ok(PROHIBITED_PATTERNS.length >= 5);
    assert.ok(OFF_DOMAIN_PATTERNS.length >= 7);
  });
});

describe('Domain Classifier — Study Hub In-Domain Classification', () => {
  const studyQueries = [
    'Explain photosynthesis and light reactions in chloroplasts',
    'What is the Schrödinger wave equation and de Broglie wavelength?',
    'Balance the chemical reaction for glucose breakdown',
    'Calculate the derivative of x^3 * sin(x) using product rule',
    'Analyze the time complexity and recursion tree of QuickSort',
    'Explain the Calvin cycle and RuBisCO enzyme in detail',
    'What is the difference between mitosis and meiosis?',
    'Summarize the economic impact of inflation on GDP',
    'Define Newton third law of motion with examples'
  ];

  studyQueries.forEach(query => {
    test(`Classifies educational query correctly: "${query.slice(0, 40)}..."`, () => {
      const res = classifyDomain(query);
      assert.equal(res.domain, 'study');
      assert.equal(res.isAllowed, true);
      assert.ok(res.confidence >= 0.65, `Confidence ${res.confidence} should be >= 0.65`);
    });
  });

  test('Friendly greetings map safely to Study Hub with high confidence', () => {
    const greetings = ['Hi', 'Hello', 'Namaste', 'Good morning', 'Start'];
    greetings.forEach(greet => {
      const res = classifyDomain(greet);
      assert.equal(res.domain, 'study');
      assert.equal(res.isAllowed, true);
    });
  });
});

describe('Domain Classifier — Music Flow In-Domain Classification', () => {
  const musicQueries = [
    'How do 10 Hz binaural beats stimulate alpha brainwave entrainment?',
    'Explain pentatonic scales and chord progressions for Lo-Fi chillhop',
    'What is acoustic resonance in sound design and synthesizer filters?',
    'Difference between major and minor chords on a piano keyboard',
    'How does a biquad low-pass filter affect audio frequency spectrum?',
    'Explain tempo BPM and rhythm in classical counterpoint'
  ];

  musicQueries.forEach(query => {
    test(`Classifies music/audio query correctly: "${query.slice(0, 40)}..."`, () => {
      const res = classifyDomain(query);
      assert.equal(res.domain, 'music');
      assert.equal(res.isAllowed, true);
      assert.ok(res.confidence >= 0.65);
    });
  });
});

describe('Domain Classifier — Cinema Pulse In-Domain Classification', () => {
  const movieQueries = [
    'Analyze the cinematography and chiaroscuro lighting in film noir',
    'Break down the three-act structure and character arc of Interstellar',
    'What is the function of the inciting incident in screenplay structure?',
    'How does Christopher Nolan use IMAX 70mm aspect ratio and practical effects?',
    'Explain the difference between a Dutch angle and a dolly zoom in cinema',
    'Describe mise-en-scene in classic directorial micro-lectures'
  ];

  movieQueries.forEach(query => {
    test(`Classifies cinema query correctly: "${query.slice(0, 40)}..."`, () => {
      const res = classifyDomain(query);
      assert.equal(res.domain, 'movies');
      assert.equal(res.isAllowed, true);
      assert.ok(res.confidence >= 0.65);
    });
  });
});

describe('Domain Classifier — Out-of-Domain & Prohibited Restriction Enforcement', () => {
  const prohibitedQueries = [
    { text: 'How do I win at online casino roulette and blackjack betting?', reason: 'Gambling' },
    { text: 'Which memecoin pump and dump crypto token should I buy for 100x?', reason: 'Crypto' },
    { text: 'How to hack a password and crack wifi security keylogger', reason: 'Malware/Exploit' },
    { text: 'Where to buy illicit drugs and cocaine online', reason: 'Contraband' },
    { text: 'Watch adult porn video and escort service online', reason: 'Adult / NSFW' }
  ];

  prohibitedQueries.forEach(({ text, reason }) => {
    test(`Prohibits high-risk query: "${text.slice(0, 35)}..." (${reason})`, () => {
      const res = classifyDomain(text);
      assert.equal(res.domain, 'unsupported');
      assert.equal(res.isAllowed, false);
      assert.ok(res.reason, 'Should provide refusal reason');
      assert.ok(res.confidence >= 0.9, 'Confidence should be high for prohibited topics');
    });
  });

  const everydayOffDomainQueries = [
    { text: 'Where can I buy cheap running shoes and discount furniture?', reason: 'Shopping' },
    { text: 'Give me a recipe for baking chocolate fudge cake in an oven', reason: 'Cooking' },
    { text: 'How to unclog a toilet and call for emergency plumbing repair', reason: 'Plumbing' },
    { text: 'Give me dating advice for my Tinder profile match', reason: 'Dating' },
    { text: 'What is the live cricket match score in the IPL tournament?', reason: 'Sports' },
    { text: 'What pills should I take and what is the dosage for antibiotics?', reason: 'Medical diagnosis' },
    { text: 'Tell me a knock knock joke and funny chit chat', reason: 'Casual chit-chat' }
  ];

  everydayOffDomainQueries.forEach(({ text, reason }) => {
    test(`Restricts non-academic off-domain query: "${text.slice(0, 35)}..." (${reason})`, () => {
      const res = classifyDomain(text);
      assert.equal(res.domain, 'unsupported');
      assert.equal(res.isAllowed, false);
      assert.ok(res.reason);
    });
  });
});

describe('Domain Classifier — Context Reinforcement & Fallback Edge Cases', () => {
  test('General academic concept queries safely classify into Study Hub', () => {
    const conceptualQueries = [
      'What is an algorithm and why does it matter?',
      'Explain how gravity works in celestial mechanics',
      'Define thermodynamics and heat transfer',
      'Solve the quadratic equation step by step'
    ];
    conceptualQueries.forEach(query => {
      const res = classifyDomain(query);
      assert.equal(res.domain, 'study');
      assert.equal(res.isAllowed, true);
    });
  });

  test('Active domain context reinforces borderline queries', () => {
    const resMusic = classifyDomain('relaxation and focus', { activeDomain: 'music' });
    assert.equal(resMusic.domain, 'music');
    assert.equal(resMusic.isAllowed, true);

    const resMovies = classifyDomain('story plot and pacing', { activeDomain: 'movies' });
    assert.equal(resMovies.domain, 'movies');
    assert.equal(resMovies.isAllowed, true);
  });

  test('Empty or whitespace input is flagged unsupported safely', () => {
    const resEmpty = classifyDomain('');
    assert.equal(resEmpty.domain, 'unsupported');
    assert.equal(resEmpty.isAllowed, false);

    const resSpaces = classifyDomain('    ');
    assert.equal(resSpaces.domain, 'unsupported');
    assert.equal(resSpaces.isAllowed, false);
  });

  test('getDomainRefusalResponse produces structured UI card payload', () => {
    const refusal = getDomainRefusalResponse('how to buy pizza', { reason: 'Commercial retail' });
    assert.ok(refusal.title.includes('Domain Boundary'));
    assert.ok(refusal.fullText.includes('Study Hub'));
    assert.ok(refusal.fullText.includes('Music Flow'));
    assert.ok(refusal.fullText.includes('Cinema Pulse'));
    assert.ok(refusal.equation);
    assert.ok(refusal.equation.code);
    assert.ok(refusal.flashcard);
    assert.ok(refusal.flashcard.title);
    assert.ok(refusal.flashcard.answer);
    assert.equal(refusal.suggestions.length, 3);
    assert.deepEqual(refusal.suggestions.map(s => s.domain), ['study', 'music', 'movies']);
  });
});
