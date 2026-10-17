/**
 * Domain Classifier Middleware — Enforced Server-Side for Nexora AI
 * 
 * Classifies all incoming queries strictly into one of three allowed domains:
 * 1. 'study'  — Academic concepts, STEM, humanities, exam prep, formulas & notes
 * 2. 'music'  — Music theory, Lo-Fi soundscapes, audio synthesis, binaural waves, chords & tracks
 * 3. 'movies' — Cinema, film analysis, cinematography, screenwriting, directors & micro-lectures
 * 
 * If a query falls outside these three permitted domains, it is flagged as 'unsupported'
 * and steered with a structured refusal and suggested domain prompts.
 */

const ALLOWED_DOMAINS = ['study', 'music', 'movies'];

const DOMAIN_METADATA = {
  study: {
    id: 'study',
    name: 'Study Hub',
    icon: 'school',
    tagline: 'Academic Mastery & STEM',
    color: 'primary',
    description: 'Conceptual mastery, science, math, computer science, formulas & exam prep.'
  },
  music: {
    id: 'music',
    name: 'Music Flow',
    icon: 'headphones',
    tagline: 'Audio Neuro-Stimulation',
    color: 'secondary',
    description: 'Music theory, Lo-Fi beats, frequencies, alpha waves, chords & acoustic synthesis.'
  },
  movies: {
    id: 'movies',
    name: 'Cinema Pulse',
    icon: 'movie',
    tagline: 'Visual Micro-Lectures & Film Analysis',
    color: 'tertiary',
    description: 'Visual micro-lectures, cinematography, screenplay structure, camera work & film analysis.'
  }
};

// Domain Keyword & N-Gram Dictionaries
const DOMAIN_LEXICONS = {
  study: [
    // Core Educational Terms
    'study', 'learn', 'academic', 'exam', 'test', 'quiz', 'notes', 'revision',
    'homework', 'lecture', 'syllabus', 'curriculum', 'textbook', 'undergrad',
    'high school', 'competitive exam', 'dissertation', 'thesis', 'tutorial',
    // Life Sciences & Biology
    'science', 'biology', 'botany', 'zoology', 'photosynthesis', 'calvin cycle',
    'chloroplast', 'mitochondria', 'photolysis', 'atp', 'nadph', 'rubisco',
    'cell', 'genetics', 'dna', 'rna', 'protein synthesis', 'evolution', 'ecology',
    'anatomy', 'physiology', 'bacteria', 'virus', 'enzyme', 'metabolism',
    'cellular respiration', 'glycolysis', 'krebs cycle', 'chromosome',
    // Physical Sciences & Chemistry
    'physics', 'chemistry', 'organic chemistry', 'thermodynamics', 'quantum',
    'mechanics', 'newton', 'einstein', 'relativity', 'electromagnetism', 'gravity',
    'velocity', 'acceleration', 'kinetic energy', 'potential energy', 'atom',
    'molecule', 'periodic table', 'chemical reaction', 'stoichiometry', 'equilibrium',
    'acid', 'base', 'covalent bond', 'ionic bond', 'electron', 'proton', 'neutron',
    // Mathematics & Computing
    'mathematics', 'math', 'calculus', 'algebra', 'geometry', 'trigonometry',
    'integral', 'derivative', 'differential equation', 'theorem', 'formula',
    'equation', 'derivation', 'proof', 'cs', 'computer science', 'programming',
    'algorithm', 'data structure', 'complexity', 'big o', 'recursion', 'binary tree',
    'graph theory', 'dynamic programming', 'sorting', 'python', 'javascript',
    'c++', 'java', 'sql', 'database schema', 'machine learning', 'neural network',
    // Humanities & Social Sciences
    'history', 'world history', 'geography', 'economics', 'macroeconomics',
    'microeconomics', 'inflation', 'gdp', 'english', 'grammar', 'syntax',
    'vocabulary', 'gk', 'general knowledge', 'philosophy', 'sociology',
    'political science', 'constitution', 'civics', 'literature', 'poetry', 'essay',
    'assignment', 'research paper', 'novel', 'prose', 'playwright', 'shakespeare',
    // Conceptual & Academic Verbs/Actions
    'definition of', 'explain how', 'explain the', 'derive the', 'solve the',
    'calculate the', 'difference between', 'step by step explanation', 'scientific principle'
  ],

  music: [
    // Music Theory & Composition
    'music', 'music theory', 'song', 'track', 'album', 'artist', 'singer', 'band',
    'melody', 'harmony', 'chord', 'chords', 'scale', 'scales', 'pentatonic',
    'major scale', 'minor scale', 'key signature', 'cadence', 'arpeggio', 'octave',
    'pitch', 'interval', 'triad', 'seventh chord', 'counterpoint', 'notation',
    'sheet music', 'treble clef', 'bass clef', 'staves', 'tempo', 'bpm', 'rhythm',
    'time signature', 'dynamics', 'timbre',
    // Audio Engineering & Neuro-Acoustics
    'sound', 'soundscape', 'sound design', 'acoustics', 'audio engineering',
    'synthesizer', 'synth', 'sound synthesis', 'beat', 'beats', 'lo-fi', 'lofi',
    'chillhop', 'binaural', 'binaural beat', 'binaural beats', 'alpha wave',
    'alpha waves', 'brainwave entrainment', 'frequency', 'frequencies', 'hertz',
    'hz', 'equalizer', 'eq', 'reverb', 'delay', 'compression', 'gain', 'decibel',
    'headphones', 'audio production', 'mixing', 'mastering', 'daw', 'midi',
    'sampling', 'vocal', 'vocals', 'acoustic resonance',
    // Instruments & Performance
    'instrument', 'guitar', 'piano', 'drums', 'violin', 'cello', 'bass guitar',
    'flute', 'saxophone', 'trumpet', 'keyboard', 'orchestra', 'choir',
    // Genres & Culture
    'jazz', 'classical music', 'rock', 'hip-hop', 'edm', 'ambient music',
    'techno', 'blues', 'folk music', 'reggae', 'playlist', 'lyrics'
  ],

  movies: [
    // Cinema & Film Theory
    'movie', 'movies', 'film', 'films', 'cinema', 'cinematic', 'cinema pulse',
    'film analysis', 'film theory', 'auteur', 'screenplay', 'script',
    'screenwriting', 'three-act structure', '3-act structure', 'narrative arc',
    'inciting incident', 'storytelling', 'scene', 'plot', 'climax', 'exposition',
    'resolution', 'protagonist', 'antagonist', 'character arc', 'dialogue',
    'subtext', 'storyboard', 'montage', 'mise-en-scene', 'motif',
    // Cinematography & Technical Craft
    'cinematography', 'cinematographer', 'camera angle', 'camera movement',
    'dutch angle', 'canted angle', 'close-up', 'wide shot', 'tracking shot',
    'pan and tilt', 'dolly zoom', 'lighting in film', 'chiaroscuro', 'color grading',
    'framing', 'aspect ratio', '24fps', 'shutter angle', 'director', 'filmmaker',
    'directing', 'film editing', 'jump cut', 'match cut', 'soundtrack', 'film score',
    'sound design in film', 'foley', 'vfx', 'visual effects', 'cgi',
    // Film Industry & Appreciation
    'actor', 'actress', 'hollywood', 'bollywood', 'oscar', 'oscars',
    'academy award', 'film festival', 'cannes', 'sundance', 'box office',
    'trailer', 'theater', 'premiere', 'imdb', 'rotten tomatoes', 'criterion',
    'documentary', 'animation film', 'anime film', 'film noir', 'short film',
    'director cut', 'micro-lecture'
  ]
};

// Explicit Out-of-Domain / Malicious / Prohibited Patterns
const PROHIBITED_PATTERNS = [
  { pattern: /\b(casino|gambling|betting|slot machine|poker table|blackjack|roulette|sports betting)\b/i, reason: 'Gambling and betting activities' },
  { pattern: /\b(crypto token|memecoin|pump and dump|forex signal|buy bitcoin|crypto moon|nft drop|buy ethereum)\b/i, reason: 'Cryptocurrency speculation and financial schemes' },
  { pattern: /\b(hack account|bypass password|ddos tool|crack software|steal credentials|wifi hack|keylogger|malware injection)\b/i, reason: 'Malicious hacking and unauthorized security exploits' },
  { pattern: /\b(buy cocaine|buy heroin|buy weapons|firearm sale|illicit drugs|buy contraband)\b/i, reason: 'Prohibited illicit substances and weapons' },
  { pattern: /\b(porn|nsfw|escort service|adult cam|xxx video|erotic story)\b/i, reason: 'Adult / NSFW content' }
];

// Patterns representing non-academic commercial or everyday off-domain inquiries
const OFF_DOMAIN_PATTERNS = [
  // Commercial retail, shopping, coupons, car dealerships, prices
  { pattern: /\b(buy (shoes|clothes|furniture|car|laptop|phone|tickets)|cheap flights|discount code|promo code|shopping cart|used car|dealership|dealerships|amazon order|walmart grocery|best vacuum cleaner|car insurance|insurance policy|price for|price of|how much (is|are|does a|does an)|where to buy)\b/i, reason: 'Commercial shopping and retail transactions' },
  // Home trades, plumbing, mechanical repairs
  { pattern: /\b(plumbing repair|call a plumber|leaky pipe|unclog toilet|hvac repair|car oil change|change flat tire|lawn mower repair|pest control service)\b/i, reason: 'Home maintenance and trade services' },
  // Cooking recipes and baking (unless biochemical/cellular)
  { pattern: /\b(recipe for|bake a cake|how to cook pasta|pancake recipe|chocolate fudge recipe|fried chicken recipe|air fryer cooking|best pizza topping)\b/i, reason: 'Culinary recipes and meal cooking' },
  // Live Sports Scores & Betting (non-academic)
  { pattern: /\b(premier league score|cricket match score|ipl live score|nba game score|nfl standings|real madrid score|barcelona match result|fantasy team pick)\b/i, reason: 'Live sports match scores and athletics updates' },
  // Dating, relationship drama, romance advice
  { pattern: /\b(dating advice|tinder profile tips|bumble match advice|how to get my ex back|breakup advice|relationship drama)\b/i, reason: 'Personal dating and romance advice' },
  // Medical prescription and clinical diagnosis
  { pattern: /\b(prescribe medicine|cure my infection|what pills should i take|dosage for antibiotics|medical diagnosis for my symptoms)\b/i, reason: 'Clinical medical diagnosis and prescription seeking' },
  // Casual chit chat / jokes
  { pattern: /\b(tell me a joke|knock knock joke|are you single|who is your boyfriend)\b/i, reason: 'Casual entertainment chit-chat' }
];

/**
 * Classify user prompt into Study, Music, Movies, or Unsupported
 * @param {string} userMessage - Raw or sanitized student message
 * @param {Object} [context] - Academic context (e.g. contextTopic, activeDomain)
 * @returns {{ domain: 'study'|'music'|'movies'|'unsupported', isAllowed: boolean, confidence: number, label: string, reason?: string, allowedDomains: string[] }}
 */
function classifyDomain(userMessage = '', context = {}) {
  const text = (userMessage || '').toLowerCase().trim();

  // 1. Check for explicitly prohibited or off-topic exploits
  for (const item of PROHIBITED_PATTERNS) {
    if (item.pattern.test(text)) {
      return {
        domain: 'unsupported',
        isAllowed: false,
        confidence: 0.99,
        label: 'Prohibited / Out-of-Domain',
        reason: item.reason,
        allowedDomains: ALLOWED_DOMAINS
      };
    }
  }

  // 2. Check for explicit everyday off-domain patterns
  for (const item of OFF_DOMAIN_PATTERNS) {
    if (item.pattern.test(text)) {
      return {
        domain: 'unsupported',
        isAllowed: false,
        confidence: 0.95,
        label: 'Out of Domain',
        reason: item.reason,
        allowedDomains: ALLOWED_DOMAINS
      };
    }
  }

  // 3. Conversational greeting check
  // Friendly greetings are welcomed into the Study Hub by default
  if (/^(hi|hello|hey|namaste|good morning|good evening|start|help|nexora)\b/i.test(text) && text.length < 25) {
    return {
      domain: 'study',
      isAllowed: true,
      confidence: 0.85,
      label: 'Study Hub (Welcome)',
      allowedDomains: ALLOWED_DOMAINS
    };
  }

  // 4. Compute Lexical & N-Gram Overlap Scores
  let studyScore = 0;
  let musicScore = 0;
  let moviesScore = 0;

  // Helper: safely escape regex special characters
  const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Helper: check word boundary or phrase match
  const matchTerm = (target, term) => {
    if (term.includes(' ') || term.includes('+') || term.includes('-')) {
      return target.includes(term.toLowerCase());
    }
    const regex = new RegExp(`\\b${escapeRegExp(term)}\\b`, 'i');
    return regex.test(target);
  };

  for (const term of DOMAIN_LEXICONS.study) {
    if (matchTerm(text, term)) {
      studyScore += term.length > 6 || term.includes(' ') ? 2.5 : 1.5;
    }
  }

  for (const term of DOMAIN_LEXICONS.music) {
    if (matchTerm(text, term)) {
      musicScore += term.length > 6 || term.includes(' ') ? 2.5 : 1.5;
    }
  }

  for (const term of DOMAIN_LEXICONS.movies) {
    if (matchTerm(text, term)) {
      moviesScore += term.length > 6 || term.includes(' ') ? 2.5 : 1.5;
    }
  }

  // 5. Evaluate Context Clues (Active Domain & Selected Topic)
  const activeDomain = (context.activeDomain || '').toLowerCase().trim();
  const contextTopic = (context.contextTopic || '').toLowerCase().trim();

  // If client explicit domain provided and recognized:
  if (activeDomain === 'music') {
    musicScore += 1.5;
  } else if (activeDomain === 'movies') {
    moviesScore += 1.5;
  } else if (activeDomain === 'study') {
    studyScore += 1.0;
  }

  // Topic context bonus (applied as reinforcement if an academic signal or topic keyword is present)
  const isAcademicTopic = ['science', 'mathematics', 'cs', 'english', 'gk'].includes(contextTopic);
  const mentionsTopic = isAcademicTopic && (text.includes(contextTopic) || (contextTopic === 'cs' && text.includes('computer')));

  if (studyScore > 0 && isAcademicTopic) {
    studyScore += 1.0;
  } else if (mentionsTopic) {
    studyScore += 1.5;
  }

  // 6. General Educational / Intellectual Inquiry Check
  // If no specific lexicon matched yet, verify if inquiry is an academic concept question
  if (studyScore === 0 && musicScore === 0 && moviesScore === 0) {
    const generalEducationalQuery = /^(what is|what are|explain|define|derive|solve|how does|why does|difference between|summarize the)\s+([a-zA-Z0-9\s_-]+)/i;
    const match = text.match(generalEducationalQuery);

    if (match) {
      const subject = match[2].trim();
      // Verify subject is not an off-domain entity
      const offDomainWord = /(pizza|faucet|car|insurance|dealership|cake|burger|shoes|flight|tinder|boyfriend|girlfriend)/i.test(subject);
      if (!offDomainWord && subject.length >= 3) {
        studyScore += 2.0;
      }
    }
  }

  // 7. Resolve Winning Domain
  const maxScore = Math.max(studyScore, musicScore, moviesScore);

  if (maxScore > 0) {
    // Music priority
    if (musicScore > 0 && musicScore >= studyScore && musicScore >= moviesScore) {
      return {
        domain: 'music',
        isAllowed: true,
        confidence: Math.min(0.98, 0.65 + musicScore * 0.08),
        label: 'Music Flow',
        allowedDomains: ALLOWED_DOMAINS
      };
    }

    // Movies priority
    if (moviesScore > 0 && moviesScore >= studyScore && moviesScore > musicScore) {
      return {
        domain: 'movies',
        isAllowed: true,
        confidence: Math.min(0.98, 0.65 + moviesScore * 0.08),
        label: 'Cinema Pulse',
        allowedDomains: ALLOWED_DOMAINS
      };
    }

    // Study priority
    if (studyScore > 0) {
      return {
        domain: 'study',
        isAllowed: true,
        confidence: Math.min(0.98, 0.65 + studyScore * 0.08),
        label: 'Study Hub',
        allowedDomains: ALLOWED_DOMAINS
      };
    }
  }

  // 8. Outside Study, Music, or Movies -> Enforce refusal
  return {
    domain: 'unsupported',
    isAllowed: false,
    confidence: 0.90,
    label: 'Out of Domain',
    reason: 'Query does not match Study Hub, Music Flow, or Cinema Pulse boundaries',
    allowedDomains: ALLOWED_DOMAINS
  };
}

/**
 * Generate structured domain rejection response for out-of-domain queries
 * @param {string} userMessage
 * @param {Object} [classification]
 * @returns {Object} Structured educational guidance payload matching Nexora card architecture
 */
function getDomainRefusalResponse(userMessage = '', classification = {}) {
  const queryExcerpt = userMessage && userMessage.trim().length > 0 
    ? `"${userMessage.trim().slice(0, 60)}${userMessage.trim().length > 60 ? '...' : ''}"`
    : 'your inquiry';

  const reasonNotice = classification.reason ? ` (${classification.reason})` : '';

  return {
    title: 'Domain Boundary: Study, Music & Movies Only',
    fullText: `Nexora AI is strictly calibrated to assist exclusively across three cognitive domains:\n\n` +
      `1. 📚 **Study Hub** — Academic concepts, STEM formulas, computer science, notes & competitive exam prep.\n` +
      `2. 🎵 **Music Flow** — Audio neuro-stimulation, music theory, Lo-Fi synthesis, binaural waves & acoustic chords.\n` +
      `3. 🎬 **Cinema Pulse** — Visual micro-lectures, cinematography craft, screenplay structure & film analysis.\n\n` +
      `Your query ${queryExcerpt} falls outside these three permitted pillars${reasonNotice}. Server-side policy enforces strict cognitive boundaries to maintain peak educational precision. Please select one of the high-yield prompts below to proceed!`,
    equation: {
      title: 'Nexora Tri-Domain Architecture',
      label: 'Server Boundary Enforcement',
      code: 'Domain ∈ { Study_Hub, Music_Flow, Cinema_Pulse }',
      details: 'Strict server-enforced cognitive scope boundary • Off-domain inference prohibited'
    },
    flashcard: {
      title: 'Supported Exploration Modes',
      sub: 'Choose an active domain to explore',
      hint: 'Study • Music • Cinema',
      answer: 'Ask an academic concept question in <span class="text-secondary font-semibold">Study Hub</span>, explore audio in <span class="text-tertiary font-semibold">Music Flow</span>, or analyze film in <span class="text-primary font-semibold">Cinema Pulse</span>!'
    },
    suggestions: [
      { domain: 'study', label: 'Study Hub', prompt: 'Explain the light reactions of photosynthesis in Hinglish' },
      { domain: 'music', label: 'Music Flow', prompt: 'How do 10 Hz binaural alpha waves induce deep focus?' },
      { domain: 'movies', label: 'Cinema Pulse', prompt: 'Break down the three-act story structure with examples' }
    ]
  };
}

module.exports = {
  classifyDomain,
  getDomainRefusalResponse,
  ALLOWED_DOMAINS,
  DOMAIN_METADATA,
  DOMAIN_LEXICONS,
  PROHIBITED_PATTERNS,
  OFF_DOMAIN_PATTERNS
};
