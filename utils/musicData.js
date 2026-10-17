/**
 * Nexora AI — Music Flow Soundscapes & Neuro-Acoustic Repository
 * Curated Binaural Brainwaves, Ambient Lo-Fi Synthesis, and Music Theory Reference
 */

const SOUNDSCAPES = [
  {
    id: 'cosmic-lofi',
    title: 'Cosmic Lo-Fi Chill',
    subtitle: 'Warm Rhodes Chords & 10 Hz Binaural Alpha',
    category: 'Lo-Fi Beats',
    brainwave: 'Alpha',
    frequency: '10 Hz',
    carrier: '130.81 Hz (C3)',
    bpm: 72,
    icon: 'nightlife',
    color: 'text-secondary',
    accentBg: 'bg-secondary/20',
    description: 'Harmonic C minor pentatonic chords with a 10 Hz alpha binaural undertone and vintage analog warmth for effortless reading flow.',
    science: '10 Hz Alpha frequencies promote thalamocortical coherence, lowering baseline anxiety during coding and dense study sessions.',
    synthConfig: {
      rootFreq: 130.81,
      beatDiff: 10,
      filterCutoff: 380,
      waveform: 'sine',
      harmonicWaveform: 'triangle',
      gain: 0.35
    }
  },
  {
    id: 'alpha-waves',
    title: 'Pure Alpha Waves (10 Hz)',
    subtitle: 'Thalamocortical Neuro-Synchronization',
    category: 'Binaural Brainwaves',
    brainwave: 'Alpha',
    frequency: '10 Hz',
    carrier: '200 Hz / 210 Hz',
    bpm: 'Continuous Drone',
    icon: 'waves',
    color: 'text-primary',
    accentBg: 'bg-primary/20',
    description: 'Precision dual-channel binaural beat (Left 200 Hz, Right 210 Hz) creating an internalized 10 Hz cognitive resonance.',
    science: 'Studies show 10 Hz binaural auditory stimulation enhances working memory capacity and prevents wandering thoughts.',
    synthConfig: {
      rootFreq: 200,
      beatDiff: 10,
      filterCutoff: 500,
      waveform: 'sine',
      harmonicWaveform: 'sine',
      gain: 0.4
    }
  },
  {
    id: 'theta-waves',
    title: 'Theta Meditation Flow (6 Hz)',
    subtitle: 'Deep Problem Solving & Insight Recall',
    category: 'Binaural Brainwaves',
    brainwave: 'Theta',
    frequency: '6 Hz',
    carrier: '136.1 Hz (Om Frequency)',
    bpm: 'Continuous Drone',
    icon: 'self_improvement',
    color: 'text-tertiary',
    accentBg: 'bg-tertiary/20',
    description: 'Resonant 6 Hz theta beat tuned to the 136.1 Hz frequency, fostering creative connections between disparate concepts.',
    science: 'Theta state (4-8 Hz) dominates REM sleep and hypnagogic insight, unlocking non-linear problem solving and conceptual architectural design.',
    synthConfig: {
      rootFreq: 136.1,
      beatDiff: 6,
      filterCutoff: 320,
      waveform: 'sine',
      harmonicWaveform: 'triangle',
      gain: 0.38
    }
  },
  {
    id: 'gamma-waves',
    title: 'Gamma Peak Acuity (40 Hz)',
    subtitle: 'High-Speed Sensory Binding & Focus',
    category: 'Binaural Brainwaves',
    brainwave: 'Gamma',
    frequency: '40 Hz',
    carrier: '240 Hz / 280 Hz',
    bpm: 'Pulsed Resonance',
    icon: 'bolt',
    color: 'text-amber-400',
    accentBg: 'bg-amber-400/20',
    description: 'Rapid 40 Hz gamma stimulation engineered for high-intensity problem solving, mathematical calculations, and coding sprints.',
    science: '40 Hz gamma rhythms represent the fastest EEG brainwave band, orchestrating micro-second information binding across the cerebral cortex.',
    synthConfig: {
      rootFreq: 240,
      beatDiff: 40,
      filterCutoff: 650,
      waveform: 'sine',
      harmonicWaveform: 'sine',
      gain: 0.32
    }
  },
  {
    id: 'rain-ambient',
    title: 'Midnight Rainfall & Thunder',
    subtitle: 'Dynamic Pink Noise Masking',
    category: 'Nature Soundscapes',
    brainwave: 'Broadband',
    frequency: '1/f Spectrum',
    carrier: 'Multi-layer Noise',
    bpm: 'Natural Rhythm',
    icon: 'rainy',
    color: 'text-blue-400',
    accentBg: 'bg-blue-400/20',
    description: 'Soothing rain audio generated via filtered pink noise with gentle low-frequency acoustic rolls resembling distant thunder.',
    science: 'Pink noise (equal energy per octave) reduces acoustic startle reflex and blocks conversation intelligibility in busy environments.',
    synthConfig: {
      filterCutoff: 650,
      type: 'pink-noise',
      gain: 0.45
    }
  },
  {
    id: 'brown-noise',
    title: 'Deep Space Brown Noise',
    subtitle: 'Warm 1/f² Low-End Isolation',
    category: 'Nature Soundscapes',
    brainwave: 'Delta / Theta',
    frequency: '1/f² Spectrum',
    carrier: 'Sub-bass Brownian Noise',
    bpm: 'Deep Resonance',
    icon: 'public',
    color: 'text-emerald-400',
    accentBg: 'bg-emerald-400/20',
    description: 'Heavily weighted low-frequency rumble resembling an interstellar spacecraft cabin or heavy oceanic waterfall.',
    science: 'Brown noise features a steep -6 dB/octave attenuation curve, providing calming sound masking particularly favored by neurodivergent/ADHD learners.',
    synthConfig: {
      filterCutoff: 300,
      type: 'brown-noise',
      gain: 0.5
    }
  },
  {
    id: 'focus-piano',
    title: 'Minimalist Felt Piano',
    subtitle: 'Gentle Pentatonic Harmonics',
    category: 'Lo-Fi Beats',
    brainwave: 'Alpha',
    frequency: '12 Hz Harmonic',
    carrier: '220 Hz (A3 Minor)',
    bpm: 64,
    icon: 'piano',
    color: 'text-purple-400',
    accentBg: 'bg-purple-400/20',
    description: 'Subtle resonant piano chords decaying gracefully with warm tape saturation and gentle vinyl crackle ambience.',
    science: 'Repetitive acoustic motifs in minor/modal scales maintain steady heart rate variability and inhibit cortical distraction spikes.',
    synthConfig: {
      rootFreq: 220,
      beatDiff: 12,
      filterCutoff: 420,
      waveform: 'triangle',
      harmonicWaveform: 'sine',
      gain: 0.36
    }
  }
];

const BRAINWAVE_BANDS = [
  {
    band: 'Delta',
    range: '0.5 – 4 Hz',
    state: 'Deep Sleep & Tissue Restoration',
    effect: 'Immune recovery, unconscious integration',
    soundscapeId: 'brown-noise'
  },
  {
    band: 'Theta',
    range: '4 – 8 Hz',
    state: 'Meditation, Hypnagogia & Deep Insight',
    effect: 'Subconscious synthesis, conceptual leaps, emotional processing',
    soundscapeId: 'theta-waves'
  },
  {
    band: 'Alpha',
    range: '8 – 12 Hz',
    state: 'Relaxed Alertness & Cognitive Flow',
    effect: 'Peak study state, accelerated memory encoding, low anxiety',
    soundscapeId: 'alpha-waves'
  },
  {
    band: 'Beta',
    range: '13 – 30 Hz',
    state: 'Active Analysis & External Engagement',
    effect: 'Logical argumentation, active debate, problem confrontation',
    soundscapeId: 'cosmic-lofi'
  },
  {
    band: 'Gamma',
    range: '30 – 100 Hz',
    state: 'Peak Performance & Neural Binding',
    effect: 'Rapid synthesis, mathematical computation, heightened memory retrieval',
    soundscapeId: 'gamma-waves'
  }
];

const MUSIC_THEORY_ITEMS = [
  {
    id: 'circle-of-fifths',
    title: 'Circle of Fifths',
    category: 'Harmony',
    formula: 'Clockwise (+1 Sharp, Up 5th) • Counter-Clockwise (+1 Flat, Down 5th)',
    summary: 'The geometric compass of tonal harmony connecting all 12 chromatic pitches, their major/minor relatives, and key signatures.',
    prompt: 'Explain the Circle of Fifths and how it guides chord progression modulation.'
  },
  {
    id: 'lofi-chord-progressions',
    title: 'Jazz Lo-Fi Chord Progressions',
    category: 'Composition',
    formula: 'ii7 → V7(b9) → Imaj7 → VI7  (e.g., Dm9 → G13 → Cmaj9 → A7#9)',
    summary: 'Lo-Fi chillhop relies on rich 7th, 9th, and 11th chord extensions played on warm electric pianos (Rhodes / Wurlitzer) with swing groove.',
    prompt: 'Generate 3 atmospheric Lo-Fi chord progressions with voice leading in D minor.'
  },
  {
    id: 'binaural-physics',
    title: 'Binaural Beat Formulation',
    category: 'Neuro-Acoustics',
    formula: 'f_binaural = | f_Left - f_Right |  (Requires Stereo Headphones)',
    summary: 'When two slightly different pure tones are played into each ear, the brain superior olivary complex perceives a third pulsing phantom beat.',
    prompt: 'How does binaural beating trigger phase-locking in the auditory cortex?'
  },
  {
    id: 'equal-temperament',
    title: 'Equal Temperament & Tuning',
    category: 'Acoustic Science',
    formula: 'f_n = 440 × 2^((n - 69) / 12) Hz  [A4 = 440 Hz standard]',
    summary: 'The mathematical division of an octave into 12 logarithmic equal semitones, enabling instruments to play in all 24 keys without retuning.',
    prompt: 'What is the mathematical and historical difference between 432 Hz and 440 Hz tuning?'
  }
];

function getSoundscapes({ category = null } = {}) {
  if (!category || category.toLowerCase() === 'all') {
    return SOUNDSCAPES;
  }
  return SOUNDSCAPES.filter(s => s.category.toLowerCase() === category.toLowerCase());
}

function getSoundscapeById(id) {
  return SOUNDSCAPES.find(s => s.id === id) || SOUNDSCAPES[0];
}

function getMusicTheory() {
  return {
    soundscapes: SOUNDSCAPES,
    brainwaveBands: BRAINWAVE_BANDS,
    theoryItems: MUSIC_THEORY_ITEMS
  };
}

module.exports = {
  SOUNDSCAPES,
  BRAINWAVE_BANDS,
  MUSIC_THEORY_ITEMS,
  getSoundscapes,
  getSoundscapeById,
  getMusicTheory
};
