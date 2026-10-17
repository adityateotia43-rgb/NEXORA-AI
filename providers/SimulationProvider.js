/**
 * SimulationProvider — Zero-Dependency Cognitive Simulation Engine
 * 
 * Provides offline, high-speed educational simulation with domain-specific
 * academic knowledge, step-by-step reasoning, mathematical equations, and flashcards.
 * Acts as the rock-solid fallback whenever external LLM keys are absent or hit limits.
 */

const BaseProvider = require('./BaseProvider');

const SIMULATED_KNOWLEDGE = {
  calvin: {
    title: 'Step 1: Calvin Cycle (Dark Reaction) Mechanics',
    fullText: `Photosynthesis ke second phase ko Calvin Cycle ya Dark Reaction kaha jata hai. Ye reaction chloroplast ke liquid Stroma me hoti hai jahan atmospheric CO₂ ko organic sugars (glucose) me convert kiya jata hai. Is cycle ke 3 main steps hain: 1. Carbon Fixation (via RuBisCO enzyme), 2. Reduction (ATP & NADPH energy use karke), aur 3. RuBP Regeneration. Net result ye hota hai ki 6 turns of Calvin cycle ek Glucose molecule banate hain!`,
    equation: {
      title: 'Net Calvin Cycle Reaction',
      label: 'Sugar Synthesis',
      code: '3 CO₂ + 9 ATP + 6 NADPH → G3P + 9 ADP + 6 NADP⁺ + 8 Pi',
      details: 'Reactants: Carbon Dioxide + Energy • Yield: G3P (Glucose Precursor)'
    },
    flashcard: {
      title: 'Calvin Cycle Yield',
      sub: 'How many turns to make 1 Glucose molecule?',
      hint: '6 Turns = 1 C₆H₁₂O₆',
      answer: '<span class="font-semibold text-secondary">6 Turns</span> required hain, jisme 18 ATP aur 12 NADPH consume hote hain!'
    }
  },
  photosynthesis: {
    title: 'Step 1: Photosynthesis & Photophosphorylation',
    fullText: `Photosynthesis do distinct phases me hoti hai: 1. Light Reactions (Thylakoid membranes me) jahan solar energy ko capture karke ATP aur NADPH produce kiya jata hai sath me H₂O split hokar O₂ release hota hai. 2. Dark Reactions / Calvin Cycle (Stroma me) jahan ye chemical energy CO₂ ko reduce karke hexose sugars banati hai. Light reaction ka main driver Photosystem II (P680) aur Photosystem I (P700) ka electron transport chain hai.`,
    equation: {
      title: 'Light-Harvesting Energy Yield',
      label: 'Z-Scheme Photolysis',
      code: '2 H₂O + 2 NADP⁺ + 3 ADP + 3 Pi + Light → 2 NADPH + 3 ATP + O₂',
      details: 'Non-cyclic photophosphorylation pathway across Thylakoid lumen'
    },
    flashcard: {
      title: 'Reaction Sites',
      sub: 'Where do Light and Dark reactions occur?',
      hint: 'Thylakoid vs Stroma',
      answer: '<span class="font-semibold text-secondary">Light:</span> Thylakoids • <span class="font-semibold text-tertiary">Dark:</span> Stroma fluid.'
    }
  },
  quiz: {
    title: 'Step 1: Rapid Knowledge Evaluation',
    fullText: `Yahan Botany aur Cellular Biology ke high-yield conceptual questions hain: 1. Photolysis kahan hoti hai? (Thylakoid Lumen me). 2. Primary electron donor kaunsa molecule hai? (H₂O). 3. Final electron acceptor light reaction me kaunsa hai? (NADP⁺). In concepts ko master karne se exam me direct numerical aur factual accuracy aati hai.`,
    equation: {
      title: 'Water Splitting Half-Reaction',
      label: 'Photolysis of Water',
      code: '2H₂O + Photons → 4H⁺ + 4e⁻ + O₂ ↑',
      details: 'PS II (P680) reaction center creates Oxygen by-product'
    },
    flashcard: {
      title: 'Z-Scheme Pathway',
      sub: 'What is the electron trajectory?',
      hint: 'PS II → Cytochrome b6f → PS I',
      answer: '<span class="text-secondary font-semibold">PS II (P680)</span> absorbs light → e⁻ passes to <span class="text-tertiary font-semibold">Cyt b6f</span> → <span class="text-primary font-semibold">PS I (P700)</span>!'
    }
  },
  revision: {
    title: 'Step 1: 5-Point High Yield Exam Summary',
    fullText: `Exam Quick Revision Points: 1. Site: Light reaction Thylakoid membrane me hoti hai, Calvin cycle Stroma me. 2. Energy Input: Photons PS-II (680nm) aur PS-I (700nm) ko excite karte hain. 3. Photolysis: H₂O split hota hai aur oxygen gas release hoti hai. 4. Chemiosmosis: ATP Synthase proton gradient se ATP banata hai. 5. Sugar Yield: RuBisCO CO₂ fix karta hai!`,
    equation: {
      title: 'Chemiosmotic ATP Synthesis',
      label: 'Proton-Motive Force',
      code: 'ADP + Pi + H⁺(lumen → stroma) → ATP',
      details: 'Driven by proton gradient created during non-cyclic photophosphorylation'
    },
    flashcard: {
      title: 'RuBisCO Function',
      sub: 'Key role in C3 cycle',
      hint: 'Carboxylation catalyst',
      answer: 'Fixes atmospheric CO₂ into 3-PGA in stroma.'
    }
  },
  music: {
    title: 'Music Flow: 10 Hz Binaural Alpha & Lo-Fi Synthesis',
    fullText: `Nexora Music Flow audio neuro-stimulation: 10 Hz Alpha Waves create binaural beating when left (210 Hz) and right (200 Hz) audio channels differ by exactly 10 Hz. Ye brainwave pattern thalamocortical oscillations ko synchronize karta hai, jisse study sessions me uninterrupted cognitive flow aur stress reduction milta hai. Synth engine warm analogue filters aur tape saturation add karta hai for vintage warmth.`,
    equation: {
      title: 'Binaural Beat Formulation',
      label: 'Neuro-Acoustic Formula',
      code: 'f_binaural = | f_L (210 Hz) - f_R (200 Hz) | = 10 Hz Alpha State',
      details: 'Drives electroencephalographic synchronization in frontal lobe'
    },
    flashcard: {
      title: 'Audio Neuro-Stimulation',
      sub: 'What is the optimal Alpha focus frequency?',
      hint: '8 Hz - 12 Hz Band',
      answer: '<span class="text-secondary font-semibold">10 Hz Alpha Waves</span> synchronize thalamocortical oscillations for uninterrupted deep work session retention!'
    }
  },
  movies: {
    title: 'Cinema Pulse: Visual Micro-Lecture & Screenplay Analysis',
    fullText: `Nexora Cinema Pulse analysis: Visual storytelling 3-Act narrative structure (Setup 25%, Confrontation 50%, Resolution 25%) par depend karti hai. Syd Field paradigm ke according, Inciting Incident minute 10 par aur Midpoint minute 60 par occur hota hai. Visual grammar me camera angle aur high-contrast Chiaroscuro lighting character psychology aur dramatic subtext communicate karte hain!`,
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
  }
};

class SimulationProvider extends BaseProvider {
  constructor() {
    super({
      id: 'simulation',
      name: 'Cognitive Simulation Engine',
      defaultModel: 'cognitive-sim-v2.4',
      availableModels: [
        { id: 'cognitive-sim-v2.4', name: 'Nexora Cognitive Simulation v2.4', description: 'Zero-latency offline academic inference' }
      ]
    });
  }

  isConfigured(_config) {
    // Simulation is always available
    return true;
  }

  getSimulatedData(userQuery, topic = 'Science', tier = 'Undergrad', language = 'Hinglish', domain = 'study') {
    const q = (userQuery || '').toLowerCase();

    if (domain === 'music' || q.includes('music') || q.includes('song') || q.includes('lofi') || q.includes('binaural') || q.includes('beat')) {
      return SIMULATED_KNOWLEDGE.music;
    }
    if (domain === 'movies' || q.includes('movie') || q.includes('film') || q.includes('cinema') || q.includes('director')) {
      return SIMULATED_KNOWLEDGE.movies;
    }

    if (q.includes('calvin') || q.includes('cycle')) return SIMULATED_KNOWLEDGE.calvin;
    if (q.includes('photosynthesis') || q.includes('light reaction')) return SIMULATED_KNOWLEDGE.photosynthesis;
    if (q.includes('quiz') || q.includes('question') || q.includes('test')) return SIMULATED_KNOWLEDGE.quiz;
    if (q.includes('bullet') || q.includes('revision') || q.includes('summary') || q.includes('points')) return SIMULATED_KNOWLEDGE.revision;

    const widgets = this.synthesizeEducationalWidgets(userQuery, topic, tier, domain);

    return {
      title: `Step 1: ${topic} Concept Synthesis (${tier})`,
      fullText: language === 'Hinglish'
        ? `${userQuery} ke core concepts ko ${tier} standard ke according evaluate kiya gaya hai. Isme theoretical breakdown aur formula derivation dono include hain. Fundamental principle ko samajhne ke liye pehle core physical/logical laws ko verify karein.`
        : `Concept breakdown for: "${userQuery}". Tailored to ${tier} level standards with structured theoretical foundations and analytical derivations.`,
      equation: widgets.equation,
      flashcard: widgets.flashcard
    };
  }

  async streamChat({ userMessage, topic, tier, language, model: _model, config: _config, res, abortSignal, domain = 'study' }) {
    const simulatedData = this.getSimulatedData(userMessage, topic, tier, language, domain);
    const words = simulatedData.fullText.split(' ');
    let i = 0;

    return new Promise((resolve) => {
      let timer = null;

      const cleanup = () => {
        if (timer) clearInterval(timer);
        if (abortSignal) {
          abortSignal.removeEventListener('abort', onAbort);
        }
      };

      const onAbort = () => {
        cleanup();
        resolve({ fullText: '', modelUsed: this.defaultModel });
      };

      if (abortSignal) {
        if (abortSignal.aborted) return onAbort();
        abortSignal.addEventListener('abort', onAbort, { once: true });
      }

      timer = setInterval(() => {
        if (abortSignal && abortSignal.aborted) {
          return onAbort();
        }

        if (i < words.length) {
          const chunk = (i === 0 ? '' : ' ') + words[i];
          res.write(`data: ${JSON.stringify({ chunk, done: false })}\n\n`);
          i++;
        } else {
          cleanup();
          res.write(`data: ${JSON.stringify({
            done: true,
            fullText: simulatedData.fullText,
            title: simulatedData.title,
            equation: simulatedData.equation,
            flashcard: simulatedData.flashcard,
            source: 'simulated-engine',
            provider: this.id,
            model: this.defaultModel,
            domain
          })}\n\n`);
          res.end();
          resolve({ fullText: simulatedData.fullText, modelUsed: this.defaultModel, domain });
        }
      }, 30);

      res.on('close', () => {
        cleanup();
        resolve({ fullText: simulatedData.fullText, modelUsed: this.defaultModel });
      });
    });
  }
}

module.exports = SimulationProvider;
