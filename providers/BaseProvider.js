/**
 * BaseProvider — Abstract Base Class for LLM and Simulation Providers
 * 
 * Defines the contract that all AI providers (Gemini, OpenAI, Anthropic, Groq, Ollama, Simulation)
 * must implement to ensure seamless hot-swapping, unified SSE streaming, and resilient fallback.
 */

class BaseProvider {
  /**
   * @param {Object} options
   * @param {string} options.id - Unique provider identifier (e.g. 'gemini', 'openai')
   * @param {string} options.name - Human-readable provider name
   * @param {string} options.defaultModel - Default model identifier
   * @param {Array<{id: string, name: string, description?: string}>} options.availableModels - Supported models
   */
  constructor({ id, name, defaultModel, availableModels = [] }) {
    if (new.target === BaseProvider) {
      throw new TypeError('Cannot construct BaseProvider instances directly. Subclass must be used.');
    }
    this.id = id;
    this.name = name;
    this.defaultModel = defaultModel;
    this.availableModels = availableModels;
  }

  /**
   * Check whether this provider has sufficient configuration (e.g. API keys, host URL)
   * @param {Object} [_config] - Server runtime configuration
   * @returns {boolean}
   */
  isConfigured(_config) {
    throw new Error(`isConfigured() must be implemented by ${this.constructor.name}`);
  }

  /**
   * Create an AbortSignal combining configurable timeout and client disconnect signal
   * @param {number} [timeoutMs] - Timeout in milliseconds
   * @param {AbortSignal} [externalSignal] - Client or caller abort signal
   * @returns {{ signal: AbortSignal, cleanup: Function }}
   */
  createFetchSignal(timeoutMs = 18000, externalSignal = null) {
    const timeoutSignal = typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(timeoutMs) : null;

    if (!timeoutSignal) {
      const controller = new AbortController();
      const timer = setTimeout(() => {
        controller.abort(new Error(`AI Provider request timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      if (externalSignal) {
        externalSignal.addEventListener('abort', () => {
          clearTimeout(timer);
          controller.abort(externalSignal.reason);
        });
      }
      return { signal: controller.signal, cleanup: () => clearTimeout(timer) };
    }

    if (externalSignal) {
      if (typeof AbortSignal.any === 'function') {
        return { signal: AbortSignal.any([timeoutSignal, externalSignal]), cleanup: () => {} };
      }
      const controller = new AbortController();
      const onAbort = () => controller.abort(externalSignal.reason);
      externalSignal.addEventListener('abort', onAbort, { once: true });
      timeoutSignal.addEventListener('abort', () => controller.abort(new Error(`AI Provider request timed out after ${timeoutMs}ms`)), { once: true });
      return { signal: controller.signal, cleanup: () => externalSignal.removeEventListener('abort', onAbort) };
    }

    return { signal: timeoutSignal, cleanup: () => {} };
  }

  /**
   * Generates standard educational system prompt for Nexora AI tailored by domain
   * @param {Object} context
   * @param {string} [context.topic]
   * @param {string} [context.tier]
   * @param {string} [context.language]
   * @param {'study'|'music'|'movies'|string} [context.domain]
   * @returns {string}
   */
  buildSystemPrompt({ topic = 'Science', tier = 'Undergrad', language = 'Hinglish', domain = 'study' }) {
    if (domain === 'music') {
      return `You are NEXORA AI v2.4 (Music Flow Co-Pilot), an elite audio neuro-stimulation and music theory specialist.
Context: Domain = Music & Audio Engineering, Language = ${language}.
Guidelines:
1. Explain musical concepts, acoustic frequencies, Lo-Fi synthesis, or music theory clearly and engagingly.
2. Break down rhythm, chords, bpm, binaural frequencies, and emotional flow.
3. If Hinglish, use natural colloquial Hindi+English; if English, keep it stylish and educational.`;
    }

    if (domain === 'movies') {
      return `You are NEXORA AI v2.4 (Cinema Pulse Co-Pilot), a master film scholar, screenplay architect, and cinematography analyst.
Context: Domain = Cinema & Visual Storytelling, Language = ${language}.
Guidelines:
1. Provide sharp, insightful cinematic breakdowns of films, directors, lighting, camera angles, and three-act narrative arcs.
2. Connect visual micro-lectures to narrative resonance and production craftsmanship.
3. If Hinglish, use natural colloquial Hindi+English; if English, keep it articulate and cinematic.`;
    }

    // Default: Study Hub
    return `You are NEXORA AI v2.4 (Study Hub Co-Pilot), an elite cognitive study co-pilot and educational tutor.
Current Academic Context:
- Topic/Domain: ${topic}
- Student Academic Tier: ${tier}
- Preferred Language Mode: ${language} (If Hinglish, explain in natural colloquial Hindi+English; if EN, use concise clear English; if HI, use clear modern Hindi).

Instruction Guidelines:
1. Provide a clear, step-by-step conceptual explanation tailored to the ${tier} level.
2. Highlight essential keywords, physical/logical laws, and exam high-yield tips.
3. Be inspiring, highly educational, concise, and structured.`;
  }

  /**
   * Synthesize equation and flashcard metadata for structured UI hydration
   * @param {string} userMessage
   * @param {string} topic
   * @param {string} [_tier]
   * @param {'study'|'music'|'movies'|string} [domain]
   * @returns {{equation: Object, flashcard: Object}}
   */
  synthesizeEducationalWidgets(userMessage, topic = 'Science', _tier = 'Undergrad', domain = 'study') {
    const q = (userMessage || '').toLowerCase();

    // 1. Music Domain Widgets
    if (domain === 'music' || q.includes('music') || q.includes('song') || q.includes('binaural') || q.includes('lofi')) {
      const isBinaural = q.includes('binaural') || q.includes('alpha') || q.includes('hz');
      return {
        equation: {
          title: isBinaural ? 'Binaural Alpha Frequency Synthesis' : 'Equal Temperament Pitch Formulation',
          label: isBinaural ? 'Neuro-Acoustic Formula' : 'Acoustic Standard',
          code: isBinaural 
            ? 'f_binaural = | f_left (210 Hz) - f_right (200 Hz) | = 10 Hz (Alpha Waves)' 
            : 'f_n = 440 × 2^((n - 69) / 12) Hz  [A4 = 440 Hz standard]',
          details: isBinaural ? '10 Hz Alpha State promotes flow-state cognition and relaxed focus' : '12-tone equal temperament universal pitch derivation'
        },
        flashcard: {
          title: 'Audio Neuro-Stimulation',
          sub: 'What is the optimal Alpha focus frequency?',
          hint: '8 Hz - 12 Hz Band',
          answer: '<span class="text-secondary font-semibold">10 Hz Alpha Waves</span> synchronize thalamocortical oscillations for uninterrupted deep work session retention!'
        }
      };
    }

    // 2. Movies Domain Widgets
    if (domain === 'movies' || q.includes('movie') || q.includes('film') || q.includes('cinema') || q.includes('director')) {
      return {
        equation: {
          title: 'Cinematic Narrative Paradigm',
          label: 'Syd Field Three-Act Formulation',
          code: 'Story Arc = Act I (Setup: 25%) + Act II (Confrontation: 50%) + Act III (Resolution: 25%)',
          details: 'Standard structural screenplay paradigm with Inciting Incident at min 10 & Midpoint at min 60'
        },
        flashcard: {
          title: 'Cinematography Recall',
          sub: 'What is the Dutch Angle used for?',
          hint: 'Camera tilt off axis',
          answer: '<span class="text-secondary font-semibold">Dutch Angle (Canted Shot)</span> creates visual unease, psychological tension, and disorientation in high-stakes scenes!'
        }
      };
    }
    
    // 3. Study Domain Widgets (Default)
    let equation = {
      title: `${topic} Formulation`,
      label: 'Analytical Model',
      code: 'ΔU = Q - W  (First Law of Thermodynamics)',
      details: 'Universal energy conservation in closed thermodynamic systems'
    };

    if (q.includes('photosynthesis') || q.includes('calvin') || q.includes('light')) {
      equation = {
        title: 'Net Photosynthetic Equation',
        label: 'Energy Transduction',
        code: '6 CO₂ + 6 H₂O + Light (hν) → C₆H₁₂O₆ + 6 O₂',
        details: 'Reactants: Carbon Dioxide + Water • Products: Glucose + Oxygen by-product'
      };
    } else if (topic === 'Mathematics' || q.includes('integral') || q.includes('calculus')) {
      equation = {
        title: 'Fundamental Integral Formulation',
        label: 'Calculus Standard',
        code: '∫ e^(ax) dx = (1/a) e^(ax) + C',
        details: 'Exponential integration theorem under constant scaling'
      };
    } else if (topic === 'CS' || q.includes('algorithm') || q.includes('sort')) {
      equation = {
        title: 'Master Theorem Asymptotic Bound',
        label: 'Complexity Analysis',
        code: 'T(n) = 2T(n/2) + O(n) ⇒ O(n log n)',
        details: 'Standard divide-and-conquer recurrence relation (e.g. Merge Sort)'
      };
    }

    const flashcard = {
      title: `${topic} High-Yield Concept`,
      sub: userMessage.length > 35 ? `${userMessage.slice(0, 32)}...` : userMessage,
      hint: 'Crucial Exam Relationship',
      answer: `<span class="text-secondary font-semibold">${topic} Synthesis:</span> Master the underlying mechanics and variable relationships for guaranteed exam accuracy!`
    };

    return { equation, flashcard };
  }

  /**
   * Stream a chat response via Server-Sent Events (SSE)
   * Subclasses must implement this method.
   * 
   * @param {Object} params
   * @param {string} params.userMessage
   * @param {string} params.topic
   * @param {string} params.tier
   * @param {string} params.language
   * @param {string} [params.model]
   * @param {AbortSignal} [params.abortSignal]
   * @param {'study'|'music'|'movies'|string} [params.domain]
   * @param {Object} params.config - Server config
   * @param {import('http').ServerResponse} params.res - Writable SSE response stream
   * @returns {Promise<{ fullText: string, modelUsed: string }>}
   */
  async streamChat(_params) {
    throw new Error(`streamChat() must be implemented by ${this.constructor.name}`);
  }
}

module.exports = BaseProvider;
