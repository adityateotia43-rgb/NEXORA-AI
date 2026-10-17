/**
 * NEXORA AI v2.4 — Core Application Controller & State Engine
 */

// ==========================================
// 1. STATE & STORAGE MANAGEMENT
// ==========================================
const STORAGE_KEY = 'NEXORA_AI_STATE_v2.4';

const defaultState = {
  activeTab: 'study-hub',
  selectedTopic: 'Science',
  selectedTier: 'Undergrad',
  selectedLanguage: 'Hinglish',
  activeCardIndex: 0,
  bookmarkedCards: [0],
  masteredCards: [],
  flashcardTopicFilter: 'All',
  quizTopicFilter: 'Science',
  savedNotes: [
    {
      id: 'note-1',
      title: 'Photosynthesis Fundamentals',
      topic: 'Science',
      tier: 'Undergrad',
      date: 'Today',
      summary: '6CO₂ + 6H₂O + Light → C₆H₁₂O₆ + 6O₂. Thylakoid membrane hosts light reactions; Stroma hosts Calvin cycle.'
    }
  ],
  pomodoroStats: { completed: 0, focusMinutes: 0, xp: 0 },
  watchlist: [
    {
      id: 157336,
      title: 'Interstellar',
      year: 2014,
      director: 'Christopher Nolan',
      rating: 8.7,
      runtime: '169 min',
      posterUrl: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/w1280/xJHokMbljvjADYdit5fK5VQsXEG.jpg',
      genres: ['Sci-Fi & STEM', 'Mind-Bending'],
      status: 'plan',
      addedAt: 'Recent'
    }
  ],
  activeMovieCategory: 'all',
  messages: [],
  quizHistory: [
    {
      id: 'quiz-init-1',
      topic: 'Science',
      tier: 'Undergrad',
      score: 3,
      totalQuestions: 4,
      percentage: 75,
      timeSpentSeconds: 45,
      date: 'Today'
    }
  ],
  selectedProvider: 'auto',
  selectedModel: '',
  user: {
    id: null,
    email: '',
    displayName: 'Alex Mercer',
    avatarUrl: '',
    academicTier: 'Undergrad',
    preferredLanguage: 'Hinglish',
    xp: 1420,
    streakDays: 4,
    isAuthenticated: false
  }
};

let state = loadState();
if (!Array.isArray(state.watchlist)) state.watchlist = [...defaultState.watchlist];
if (!Array.isArray(state.savedNotes)) state.savedNotes = [...defaultState.savedNotes];
if (!Array.isArray(state.bookmarkedCards)) state.bookmarkedCards = [...defaultState.bookmarkedCards];
if (!Array.isArray(state.masteredCards)) state.masteredCards = [...defaultState.masteredCards];
if (!Array.isArray(state.messages)) state.messages = [];
if (!Array.isArray(state.quizHistory)) state.quizHistory = [...defaultState.quizHistory];
if (!state.user || typeof state.user !== 'object') state.user = { ...defaultState.user };


async function syncServerConfig() {
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const serverConfig = await res.json();
      window.NEXORA_SERVER_CONFIG = serverConfig;
      if (serverConfig.providersInfo) {
        window.NEXORA_PROVIDERS = serverConfig.providersInfo;
        updateProviderBadges();
      }
      if (!localStorage.getItem(STORAGE_KEY)) {
        if (serverConfig.defaultTopic) state.selectedTopic = serverConfig.defaultTopic;
        if (serverConfig.defaultTier) state.selectedTier = serverConfig.defaultTier;
        if (serverConfig.defaultLanguage) state.selectedLanguage = serverConfig.defaultLanguage;
        saveState();
      }
      // Initialize Supabase Auth with server config
      await initSupabaseAuth();
    }
  } catch (e) {
    // Graceful offline fallback
    updateProviderBadges();
    await initSupabaseAuth();
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultState, ...JSON.parse(raw) };
  } catch (e) {
    console.warn('LocalStorage error:', e);
  }
  return { ...defaultState };
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('LocalStorage save error:', e);
  }
}

// ==========================================
// 1B. GLOBAL ERROR BOUNDARY & RESILIENCE ENGINE
// ==========================================
window.addEventListener('error', (event) => {
  console.error('[Global Error Boundary Caught]:', event.error || event.message);
  showErrorBoundaryToast('An unexpected interface error occurred.', () => {
    window.location.reload();
  });
});

window.addEventListener('unhandledrejection', (event) => {
  console.warn('[Unhandled Rejection Caught]:', event.reason);
  event.preventDefault();
  const reasonMsg = (event.reason && event.reason.message) ? event.reason.message : 'Network or async operation failed';
  showErrorBoundaryToast(reasonMsg);
});

// Network Offline / Online State Handlers
window.addEventListener('offline', () => {
  const banner = document.getElementById('network-offline-banner');
  if (banner) banner.classList.remove('hidden');
  showToast('Network offline. Local simulation and audio synthesis available.', 'warning', 'wifi_off');
});

window.addEventListener('online', () => {
  const banner = document.getElementById('network-offline-banner');
  if (banner) banner.classList.add('hidden');
  showToast('Connection restored. Supabase cloud sync reconnected.', 'success', 'wifi');
  if (typeof syncServerConfig === 'function') syncServerConfig();
});

function showErrorBoundaryToast(message, actionCallback = null) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'w-full p-3.5 rounded-2xl glass-modal shadow-2xl border border-error/30 flex items-center justify-between gap-3 text-on-surface animate-fade-in pointer-events-auto error-boundary-banner';
  toast.innerHTML = `
    <div class="flex items-center gap-2.5 min-w-0">
      <span class="material-symbols-outlined text-error text-lg shrink-0">report_problem</span>
      <span class="text-xs text-on-surface truncate font-medium">${escapeHtml(message)}</span>
    </div>
    <div class="flex items-center gap-1.5 shrink-0">
      ${actionCallback ? `
        <button class="px-2.5 py-1 rounded-lg bg-surface-container-high text-primary hover:text-on-surface font-semibold text-xs active:scale-95 transition-all" id="toast-retry-btn">
          Reload
        </button>
      ` : ''}
      <button class="w-6 h-6 rounded-full flex items-center justify-center text-outline hover:text-on-surface" onclick="this.closest('.glass-modal').remove()">
        <span class="material-symbols-outlined text-sm">close</span>
      </button>
    </div>
  `;

  if (actionCallback) {
    const btn = toast.querySelector('#toast-retry-btn');
    if (btn) btn.onclick = () => { toast.remove(); actionCallback(); };
  }

  container.appendChild(toast);
  setTimeout(() => {
    if (toast.parentNode) {
      toast.classList.add('opacity-0', 'transition-opacity');
      setTimeout(() => toast.remove(), 300);
    }
  }, 7000);
}

// Component Level Safe Render Boundary
function safeRender(renderFn, containerId, sectionName = 'Section') {
  try {
    renderFn();
  } catch (err) {
    console.error(`[SafeRender Error in ${sectionName}]:`, err);
    const container = document.getElementById(containerId);
    if (container) {
      const errorCardId = `error-boundary-${Date.now()}`;
      container.innerHTML = `
        <div class="col-span-full p-6 rounded-3xl bg-surface-container border border-error/25 text-center space-y-3 animate-fade-in my-3" id="${errorCardId}">
          <div class="w-12 h-12 rounded-full bg-error/15 text-error flex items-center justify-center mx-auto">
            <span class="material-symbols-outlined text-2xl">error_outline</span>
          </div>
          <h4 class="font-headline-sm text-sm font-bold text-on-surface">${escapeHtml(sectionName)} Display Error</h4>
          <p class="text-xs text-on-surface-variant max-w-sm mx-auto leading-relaxed">An error occurred while loading this view: ${escapeHtml(err.message || 'Unknown render failure')}. Your notes and session data remain safe.</p>
          <div class="flex items-center justify-center gap-2 pt-1">
            <button class="px-4 py-1.5 rounded-xl bg-primary text-white text-xs font-semibold shadow active:scale-95 transition-all inline-flex items-center gap-1.5 cursor-pointer retry-boundary-btn">
              <span class="material-symbols-outlined text-xs">refresh</span>
              <span>Retry Render</span>
            </button>
          </div>
        </div>
      `;
      const retryBtn = container.querySelector(`#${errorCardId} .retry-boundary-btn`);
      if (retryBtn) {
        retryBtn.onclick = () => safeRender(renderFn, containerId, sectionName);
      }
    }
  }
}

// Image Error Fallback Handler for Posters and Media
function handleImageFallback(imgEl, title = 'NEXORA', type = 'poster') {
  if (!imgEl || imgEl.dataset.fallbackApplied) return;
  imgEl.dataset.fallbackApplied = 'true';
  const bg = type === 'backdrop' ? '%231a1b20' : '%23121317';
  const fg = type === 'backdrop' ? '%2300a6e0' : '%23a078ff';
  const icon = type === 'backdrop' ? '🎬' : '🎞️';
  const cleanTitle = (title || 'Film Study').replace(/["'<>]/g, '').slice(0, 24);
  const label = encodeURIComponent(cleanTitle);
  imgEl.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450"><rect width="300" height="450" fill="${bg}"/><circle cx="150" cy="180" r="45" fill="${fg}" opacity="0.15"/><text x="150" y="192" font-family="sans-serif" font-size="36" text-anchor="middle" fill="${fg}">${icon}</text><text x="150" y="255" font-family="sans-serif" font-size="14" font-weight="600" text-anchor="middle" fill="%23e3e2e8">${label}</text><text x="150" y="280" font-family="sans-serif" font-size="11" text-anchor="middle" fill="%23958ea0">Cinema Pulse</text></svg>`;
}


// ==========================================
// 1C. EXPLORE AGENTS CATALOG & ENGINE
// ==========================================
const AI_STUDY_AGENTS = [
  {
    id: 'agent-quantum',
    title: 'Quantum Mechanics & Wave Tutor',
    category: 'STEM & Math',
    badge: 'Physics Engine',
    badgeBg: 'bg-primary/20 text-primary',
    icon: 'neurology',
    iconColor: 'text-primary',
    description: 'Deconstruct de Broglie wavelength, Schrödinger wave equations, and quantum superposition in simple Hinglish.',
    prompt: 'Explain Quantum Mechanics, wave-particle duality, and the de Broglie wavelength in simple Hinglish with examples.',
    xpMultiplier: '1.5x XP'
  },
  {
    id: 'agent-formula',
    title: 'Formula Derivation Specialist',
    category: 'STEM & Math',
    badge: 'Pure Mathematics',
    badgeBg: 'bg-secondary/20 text-secondary',
    icon: 'functions',
    iconColor: 'text-secondary',
    description: 'Step-by-step rigorous derivations for quadratic formulas, calculus theorems, and trigonometric identities.',
    prompt: 'Derive the quadratic formula step by step with geometric intuition and algebraic proofs.',
    xpMultiplier: '1.2x XP'
  },
  {
    id: 'agent-dsa',
    title: 'Code Mentor & DSA Architect',
    category: 'Code & Algorithms',
    badge: 'Computer Science',
    badgeBg: 'bg-tertiary/20 text-tertiary',
    icon: 'terminal',
    iconColor: 'text-tertiary',
    description: 'Big-O time and space complexity verification, dynamic programming breakdowns, and graph algorithm derivations.',
    prompt: 'Analyze time and space complexity of Dijkstra vs A* algorithm with code snippet examples.',
    xpMultiplier: '1.4x XP'
  },
  {
    id: 'agent-crammer',
    title: 'High-Yield Exam Crammer',
    category: 'Exam Cram',
    badge: 'Exam Accelerator',
    badgeBg: 'bg-amber-500/20 text-amber-400',
    icon: 'bolt',
    iconColor: 'text-amber-400',
    description: 'High-frequency exam questions, mnemonics, reaction summaries, and 1-page condensed revision cheat sheets.',
    prompt: 'Create a 3-page high yield exam cram sheet for Organic Chemistry reactions and mechanisms.',
    xpMultiplier: '1.3x XP'
  },
  {
    id: 'agent-essay',
    title: 'Argumentative Essay Outliner',
    category: 'Writing & Humanities',
    badge: 'Rhetoric & Logic',
    badgeBg: 'bg-emerald-500/20 text-emerald-400',
    icon: 'draw',
    iconColor: 'text-emerald-400',
    description: 'Thesis statement architect, counter-argument synthesizer, academic vocabulary enhancer, and bibliography structurer.',
    prompt: 'Outline a high-scoring argumentative essay on Artificial Intelligence in modern education with strong thesis and counter-arguments.',
    xpMultiplier: '1.1x XP'
  },
  {
    id: 'agent-calculus',
    title: 'Multivariable Calculus & Vector Sage',
    category: 'STEM & Math',
    badge: 'Advanced Math',
    badgeBg: 'bg-secondary/20 text-secondary',
    icon: 'calculate',
    iconColor: 'text-secondary',
    description: 'Visual gradient, curl, divergence, line integrals, and Green-Stokes theorem derivations made clear and intuitive.',
    prompt: 'Explain Gradient, Divergence, and Curl with physical vector field analogies and formula summaries.',
    xpMultiplier: '1.5x XP'
  },
  {
    id: 'agent-medical',
    title: 'Cellular & Molecular Biology Sage',
    category: 'Medical & Bio',
    badge: 'Life Sciences',
    badgeBg: 'bg-emerald-500/20 text-emerald-400',
    icon: 'biotech',
    iconColor: 'text-emerald-400',
    description: 'Mitochondrial ATP synthesis, Krebs cycle, signal transduction pathways, and genetics problem sets.',
    prompt: 'Explain the Krebs citric acid cycle and oxidative phosphorylation with ATP yield accounting.',
    xpMultiplier: '1.4x XP'
  },
  {
    id: 'agent-history',
    title: 'Historical Causation & Geo-Politics',
    category: 'Writing & Humanities',
    badge: 'Social Sciences',
    badgeBg: 'bg-primary/20 text-primary',
    icon: 'history_edu',
    iconColor: 'text-primary',
    description: 'Cause-and-effect timelines, treaty deconstructions, economic catalysts, and essay evaluation rubrics.',
    prompt: 'Analyze the economic and diplomatic causes of the Industrial Revolution in 18th century Europe.',
    xpMultiplier: '1.2x XP'
  }
];

let activeAgentCategory = 'All';
let agentSearchQuery = '';

function filterExploreAgents(query) {
  agentSearchQuery = (query || '').trim().toLowerCase();
  safeRender(renderExploreAgents, 'agents-grid', 'Explore Agents');
}

function filterExploreAgentsCategory(cat) {
  activeAgentCategory = cat;
  const tabs = document.getElementById('agent-category-tabs');
  if (tabs) {
    tabs.querySelectorAll('[data-agent-cat]').forEach(btn => {
      const c = btn.getAttribute('data-agent-cat');
      if (c === cat) {
        btn.className = "px-3.5 py-1.5 rounded-xl bg-surface-container-high text-primary font-semibold text-xs shadow-sm transition-all whitespace-nowrap";
      } else {
        btn.className = "px-3.5 py-1.5 rounded-xl bg-surface-container text-on-surface-variant hover:text-on-surface font-medium text-xs transition-all whitespace-nowrap";
      }
    });
  }
  safeRender(renderExploreAgents, 'agents-grid', 'Explore Agents');
}

function renderExploreAgents() {
  const grid = document.getElementById('agents-grid');
  const countBadge = document.getElementById('agents-count-badge');
  if (!grid) return;

  let filtered = activeAgentCategory === 'All' 
    ? AI_STUDY_AGENTS 
    : AI_STUDY_AGENTS.filter(a => a.category === activeAgentCategory);

  if (agentSearchQuery) {
    filtered = filtered.filter(a => 
      a.title.toLowerCase().includes(agentSearchQuery) ||
      a.description.toLowerCase().includes(agentSearchQuery) ||
      a.category.toLowerCase().includes(agentSearchQuery) ||
      a.badge.toLowerCase().includes(agentSearchQuery)
    );
  }

  if (countBadge) {
    countBadge.textContent = `${filtered.length} Co-Pilots Available`;
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full py-12 px-4 text-center space-y-3 rounded-2xl bg-surface-container border border-outline-variant animate-fade-in">
        <div class="w-14 h-14 rounded-full bg-surface-container-high text-outline flex items-center justify-center mx-auto">
          <span class="material-symbols-outlined text-3xl animate-float">search_off</span>
        </div>
        <h4 class="font-headline-sm text-base font-bold text-on-surface">No Study Agents Found</h4>
        <p class="text-xs text-on-surface-variant max-w-sm mx-auto">
          ${agentSearchQuery ? `No specialized agents match "${escapeHtml(agentSearchQuery)}".` : 'No agents available in this category.'} Try searching for Math, Code, Exam, or Physics.
        </p>
        <button class="px-4 py-2 rounded-xl bg-primary text-white font-semibold text-xs shadow-md active:scale-95 transition-all inline-flex items-center gap-1.5" onclick="filterExploreAgentsCategory('All'); document.getElementById('agent-search-input').value=''; filterExploreAgents('');">
          <span class="material-symbols-outlined text-xs">refresh</span>
          <span>View All 8 Agents</span>
        </button>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(agent => `
    <div class="p-4 rounded-2xl bg-surface-container border border-outline-variant hover:border-primary/40 transition-all flex flex-col justify-between group shadow-sm hover:shadow-lg cursor-pointer" onclick="switchTab('study-hub'); insertPrompt('${escapeHtml(agent.prompt)}')">
      <div class="space-y-2.5">
        <div class="flex items-center justify-between gap-2">
          <span class="px-2 py-0.5 rounded-md ${agent.badgeBg} text-[10px] font-bold uppercase tracking-wider">${agent.badge}</span>
          <span class="text-[10px] font-mono text-outline font-semibold">${agent.xpMultiplier}</span>
        </div>
        <div class="flex items-start gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-surface-container-high flex items-center justify-center ${agent.iconColor} shrink-0 group-hover:scale-110 transition-transform shadow-inner">
            <span class="material-symbols-outlined text-xl">${agent.icon}</span>
          </div>
          <div>
            <h4 class="font-semibold text-sm text-on-surface group-hover:text-primary transition-colors line-clamp-1">${escapeHtml(agent.title)}</h4>
            <span class="text-[10px] text-outline font-medium">${agent.category}</span>
          </div>
        </div>
        <p class="text-xs text-on-surface-variant leading-relaxed line-clamp-2">${escapeHtml(agent.description)}</p>
      </div>
      <div class="pt-3 border-t border-outline-variant/40 flex items-center justify-between text-xs text-primary font-semibold mt-2">
        <span class="flex items-center gap-1">Launch Agent</span>
        <span class="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
      </div>
    </div>
  `).join('');
}

// Start Clean Study Session with Starter Cards
function startNewChatSession() {
  switchTab('study-hub');
  state.messages = [];
  saveState();

  const stream = document.getElementById('chat-stream');
  if (stream) {
    stream.innerHTML = `
      <div id="chat-empty-state" class="py-10 px-4 text-center space-y-4 rounded-3xl bg-surface-container border border-outline-variant shadow-lg animate-fade-in my-2">
        <div class="w-16 h-16 rounded-3xl bg-gradient-to-tr from-primary to-secondary p-0.5 flex items-center justify-center mx-auto shadow-md">
          <div class="w-full h-full rounded-[22px] bg-surface-container flex items-center justify-center text-primary">
            <span class="material-symbols-outlined text-3xl animate-float">neurology</span>
          </div>
        </div>
        <div class="space-y-1">
          <h3 class="font-headline-sm text-lg font-bold text-on-surface">New Cognitive Study Session Started</h3>
          <p class="text-xs text-on-surface-variant max-w-md mx-auto leading-relaxed">
            Choose a concept accelerator below or type any question into the study co-pilot composer.
          </p>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-lg mx-auto pt-2 text-left">
          <button class="p-3 rounded-2xl bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/60 active:scale-98 transition-all group" onclick="insertPrompt('Explain Calvin Cycle and RuBisCO enzyme in simple Hinglish')">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-secondary text-lg group-hover:scale-110 transition-transform">biotech</span>
              <span class="text-xs font-semibold text-on-surface">Calvin Cycle &amp; RuBisCO</span>
            </div>
            <p class="text-[11px] text-outline mt-1 line-clamp-1">Photosynthetic dark reaction synthesis</p>
          </button>
          <button class="p-3 rounded-2xl bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/60 active:scale-98 transition-all group" onclick="insertPrompt('Derive Euler\\'s formula e^(i*pi) + 1 = 0 step by step')">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-primary text-lg group-hover:scale-110 transition-transform">functions</span>
              <span class="text-xs font-semibold text-on-surface">Euler's Identity Proof</span>
            </div>
            <p class="text-[11px] text-outline mt-1 line-clamp-1">Taylor series &amp; complex exponents</p>
          </button>
          <button class="p-3 rounded-2xl bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/60 active:scale-98 transition-all group" onclick="insertPrompt('Explain Dijkstra\\'s shortest path algorithm vs A* with priority queue')">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-tertiary text-lg group-hover:scale-110 transition-transform">terminal</span>
              <span class="text-xs font-semibold text-on-surface">Dijkstra vs A* Algorithm</span>
            </div>
            <p class="text-[11px] text-outline mt-1 line-clamp-1">DSA Big-O time &amp; space bounds</p>
          </button>
          <button class="p-3 rounded-2xl bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/60 active:scale-98 transition-all group" onclick="insertPrompt('Create a 3-page high yield exam cram sheet for Organic Chemistry')">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-amber-400 text-lg group-hover:scale-110 transition-transform">bolt</span>
              <span class="text-xs font-semibold text-on-surface">Exam Cram Sheet</span>
            </div>
            <p class="text-[11px] text-outline mt-1 line-clamp-1">High-frequency reaction mechanisms</p>
          </button>
        </div>
      </div>
    `;
  }

  const input = document.getElementById('study-input');
  if (input) {
    input.value = '';
    input.focus();
  }
  showToast('New study session initialized. Previous memory cleared.', 'info', 'auto_fix_high');
}

// ==========================================
// 2. FLASHCARDS DATASET (20 Cards across 5 Subjects & 3 Tiers)
// ==========================================
const FLASHCARDS = [
  // --- SCIENCE ---
  {
    id: 0,
    topic: 'Science',
    tier: 'Undergrad',
    difficulty: 'Medium',
    frontTitle: 'Light vs Dark Reactions',
    frontSubtitle: 'Where does each take place in the plant cell?',
    hint: 'Thylakoid vs Stroma',
    equation: '6 CO₂ + 6 H₂O + Light → C₆H₁₂O₆ + 6 O₂',
    backAnswer: `
      <span class="font-semibold text-secondary">Light Reaction:</span> Thylakoid membrane (Grana) me hoti hai jahan water photolysis se ATP & NADPH bante hain.<br>
      <span class="font-semibold text-tertiary">Dark Reaction (Calvin Cycle):</span> Chloroplast ke aqueous fluid <span class="text-on-surface font-semibold">Stroma</span> me hoti hai jahan RuBisCO CO₂ fix karta hai.
    `
  },
  {
    id: 1,
    topic: 'Science',
    tier: 'Undergrad',
    difficulty: 'Hard',
    frontTitle: 'Photophosphorylation Yield',
    frontSubtitle: 'What energy currencies are generated in light reactions?',
    hint: 'ATP + NADPH',
    equation: '2 H₂O + 2 NADP⁺ + 3 ADP + 3 Pi + Light → 2 NADPH + 3 ATP + O₂',
    backAnswer: `
      <span class="font-semibold text-secondary">Products:</span> Light energy splits H₂O via photolysis, generating <span class="text-primary font-semibold">ATP</span> and <span class="text-tertiary font-semibold">NADPH</span>.<br>
      Ye high-energy molecules dark reaction me glucose synthesis drive karte hain.
    `
  },
  {
    id: 2,
    topic: 'Science',
    tier: 'Undergrad',
    difficulty: 'Medium',
    frontTitle: 'RuBisCO Enzyme Function',
    frontSubtitle: 'Why is RuBisCO critical in the Calvin Cycle?',
    hint: 'CO₂ Fixation Catalyst',
    equation: 'CO₂ + RuBP (5C) —[RuBisCO]→ 2 × 3-PGA (3C)',
    backAnswer: `
      RuBisCO (Ribulose-1,5-bisphosphate carboxylase-oxygenase) atmospheric <span class="text-secondary font-semibold">CO₂ ko RuBP se bind</span> karke 3-PGA produce karta hai. Ye earth ka most abundant enzyme hai!
    `
  },
  {
    id: 3,
    topic: 'Science',
    tier: 'High School',
    difficulty: 'Easy',
    frontTitle: 'Newton’s Second Law of Motion',
    frontSubtitle: 'What is the fundamental definition of Force?',
    hint: 'Rate of change of momentum',
    equation: 'F = dp/dt = m · a',
    backAnswer: `
      <span class="font-mono text-primary font-semibold">F = dp/dt = m · a</span>.<br>
      Force kisi body ke linear momentum ke time rate of change ke barabar hoti hai aur usi direction me act karti hai.
    `
  },
  {
    id: 4,
    topic: 'Science',
    tier: 'Undergrad',
    difficulty: 'Hard',
    frontTitle: 'Heisenberg Uncertainty Principle',
    frontSubtitle: 'Can position and momentum be measured simultaneously?',
    hint: 'Δx · Δp ≥ ℏ/2',
    equation: 'Δx · Δp ≥ ℏ / 2  (ℏ = h / 2π)',
    backAnswer: `
      Nahi! Quantum level par kisi particle ki <span class="text-secondary font-semibold">Position (Δx)</span> aur <span class="text-tertiary font-semibold">Momentum (Δp)</span> ko simultaneously infinite precision se measure karna physically impossible hai.
    `
  },
  {
    id: 5,
    topic: 'Science',
    tier: 'Competitive',
    difficulty: 'Hard',
    frontTitle: 'First Law of Thermodynamics',
    frontSubtitle: 'How does internal energy relate to heat and work?',
    hint: 'Energy Conservation in Closed Systems',
    equation: 'ΔU = Q - W',
    backAnswer: `
      Closed system me internal energy change (<span class="text-primary font-semibold">ΔU</span>) system ko di gayi heat (<span class="text-secondary font-semibold">Q</span>) minus system dwara kiye gaye work (<span class="text-tertiary font-semibold">W</span>) ke equal hoti hai.
    `
  },

  // --- MATHEMATICS ---
  {
    id: 6,
    topic: 'Mathematics',
    tier: 'Undergrad',
    difficulty: 'Hard',
    frontTitle: 'Euler’s Identity Meaning',
    frontSubtitle: 'What is e^(iπ) + 1 = 0 and why is it profound?',
    hint: '5 Fundamental Constants',
    equation: 'e^(iπ) + 1 = 0',
    backAnswer: `
      Ye formula mathematics ke 5 most fundamental constants ko connect karta hai: <span class="text-primary font-semibold">e</span> (exponential base), <span class="text-secondary font-semibold">i</span> (imaginary unit), <span class="text-tertiary font-semibold">π</span>, 1, aur 0.
    `
  },
  {
    id: 7,
    topic: 'Mathematics',
    tier: 'High School',
    difficulty: 'Easy',
    frontTitle: 'Product Rule in Calculus',
    frontSubtitle: 'What is the derivative expansion for d/dx [u · v]?',
    hint: 'uv\' + vu\'',
    equation: 'd/dx [u · v] = u · (dv/dx) + v · (du/dx)',
    backAnswer: `
      <span class="font-mono text-primary font-semibold">d/dx [u · v] = u(dv/dx) + v(du/dx)</span>.<br>
      Rule: Pehla function waise hi × dusre ka derivative + dusra waise hi × pehle ka derivative!
    `
  },
  {
    id: 8,
    topic: 'Mathematics',
    tier: 'Undergrad',
    difficulty: 'Medium',
    frontTitle: 'Integration by Parts',
    frontSubtitle: 'What is the standard formula derived from the product rule?',
    hint: '∫ u dv = uv - ∫ v du',
    equation: '∫ u · dv = u · v - ∫ v · du',
    backAnswer: `
      Do functions ke product ka integral nikalne ke liye <span class="text-secondary font-semibold">ILATE rule</span> (Inverse, Logarithmic, Algebraic, Trig, Exponential) se 'u' choose karte hain aur formula apply karte hain.
    `
  },
  {
    id: 9,
    topic: 'Mathematics',
    tier: 'Competitive',
    difficulty: 'Hard',
    frontTitle: 'Bayes’ Theorem Formulation',
    frontSubtitle: 'How do you update conditional probability with evidence?',
    hint: 'P(A|B) formula',
    equation: 'P(A|B) = [ P(B|A) · P(A) ] / P(B)',
    backAnswer: `
      <span class="text-primary font-semibold">P(A|B)</span> is posterior probability, <span class="text-secondary font-semibold">P(B|A)</span> is likelihood, <span class="text-tertiary font-semibold">P(A)</span> is prior probability, and P(B) is marginal evidence.
    `
  },

  // --- COMPUTER SCIENCE ---
  {
    id: 10,
    topic: 'CS',
    tier: 'Undergrad',
    difficulty: 'Medium',
    frontTitle: 'QuickSort Time Complexity',
    frontSubtitle: 'What are the Best, Average, and Worst-Case bounds?',
    hint: 'Pivot selection dependent',
    equation: 'T(n) = 2T(n/2) + O(n) ⇒ O(n log n)',
    backAnswer: `
      <span class="font-semibold text-secondary">Best & Avg:</span> <span class="text-primary font-semibold">O(n log n)</span><br>
      <span class="font-semibold text-error">Worst Case:</span> <span class="text-error font-semibold">O(n²)</span> (jab pivot consistently smallest ya largest element ban jaye).
    `
  },
  {
    id: 11,
    topic: 'CS',
    tier: 'Undergrad',
    difficulty: 'Medium',
    frontTitle: 'Binary Search Tree Property',
    frontSubtitle: 'What condition must hold for every node in a BST?',
    hint: 'Left < Root < Right',
    equation: '∀ x ∈ Left(N): x.key < N.key < ∀ y ∈ Right(N): y.key',
    backAnswer: `
      Har node ke <span class="text-secondary font-semibold">Left subtree</span> ke sabhi keys usse choti honi chahiye, aur <span class="text-tertiary font-semibold">Right subtree</span> ke sabhi keys usse badi honi chahiye.
    `
  },
  {
    id: 12,
    topic: 'CS',
    tier: 'Undergrad',
    difficulty: 'Hard',
    frontTitle: 'CAP Theorem in Distributed Systems',
    frontSubtitle: 'Which 3 guarantees, and how many can you ensure simultaneously?',
    hint: 'Pick at most 2 of 3 in partition',
    equation: 'Consistency + Availability + Partition Tolerance',
    backAnswer: `
      <span class="text-primary font-semibold">Consistency, Availability, Partition Tolerance</span>.<br>
      Network partition (P) hone par distributed system ya to Consistent (C) ban sakta hai ya Available (A), dono ek sath nahi!
    `
  },
  {
    id: 13,
    topic: 'CS',
    tier: 'Competitive',
    difficulty: 'Hard',
    frontTitle: 'Dijkstra’s Algorithm Complexity',
    frontSubtitle: 'What is the optimal complexity using Min-Heap priority queue?',
    hint: 'Vertices V and Edges E',
    equation: 'O((V + E) log V)',
    backAnswer: `
      Min-Heap priority queue ke sath Dijkstra algorithm ki time complexity <span class="text-secondary font-semibold">O((V + E) log V)</span> hoti hai. Non-negative edge weights hona mandatory hai.
    `
  },

  // --- ENGLISH ---
  {
    id: 14,
    topic: 'English',
    tier: 'Competitive',
    difficulty: 'Medium',
    frontTitle: 'Active vs Passive Voice',
    frontSubtitle: 'Identify voice: "The experiment was conducted by Dr. Roy."',
    hint: 'Subject receives the action',
    equation: 'Object + Auxiliary verb + Past Participle + by + Subject',
    backAnswer: `
      Ye <span class="text-tertiary font-semibold">Passive Voice</span> hai! Iska active voice form hoga: <span class="text-secondary font-semibold">"Dr. Roy conducted the experiment."</span>
    `
  },
  {
    id: 15,
    topic: 'English',
    tier: 'Undergrad',
    difficulty: 'Medium',
    frontTitle: 'Metaphor vs Simile',
    frontSubtitle: 'What differentiates these two figurative comparisons?',
    hint: 'Direct assertion vs "like / as"',
    equation: 'Metaphor: A is B • Simile: A is like B',
    backAnswer: `
      <span class="text-secondary font-semibold">Simile:</span> Comparison using 'like' or 'as' ("He fights like a lion").<br>
      <span class="text-primary font-semibold">Metaphor:</span> Direct figurative assertion ("He is a lion in battle").
    `
  },
  {
    id: 16,
    topic: 'English',
    tier: 'High School',
    difficulty: 'Easy',
    frontTitle: 'Subject-Verb Agreement Rule',
    frontSubtitle: 'Which is correct: "Neither the teacher nor the students (was/were) present"?',
    hint: 'Proximity Rule with Correlative Conjunctions',
    equation: 'Verb agrees with the closer subject',
    backAnswer: `
      Correct: <span class="text-secondary font-semibold">"Neither the teacher nor the students were present."</span><br>
      Rule: 'Neither... nor' me verb hamesha nearest subject ('students' plural) se agree karta hai.
    `
  },

  // --- GENERAL KNOWLEDGE (GK) ---
  {
    id: 17,
    topic: 'GK',
    tier: 'Competitive',
    difficulty: 'Medium',
    frontTitle: 'Indian Constitution Drafting',
    frontSubtitle: 'Who chaired the Drafting Committee of the Indian Constitution?',
    hint: 'Adopted 26 Nov 1949',
    equation: 'Constitution of India (Drafting Committee 1947–1950)',
    backAnswer: `
      <span class="text-primary font-semibold">Dr. B. R. Ambedkar</span> was the Chairman of the Drafting Committee. Constitution 26 November 1949 ko adopt hua aur 26 January 1950 ko enforce hua.
    `
  },
  {
    id: 18,
    topic: 'GK',
    tier: 'Undergrad',
    difficulty: 'Easy',
    frontTitle: 'United Nations Headquarters',
    frontSubtitle: 'Where is the principal headquarters of the UN located?',
    hint: 'Established 1945',
    equation: 'UN Charter: 193 Member States',
    backAnswer: `
      United Nations ka main headquarters <span class="text-secondary font-semibold">New York City, USA</span> me East River ke kinare located hai. UN 24 October 1945 ko establish hua tha.
    `
  },
  {
    id: 19,
    topic: 'GK',
    tier: 'Competitive',
    difficulty: 'Hard',
    frontTitle: 'Fundamental Rights in Indian Constitution',
    frontSubtitle: 'Which part and articles cover Fundamental Rights?',
    hint: 'Part III Articles 12 to 35',
    equation: 'Part III: Magna Carta of India (Articles 12–35)',
    backAnswer: `
      Fundamental Rights Indian Constitution ke <span class="text-primary font-semibold">Part III</span> me <span class="text-secondary font-semibold">Articles 12 se 35</span> tak diye gaye hain. Isse Magna Carta of India bhi kaha jata hai.
    `
  }
];

// ==========================================
// 3. QUIZ DATASET (20 Questions across 5 Subjects & 3 Tiers)
// ==========================================
const QUIZ_QUESTIONS = [
  // --- SCIENCE QUIZZES ---
  {
    id: 1,
    topic: 'Science',
    tier: 'Undergrad',
    question: "Photosynthesis ke dauran oxygen gas (O₂) kis molecule ke splitting se release hoti hai?",
    options: [
      { text: "Carbon Dioxide (CO₂)", correct: false },
      { text: "Water (H₂O)", correct: true },
      { text: "Glucose (C₆H₁₂O₆)", correct: false },
      { text: "RuBP", correct: false }
    ],
    explanation: "Photolysis process me light energy chloroplast ke thylakoid lumen me H₂O molecules ko split karti hai (2H₂O → 4H⁺ + 4e⁻ + O₂)."
  },
  {
    id: 2,
    topic: 'Science',
    tier: 'Undergrad',
    question: "Calvin cycle (Light-Independent Reaction) chloroplast ke kis hisse mein hoti hai?",
    options: [
      { text: "Thylakoid Membrane", correct: false },
      { text: "Stroma Fluid Matrix", correct: true },
      { text: "Outer Membrane", correct: false },
      { text: "Granum", correct: false }
    ],
    explanation: "Dark reaction / Calvin Cycle stroma ke liquid matrix me hoti hai jahan CO₂ fixation enzymes jaise RuBisCO present hote hain."
  },
  {
    id: 3,
    topic: 'Science',
    tier: 'Undergrad',
    question: "Non-cyclic photophosphorylation process me main energy products kya bante hain?",
    options: [
      { text: "ATP and NADPH", correct: true },
      { text: "Only Lactic Acid", correct: false },
      { text: "Pyruvate & NADH", correct: false },
      { text: "Ethanol & FADH₂", correct: false }
    ],
    explanation: "Light reactions me electron transport chain ADP ko ATP aur NADP⁺ ko NADPH me convert karti hai, jo Calvin cycle me carbon reduce karte hain."
  },
  {
    id: 4,
    topic: 'Science',
    tier: 'High School',
    question: "According to Newton's Second Law of Motion, what is Force equal to?",
    options: [
      { text: "Mass × Velocity (m · v)", correct: false },
      { text: "Mass × Acceleration (m · a)", correct: true },
      { text: "Work / Time (W / t)", correct: false },
      { text: "Mass × Gravity × Height (m · g · h)", correct: false }
    ],
    explanation: "F = dp/dt = m(dv/dt) = m · a. Force is directly proportional to the rate of change of linear momentum."
  },
  {
    id: 5,
    topic: 'Science',
    tier: 'Competitive',
    question: "In thermodynamics, what condition defines an Adiabatic process?",
    options: [
      { text: "Constant temperature (ΔT = 0)", correct: false },
      { text: "No heat exchange with surroundings (Q = 0)", correct: true },
      { text: "Constant pressure (ΔP = 0)", correct: false },
      { text: "No work performed (W = 0)", correct: false }
    ],
    explanation: "An adiabatic process occurs with zero heat transfer into or out of the system (Q = 0), so ΔU = -W."
  },

  // --- MATHEMATICS QUIZZES ---
  {
    id: 6,
    topic: 'Mathematics',
    tier: 'Undergrad',
    question: "Euler's Identity e^(iπ) + 1 = 0 connects which of the following constants?",
    options: [
      { text: "e, i, π, 1, 0", correct: true },
      { text: "e, golden ratio (φ), π, 2, 0", correct: false },
      { text: "Only real prime numbers", correct: false },
      { text: "i, c, G, h, 0", correct: false }
    ],
    explanation: "Euler's Identity unifies the 5 most fundamental constants in mathematics in a single elegant equation."
  },
  {
    id: 7,
    topic: 'Mathematics',
    tier: 'High School',
    question: "What is the derivative of f(x) = x³ · sin(x) using the product rule?",
    options: [
      { text: "3x² · cos(x)", correct: false },
      { text: "3x² · sin(x) + x³ · cos(x)", correct: true },
      { text: "3x² · sin(x) - x³ · cos(x)", correct: false },
      { text: "x³ · cos(x)", correct: false }
    ],
    explanation: "Using product rule d/dx[u·v] = u'v + uv': (3x²)(sin x) + (x³)(cos x)."
  },
  {
    id: 8,
    topic: 'Mathematics',
    tier: 'Competitive',
    question: "If determinant of 3×3 matrix A is |A| = 4, what is the determinant of 2A?",
    options: [
      { text: "8", correct: false },
      { text: "16", correct: false },
      { text: "32", correct: true },
      { text: "64", correct: false }
    ],
    explanation: "For an n×n matrix, |k·A| = kⁿ · |A|. Here n=3 and k=2, so |2A| = 2³ · |A| = 8 · 4 = 32."
  },
  {
    id: 9,
    topic: 'Mathematics',
    tier: 'Undergrad',
    question: "What is the value of ∫₀^(π/2) sin²(x) dx?",
    options: [
      { text: "π / 4", correct: true },
      { text: "π / 2", correct: false },
      { text: "1", correct: false },
      { text: "0", correct: false }
    ],
    explanation: "Using Wallis formula or symmetry: ∫₀^(π/2) sin²(x) dx = (1/2) · (π/2) = π/4."
  },

  // --- COMPUTER SCIENCE QUIZZES ---
  {
    id: 10,
    topic: 'CS',
    tier: 'Undergrad',
    question: "What is the worst-case time complexity of standard QuickSort?",
    options: [
      { text: "O(n log n)", correct: false },
      { text: "O(n²)", correct: true },
      { text: "O(n)", correct: false },
      { text: "O(2ⁿ)", correct: false }
    ],
    explanation: "When pivot selection is unbalanced (e.g. sorted array with first element as pivot), QuickSort degrades to O(n²)."
  },
  {
    id: 11,
    topic: 'CS',
    tier: 'Undergrad',
    question: "In a Binary Search Tree (BST), what traversal yields elements in strictly sorted order?",
    options: [
      { text: "Pre-order traversal (Root-Left-Right)", correct: false },
      { text: "In-order traversal (Left-Root-Right)", correct: true },
      { text: "Post-order traversal (Left-Right-Root)", correct: false },
      { text: "Level-order BFS traversal", correct: false }
    ],
    explanation: "In-order traversal visits left subtree (smaller), root, then right subtree (larger), yielding monotonic sorted keys."
  },
  {
    id: 12,
    topic: 'CS',
    tier: 'Competitive',
    question: "According to the CAP theorem, which property MUST be sacrificed in an asynchronous network partition?",
    options: [
      { text: "Either Consistency (C) or Availability (A)", correct: true },
      { text: "Partition Tolerance (P) only", correct: false },
      { text: "Both Storage and Encryption", correct: false },
      { text: "Scalability and Latency", correct: false }
    ],
    explanation: "Network partitions (P) are unavoidable in distributed systems. Thus, designers must choose between Consistency (CP) or Availability (AP)."
  },
  {
    id: 13,
    topic: 'CS',
    tier: 'High School',
    question: "Which data structure operates on a Last-In, First-Out (LIFO) principle?",
    options: [
      { text: "Queue", correct: false },
      { text: "Stack", correct: true },
      { text: "Array", correct: false },
      { text: "Linked List", correct: false }
    ],
    explanation: "A Stack pushes and pops from the top, adhering to the LIFO discipline (e.g. function call stack, undo operations)."
  },

  // --- ENGLISH QUIZZES ---
  {
    id: 14,
    topic: 'English',
    tier: 'Competitive',
    question: "Convert to Active Voice: 'The manuscript was meticulously reviewed by Professor Sharma.'",
    options: [
      { text: "Professor Sharma was reviewing the manuscript meticulously.", correct: false },
      { text: "Professor Sharma meticulously reviewed the manuscript.", correct: true },
      { text: "The manuscript had been reviewed by Professor Sharma.", correct: false },
      { text: "Reviewing the manuscript was done by Professor Sharma.", correct: false }
    ],
    explanation: "Active voice makes the actor (Professor Sharma) the grammatical subject directly performing the action."
  },
  {
    id: 15,
    topic: 'English',
    tier: 'Undergrad',
    question: "Which literary device involves attributing human traits to non-human objects?",
    options: [
      { text: "Hyperbole", correct: false },
      { text: "Personification", correct: true },
      { text: "Irony", correct: false },
      { text: "Alliteration", correct: false }
    ],
    explanation: "Personification endows inanimate entities or animals with human qualities (e.g. 'The wind whispered through the trees')."
  },
  {
    id: 16,
    topic: 'English',
    tier: 'High School',
    question: "Choose the correct sentence following Subject-Verb agreement rules:",
    options: [
      { text: "Each of the students have completed their assignment.", correct: false },
      { text: "Each of the students has completed their assignment.", correct: true },
      { text: "Each of the students were completing their assignment.", correct: false },
      { text: "Each of the students are completing their assignment.", correct: false }
    ],
    explanation: "'Each' is an indefinite singular pronoun requiring the singular verb 'has'."
  },

  // --- GENERAL KNOWLEDGE QUIZZES ---
  {
    id: 17,
    topic: 'GK',
    tier: 'Competitive',
    question: "Who was appointed Chairman of the Drafting Committee of the Indian Constitution in 1947?",
    options: [
      { text: "Jawaharlal Nehru", correct: false },
      { text: "Dr. B. R. Ambedkar", correct: true },
      { text: "Sardar Vallabhbhai Patel", correct: false },
      { text: "Dr. Rajendra Prasad", correct: false }
    ],
    explanation: "Dr. B.R. Ambedkar was the Chairman of the Drafting Committee. Dr. Rajendra Prasad was the President of the Constituent Assembly."
  },
  {
    id: 18,
    topic: 'GK',
    tier: 'Undergrad',
    question: "Which international agreement signed in 1971 focuses on the conservation of wetlands?",
    options: [
      { text: "Kyoto Protocol", correct: false },
      { text: "Ramsar Convention", correct: true },
      { text: "Paris Accord", correct: false },
      { text: "Geneva Convention", correct: false }
    ],
    explanation: "The Ramsar Convention on Wetlands was signed in Ramsar, Iran in 1971 to protect globally significant wetland ecosystems."
  },
  {
    id: 19,
    topic: 'GK',
    tier: 'High School',
    question: "Which layer of the atmosphere contains the protective Ozone layer?",
    options: [
      { text: "Troposphere", correct: false },
      { text: "Stratosphere", correct: true },
      { text: "Mesosphere", correct: false },
      { text: "Thermosphere", correct: false }
    ],
    explanation: "The ozone layer (O₃) resides primarily in the Stratosphere (15 to 35 km altitude), absorbing harmful solar ultraviolet UV radiation."
  },
  {
    id: 20,
    topic: 'GK',
    tier: 'Competitive',
    question: "Which infrared space observatory launched in December 2021 succeeded Hubble as the premier deep space telescope?",
    options: [
      { text: "Chandra Observatory", correct: false },
      { text: "James Webb Space Telescope (JWST)", correct: true },
      { text: "Spitzer Space Telescope", correct: false },
      { text: "Kepler Space Telescope", correct: false }
    ],
    explanation: "The James Webb Space Telescope (JWST) operates at the Sun-Earth L2 Lagrange point, capturing infrared deep-field views of early cosmic history."
  }
];

// ==========================================
// 4. TOAST NOTIFICATION SYSTEM
// ==========================================
function showToast(message, type = 'info', icon = 'check_circle') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `flex items-center gap-2 px-4 py-2.5 rounded-xl glass-modal text-on-surface shadow-[0_8px_24px_rgba(0,0,0,0.6)] border border-primary/20 text-body-sm font-body-sm animate-slide-up transition-all duration-300`;
  
  let iconColor = 'text-primary';
  if (type === 'success') iconColor = 'text-secondary';
  if (type === 'warning') iconColor = 'text-tertiary';

  toast.innerHTML = `
    <span class="material-symbols-outlined text-base ${iconColor}">${icon}</span>
    <span class="truncate">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// ==========================================
// 5. WEB AUDIO NEURO-STIMULATION ENGINE
// ==========================================
const MUSIC_SOUNDSCAPES = [
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
    science: '10 Hz Alpha frequencies promote thalamocortical coherence, lowering baseline anxiety during coding and dense study sessions.'
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
    science: 'Studies show 10 Hz binaural auditory stimulation enhances working memory capacity and prevents wandering thoughts.'
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
    science: 'Theta state (4-8 Hz) dominates REM sleep and hypnagogic insight, unlocking non-linear problem solving and conceptual architectural design.'
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
    science: '40 Hz gamma rhythms represent the fastest EEG brainwave band, orchestrating micro-second information binding across the cerebral cortex.'
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
    science: 'Pink noise (equal energy per octave) reduces acoustic startle reflex and blocks conversation intelligibility in busy environments.'
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
    science: 'Brown noise features a steep -6 dB/octave attenuation curve, providing calming sound masking particularly favored by neurodivergent/ADHD learners.'
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
    science: 'Repetitive acoustic motifs in minor/modal scales maintain steady heart rate variability and inhibit cortical distraction spikes.'
  }
];

const BRAINWAVE_BANDS = [
  { band: 'Delta', range: '0.5 – 4 Hz', state: 'Deep Sleep & Restoration', soundscapeId: 'brown-noise' },
  { band: 'Theta', range: '4 – 8 Hz', state: 'Deep Problem Solving & Recall', soundscapeId: 'theta-waves' },
  { band: 'Alpha', range: '8 – 12 Hz', state: 'Relaxed Alertness & Cognitive Flow', soundscapeId: 'alpha-waves' },
  { band: 'Beta', range: '13 – 30 Hz', state: 'Active Analysis & External Work', soundscapeId: 'cosmic-lofi' },
  { band: 'Gamma', range: '30 – 100 Hz', state: 'Peak Performance & Rapid Synthesis', soundscapeId: 'gamma-waves' }
];

class AmbientAudioEngine {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.currentTrack = 'cosmic-lofi';
    this.volume = 0.5;
    this.warmth = 600; // Lowpass filter cutoff in Hz
    this.oscillators = [];
    this.noiseNode = null;
    this.gainNode = null;
    this.filterNode = null;
    this.analyser = null;
    this.arpeggioTimer = null;
    this.visualizerAnimationId = null;
    this.dataArray = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master Gain
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.setValueAtTime(this.volume, this.ctx.currentTime);

      // Master Warmth Lowpass Filter
      this.filterNode = this.ctx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.setValueAtTime(this.warmth, this.ctx.currentTime);

      // Master Analyser Node for live audio visualization
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);

      // Routing: Filter -> Gain -> Analyser -> Destination
      this.filterNode.connect(this.gainNode);
      this.gainNode.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(val) {
    this.volume = parseFloat(val);
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
    const label = document.getElementById('music-volume-display');
    if (label) label.textContent = `${Math.round(this.volume * 100)}%`;
  }

  setWarmth(val) {
    this.warmth = parseFloat(val);
    if (this.filterNode && this.ctx) {
      this.filterNode.frequency.setValueAtTime(this.warmth, this.ctx.currentTime);
    }
    const label = document.getElementById('music-warmth-display');
    if (label) label.textContent = `${Math.round(this.warmth)} Hz`;
  }

  play(trackKey = 'cosmic-lofi') {
    this.init();
    this.stopAudioNodes();
    this.isPlaying = true;
    this.currentTrack = trackKey;

    const t = this.ctx.currentTime;
    const soundscape = MUSIC_SOUNDSCAPES.find(s => s.id === trackKey) || MUSIC_SOUNDSCAPES[0];

    if (trackKey === 'cosmic-lofi') {
      // Warm C3 Rhodes & 10 Hz Binaural Beat
      this.createBinauralPair(130.81, 10, 'sine', 'triangle');
      const osc5th = this.ctx.createOscillator();
      osc5th.type = 'triangle';
      osc5th.frequency.setValueAtTime(196.00, t); // G3
      const g5 = this.ctx.createGain();
      g5.gain.setValueAtTime(0.2, t);
      osc5th.connect(g5).connect(this.filterNode);
      osc5th.start();
      this.oscillators.push(osc5th);

    } else if (trackKey === 'alpha-waves') {
      // Pure 10 Hz Alpha Binaural Beat (200 Hz carrier)
      this.createBinauralPair(200, 10, 'sine', 'sine');

    } else if (trackKey === 'theta-waves') {
      // 6 Hz Theta Meditation (136.1 Hz Earth Om)
      this.createBinauralPair(136.1, 6, 'sine', 'triangle');

    } else if (trackKey === 'gamma-waves') {
      // 40 Hz Gamma Peak Acuity (240 Hz carrier with 40 Hz tremolo AM)
      const carrier = this.ctx.createOscillator();
      carrier.type = 'sine';
      carrier.frequency.setValueAtTime(240, t);

      const amGain = this.ctx.createGain();
      amGain.gain.setValueAtTime(0.5, t);

      const lfo = this.ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(40, t);
      lfo.connect(amGain.gain);

      carrier.connect(amGain).connect(this.filterNode);
      carrier.start();
      lfo.start();
      this.oscillators.push(carrier, lfo);

    } else if (trackKey === 'rain-ambient') {
      // Pink Noise Rainfall Synth
      this.createNoiseBuffer('pink', 650, 0.42);

    } else if (trackKey === 'brown-noise') {
      // Deep Space Brown Noise (1/f² steep low-frequency acoustic mask)
      this.createNoiseBuffer('brown', 320, 0.5);

    } else if (trackKey === 'focus-piano') {
      // Minimalist Pentatonic Piano Arpeggio (A3, C4, E4, G4)
      const notes = [220, 261.63, 329.63, 392.00];
      let noteIdx = 0;

      const playPianoNote = () => {
        if (!this.isPlaying || this.currentTrack !== 'focus-piano') return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const noteGain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(notes[noteIdx % notes.length], now);

        noteGain.gain.setValueAtTime(0, now);
        noteGain.gain.linearRampToValueAtTime(0.35, now + 0.05);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);

        osc.connect(noteGain).connect(this.filterNode);
        osc.start(now);
        osc.stop(now + 2.3);

        noteIdx++;
      };

      playPianoNote();
      this.arpeggioTimer = setInterval(playPianoNote, 1200);
    }

    this.updateStudioUI(soundscape, true);
    this.startCanvasVisualizer();
    showToast(`Playing soundscape: ${soundscape.title}`, 'info', 'headphones');
  }

  createBinauralPair(baseFreq, diff, typeL = 'sine', typeR = 'sine') {
    const t = this.ctx.currentTime;
    const oscL = this.ctx.createOscillator();
    const oscR = this.ctx.createOscillator();
    oscL.type = typeL;
    oscR.type = typeR;
    oscL.frequency.setValueAtTime(baseFreq, t);
    oscR.frequency.setValueAtTime(baseFreq + diff, t);

    const panL = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    const panR = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

    if (panL && panR) {
      panL.pan.setValueAtTime(-1, t);
      panR.pan.setValueAtTime(1, t);
      oscL.connect(panL).connect(this.filterNode);
      oscR.connect(panR).connect(this.filterNode);
    } else {
      oscL.connect(this.filterNode);
      oscR.connect(this.filterNode);
    }

    oscL.start();
    oscR.start();
    this.oscillators.push(oscL, oscR);
  }

  createNoiseBuffer(type, cutoff, gainVal) {
    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    if (type === 'pink') {
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        data[i] = (b0 + b1 + b2) * 0.15;
      }
    } else {
      // Brown noise (integrated random walk)
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = data[i];
        data[i] *= 2.5;
      }
    }

    this.noiseNode = this.ctx.createBufferSource();
    this.noiseNode.buffer = buffer;
    this.noiseNode.loop = true;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(cutoff, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(gainVal, t);

    this.noiseNode.connect(noiseFilter).connect(noiseGain).connect(this.filterNode);
    this.noiseNode.start();
  }

  stopAudioNodes() {
    this.oscillators.forEach(osc => {
      try { osc.stop(); osc.disconnect(); } catch (e) {}
    });
    this.oscillators = [];

    if (this.noiseNode) {
      try { this.noiseNode.stop(); this.noiseNode.disconnect(); } catch (e) {}
      this.noiseNode = null;
    }

    if (this.arpeggioTimer) {
      clearInterval(this.arpeggioTimer);
      this.arpeggioTimer = null;
    }
  }

  stop() {
    this.stopAudioNodes();
    this.isPlaying = false;
    this.updateStudioUI(null, false);
    if (this.visualizerAnimationId) {
      cancelAnimationFrame(this.visualizerAnimationId);
      this.visualizerAnimationId = null;
    }
  }

  toggle() {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.play(this.currentTrack);
    }
  }

  next() {
    const list = MUSIC_SOUNDSCAPES;
    const idx = list.findIndex(s => s.id === this.currentTrack);
    const nextIdx = (idx + 1) % list.length;
    this.play(list[nextIdx].id);
  }

  prev() {
    const list = MUSIC_SOUNDSCAPES;
    const idx = list.findIndex(s => s.id === this.currentTrack);
    const prevIdx = (idx - 1 + list.length) % list.length;
    this.play(list[prevIdx].id);
  }

  startCanvasVisualizer() {
    const canvas = document.getElementById('music-canvas-visualizer');
    if (!canvas || !this.analyser) return;

    const ctx = canvas.getContext('2d');

    const render = () => {
      if (!this.isPlaying) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      this.visualizerAnimationId = requestAnimationFrame(render);
      this.analyser.getByteFrequencyData(this.dataArray);

      if (canvas.offsetWidth > 0 && canvas.width !== canvas.offsetWidth) {
        canvas.width = canvas.offsetWidth;
      }
      if (canvas.offsetHeight > 0 && canvas.height !== canvas.offsetHeight) {
        canvas.height = canvas.offsetHeight;
      }

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      const barCount = 28;
      const barWidth = Math.max(2, (width / barCount) - 2);
      let x = 1;

      for (let i = 0; i < barCount; i++) {
        const val = this.dataArray[i % this.dataArray.length];
        const barHeight = Math.max(3, (val / 255) * (height - 6));
        const y = height - barHeight;

        const grad = ctx.createLinearGradient(0, height, 0, 0);
        grad.addColorStop(0, '#00a6e0');
        grad.addColorStop(1, '#a078ff');

        ctx.fillStyle = grad;
        ctx.fillRect(x, y, barWidth, barHeight);

        x += barWidth + 2;
      }
    };

    render();
  }

  updateStudioUI(soundscape, isPlaying) {
    const playBtn = document.getElementById('music-play-toggle');
    const vinylDisc = document.getElementById('music-vinyl-disc');
    const titleEl = document.getElementById('music-active-title');
    const subEl = document.getElementById('music-active-sub');
    const freqEl = document.getElementById('music-active-freq');
    const brainwaveEl = document.getElementById('music-active-brainwave');
    const visualizer = document.getElementById('music-visualizer-container');

    if (playBtn) {
      playBtn.innerHTML = `
        <span class="material-symbols-outlined text-3xl">${isPlaying ? 'pause' : 'play_arrow'}</span>
      `;
      if (isPlaying) {
        playBtn.classList.add('shadow-[0_0_24px_rgba(0,166,224,0.6)]');
      } else {
        playBtn.classList.remove('shadow-[0_0_24px_rgba(0,166,224,0.6)]');
      }
    }

    if (vinylDisc) {
      if (isPlaying) {
        vinylDisc.classList.add('animate-spin-slow', 'animate-pulse-glow');
      } else {
        vinylDisc.classList.remove('animate-spin-slow', 'animate-pulse-glow');
      }
    }

    if (soundscape) {
      if (titleEl) titleEl.textContent = soundscape.title;
      if (subEl) subEl.textContent = soundscape.subtitle;
      if (freqEl) freqEl.textContent = `${soundscape.frequency} • ${soundscape.carrier} • ${soundscape.bpm} BPM`;
      if (brainwaveEl) brainwaveEl.textContent = `${soundscape.brainwave} State`;
    }

    if (visualizer) {
      if (isPlaying) {
        visualizer.classList.remove('opacity-30');
        visualizer.classList.add('opacity-100');
      } else {
        visualizer.classList.add('opacity-30');
        visualizer.classList.remove('opacity-100');
      }
    }

    // Update active ring on soundscape cards in grid
    document.querySelectorAll('[data-soundscape-card]').forEach(card => {
      const id = card.getAttribute('data-soundscape-card');
      const cardPlayBtn = card.querySelector('.soundscape-card-play-icon');
      if (id === this.currentTrack && isPlaying) {
        card.classList.add('ring-2', 'ring-secondary', 'bg-surface-container-high');
        if (cardPlayBtn) cardPlayBtn.textContent = 'pause';
      } else {
        card.classList.remove('ring-2', 'ring-secondary');
        if (cardPlayBtn) cardPlayBtn.textContent = 'play_arrow';
      }
    });
  }
}

const ambientAudio = new AmbientAudioEngine();

// ==========================================
// 6. WEB SPEECH API (Voice Assistant & Mic)
// ==========================================
let isSpeaking = false;

function speakText(text) {
  if (!('speechSynthesis' in window)) {
    showToast('Speech synthesis not supported in this browser', 'warning', 'info');
    return;
  }

  if (isSpeaking) {
    window.speechSynthesis.cancel();
    isSpeaking = false;
    updateSpeechUI(false);
    return;
  }

  window.speechSynthesis.cancel();

  // Strip HTML tags for clean speech
  const clean = text.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim();
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  utterance.onstart = () => {
    isSpeaking = true;
    updateSpeechUI(true);
    showToast('Playing Audio AI explanation...', 'info', 'volume_up');
  };

  utterance.onend = () => {
    isSpeaking = false;
    updateSpeechUI(false);
  };

  utterance.onerror = () => {
    isSpeaking = false;
    updateSpeechUI(false);
  };

  window.speechSynthesis.speak(utterance);
}

function updateSpeechUI(speaking) {
  const btn = document.getElementById('listen-audio-btn');
  if (!btn) return;
  if (speaking) {
    btn.innerHTML = `
      <span class="flex items-center gap-1 text-secondary">
        <span class="sound-bar h-3"></span>
        <span class="sound-bar h-4"></span>
        <span class="sound-bar h-2"></span>
      </span>
    `;
    btn.setAttribute('title', 'Stop Audio');
  } else {
    btn.innerHTML = `<span class="material-symbols-outlined text-lg">volume_up</span>`;
    btn.setAttribute('title', 'Listen with Audio AI');
  }
}

// Voice Recognition
let recognition = null;
let isListening = false;

function initVoiceRecognition() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRec) {
    recognition = new SpeechRec();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = state.selectedLanguage === 'HI' ? 'hi-IN' : 'en-US';

    recognition.onstart = () => {
      isListening = true;
      const micBtn = document.getElementById('mic-button');
      if (micBtn) {
        micBtn.classList.add('text-secondary', 'animate-pulse');
      }
      showToast('Listening... Speak your study question', 'info', 'mic');
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const input = document.getElementById('study-input');
      if (input) {
        input.value = transcript;
        input.focus();
      }
      showToast(`Captured: "${transcript}"`, 'success', 'mic');
    };

    recognition.onend = () => {
      isListening = false;
      const micBtn = document.getElementById('mic-button');
      if (micBtn) {
        micBtn.classList.remove('text-secondary', 'animate-pulse');
      }
    };

    recognition.onerror = () => {
      isListening = false;
      const micBtn = document.getElementById('mic-button');
      if (micBtn) {
        micBtn.classList.remove('text-secondary', 'animate-pulse');
      }
    };
  }
}

function toggleVoiceRecognition() {
  if (!recognition) {
    initVoiceRecognition();
  }

  if (!recognition) {
    // Graceful simulation fallback
    const input = document.getElementById('study-input');
    showToast('Voice Simulation: Dictating question...', 'info', 'mic');
    setTimeout(() => {
      if (input) {
        input.value = "Explain light reactions and ATP generation in detail.";
        input.focus();
      }
    }, 1000);
    return;
  }

  if (isListening) {
    recognition.stop();
  } else {
    try {
      recognition.start();
    } catch (e) {
      console.warn(e);
    }
  }
}

// ==========================================
// 7. RESPONSIVE AI CONVERSATIONAL GENERATOR
// ==========================================
const KNOWLEDGE_RESPONSES = {
  calvin: {
    title: 'Step 1: Calvin Cycle (Dark Reaction) Mechanics',
    summary: `
      <p class="font-body-md text-body-md text-on-surface-variant leading-relaxed">
        <span class="text-on-surface font-medium">Calvin Cycle</span> chloroplast ke <span class="text-secondary font-semibold">Stroma</span> me hone wali light-independent reaction hai jisme atmospheric <span class="text-primary font-semibold">CO₂</span> ko organic sugars (glucose) me convert kiya jata hai.
      </p>
      <p class="font-body-md text-body-md text-on-surface-variant leading-relaxed">
        Is cycle ke 3 main steps hain: <span class="text-tertiary font-medium">1. Carbon Fixation (via RuBisCO)</span>, <span class="text-secondary font-medium">2. Reduction (ATP & NADPH use)</span>, aur <span class="text-primary font-medium">3. RuBP Regeneration</span>.
      </p>
    `,
    equation: {
      title: 'Net Calvin Cycle Reaction',
      label: 'Sugar Synthesis',
      code: '3 CO₂ + 9 ATP + 6 NADPH → G3P + 9 ADP + 6 NADP⁺ + 8 Pi',
      details: 'Reactants: Carbon Dioxide + Energy • Yield: G3P (Precursor to Glucose)'
    },
    flashcard: {
      title: 'Calvin Cycle Yield',
      sub: 'How many turns to make 1 Glucose molecule?',
      hint: '6 Turns = 1 C₆H₁₂O₆',
      answer: '<span class="font-semibold text-secondary">6 Turns</span> required hain, jisme 18 ATP aur 12 NADPH consume hote hain!'
    }
  },
  quiz: {
    title: 'Step 1: Rapid Knowledge Evaluation',
    summary: `
      <p class="font-body-md text-body-md text-on-surface-variant leading-relaxed">
        Yahan Botany aur Cellular Biology ke high-yield conceptual questions generate kiye gaye hain. Apne recall ko test karein!
      </p>
      <ul class="list-disc pl-5 space-y-1 font-body-sm text-body-sm text-on-surface-variant">
        <li>Photolysis kahan hoti hai? <span class="text-secondary font-semibold">(Lumen of Thylakoid)</span></li>
        <li>Primary electron donor kaunsa molecule hai? <span class="text-primary font-semibold">(H₂O)</span></li>
        <li>Final electron acceptor light reaction mein? <span class="text-tertiary font-semibold">(NADP⁺)</span></li>
      </ul>
    `,
    equation: {
      title: 'Water Splitting Half-Reaction',
      label: 'Photolysis of Water',
      code: '2H₂O + Photons → 4H⁺ + 4e⁻ + O₂ ↑',
      details: 'PS II (P680) reaction center creates Oxygen by-product'
    },
    flashcard: {
      title: 'Z-Scheme of Light Reactions',
      sub: 'What is the electron pathway?',
      hint: 'PS II → Cytochrome b6f → PS I',
      answer: '<span class="text-secondary font-semibold">PS II (P680)</span> absorbs light → e⁻ passes to <span class="text-tertiary font-semibold">Cyt b6f</span> → <span class="text-primary font-semibold">PS I (P700)</span> → Ferredoxin-NADP⁺ reductase!'
    }
  },
  revision: {
    title: 'Step 1: 5-Point High Yield Exam Summary',
    summary: `
      <div class="space-y-2 font-body-md text-body-md text-on-surface-variant">
        <div class="p-2.5 rounded-lg bg-surface-container-high border-l-2 border-primary">
          <strong class="text-on-surface">1. Site:</strong> Light reaction Thylakoid membrane me hoti hai, Calvin cycle Stroma me.
        </div>
        <div class="p-2.5 rounded-lg bg-surface-container-high border-l-2 border-secondary">
          <strong class="text-on-surface">2. Energy Input:</strong> Photons PS-II (680nm) aur PS-I (700nm) ko excite karte hain.
        </div>
        <div class="p-2.5 rounded-lg bg-surface-container-high border-l-2 border-tertiary">
          <strong class="text-on-surface">3. Photolysis:</strong> H₂O split hota hai aur oxygen gas release hoti hai.
        </div>
        <div class="p-2.5 rounded-lg bg-surface-container-high border-l-2 border-primary">
          <strong class="text-on-surface">4. Energy Currency:</strong> ATP Synthase proton gradient (chemiosmosis) se ATP banata hai.
        </div>
        <div class="p-2.5 rounded-lg bg-surface-container-high border-l-2 border-secondary">
          <strong class="text-on-surface">5. Final Product:</strong> CO₂ fix hokar Glucose banata hai via RuBisCO enzyme.
        </div>
      </div>
    `,
    equation: {
      title: 'Chemiosmotic ATP Synthesis',
      label: 'Proton-Motive Force',
      code: 'ADP + Pi + H⁺(lumen → stroma) → ATP',
      details: 'Driven by proton gradient created during non-cyclic photophosphorylation'
    },
    flashcard: {
      title: 'RuBisCO Full Name',
      sub: 'Spell and define the enzyme',
      hint: 'Ribulose-1,5-bisphosphate carboxylase/oxygenase',
      answer: '<span class="text-primary font-semibold">Ribulose-1,5-bisphosphate carboxylase/oxygenase</span>. Fixes CO₂ in C3 cycle.'
    }
  }
};

function generateAIResponse(userQuery) {
  const q = userQuery.toLowerCase();
  let responseData = null;

  if (q.includes('calvin') || q.includes('cycle')) {
    responseData = KNOWLEDGE_RESPONSES.calvin;
  } else if (q.includes('quiz') || q.includes('question') || q.includes('test')) {
    responseData = KNOWLEDGE_RESPONSES.quiz;
  } else if (q.includes('bullet') || q.includes('revision') || q.includes('summary') || q.includes('points')) {
    responseData = KNOWLEDGE_RESPONSES.revision;
  } else {
    // Dynamic synthesis based on topic & language
    const lang = state.selectedLanguage;
    const topic = state.selectedTopic;
    const tier = state.selectedTier;

    responseData = {
      title: `Step 1: ${topic} Concept Synthesis (${tier})`,
      summary: `
        <p class="font-body-md text-body-md text-on-surface-variant leading-relaxed">
          ${lang === 'Hinglish' 
            ? `<span class="text-on-surface font-medium">${userQuery}</span> ke core concepts ko ${tier} standard ke according evaluate kiya gaya hai. Isme theoretical breakdown aur formula derivation dono include hain.` 
            : `<span class="text-on-surface font-medium">Concept breakdown for:</span> ${userQuery}. Structured according to the ${tier} curriculum with fundamental principles and active-recall derivations.`}
        </p>
        <p class="font-body-md text-body-md text-on-surface-variant leading-relaxed">
          <span class="text-primary font-semibold">Key takeaway:</span> Always isolate variables and test boundary conditions before calculating complex derivations.
        </p>
      `,
      equation: {
        title: 'Fundamental Formulation',
        label: `${topic} Analytical Model`,
        code: topic === 'Mathematics' ? '∫ e^(ax) dx = (1/a) e^(ax) + C' : (topic === 'CS' ? 'T(n) = 2T(n/2) + O(n) ⇒ O(n log n)' : 'ΔU = Q - W  (First Law of Thermodynamics)'),
        details: 'Analytical validation verified for all standard constraints'
      },
      flashcard: {
        title: `${topic} Core Formula`,
        sub: `Key relationship in ${userQuery.slice(0, 30)}...`,
        hint: 'High-frequency exam item',
        answer: `<span class="text-secondary font-semibold">Essential Concept:</span> Master this relationship to solve complex problem variants on exam day!`
      }
    };
  }

  return responseData;
}

// Render dynamic AI response card
function appendAIMessage(userText, responseData) {
  const stream = document.getElementById('chat-stream');
  if (!stream) return;

  const cardId = 'ai-card-' + Date.now();
  const cardHtml = `
    <!-- User Prompt Bubble -->
    <div class="flex items-start justify-end gap-space-sm pl-8 animate-fade-in">
      <div class="flex flex-col items-end gap-1">
        <div class="rounded-2xl rounded-tr-xs bg-surface-container-highest px-space-md py-2.5 text-on-surface shadow-md">
          <p class="font-body-md text-body-md leading-relaxed">${escapeHtml(userText)}</p>
        </div>
        <span class="font-label-sm text-label-sm text-outline px-1">Just now • ${state.selectedTopic}</span>
      </div>
      <div class="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-on-surface-variant shrink-0 mt-0.5">
        <span class="material-symbols-outlined text-sm">person</span>
      </div>
    </div>

    <!-- AI Multi-Modal Response Card -->
    <div class="flex items-start gap-space-sm pr-1 animate-fade-in" id="${cardId}">
      <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-primary-container to-secondary flex items-center justify-center text-on-primary-container shrink-0 mt-1 shadow-[0_0_14px_rgba(160,120,255,0.6)]">
        <span class="material-symbols-outlined text-base" style="font-variation-settings: 'FILL' 1;">auto_awesome</span>
      </div>
      <div class="flex-1 rounded-2xl rounded-tl-xs bg-surface-container p-space-md shadow-[0_8px_30px_rgba(0,0,0,0.5)] relative overflow-hidden space-y-space-md">
        <!-- Ambient Violet Glow Rim -->
        <div class="absolute inset-0 pointer-events-none rounded-2xl shadow-[inset_0_0_24px_rgba(208,188,255,0.12)]"></div>
        
        <!-- Header Tagline -->
        <div class="flex items-center justify-between pb-1">
          <div class="flex items-center gap-1.5">
            <span class="px-2 py-0.5 rounded-full bg-surface-container-high text-primary font-label-sm text-label-sm font-semibold">Synthesis v2.4</span>
            <span class="font-label-sm text-label-sm text-outline">• ${state.selectedLanguage} Mode</span>
          </div>
          <button class="w-7 h-7 flex items-center justify-center rounded-full text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors" type="button" onclick="saveToVault('${escapeHtml(userText)}', '${cardId}')">
            <span class="material-symbols-outlined text-sm">bookmark_add</span>
          </button>
        </div>

        <!-- Step 1: Conceptual Explanation -->
        <div class="space-y-1.5">
          <div class="flex items-center gap-1.5 text-secondary">
            <span class="material-symbols-outlined text-base">energy_savings_leaf</span>
            <h2 class="font-headline-sm text-headline-sm text-on-surface font-semibold tracking-tight">${responseData.title}</h2>
          </div>
          <div id="${cardId}-text">${responseData.summary}</div>
        </div>

        <!-- LaTeX / Chemical Equation Highlighted Box -->
        <div class="rounded-xl bg-surface-container-lowest p-space-md shadow-inner relative overflow-hidden">
          <div class="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-xl pointer-events-none"></div>
          <div class="flex items-center justify-between pb-2">
            <span class="font-label-sm text-label-sm text-primary uppercase tracking-widest font-bold flex items-center gap-1">
              <span class="material-symbols-outlined text-sm">functions</span>
              ${responseData.equation.title}
            </span>
            <span class="font-label-sm text-label-sm text-outline font-code-snippet">${responseData.equation.label}</span>
          </div>
          <div class="py-2 px-1 text-center font-headline-sm text-headline-sm font-semibold tracking-wide text-primary-fixed-dim select-all">
            ${responseData.equation.code}
          </div>
          <div class="flex items-center justify-center gap-4 pt-1 font-label-sm text-label-sm text-outline">
            <span>${responseData.equation.details}</span>
          </div>
        </div>

        <!-- Interactive Flashcard Widget -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="font-label-sm text-label-sm text-tertiary uppercase tracking-wider font-semibold">Active Recall Component</span>
            <span class="font-label-sm text-label-sm text-outline">Interactive Tap</span>
          </div>
          <div class="group cursor-pointer rounded-xl bg-surface-container-high hover:bg-surface-bright transition-all duration-300 p-space-md shadow-lg relative min-h-28 flex flex-col justify-between" onclick="toggleLocalCard(this, '${escapeHtml(responseData.flashcard.title)}', '${escapeHtml(responseData.flashcard.sub)}', '${encodeURIComponent(responseData.flashcard.answer)}')">
            <div class="flex items-center justify-between w-full">
              <div class="flex items-center gap-1.5 text-secondary">
                <span class="material-symbols-outlined text-sm">flip</span>
                <span class="font-label-sm text-label-sm font-semibold uppercase">${responseData.flashcard.title}</span>
              </div>
              <span class="text-xs text-outline group-hover:text-primary transition-colors flex items-center gap-0.5">
                <span>Tap to flip</span>
                <span class="material-symbols-outlined text-xs">touch_app</span>
              </span>
            </div>
            <div class="my-auto py-1.5 text-left local-card-body">
              <p class="font-headline-sm text-headline-sm text-on-surface font-semibold">${responseData.flashcard.title}</p>
              <p class="font-body-sm text-body-sm text-on-surface-variant">${responseData.flashcard.sub}</p>
            </div>
            <div class="flex items-center justify-between pt-1">
              <span class="px-2 py-0.5 rounded-md bg-surface-container text-outline font-label-sm text-label-sm">${responseData.flashcard.hint}</span>
              <span class="text-primary font-label-sm text-label-sm font-medium">Difficulty: Smart Recall</span>
            </div>
          </div>
        </div>

        <!-- Tool / Utility Action Strip -->
        <div class="flex items-center justify-between pt-1 border-t-0 bg-surface-container-low/60 -mx-space-md -mb-space-md px-space-md py-2.5 rounded-b-2xl">
          <div class="flex items-center gap-1">
            <button aria-label="Copy Notes" class="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors active:scale-90" type="button" onclick="copyCardContent('${cardId}')" title="Copy to Clipboard">
              <span class="material-symbols-outlined text-lg">content_copy</span>
            </button>
            <button aria-label="Save to Notes" class="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors active:scale-90" type="button" onclick="saveToVault('${escapeHtml(userText)}', '${cardId}')" title="Save to Vault">
              <span class="material-symbols-outlined text-lg">bookmark</span>
            </button>
            <button aria-label="Listen with Audio AI" class="w-8 h-8 flex items-center justify-center rounded-lg text-secondary hover:bg-surface-container transition-colors active:scale-90" type="button" onclick="speakCardContent('${cardId}-text')" title="Listen Aloud">
              <span class="material-symbols-outlined text-lg">volume_up</span>
            </button>
            <button class="flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-tertiary hover:text-on-surface active:scale-95 transition-all text-xs font-label-sm" type="button" onclick="openTopicQuiz('${state.selectedTopic}')" title="Test knowledge on ${state.selectedTopic}">
              <span class="material-symbols-outlined text-sm">quiz</span>
              <span>Quiz</span>
            </button>
            <button class="flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-secondary hover:text-on-surface active:scale-95 transition-all text-xs font-label-sm" type="button" onclick="openTopicFlashcards('${state.selectedTopic}')" title="Review ${state.selectedTopic} Flashcards">
              <span class="material-symbols-outlined text-sm">style</span>
              <span>Cards</span>
            </button>
          </div>
          <button class="flex items-center gap-1 px-3 py-1 rounded-lg bg-surface-container text-on-surface-variant hover:text-on-surface active:scale-95 transition-all text-xs font-label-sm text-label-sm" type="button" onclick="handleSend('${escapeHtml(userText)}')">
            <span class="material-symbols-outlined text-sm">cached</span>
            <span>Regenerate</span>
          </button>
        </div>
      </div>
    </div>
  `;

  stream.insertAdjacentHTML('beforeend', cardHtml);
  
  // Smooth scroll to latest card
  const newCard = document.getElementById(cardId);
  if (newCard) {
    newCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function toggleLocalCard(el, title, sub, encodedAnswer) {
  const body = el.querySelector('.local-card-body');
  if (!body) return;

  const isFlipped = el.getAttribute('data-flipped') === 'true';
  if (!isFlipped) {
    el.setAttribute('data-flipped', 'true');
    el.classList.add('bg-surface-bright');
    body.innerHTML = `
      <p class="font-headline-sm text-headline-sm text-primary font-semibold">Answer:</p>
      <div class="font-body-md text-body-md text-on-surface leading-relaxed pt-1">
        ${decodeURIComponent(encodedAnswer)}
      </div>
    `;
  } else {
    el.setAttribute('data-flipped', 'false');
    el.classList.remove('bg-surface-bright');
    body.innerHTML = `
      <p class="font-headline-sm text-headline-sm text-on-surface font-semibold">${title}</p>
      <p class="font-body-sm text-body-sm text-on-surface-variant">${sub}</p>
    `;
  }
}

function copyCardContent(cardId) {
  const card = document.getElementById(cardId);
  if (!card) return;
  const text = card.innerText;
  navigator.clipboard.writeText(text).then(() => {
    showToast('Explanation & formula copied to clipboard!', 'success', 'content_copy');
  }).catch(() => {
    showToast('Copied to clipboard', 'success');
  });
}

function speakCardContent(textContainerId) {
  const container = document.getElementById(textContainerId);
  if (!container) return;
  speakText(container.innerText);
}

function saveToVault(title, cardId) {
  const card = document.getElementById(cardId);
  const snippet = card ? card.querySelector('p')?.innerText || title : title;
  
  const note = {
    id: 'note-' + Date.now(),
    title: title.length > 40 ? title.slice(0, 37) + '...' : title,
    topic: state.selectedTopic || 'Science',
    tier: state.selectedTier || 'Undergrad',
    date: new Date().toLocaleDateString(),
    summary: snippet
  };

  if (!Array.isArray(state.savedNotes)) state.savedNotes = [];
  state.savedNotes.unshift(note);
  saveState();
  renderLibraryVault();
  showToast('Saved note to Library Vault!', 'success', 'bookmark');

  // Supabase RLS Cloud Sync: Upsert Note
  if (window.supabaseClient && state.user?.isAuthenticated && state.user?.id) {
    window.supabaseClient
      .from('study_notes')
      .upsert({
        user_id: state.user.id,
        note_client_id: note.id,
        title: note.title,
        topic: note.topic,
        tier: note.tier,
        summary: note.summary
      }, { onConflict: 'user_id,note_client_id' })
      .then(({ error }) => {
        if (error) console.warn('[SupabaseNotes] Sync error:', error);
      });
  }
}

function deleteNote(noteId) {
  if (!state.savedNotes) return;
  const idx = state.savedNotes.findIndex(n => n.id === noteId);
  if (idx !== -1) {
    const title = state.savedNotes[idx].title;
    state.savedNotes.splice(idx, 1);
    saveState();
    renderLibraryVault();
    showToast(`Deleted note: "${title}"`, 'info', 'delete');

    // Supabase RLS Cloud Sync: Delete Note
    if (window.supabaseClient && state.user?.isAuthenticated && state.user?.id) {
      window.supabaseClient
        .from('study_notes')
        .delete()
        .eq('user_id', state.user.id)
        .eq('note_client_id', noteId)
        .then(({ error }) => {
          if (error) console.warn('[SupabaseNotes] Delete error:', error);
        });
    }
  }
}

// ==========================================
// AI PROVIDER ABSTRACTION CONTROLLER
// ==========================================
function getProviderDisplayInfo(providerId) {
  const providersMap = {
    'auto': { name: 'Auto (Best Available)', icon: 'auto_awesome', color: 'text-primary' },
    'gemini': { name: 'Google Gemini', icon: 'neurology', color: 'text-secondary' },
    'openai': { name: 'OpenAI GPT', icon: 'smart_toy', color: 'text-tertiary' },
    'anthropic': { name: 'Anthropic Claude', icon: 'psychology', color: 'text-primary' },
    'groq': { name: 'Groq Cloud LPU', icon: 'bolt', color: 'text-secondary' },
    'ollama': { name: 'Ollama (Local LLM)', icon: 'terminal', color: 'text-on-surface' },
    'simulation': { name: 'Cognitive Simulation', icon: 'offline_bolt', color: 'text-tertiary' }
  };
  return providersMap[providerId] || { name: providerId || 'Auto AI', icon: 'hub', color: 'text-primary' };
}

function updateProviderBadges() {
  const currentProviderId = state.selectedProvider || 'auto';
  const info = getProviderDisplayInfo(currentProviderId);
  const activeServerProvider = window.NEXORA_PROVIDERS?.activeProvider;
  
  const heroBadge = document.getElementById('hero-provider-label');
  if (heroBadge) {
    if (currentProviderId === 'auto' && activeServerProvider) {
      heroBadge.textContent = `Provider: Auto (${activeServerProvider.name})`;
    } else {
      heroBadge.textContent = `Provider: ${info.name}`;
    }
  }

  const headerBadge = document.getElementById('header-provider-label');
  if (headerBadge) {
    if (currentProviderId === 'auto') {
      headerBadge.textContent = activeServerProvider ? activeServerProvider.id.toUpperCase() : 'Auto AI';
    } else {
      headerBadge.textContent = info.name;
    }
  }

  const modalStatus = document.getElementById('provider-modal-status-text');
  if (modalStatus) {
    modalStatus.textContent = `Active Engine: ${currentProviderId === 'auto' ? (activeServerProvider ? `${activeServerProvider.name} (Auto)` : 'Auto Cascade') : info.name}`;
  }
}

function openProviderModal() {
  openModal('provider-modal');
  renderProvidersModal();
}

function renderProvidersModal() {
  const list = document.getElementById('providers-modal-list');
  if (!list) return;

  const currentSelected = state.selectedProvider || 'auto';
  const serverProviders = window.NEXORA_PROVIDERS?.providers || [
    { id: 'simulation', name: 'Cognitive Simulation Engine', isConfigured: true, defaultModel: 'cognitive-sim-v2.4', models: [{ id: 'cognitive-sim-v2.4', name: 'Cognitive Simulation v2.4' }] },
    { id: 'gemini', name: 'Google Gemini', isConfigured: false, defaultModel: 'gemini-1.5-flash', models: [{ id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' }, { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' }, { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' }] },
    { id: 'openai', name: 'OpenAI GPT', isConfigured: false, defaultModel: 'gpt-4o-mini', models: [{ id: 'gpt-4o-mini', name: 'GPT-4o Mini' }, { id: 'gpt-4o', name: 'GPT-4o' }, { id: 'o3-mini', name: 'o3-mini' }] },
    { id: 'anthropic', name: 'Anthropic Claude', isConfigured: false, defaultModel: 'claude-3-5-sonnet-20241022', models: [{ id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' }, { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' }] },
    { id: 'groq', name: 'Groq Cloud LPU', isConfigured: false, defaultModel: 'llama-3.3-70b-versatile', models: [{ id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B' }, { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B' }] },
    { id: 'ollama', name: 'Ollama (Local LLM)', isConfigured: false, defaultModel: 'llama3.2', models: [{ id: 'llama3.2', name: 'Llama 3.2' }, { id: 'deepseek-r1', name: 'DeepSeek-R1' }] }
  ];

  const activeServerProvider = window.NEXORA_PROVIDERS?.activeProvider?.name;

  let html = `
    <!-- Auto Cascade Card -->
    <div onclick="selectProvider('auto')" class="cursor-pointer p-3.5 rounded-2xl border transition-all ${currentSelected === 'auto' ? 'bg-primary/10 border-primary shadow-[0_0_16px_rgba(208,188,255,0.2)]' : 'bg-surface-container hover:bg-surface-container-high border-outline-variant'}">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-bold">
            <span class="material-symbols-outlined text-lg">auto_awesome</span>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h4 class="font-semibold text-on-surface text-sm">Auto Provider Cascade</h4>
              <span class="px-2 py-0.5 rounded-full bg-surface-container-highest text-secondary text-[10px] font-bold uppercase tracking-wider">Recommended</span>
            </div>
            <p class="text-xs text-outline mt-0.5">Automatically routes to the best configured provider (${activeServerProvider || 'simulation'}) with fallback</p>
          </div>
        </div>
        <div class="w-5 h-5 rounded-full flex items-center justify-center border ${currentSelected === 'auto' ? 'border-primary bg-primary text-background' : 'border-outline'}">
          ${currentSelected === 'auto' ? '<span class="material-symbols-outlined text-xs">check</span>' : ''}
        </div>
      </div>
    </div>
  `;

  serverProviders.forEach(p => {
    const isSelected = currentSelected === p.id;
    const info = getProviderDisplayInfo(p.id);
    const configuredBadge = p.isConfigured
      ? '<span class="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-semibold flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>Ready</span>'
      : '<span class="px-2 py-0.5 rounded-full bg-surface-container-highest text-outline text-[10px] font-medium">Key in .env</span>';

    const selectedModel = (isSelected && state.selectedModel) ? state.selectedModel : p.defaultModel;

    let modelOptionsHtml = '';
    if (p.models && p.models.length > 0) {
      modelOptionsHtml = `
        <div class="mt-2.5 pt-2 border-t border-outline-variant/50 flex items-center justify-between gap-2 text-xs">
          <span class="text-outline text-[11px]">Model:</span>
          <select class="bg-surface-container-lowest text-on-surface border border-outline-variant rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-primary" onclick="event.stopPropagation()" onchange="selectProviderModel('${p.id}', this.value)">
            ${p.models.map(m => `<option value="${m.id}" ${m.id === selectedModel ? 'selected' : ''}>${m.name || m.id}</option>`).join('')}
          </select>
        </div>
      `;
    }

    html += `
      <div onclick="selectProvider('${p.id}')" class="cursor-pointer p-3.5 rounded-2xl border transition-all ${isSelected ? 'bg-primary/10 border-primary shadow-[0_0_16px_rgba(208,188,255,0.2)]' : 'bg-surface-container hover:bg-surface-container-high border-outline-variant'}">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-xl bg-surface-container-highest ${info.color} flex items-center justify-center">
              <span class="material-symbols-outlined text-lg">${info.icon}</span>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h4 class="font-semibold text-on-surface text-sm">${p.name}</h4>
                ${p.id === 'simulation' ? '<span class="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 text-[10px] font-semibold">Offline Ready</span>' : configuredBadge}
              </div>
              <p class="text-xs text-outline mt-0.5">${p.defaultModel}</p>
            </div>
          </div>
          <div class="w-5 h-5 rounded-full flex items-center justify-center border ${isSelected ? 'border-primary bg-primary text-background' : 'border-outline'}">
            ${isSelected ? '<span class="material-symbols-outlined text-xs">check</span>' : ''}
          </div>
        </div>
        ${modelOptionsHtml}
      </div>
    `;
  });

  list.innerHTML = html;
  updateProviderBadges();
}

function selectProvider(providerId) {
  state.selectedProvider = providerId;
  const p = window.NEXORA_PROVIDERS?.providers?.find(item => item.id === providerId);
  if (p) {
    state.selectedModel = p.defaultModel;
  } else {
    state.selectedModel = '';
  }
  saveState();
  renderProvidersModal();
  updateProviderBadges();
  const info = getProviderDisplayInfo(providerId);
  showToast(`Active AI Provider: ${info.name}`, 'success', 'memory');
}

function selectProviderModel(providerId, modelId) {
  state.selectedProvider = providerId;
  state.selectedModel = modelId;
  saveState();
  renderProvidersModal();
  updateProviderBadges();
  showToast(`Model set to: ${modelId}`, 'info');
}

// User Send Action (Input Validation & Real-Time SSE Streaming)
function handleSend(overrideText) {
  const input = document.getElementById('study-input');
  const text = overrideText || (input ? input.value : '');
  const trimmed = (text || '').trim();

  // 1. Client-Side Input Validation
  if (!trimmed) {
    showToast('Please type a study topic or academic question', 'warning', 'edit_note');
    if (input) {
      input.classList.add('ring-2', 'ring-primary', 'transition-all');
      setTimeout(() => input.classList.remove('ring-2', 'ring-primary'), 1200);
      input.focus();
    }
    return;
  }

  if (trimmed.length > 4000) {
    showToast(`Question too long (${trimmed.length} chars). Limit is 4,000 characters.`, 'error', 'warning');
    return;
  }

  if (input && !overrideText) {
    input.value = '';
  }

  // Remove attachment preview if any
  clearAttachment();

  showToast('Nexora AI analyzing query...', 'info', 'neurology');
  streamChatResponse(trimmed);
}

async function streamChatResponse(userText) {
  const stream = document.getElementById('chat-stream');
  if (!stream) return;

  const cardId = 'ai-card-' + Date.now();
  const currentProviderId = state.selectedProvider || 'auto';
  const providerInfo = getProviderDisplayInfo(currentProviderId);

  const userBubbleHtml = `
    <!-- User Prompt Bubble -->
    <div class="flex items-start justify-end gap-space-sm pl-8 animate-fade-in">
      <div class="flex flex-col items-end gap-1">
        <div class="rounded-2xl rounded-tr-xs bg-surface-container-highest px-space-md py-2.5 text-on-surface shadow-md">
          <p class="font-body-md text-body-md leading-relaxed">${escapeHtml(userText)}</p>
        </div>
        <span class="font-label-sm text-label-sm text-outline px-1">Just now • ${state.selectedTopic}</span>
      </div>
      <div class="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant shrink-0 mt-0.5">
        <span class="material-symbols-outlined text-sm">person</span>
      </div>
    </div>
  `;
  stream.insertAdjacentHTML('beforeend', userBubbleHtml);

  // Persist user prompt to state.messages and sync with Supabase
  const userMsg = {
    id: 'msg-u-' + Date.now(),
    role: 'user',
    content: userText,
    domain: state.activeTab === 'music-flow' ? 'music' : (state.activeTab === 'cinema-pulse' ? 'movies' : 'study'),
    topic: state.selectedTopic || 'Science',
    tier: state.selectedTier || 'Undergrad',
    timestamp: Date.now()
  };
  if (!Array.isArray(state.messages)) state.messages = [];
  state.messages.push(userMsg);
  saveState();
  if (typeof pushChatMessageToSupabase === 'function') {
    pushChatMessageToSupabase(userMsg);
  }

  const initialCardHtml = `
    <div class="flex items-start gap-space-sm pr-1 animate-fade-in" id="${cardId}">
      <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white shrink-0 mt-1 shadow-md">
        <span class="material-symbols-outlined text-base animate-pulse" style="font-variation-settings: 'FILL' 1;">auto_awesome</span>
      </div>
      <div class="flex-1 rounded-2xl rounded-tl-xs bg-surface-container p-space-md shadow-lg relative overflow-hidden space-y-space-md border border-outline-variant">
        <div class="flex items-center justify-between pb-1">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span id="${cardId}-provider-badge" class="px-2 py-0.5 rounded-full bg-surface-container-high text-primary font-label-sm text-label-sm font-semibold flex items-center gap-1">
              <span class="material-symbols-outlined text-xs">hub</span>
              ${providerInfo.name}
            </span>
            <span class="font-label-sm text-label-sm text-outline">• ${state.selectedLanguage} Stream</span>
          </div>
          <span class="text-xs text-secondary flex items-center gap-1 animate-pulse" id="${cardId}-streaming-badge">
            <span class="w-1.5 h-1.5 rounded-full bg-secondary"></span>
            Streaming...
          </span>
        </div>

        <div class="space-y-1.5">
          <div class="flex items-center gap-1.5 text-secondary">
            <span class="material-symbols-outlined text-base">energy_savings_leaf</span>
            <h2 class="font-headline-sm text-headline-sm text-on-surface font-semibold tracking-tight" id="${cardId}-title">Synthesizing ${state.selectedTopic}...</h2>
          </div>
          <div id="${cardId}-text" class="font-body-md text-body-md text-on-surface-variant leading-relaxed min-h-12 typing-cursor">
            <div id="${cardId}-skeleton" class="space-y-2 py-1.5 animate-fade-in">
              <div class="flex items-center gap-2 text-xs text-secondary animate-pulse pb-1">
                <span class="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                <span>Synthesizing conceptual breakdown...</span>
              </div>
              <div class="h-3.5 skeleton w-11/12"></div>
              <div class="h-3.5 skeleton w-full"></div>
              <div class="h-3.5 skeleton w-4/5"></div>
            </div>
          </div>
        </div>

        <!-- Dynamic Components Section (Hydrated upon stream completion) -->
        <div id="${cardId}-components" class="space-y-space-md"></div>
      </div>
    </div>
  `;
  stream.insertAdjacentHTML('beforeend', initialCardHtml);

  const newCard = document.getElementById(cardId);
  if (newCard) newCard.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const textContainer = document.getElementById(`${cardId}-text`);
  const titleContainer = document.getElementById(`${cardId}-title`);
  const componentsContainer = document.getElementById(`${cardId}-components`);
  const streamingBadge = document.getElementById(`${cardId}-streaming-badge`);
  const submitBtn = document.getElementById('study-submit-btn');
  const studyInput = document.getElementById('study-input');

  const resetSubmitBtn = () => {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove('opacity-60', 'cursor-not-allowed', 'pointer-events-none');
      submitBtn.innerHTML = '<span class="material-symbols-outlined text-xl">arrow_upward</span>';
    }
    if (studyInput) {
      studyInput.disabled = false;
    }
  };

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-60', 'cursor-not-allowed', 'pointer-events-none');
    submitBtn.innerHTML = '<span class="material-symbols-outlined text-xl animate-spin">progress_activity</span>';
  }
  if (studyInput) {
    studyInput.disabled = true;
  }

  // Client Timeout Controller (30s)
  const clientAbortController = new AbortController();
  const clientTimeoutTimer = setTimeout(() => {
    clientAbortController.abort(new Error('Request timed out: Server did not respond within 30 seconds'));
  }, 30000);

  let accumulated = '';

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: clientAbortController.signal,
      body: JSON.stringify({
        message: userText,
        topic: state.selectedTopic,
        tier: state.selectedTier,
        language: state.selectedLanguage,
        provider: state.selectedProvider !== 'auto' ? state.selectedProvider : undefined,
        model: state.selectedModel || undefined,
        domain: state.activeTab === 'music-flow' ? 'music' : (state.activeTab === 'cinema-pulse' ? 'movies' : (state.selectedDomain || undefined))
      })
    });

    clearTimeout(clientTimeoutTimer);

    // 2. HTTP Error Handling (Rate Limit, Validation, Server Errors)
    if (!res.ok) {
      let errorData = {};
      try {
        errorData = await res.json();
      } catch (e) {}

      const statusCode = res.status;

      if (statusCode === 429) {
        // Rate Limit Exceeded
        const retryAfter = errorData.details?.retryAfterSeconds || res.headers.get('Retry-After') || 15;
        showToast(`Rate limit reached. Please wait ${retryAfter}s.`, 'warning', 'hourglass_empty');

        if (textContainer) {
          textContainer.classList.remove('typing-cursor');
          textContainer.innerHTML = `
            <div class="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-2">
              <div class="flex items-center gap-2 font-semibold text-sm">
                <span class="material-symbols-outlined text-base">hourglass_empty</span>
                <span>Rate Limit Cooldown Active</span>
              </div>
              <p class="text-xs text-on-surface-variant leading-relaxed">
                ${escapeHtml(errorData.message || 'You have sent multiple queries in a short window. Please wait a few moments before submitting again.')}
              </p>
              <div class="flex items-center gap-2 pt-1">
                <button class="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-semibold active:scale-95 transition-all flex items-center gap-1.5" onclick="handleSend('${escapeHtml(userText)}')">
                  <span class="material-symbols-outlined text-xs">refresh</span>
                  <span>Try Again</span>
                </button>
              </div>
            </div>
          `;
        }
        if (streamingBadge) {
          streamingBadge.classList.remove('animate-pulse');
          streamingBadge.innerHTML = `<span class="text-xs text-amber-400 flex items-center gap-1"><span class="material-symbols-outlined text-xs">speed</span> Throttled</span>`;
        }
        return;
      }

      if (statusCode === 400 || statusCode === 413) {
        // Input Validation Error
        const validationMsg = errorData.message || (statusCode === 413 ? 'Payload too large' : 'Validation error');
        showToast(validationMsg, 'error', 'error');

        if (textContainer) {
          textContainer.classList.remove('typing-cursor');
          textContainer.innerHTML = `
            <div class="p-3.5 rounded-xl bg-error/10 border border-error/30 text-error space-y-2">
              <div class="flex items-center gap-2 font-semibold text-sm">
                <span class="material-symbols-outlined text-base">error_outline</span>
                <span>Invalid Request</span>
              </div>
              <p class="text-xs text-on-surface-variant leading-relaxed">${escapeHtml(validationMsg)}</p>
            </div>
          `;
        }
        if (streamingBadge) {
          streamingBadge.classList.remove('animate-pulse');
          streamingBadge.innerHTML = `<span class="text-xs text-error flex items-center gap-1">Failed</span>`;
        }
        return;
      }

      throw new Error(errorData.message || `Server error (${statusCode})`);
    }

    if (!res.body) {
      throw new Error('Streaming endpoint not readable');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const jsonStr = trimmed.slice(5).trim();
        try {
          const data = JSON.parse(jsonStr);

          if (data.error) {
            showToast(data.error, 'warning', 'warning');
          }

          if (data.chunk) {
            const skel = document.getElementById(`${cardId}-skeleton`);
            if (skel) skel.remove();
            accumulated += data.chunk;
            if (textContainer) {
              textContainer.innerText = accumulated;
            }
          }
          if (data.done) {
            const skel = document.getElementById(`${cardId}-skeleton`);
            if (skel) skel.remove();
            if (streamingBadge) {
              streamingBadge.classList.remove('animate-pulse');
              streamingBadge.innerHTML = `<span class="text-xs text-emerald-400 flex items-center gap-1"><span class="material-symbols-outlined text-xs">check_circle</span> Complete</span>`;
            }
            const providerBadge = document.getElementById(`${cardId}-provider-badge`);
            if (providerBadge && (data.provider || data.source)) {
              const pInfo = getProviderDisplayInfo(data.provider || 'simulation');
              providerBadge.innerHTML = `
                <span class="material-symbols-outlined text-xs text-secondary">${pInfo.icon}</span>
                <span>${data.model ? `${pInfo.name} (${data.model})` : pInfo.name}</span>
              `;
            }
            if (textContainer) {
              textContainer.classList.remove('typing-cursor');
              textContainer.innerHTML = `<p class="leading-relaxed">${escapeHtml(data.fullText || accumulated)}</p>`;
            }

            // Persist assistant response to state.messages and sync with Supabase
            const asstContent = data.fullText || accumulated;
            const asstMsg = {
              id: 'msg-a-' + Date.now(),
              role: 'assistant',
              content: asstContent,
              domain: data.domain || (state.activeTab === 'music-flow' ? 'music' : (state.activeTab === 'cinema-pulse' ? 'movies' : 'study')),
              topic: state.selectedTopic || 'Science',
              tier: state.selectedTier || 'Undergrad',
              timestamp: Date.now()
            };
            if (!Array.isArray(state.messages)) state.messages = [];
            state.messages.push(asstMsg);
            saveState();
            if (typeof pushChatMessageToSupabase === 'function') {
              pushChatMessageToSupabase(asstMsg);
            }

            if (titleContainer && data.title) {
              titleContainer.innerText = data.title;
            }
            if (data.domain) {
              const domainInfo = {
                study: { name: 'Study Hub', icon: 'school', color: 'text-primary' },
                music: { name: 'Music Flow', icon: 'headphones', color: 'text-secondary' },
                movies: { name: 'Cinema Pulse', icon: 'movie', color: 'text-tertiary' },
                unsupported: { name: 'Boundary Refusal', icon: 'shield', color: 'text-error' }
              }[data.domain] || { name: data.domain, icon: 'tag', color: 'text-primary' };

              const providerBadge = document.getElementById(`${cardId}-provider-badge`);
              let domainBadge = document.getElementById(`${cardId}-domain-badge`);
              if (!domainBadge && providerBadge) {
                providerBadge.insertAdjacentHTML('afterend', `
                  <span id="${cardId}-domain-badge" class="px-2 py-0.5 rounded-full bg-surface-container-high ${domainInfo.color} font-label-sm text-label-sm font-semibold flex items-center gap-1">
                    <span class="material-symbols-outlined text-xs">${domainInfo.icon}</span>
                    <span>${domainInfo.name}</span>
                  </span>
                `);
              }
            }

            if (componentsContainer && data.equation && data.flashcard) {
              const suggestionsHtml = (data.suggestions && data.suggestions.length > 0) ? `
                <!-- Domain Guidance Suggestions -->
                <div class="space-y-2 pt-1">
                  <div class="flex items-center gap-1.5 text-xs text-outline font-semibold uppercase tracking-wider">
                    <span class="material-symbols-outlined text-sm text-secondary">explore</span>
                    <span>Explore Supported Domains</span>
                  </div>
                  <div class="flex flex-col gap-1.5">
                    ${data.suggestions.map(s => `
                      <button class="w-full text-left p-2.5 rounded-xl bg-surface-container-high hover:bg-surface-bright border border-outline-variant hover:border-secondary/40 text-xs text-on-surface flex items-center justify-between transition-all active:scale-[0.99] group shadow-sm" onclick="handleSend('${escapeHtml(s.prompt)}')">
                        <span class="flex items-center gap-2">
                          <span class="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${s.domain === 'music' ? 'bg-secondary/20 text-secondary' : (s.domain === 'movies' ? 'bg-tertiary/20 text-tertiary' : 'bg-primary/20 text-primary')}">${escapeHtml(s.label || s.domain)}</span>
                          <span class="group-hover:text-primary transition-colors">${escapeHtml(s.prompt)}</span>
                        </span>
                        <span class="material-symbols-outlined text-sm text-outline group-hover:text-primary transition-colors">arrow_forward</span>
                      </button>
                    `).join('')}
                  </div>
                </div>
              ` : '';

              componentsContainer.innerHTML = `
                <!-- Equation Box -->
                <div class="rounded-xl bg-surface-container-lowest p-space-md shadow-inner relative overflow-hidden border border-outline-variant">
                  <div class="flex items-center justify-between pb-2">
                    <span class="font-label-sm text-label-sm text-primary uppercase tracking-widest font-bold flex items-center gap-1">
                      <span class="material-symbols-outlined text-sm">functions</span>
                      ${data.equation.title}
                    </span>
                    <span class="font-label-sm text-label-sm text-outline font-code-snippet">${data.equation.label}</span>
                  </div>
                  <div class="py-2 px-1 text-center font-headline-sm text-headline-sm font-semibold tracking-wide text-primary select-all">
                    ${data.equation.code}
                  </div>
                  <div class="flex items-center justify-center gap-4 pt-1 font-label-sm text-label-sm text-outline">
                    <span>${data.equation.details}</span>
                  </div>
                </div>

                <!-- Flashcard Widget -->
                <div class="space-y-1.5">
                  <div class="flex items-center justify-between">
                    <span class="font-label-sm text-label-sm text-tertiary uppercase tracking-wider font-semibold">Active Recall Component</span>
                    <span class="font-label-sm text-label-sm text-outline">Interactive Tap</span>
                  </div>
                  <div class="group cursor-pointer rounded-xl bg-surface-container-high hover:bg-surface-bright transition-all duration-300 p-space-md shadow-md relative min-h-28 flex flex-col justify-between border border-outline-variant" onclick="toggleLocalCard(this, '${escapeHtml(data.flashcard.title)}', '${escapeHtml(data.flashcard.sub)}', '${encodeURIComponent(data.flashcard.answer)}')">
                    <div class="flex items-center justify-between w-full">
                      <div class="flex items-center gap-1.5 text-secondary">
                        <span class="material-symbols-outlined text-sm">flip</span>
                        <span class="font-label-sm text-label-sm font-semibold uppercase">${data.flashcard.title}</span>
                      </div>
                      <span class="text-xs text-outline group-hover:text-primary transition-colors flex items-center gap-0.5">
                        <span>Tap to flip</span>
                        <span class="material-symbols-outlined text-xs">touch_app</span>
                      </span>
                    </div>
                    <div class="my-auto py-1.5 text-left local-card-body">
                      <p class="font-headline-sm text-headline-sm text-on-surface font-semibold">${data.flashcard.title}</p>
                      <p class="font-body-sm text-body-sm text-on-surface-variant">${data.flashcard.sub}</p>
                    </div>
                    <div class="flex items-center justify-between pt-1">
                      <span class="px-2 py-0.5 rounded-md bg-surface-container text-outline font-label-sm text-label-sm">${data.flashcard.hint}</span>
                      <span class="text-primary font-label-sm text-label-sm font-medium">Difficulty: Smart Recall</span>
                    </div>
                  </div>
                </div>

                ${suggestionsHtml}

                <!-- Action Strip -->
                <div class="flex items-center justify-between pt-1 bg-surface-container-low/80 -mx-space-md -mb-space-md px-space-md py-2.5 rounded-b-2xl border-t border-outline-variant">
                  <div class="flex items-center gap-1">
                    <button class="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors active:scale-90" onclick="copyCardContent('${cardId}')" title="Copy to Clipboard">
                      <span class="material-symbols-outlined text-lg">content_copy</span>
                    </button>
                    <button class="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors active:scale-90" onclick="saveToVault('${escapeHtml(userText)}', '${cardId}')" title="Save to Vault">
                      <span class="material-symbols-outlined text-lg">bookmark</span>
                    </button>
                    <button class="w-8 h-8 flex items-center justify-center rounded-lg text-secondary hover:bg-surface-container transition-colors active:scale-90" onclick="speakCardContent('${cardId}-text')" title="Listen Aloud">
                      <span class="material-symbols-outlined text-lg">volume_up</span>
                    </button>
                    <button class="flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-tertiary hover:text-on-surface active:scale-95 transition-all text-xs font-label-sm" type="button" onclick="openTopicQuiz('${state.selectedTopic}')" title="Test knowledge on ${state.selectedTopic}">
                      <span class="material-symbols-outlined text-sm">quiz</span>
                      <span>Quiz</span>
                    </button>
                    <button class="flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-secondary hover:text-on-surface active:scale-95 transition-all text-xs font-label-sm" type="button" onclick="openTopicFlashcards('${state.selectedTopic}')" title="Review ${state.selectedTopic} Flashcards">
                      <span class="material-symbols-outlined text-sm">style</span>
                      <span>Cards</span>
                    </button>
                  </div>
                  <button class="flex items-center gap-1 px-3 py-1 rounded-lg bg-surface-container text-on-surface-variant hover:text-on-surface active:scale-95 transition-all text-xs font-label-sm text-label-sm" onclick="handleSend('${escapeHtml(userText)}')">
                    <span class="material-symbols-outlined text-sm">cached</span>
                    <span>Regenerate</span>
                  </button>
                </div>
              `;
            }
          }
        } catch (e) {}
      }
    }

  } catch (err) {
    clearTimeout(clientTimeoutTimer);
    console.warn('[Chat Error]:', err);

    const isTimeout = err.name === 'AbortError' || (err.message && err.message.includes('timed out'));
    const skel = document.getElementById(`${cardId}-skeleton`);
    if (skel) skel.remove();

    if (streamingBadge) {
      streamingBadge.classList.remove('animate-pulse');
      streamingBadge.innerHTML = `<span class="text-xs text-error flex items-center gap-1"><span class="material-symbols-outlined text-xs">error</span> ${isTimeout ? 'Timeout' : 'Interrupted'}</span>`;
    }

    if (textContainer) {
      textContainer.classList.remove('typing-cursor');
      textContainer.innerHTML = `
        <div class="p-3.5 rounded-xl bg-surface-container-high border border-outline-variant space-y-2">
          <div class="flex items-center gap-2 text-on-surface font-semibold text-sm">
            <span class="material-symbols-outlined text-base ${isTimeout ? 'text-amber-400' : 'text-error'}">${isTimeout ? 'schedule' : 'warning'}</span>
            <span>${isTimeout ? 'Connection Timeout' : 'Stream Interrupted'}</span>
          </div>
          <p class="text-xs text-on-surface-variant leading-relaxed">
            ${isTimeout 
              ? 'The response took longer than 30 seconds. You can retry with our zero-latency Cognitive Simulation Engine.' 
              : escapeHtml(err.message || 'An error occurred while streaming response.')}
          </p>
          <div class="flex items-center gap-2 pt-1">
            <button class="px-3 py-1.5 rounded-lg bg-primary-container text-white text-xs font-semibold active:scale-95 transition-all flex items-center gap-1.5 shadow-sm" onclick="selectProvider('simulation'); handleSend('${escapeHtml(userText)}')">
              <span class="material-symbols-outlined text-xs">offline_bolt</span>
              <span>Use Cognitive Simulation</span>
            </button>
            <button class="px-3 py-1.5 rounded-lg bg-surface-container text-on-surface-variant hover:text-on-surface text-xs active:scale-95 transition-all flex items-center gap-1.5" onclick="handleSend('${escapeHtml(userText)}')">
              <span class="material-symbols-outlined text-xs">refresh</span>
              <span>Retry</span>
            </button>
          </div>
        </div>
      `;
    }
  } finally {
    resetSubmitBtn();
  }
}

function insertPrompt(text) {
  const input = document.getElementById('study-input');
  if (input) {
    input.value = text;
    handleSend(text);
  }
}

// ==========================================
// 8. COGNITIVE ACCELERATORS & MODALS
// ==========================================

// Flashcards Deck Filtering & Engine
function getFilteredFlashcards() {
  const filterTopic = state.flashcardTopicFilter || 'All';
  let list = FLASHCARDS;
  if (filterTopic !== 'All') {
    list = list.filter(c => c.topic.toLowerCase() === filterTopic.toLowerCase());
  }
  return list;
}

function setFlashcardTopicFilter(topic) {
  state.flashcardTopicFilter = topic;
  state.activeCardIndex = 0;
  saveState();
  renderFlashcardDeck();
}

function toggleMasterCard(cardId) {
  if (!Array.isArray(state.masteredCards)) state.masteredCards = [];
  const idx = state.masteredCards.indexOf(cardId);
  if (idx > -1) {
    state.masteredCards.splice(idx, 1);
    showToast('Card moved back to Learning deck', 'info', 'school');
  } else {
    state.masteredCards.push(cardId);
    showToast('Card Mastered! +25 XP', 'success', 'verified');
  }
  saveState();
  renderFlashcardDeck();
  renderLibraryVault();
  if (typeof upsertFlashcardToSupabase === 'function') {
    upsertFlashcardToSupabase(cardId);
  }
}

function shuffleFlashcardDeck() {
  const cards = getFilteredFlashcards();
  if (cards.length > 1) {
    let nextIdx = Math.floor(Math.random() * cards.length);
    if (nextIdx === state.activeCardIndex) {
      nextIdx = (nextIdx + 1) % cards.length;
    }
    state.activeCardIndex = nextIdx;
    saveState();
    renderFlashcardDeck();
    showToast('Deck shuffled!', 'info', 'shuffle');
  }
}

function renderFlashcardDeck() {
  const container = document.getElementById('flashcard-deck-container');
  if (!container) return;

  const topics = ['All', 'Science', 'Mathematics', 'CS', 'English', 'GK'];
  const activeTopic = state.flashcardTopicFilter || 'All';
  const filteredCards = getFilteredFlashcards();

  if (filteredCards.length === 0) {
    container.innerHTML = `
      <div class="text-center py-10 space-y-3 p-6 rounded-2xl bg-surface-container border border-outline-variant animate-fade-in">
        <div class="w-14 h-14 rounded-full bg-primary/15 text-primary flex items-center justify-center mx-auto">
          <span class="material-symbols-outlined text-3xl animate-float">style</span>
        </div>
        <h4 class="font-headline-sm text-base font-bold text-on-surface">No Flashcards in ${escapeHtml(activeTopic)}</h4>
        <p class="text-xs text-on-surface-variant max-w-sm mx-auto">No study cards match this domain filter. Explore other subjects or view the complete deck.</p>
        <button class="px-4 py-2 rounded-xl bg-primary text-white font-semibold text-xs shadow-md active:scale-95 transition-all inline-flex items-center gap-1.5" onclick="setFlashcardTopicFilter('All')">
          <span class="material-symbols-outlined text-xs">visibility</span>
          <span>View All 20 Flashcards</span>
        </button>
      </div>
    `;
    return;
  }

  // Ensure index is valid
  if (state.activeCardIndex >= filteredCards.length) {
    state.activeCardIndex = 0;
  }

  const card = filteredCards[state.activeCardIndex];
  const isBookmarked = (state.bookmarkedCards || []).includes(card.id);
  const isMastered = (state.masteredCards || []).includes(card.id);
  const masteredInTopic = filteredCards.filter(c => (state.masteredCards || []).includes(c.id)).length;

  container.innerHTML = `
    <!-- Topic Filter Bar -->
    <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2">
      ${topics.map(t => {
        const count = t === 'All' ? FLASHCARDS.length : FLASHCARDS.filter(c => c.topic === t).length;
        const isActive = activeTopic.toLowerCase() === t.toLowerCase();
        return `
          <button 
            type="button"
            onclick="setFlashcardTopicFilter('${t}')"
            class="px-2.5 py-1 rounded-full text-xs font-label-sm shrink-0 transition-all ${isActive 
              ? 'bg-primary-container text-white font-semibold shadow-sm' 
              : 'bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'}"
          >
            ${t} (${count})
          </button>
        `;
      }).join('')}
    </div>

    <!-- Card Metadata & Action Bar -->
    <div class="flex items-center justify-between pb-2 text-xs">
      <div class="flex items-center gap-2">
        <span class="px-2.5 py-0.5 rounded-full bg-surface-container-high text-primary font-label-sm text-label-sm font-semibold">
          Card ${state.activeCardIndex + 1} of ${filteredCards.length}
        </span>
        <span class="text-outline">${card.topic} • ${card.tier}</span>
      </div>
      <div class="flex items-center gap-1.5">
        <button 
          class="px-2 py-0.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${isMastered ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-surface-container text-on-surface-variant hover:text-on-surface'}" 
          onclick="toggleMasterCard(${card.id})"
          title="${isMastered ? 'Marked as Mastered' : 'Mark as Mastered'}"
        >
          <span class="material-symbols-outlined text-sm">${isMastered ? 'verified' : 'radio_button_unchecked'}</span>
          <span>${isMastered ? 'Mastered' : 'Mark Master'}</span>
        </button>

        <button 
          class="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors" 
          onclick="toggleBookmarkCard(${card.id})" 
          title="Bookmark Card"
        >
          <span class="material-symbols-outlined text-base" style="font-variation-settings: 'FILL' ${isBookmarked ? '1' : '0'};">
            ${isBookmarked ? 'bookmark' : 'bookmark_border'}
          </span>
        </button>
      </div>
    </div>

    <!-- 3D Flip Card Container -->
    <div class="flip-card-perspective min-h-[250px] w-full cursor-pointer select-none" onclick="flipMainDeckCard()">
      <div class="flip-card-inner rounded-2xl h-full w-full shadow-2xl relative" id="main-deck-card-inner">
        <!-- Front -->
        <div class="flip-card-front bg-surface-container-high p-5 flex flex-col justify-between border border-outline/10">
          <div class="flex items-center justify-between text-secondary">
            <span class="font-label-sm text-label-sm uppercase tracking-wider font-semibold flex items-center gap-1">
              <span class="material-symbols-outlined text-base">style</span>
              Flashcard Prompt
            </span>
            <span class="text-xs text-outline flex items-center gap-0.5">
              <span>Tap to reveal</span>
              <span class="material-symbols-outlined text-xs animate-bounce">touch_app</span>
            </span>
          </div>

          <div class="my-auto py-2">
            <h3 class="font-headline-sm text-headline-sm text-on-surface font-semibold leading-snug">${card.frontTitle}</h3>
            <p class="font-body-md text-body-md text-on-surface-variant mt-1">${card.frontSubtitle}</p>
            ${card.equation ? `
              <div class="mt-2.5 p-2 rounded-lg bg-surface-container-lowest/80 border border-primary/20 font-mono text-center text-xs text-primary shadow-inner">
                ${card.equation}
              </div>
            ` : ''}
          </div>

          <div class="flex items-center justify-between text-xs text-outline">
            <span class="px-2 py-0.5 rounded bg-surface-container text-outline">Hint: ${card.hint}</span>
            <span class="text-[11px] text-primary font-medium">Difficulty: ${card.difficulty}</span>
          </div>
        </div>

        <!-- Back -->
        <div class="flip-card-back bg-surface-container-highest p-5 flex flex-col justify-between border border-primary/20 shadow-[0_0_24px_rgba(208,188,255,0.15)]">
          <div class="flex items-center justify-between text-primary">
            <span class="font-label-sm text-label-sm uppercase tracking-wider font-semibold flex items-center gap-1">
              <span class="material-symbols-outlined text-base">verified</span>
              Explanation & Key Concept
            </span>
            <span class="text-xs text-outline flex items-center gap-0.5">
              <span>Tap to flip back</span>
              <span class="material-symbols-outlined text-xs">sync</span>
            </span>
          </div>

          <div class="my-auto py-2 font-body-md text-body-md text-on-surface leading-relaxed text-sm">
            ${card.backAnswer}
            ${card.equation ? `
              <div class="mt-2 p-1.5 rounded bg-surface-container-low font-mono text-[11px] text-primary/80">
                Formula: ${card.equation}
              </div>
            ` : ''}
          </div>

          <div class="flex items-center justify-between text-xs text-outline border-t border-outline-variant pt-2">
            <span class="text-secondary font-medium flex items-center gap-1">
              <span class="material-symbols-outlined text-xs">psychology</span>
              Cognitive Recall Active
            </span>
            <span>Card ${state.activeCardIndex + 1} / ${filteredCards.length}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Deck Controls -->
    <div class="flex items-center justify-between pt-3">
      <button 
        class="px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm text-label-sm flex items-center gap-1 active:scale-95 transition-all" 
        onclick="prevFlashcard()"
        title="Previous Card (or Left Arrow)"
      >
        <span class="material-symbols-outlined text-base">arrow_back</span>
        <span>Prev</span>
      </button>

      <div class="flex items-center gap-2">
        <button 
          class="p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-all active:scale-90"
          onclick="shuffleFlashcardDeck()"
          title="Shuffle Deck"
        >
          <span class="material-symbols-outlined text-base">shuffle</span>
        </button>
        <span class="text-xs text-outline font-label-sm font-medium">
          Mastered: <span class="text-emerald-400 font-semibold">${masteredInTopic}</span>/${filteredCards.length}
        </span>
      </div>

      <button 
        class="px-3.5 py-1.5 rounded-xl bg-primary-container text-on-primary-container font-label-sm text-label-sm font-semibold flex items-center gap-1 active:scale-95 transition-all shadow-[0_0_12px_rgba(160,120,255,0.4)]" 
        onclick="nextFlashcard()"
        title="Next Card (or Right Arrow)"
      >
        <span>Next</span>
        <span class="material-symbols-outlined text-base">arrow_forward</span>
      </button>
    </div>

    <!-- Keyboard Legend -->
    <div class="text-[11px] text-outline text-center pt-2 select-none">
      <span class="opacity-75">Keyboard:</span> 
      <kbd class="px-1 py-0.5 rounded bg-surface-container text-[10px] font-mono">Space</kbd> Flip &bull; 
      <kbd class="px-1 py-0.5 rounded bg-surface-container text-[10px] font-mono">&larr;</kbd> <kbd class="px-1 py-0.5 rounded bg-surface-container text-[10px] font-mono">&rarr;</kbd> Navigate &bull; 
      <kbd class="px-1 py-0.5 rounded bg-surface-container text-[10px] font-mono">M</kbd> Master &bull; 
      <kbd class="px-1 py-0.5 rounded bg-surface-container text-[10px] font-mono">Esc</kbd> Close
    </div>
  `;
}

function flipMainDeckCard() {
  const cardInner = document.getElementById('main-deck-card-inner');
  if (cardInner) {
    cardInner.classList.toggle('is-flipped');
  }
}

function nextFlashcard() {
  const cards = getFilteredFlashcards();
  if (cards.length === 0) return;
  state.activeCardIndex = (state.activeCardIndex + 1) % cards.length;
  saveState();
  renderFlashcardDeck();
}

function prevFlashcard() {
  const cards = getFilteredFlashcards();
  if (cards.length === 0) return;
  state.activeCardIndex = (state.activeCardIndex - 1 + cards.length) % cards.length;
  saveState();
  renderFlashcardDeck();
}

function toggleBookmarkCard(cardId) {
  if (!Array.isArray(state.bookmarkedCards)) state.bookmarkedCards = [];
  const idx = state.bookmarkedCards.indexOf(cardId);
  if (idx > -1) {
    state.bookmarkedCards.splice(idx, 1);
    showToast('Card removed from bookmarks', 'info', 'bookmark_remove');
  } else {
    state.bookmarkedCards.push(cardId);
    showToast('Card bookmarked to Library Vault!', 'success', 'bookmark_added');
  }
  saveState();
  renderFlashcardDeck();
  renderLibraryVault();
  if (typeof upsertFlashcardToSupabase === 'function') {
    upsertFlashcardToSupabase(cardId);
  }
}

// ==========================================
// QUIZ MODAL ENGINE (Dynamic & Curated)
// ==========================================
let currentQuizIndex = 0;
let quizScore = 0;
let quizAnswered = false;
let activeQuizQuestions = [];
let quizAttemptRecorded = false;

function getFilteredQuizQuestions() {
  const filterTopic = state.quizTopicFilter || state.selectedTopic || 'Science';
  let list = QUIZ_QUESTIONS;
  if (filterTopic && filterTopic !== 'All') {
    list = list.filter(q => q.topic.toLowerCase() === filterTopic.toLowerCase());
  }
  return list;
}

function setQuizTopicFilter(topic) {
  state.quizTopicFilter = topic;
  saveState();
  restartQuiz();
}

function renderQuizModal() {
  const container = document.getElementById('quiz-modal-content');
  if (!container) return;

  const topics = ['Science', 'Mathematics', 'CS', 'English', 'GK', 'All'];
  const activeTopic = state.quizTopicFilter || state.selectedTopic || 'Science';

  if (!activeQuizQuestions || activeQuizQuestions.length === 0) {
    activeQuizQuestions = getFilteredQuizQuestions();
  }

  if (!activeQuizQuestions || activeQuizQuestions.length === 0) {
    container.innerHTML = `
      <div class="text-center py-10 space-y-3 p-6 rounded-2xl bg-surface-container border border-outline-variant animate-fade-in">
        <div class="w-14 h-14 rounded-full bg-tertiary/15 text-tertiary flex items-center justify-center mx-auto">
          <span class="material-symbols-outlined text-3xl animate-float">quiz</span>
        </div>
        <h4 class="font-headline-sm text-base font-bold text-on-surface">No Questions Found</h4>
        <p class="text-xs text-on-surface-variant max-w-sm mx-auto">No diagnostic quiz questions found for ${escapeHtml(activeTopic)}. Try switching topics.</p>
        <button class="px-4 py-2 rounded-xl bg-tertiary text-white font-semibold text-xs shadow-md active:scale-95 transition-all inline-flex items-center gap-1.5" onclick="setQuizTopicFilter('Science')">
          <span class="material-symbols-outlined text-xs">refresh</span>
          <span>Switch to Science Quiz</span>
        </button>
      </div>
    `;
    return;
  }

  // Completion / Results Screen
  if (currentQuizIndex >= activeQuizQuestions.length && activeQuizQuestions.length > 0) {
    const totalQ = activeQuizQuestions.length;
    const pct = Math.round((quizScore / totalQ) * 100);
    const xpEarned = quizScore * 50;

    // Persist completed quiz attempt into state.quizHistory and Supabase
    if (!quizAttemptRecorded) {
      quizAttemptRecorded = true;
      const attempt = {
        id: 'quiz-' + Date.now(),
        topic: activeTopic,
        tier: state.selectedTier || 'Undergrad',
        score: quizScore,
        totalQuestions: totalQ,
        percentage: pct,
        xpEarned: xpEarned,
        date: new Date().toISOString()
      };
      if (!Array.isArray(state.quizHistory)) state.quizHistory = [];
      state.quizHistory.unshift(attempt);
      if (state.user) {
        state.user.xp = (state.user.xp || 0) + xpEarned;
        if (typeof updateUserUI === 'function') updateUserUI();
        if (typeof updateProfileModalUI === 'function') updateProfileModalUI();
      }
      saveState();
      renderLibraryVault();
      if (typeof pushQuizAttemptToSupabase === 'function') {
        pushQuizAttemptToSupabase(attempt);
      }
    }

    let rankTitle = 'Scholar Novice 💡';
    let rankColor = 'text-tertiary';
    if (pct === 100) {
      rankTitle = 'Perfect Recall Master 🏆';
      rankColor = 'text-emerald-400';
    } else if (pct >= 80) {
      rankTitle = 'High Distinction Scholar 🌟';
      rankColor = 'text-primary';
    } else if (pct >= 60) {
      rankTitle = 'Proficient Scholar 👍';
      rankColor = 'text-secondary';
    }

    container.innerHTML = `
      <div class="text-center py-5 space-y-4">
        <!-- Trophy Glow Badge -->
        <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-secondary mx-auto flex items-center justify-center text-white shadow-[0_0_28px_rgba(160,120,255,0.6)] animate-pulse">
          <span class="material-symbols-outlined text-3xl">emoji_events</span>
        </div>

        <div>
          <span class="px-3 py-1 rounded-full bg-surface-container-high ${rankColor} font-label-sm text-label-sm font-bold uppercase tracking-wider inline-block mb-1">
            ${rankTitle}
          </span>
          <h3 class="font-headline-lg text-headline-lg font-bold text-on-surface">Quiz Completed!</h3>
          <p class="font-body-md text-body-md text-on-surface-variant mt-1">
            Subject: <span class="text-on-surface font-semibold">${activeTopic}</span>
          </p>
        </div>

        <!-- Score & XP Cards -->
        <div class="grid grid-cols-2 gap-3 max-w-xs mx-auto">
          <div class="p-3.5 rounded-2xl bg-surface-container border border-outline-variant text-center">
            <span class="text-2xl font-black text-secondary">${quizScore} / ${totalQ}</span>
            <p class="text-xs text-outline mt-0.5">Accuracy: ${pct}%</p>
          </div>
          <div class="p-3.5 rounded-2xl bg-surface-container border border-outline-variant text-center">
            <span class="text-2xl font-black text-primary">+${xpEarned}</span>
            <p class="text-xs text-outline mt-0.5">Scholar XP</p>
          </div>
        </div>

        <p class="text-xs text-outline">Performance logged to Scholar Rank and active learning memory.</p>

        <!-- Actions -->
        <div class="flex items-center justify-center gap-2 pt-2 flex-wrap">
          <button class="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm text-label-sm active:scale-95 transition-all" onclick="restartQuiz()">
            Retake Quiz
          </button>
          <button class="px-4 py-2 rounded-xl bg-surface-container-highest text-secondary font-label-sm text-label-sm active:scale-95 transition-all" onclick="openTopicFlashcards('${activeTopic}')">
            Review Flashcards
          </button>
          <button class="px-5 py-2 rounded-xl bg-primary-container text-on-primary-container font-label-sm text-label-sm font-semibold active:scale-95 transition-all shadow-md" onclick="closeModal('quiz-modal')">
            Done
          </button>
        </div>
      </div>
    `;
    return;
  }

  const q = activeQuizQuestions[currentQuizIndex];
  quizAnswered = false;
  const progressPct = Math.round(((currentQuizIndex + 1) / activeQuizQuestions.length) * 100);

  container.innerHTML = `
    <div class="space-y-3.5">
      <!-- Subject Tabs -->
      <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        ${topics.map(t => {
          const isActive = activeTopic.toLowerCase() === t.toLowerCase();
          return `
            <button 
              type="button" 
              onclick="setQuizTopicFilter('${t}')" 
              class="px-2.5 py-1 rounded-full text-xs font-label-sm shrink-0 transition-all ${isActive 
                ? 'bg-tertiary-container text-white font-semibold shadow-sm' 
                : 'bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'}"
            >
              ${t}
            </button>
          `;
        }).join('')}
      </div>

      <!-- Progress Track -->
      <div class="space-y-1.5">
        <div class="flex items-center justify-between text-xs text-outline">
          <span class="font-label-sm text-label-sm text-primary font-semibold">
            Question ${currentQuizIndex + 1} of ${activeQuizQuestions.length}
          </span>
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded bg-surface-container text-xs text-on-surface-variant font-medium">${q.topic} • ${q.tier}</span>
            <span class="text-secondary font-semibold">Score: ${quizScore}</span>
          </div>
        </div>
        <div class="w-full h-1.5 rounded-full bg-surface-container overflow-hidden">
          <div class="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300" style="width: ${progressPct}%"></div>
        </div>
      </div>

      <!-- Question Text -->
      <h3 class="font-headline-sm text-headline-sm text-on-surface font-semibold leading-snug pt-1">
        ${q.question}
      </h3>

      <!-- Options List -->
      <div class="space-y-2 pt-1" id="quiz-options-list">
        ${q.options.map((opt, i) => {
          const letter = String.fromCharCode(65 + i);
          return `
            <button 
              class="w-full text-left p-3 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline/10 hover:border-primary/30 text-on-surface text-body-md transition-all active:scale-[0.99] flex items-center justify-between group" 
              onclick="selectQuizOption(${i})"
            >
              <div class="flex items-center gap-2.5">
                <span class="w-6 h-6 rounded-lg bg-surface-container-high text-xs font-bold flex items-center justify-center text-outline group-hover:text-primary transition-colors">
                  ${letter}
                </span>
                <span class="leading-snug">${opt.text}</span>
              </div>
              <span class="material-symbols-outlined text-lg text-outline group-hover:text-primary">radio_button_unchecked</span>
            </button>
          `;
        }).join('')}
      </div>

      <!-- Explanation Box -->
      <div id="quiz-explanation-box" class="hidden p-3.5 rounded-xl bg-surface-container-highest border border-primary/20 text-body-sm text-on-surface-variant animate-fade-in space-y-1">
      </div>

      <!-- Next Action Row -->
      <div class="flex items-center justify-between pt-1">
        <div class="text-[11px] text-outline">
          Shortcut: <kbd class="px-1 py-0.5 rounded bg-surface-container text-[10px] font-mono">1-4</kbd> Choose &bull; <kbd class="px-1 py-0.5 rounded bg-surface-container text-[10px] font-mono">Enter</kbd> Next
        </div>
        <button id="quiz-next-btn" class="hidden px-4 py-2 rounded-xl bg-primary-container text-on-primary-container font-label-sm text-label-sm font-semibold items-center gap-1 shadow-md active:scale-95 transition-all" onclick="advanceQuiz()">
          <span>${currentQuizIndex === activeQuizQuestions.length - 1 ? 'View Results' : 'Next Question'}</span>
          <span class="material-symbols-outlined text-base">arrow_forward</span>
        </button>
      </div>
    </div>
  `;
}

function selectQuizOption(optionIndex) {
  if (quizAnswered) return;
  quizAnswered = true;

  const q = activeQuizQuestions[currentQuizIndex];
  const isCorrect = q.options[optionIndex].correct;
  if (isCorrect) quizScore++;

  const list = document.getElementById('quiz-options-list');
  if (list) {
    const buttons = list.querySelectorAll('button');
    buttons.forEach((btn, idx) => {
      btn.disabled = true;
      const opt = q.options[idx];
      const letter = String.fromCharCode(65 + idx);

      if (opt.correct) {
        btn.className = "w-full text-left p-3 rounded-xl bg-emerald-500/20 border border-emerald-500 text-emerald-300 font-semibold text-body-md flex items-center justify-between shadow-[0_0_16px_rgba(16,185,129,0.25)]";
        btn.innerHTML = `
          <div class="flex items-center gap-2.5">
            <span class="w-6 h-6 rounded-lg bg-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center justify-center">${letter}</span>
            <span>${opt.text}</span>
          </div>
          <span class="material-symbols-outlined text-emerald-400">check_circle</span>
        `;
      } else if (idx === optionIndex && !isCorrect) {
        btn.className = "w-full text-left p-3 rounded-xl bg-rose-500/20 border border-rose-500 text-rose-300 font-medium text-body-md flex items-center justify-between";
        btn.innerHTML = `
          <div class="flex items-center gap-2.5">
            <span class="w-6 h-6 rounded-lg bg-rose-500/40 text-rose-200 text-xs font-bold flex items-center justify-center">${letter}</span>
            <span>${opt.text}</span>
          </div>
          <span class="material-symbols-outlined text-rose-400">cancel</span>
        `;
      } else {
        btn.className = "w-full text-left p-3 rounded-xl bg-surface-container-low opacity-50 text-outline text-body-md flex items-center justify-between";
      }
    });
  }

  const expBox = document.getElementById('quiz-explanation-box');
  if (expBox) {
    expBox.classList.remove('hidden');
    expBox.innerHTML = `
      <div class="flex items-center gap-1.5 font-semibold ${isCorrect ? 'text-emerald-400' : 'text-primary'} text-xs uppercase tracking-wider mb-1">
        <span class="material-symbols-outlined text-base">${isCorrect ? 'check_circle' : 'lightbulb'}</span>
        <span>${isCorrect ? 'Correct! +50 XP' : 'Explanation & Context:'}</span>
      </div>
      <p class="leading-relaxed text-sm">${q.explanation}</p>
    `;
  }

  const nextBtn = document.getElementById('quiz-next-btn');
  if (nextBtn) {
    nextBtn.classList.remove('hidden');
    nextBtn.classList.add('flex');
  }
}

function advanceQuiz() {
  currentQuizIndex++;
  renderQuizModal();
}

function restartQuiz() {
  activeQuizQuestions = getFilteredQuizQuestions();
  currentQuizIndex = 0;
  quizScore = 0;
  quizAnswered = false;
  quizAttemptRecorded = false;
  renderQuizModal();
}

// Quick Topic Launchers
function openTopicQuiz(topic) {
  if (topic) state.quizTopicFilter = topic;
  quizAttemptRecorded = false;
  saveState();
  openModal('quiz-modal');
}

function openTopicFlashcards(topic) {
  if (topic) state.flashcardTopicFilter = topic;
  state.activeCardIndex = 0;
  saveState();
  openModal('flashcards-modal');
}

// Generic Modal Controls
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove('hidden');
  modal.classList.add('flex');

  if (modalId === 'flashcards-modal') {
    safeRender(renderFlashcardDeck, 'flashcard-deck-container', 'Flashcard Deck');
  } else if (modalId === 'quiz-modal') {
    safeRender(restartQuiz, 'quiz-modal-content', 'Diagnostic Quiz');
  } else if (modalId === 'notes-drawer') {
    safeRender(renderNotesDrawer, 'notes-drawer-list', 'Notes Drawer');
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

// Notes Drawer
function renderNotesDrawer() {
  const list = document.getElementById('notes-drawer-list');
  if (!list) return;

  if (state.savedNotes.length === 0) {
    list.innerHTML = `
      <div class="text-center py-8 text-outline">
        <span class="material-symbols-outlined text-3xl mb-1">drafts</span>
        <p class="text-body-sm">No notes saved yet. Click the bookmark icon on any explanation to store it!</p>
      </div>
    `;
    return;
  }

  list.innerHTML = state.savedNotes.map(n => `
    <div class="p-3.5 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors border border-outline/10 space-y-1.5">
      <div class="flex items-center justify-between">
        <h4 class="font-headline-sm text-headline-sm font-semibold text-on-surface">${escapeHtml(n.title)}</h4>
        <span class="text-xs text-outline">${n.date}</span>
      </div>
      <p class="text-body-sm text-on-surface-variant line-clamp-2">${escapeHtml(n.summary)}</p>
      <div class="flex items-center justify-between pt-1">
        <span class="px-2 py-0.5 rounded bg-surface-container-highest text-primary font-label-sm text-label-sm">${n.topic}</span>
        <button class="text-xs text-secondary hover:underline flex items-center gap-1" onclick="copyNoteContent('${escapeHtml(n.title)}', '${escapeHtml(n.summary)}')">
          <span class="material-symbols-outlined text-xs">content_copy</span>
          Copy
        </button>
      </div>
    </div>
  `).join('');
}

function copyNoteContent(title, summary) {
  const text = `# ${title}\n\n${summary}`;
  navigator.clipboard.writeText(text).then(() => {
    showToast('Note copied in Markdown format!', 'success', 'content_copy');
  });
}

// ==========================================
// 9. MULTI-TAB SPA ROUTER
// ==========================================
function switchTab(tabId) {
  state.activeTab = tabId;
  saveState();

  // Tab views
  const tabs = ['study-hub', 'home-explore', 'music-flow', 'cinema-pulse', 'library-vault'];
  tabs.forEach(t => {
    const el = document.getElementById('view-' + t);
    if (el) {
      if (t === tabId) {
        el.classList.remove('hidden');
        el.classList.add('flex');
      } else {
        el.classList.add('hidden');
        el.classList.remove('flex');
      }
    }
  });

  // Mobile Bottom Navigation Icons Active State
  const navLinks = document.querySelectorAll('nav a[data-path]');
  navLinks.forEach(link => {
    const path = link.getAttribute('data-path');
    if (path === tabId) {
      link.classList.remove('text-on-surface-variant');
      link.classList.add('text-primary');
      link.setAttribute('aria-current', 'page');
    } else {
      link.classList.remove('text-primary');
      link.classList.add('text-on-surface-variant');
      link.removeAttribute('aria-current');
    }
  });

  // Desktop Sidebar Navigation Buttons Active State
  const sidebarButtons = document.querySelectorAll('[data-sidebar-tab]');
  sidebarButtons.forEach(btn => {
    const path = btn.getAttribute('data-sidebar-tab');
    if (path === tabId) {
      btn.className = "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-container-high text-primary font-semibold text-body-sm transition-colors text-left shadow-sm";
    } else {
      btn.className = "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-container text-on-surface-variant hover:text-on-surface font-medium text-body-sm transition-colors text-left";
    }
  });

  // Update Breadcrumb Text in Top Header
  const breadcrumb = document.getElementById('header-breadcrumb');
  if (breadcrumb) {
    const names = {
      'study-hub': 'Study Co-Pilot',
      'home-explore': 'Explore Agents',
      'music-flow': 'Music Flow',
      'cinema-pulse': 'Cinema Pulse',
      'library-vault': 'Library Vault'
    };
    breadcrumb.textContent = names[tabId] || 'Workspace';
  }

  // Refresh tab contents safely
  if (tabId === 'library-vault') {
    safeRender(renderLibraryVault, 'vault-items-container', 'Knowledge Vault');
  }
  if (tabId === 'music-flow') {
    safeRender(renderSoundscapesGrid, 'soundscapes-grid', 'Music Soundscapes');
    updatePomodoroStatsDisplay();
    updatePomodoroDisplay();
  }
  if (tabId === 'cinema-pulse') {
    if (currentMoviesList.length === 0) {
      safeRender(() => loadMovies(), 'movies-grid', 'Cinema Catalog');
    } else {
      updateWatchlistBadges();
    }
  }
  if (tabId === 'home-explore') {
    safeRender(renderExploreAgents, 'agents-grid', 'Explore Agents');
  }

  // Scroll window to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Theme Controller (Dark / Light)
function setTheme(theme) {
  state.theme = theme;
  saveState();

  const html = document.documentElement;
  const darkBtn = document.getElementById('theme-btn-dark');
  const lightBtn = document.getElementById('theme-btn-light');
  const icon = document.getElementById('theme-toggle-icon');

  if (theme === 'light') {
    html.classList.remove('dark');
    html.classList.add('light');
    if (icon) icon.textContent = 'dark_mode';
    if (darkBtn && lightBtn) {
      darkBtn.className = "flex-1 py-1 rounded-lg text-center font-medium flex items-center justify-center gap-1 text-on-surface-variant hover:text-on-surface transition-all";
      lightBtn.className = "flex-1 py-1 rounded-lg text-center font-medium flex items-center justify-center gap-1 bg-surface-container-high text-primary shadow-sm transition-all";
    }
    showToast('Switched to Light Mode', 'info', 'light_mode');
  } else {
    html.classList.add('dark');
    html.classList.remove('light');
    if (icon) icon.textContent = 'light_mode';
    if (darkBtn && lightBtn) {
      darkBtn.className = "flex-1 py-1 rounded-lg text-center font-medium flex items-center justify-center gap-1 bg-surface-container-high text-primary shadow-sm transition-all";
      lightBtn.className = "flex-1 py-1 rounded-lg text-center font-medium flex items-center justify-center gap-1 text-on-surface-variant hover:text-on-surface transition-all";
    }
    showToast('Switched to Dark Mode', 'info', 'dark_mode');
  }
}

function toggleTheme() {
  const current = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  setTheme(current === 'dark' ? 'light' : 'dark');
}

// Mobile Sidebar Drawer Controller
function toggleMobileSidebar(show) {
  const drawer = document.getElementById('mobile-sidebar');
  if (!drawer) return;
  if (show) {
    drawer.classList.remove('hidden');
    drawer.classList.add('flex');
  } else {
    drawer.classList.add('hidden');
    drawer.classList.remove('flex');
  }
}


// Library Vault View
let vaultSearchQuery = '';

function filterLibraryVault(query) {
  vaultSearchQuery = (query || '').trim().toLowerCase();
  safeRender(renderLibraryVault, 'vault-items-container', 'Knowledge Vault');
}

function renderLibraryVault() {
  const container = document.getElementById('vault-items-container');
  if (!container) return;

  let bookmarkedCards = FLASHCARDS.filter(c => (state.bookmarkedCards || []).includes(c.id));
  const masteredCount = (state.masteredCards || []).length;
  let quizzes = state.quizHistory || [];
  let notes = state.savedNotes || [];

  if (vaultSearchQuery) {
    notes = notes.filter(n => 
      (n.title && n.title.toLowerCase().includes(vaultSearchQuery)) ||
      (n.summary && n.summary.toLowerCase().includes(vaultSearchQuery)) ||
      (n.topic && n.topic.toLowerCase().includes(vaultSearchQuery))
    );
    bookmarkedCards = bookmarkedCards.filter(c =>
      (c.frontTitle && c.frontTitle.toLowerCase().includes(vaultSearchQuery)) ||
      (c.hint && c.hint.toLowerCase().includes(vaultSearchQuery)) ||
      (c.topic && c.topic.toLowerCase().includes(vaultSearchQuery))
    );
    quizzes = quizzes.filter(q =>
      (q.topic && q.topic.toLowerCase().includes(vaultSearchQuery))
    );
  }

  // Overarching search empty state
  if (vaultSearchQuery && notes.length === 0 && bookmarkedCards.length === 0 && quizzes.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center rounded-3xl bg-surface-container border border-outline-variant space-y-3 animate-fade-in my-3">
        <div class="w-14 h-14 rounded-full bg-surface-container-high text-outline flex items-center justify-center mx-auto">
          <span class="material-symbols-outlined text-3xl animate-float">search_off</span>
        </div>
        <h4 class="font-headline-sm text-base font-bold text-on-surface">No Vault Items Found</h4>
        <p class="text-xs text-on-surface-variant max-w-sm mx-auto">No saved notes, flashcards, or quizzes match "${escapeHtml(vaultSearchQuery)}".</p>
        <button class="px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold shadow active:scale-95 transition-all" onclick="document.getElementById('vault-search-input').value=''; filterLibraryVault('')">
          Clear Search Filter
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <!-- Stats Row -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-2 pb-2">
      <div class="p-3 rounded-xl bg-surface-container text-center border border-outline-variant/40">
        <span class="font-headline-md text-headline-md font-bold text-primary">${notes.length}</span>
        <p class="text-xs text-outline mt-0.5">Saved Notes</p>
      </div>
      <div class="p-3 rounded-xl bg-surface-container text-center border border-outline-variant/40">
        <span class="font-headline-md text-headline-md font-bold text-secondary">${bookmarkedCards.length}</span>
        <p class="text-xs text-outline mt-0.5">Bookmarked</p>
      </div>
      <div class="p-3 rounded-xl bg-surface-container text-center border border-outline-variant/40">
        <span class="font-headline-md text-headline-md font-bold text-emerald-400">${masteredCount}</span>
        <p class="text-xs text-outline mt-0.5">Mastered</p>
      </div>
      <div class="p-3 rounded-xl bg-surface-container text-center border border-outline-variant/40">
        <span class="font-headline-md text-headline-md font-bold text-tertiary">${quizzes.length}</span>
        <p class="text-xs text-outline mt-0.5">Quizzes Taken</p>
      </div>
    </div>

    <!-- Diagnostic Quiz History Section -->
    <div class="space-y-2 pt-3">
      <div class="flex items-center justify-between">
        <h3 class="font-headline-sm text-headline-sm font-semibold text-on-surface flex items-center gap-1.5">
          <span class="material-symbols-outlined text-lg text-tertiary">history_edu</span>
          Diagnostic Quiz History (${quizzes.length})
        </h3>
        <button class="text-xs text-primary hover:underline flex items-center gap-1" onclick="openTopicQuiz(state.selectedTopic || 'Science')">
          <span class="material-symbols-outlined text-xs">play_arrow</span> Take Quiz
        </button>
      </div>

      <div class="space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
        ${quizzes.length === 0 ? `
          <div class="p-6 rounded-2xl bg-surface-container border border-outline/10 text-center space-y-2 animate-fade-in">
            <div class="w-12 h-12 rounded-full bg-tertiary/15 text-tertiary flex items-center justify-center mx-auto">
              <span class="material-symbols-outlined text-2xl">history_edu</span>
            </div>
            <p class="text-xs text-on-surface font-semibold">No Quiz Attempts Logged</p>
            <p class="text-xs text-outline max-w-xs mx-auto">Test your recall across Science, Math, or CS with quick 4-5 question adaptive quizzes.</p>
            <button class="px-3.5 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-primary font-semibold text-xs transition-all mt-1 shadow-sm inline-flex items-center gap-1.5" onclick="openTopicQuiz('Science')">
              <span class="material-symbols-outlined text-xs">play_arrow</span>
              <span>Launch Science Quiz</span>
            </button>
          </div>
        ` : quizzes.map(q => {
          const pct = q.percentage || Math.round((q.score / (q.totalQuestions || 1)) * 100);
          const color = pct >= 80 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' : (pct >= 60 ? 'text-primary bg-primary/10 border-primary/30' : 'text-amber-400 bg-amber-500/10 border-amber-500/30');
          const formattedDate = q.date ? new Date(q.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recent';
          return `
            <div class="p-3 rounded-xl bg-surface-container border border-outline/10 flex items-center justify-between gap-3">
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-surface-container-high text-on-surface">${q.topic}</span>
                  <span class="text-xs text-outline">${formattedDate}</span>
                </div>
                <p class="text-xs text-on-surface-variant font-medium mt-1">Tier: ${q.tier || 'Undergrad'} &bull; +${q.score * 50} Scholar XP</p>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span class="px-2.5 py-1 rounded-lg border text-xs font-bold ${color}">${q.score}/${q.totalQuestions} (${pct}%)</span>
                <button class="p-1.5 rounded-lg text-outline hover:text-primary hover:bg-surface-container-high transition-colors" title="Retake Quiz" onclick="openTopicQuiz('${q.topic}')">
                  <span class="material-symbols-outlined text-base">refresh</span>
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- Bookmarked Cards Sub-Section -->
    <div class="space-y-2 pt-3">
      <div class="flex items-center justify-between">
        <h3 class="font-headline-sm text-headline-sm font-semibold text-on-surface flex items-center gap-1.5">
          <span class="material-symbols-outlined text-lg text-secondary">bookmarks</span>
          Bookmarked Cards (${bookmarkedCards.length})
        </h3>
        <button class="text-xs text-primary hover:underline" onclick="openModal('flashcards-modal')">View All Deck</button>
      </div>

      <div class="space-y-2 max-h-52 overflow-y-auto custom-scrollbar">
        ${bookmarkedCards.length === 0 ? `
          <div class="p-6 rounded-2xl bg-surface-container border border-outline/10 text-center space-y-2 animate-fade-in">
            <div class="w-12 h-12 rounded-full bg-secondary/15 text-secondary flex items-center justify-center mx-auto">
              <span class="material-symbols-outlined text-2xl">bookmarks</span>
            </div>
            <p class="text-xs text-on-surface font-semibold">No Bookmarked Flashcards</p>
            <p class="text-xs text-outline max-w-xs mx-auto">Click the bookmark icon on any flashcard in the deck to store it for targeted spaced repetition.</p>
            <button class="px-3.5 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-secondary font-semibold text-xs transition-all mt-1 shadow-sm inline-flex items-center gap-1.5" onclick="openModal('flashcards-modal')">
              <span class="material-symbols-outlined text-xs">style</span>
              <span>Explore 20 Flashcards</span>
            </button>
          </div>
        ` : bookmarkedCards.map(c => `
          <div class="p-3 rounded-xl bg-surface-container border border-outline/10 flex items-center justify-between">
            <div>
              <h4 class="font-semibold text-on-surface text-body-sm">${c.frontTitle}</h4>
              <p class="text-xs text-outline">${c.topic} • ${c.hint}</p>
            </div>
            <div class="flex items-center gap-1">
              <button class="p-2 text-on-surface-variant hover:text-secondary" onclick="openTopicFlashcards('${c.topic}')" title="Review Card">
                <span class="material-symbols-outlined text-base">style</span>
              </button>
              <button class="p-2 text-on-surface-variant hover:text-error" onclick="removeBookmark(${c.id})" title="Remove Bookmark">
                <span class="material-symbols-outlined text-base">bookmark_remove</span>
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Saved Notes Section -->
    <div class="space-y-2 pt-4">
      <div class="flex items-center justify-between">
        <h3 class="font-headline-sm text-headline-sm font-semibold text-on-surface flex items-center gap-1.5">
          <span class="material-symbols-outlined text-lg text-primary">description</span>
          Saved Notes &amp; Formulas (${notes.length})
        </h3>
        <button class="text-xs text-outline hover:text-on-surface" onclick="exportNotesMarkdown()">Export .MD</button>
      </div>

      <div class="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
        ${notes.length === 0 ? `
          <div class="p-6 rounded-2xl bg-surface-container border border-outline/10 text-center space-y-2 animate-fade-in">
            <div class="w-12 h-12 rounded-full bg-primary/15 text-primary flex items-center justify-center mx-auto">
              <span class="material-symbols-outlined text-2xl">description</span>
            </div>
            <p class="text-xs text-on-surface font-semibold">No Saved Notes &amp; Formulas</p>
            <p class="text-xs text-outline max-w-xs mx-auto">Click the bookmark icon on any AI synthesis or formula breakdown to preserve it permanently.</p>
            <button class="px-3.5 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-primary font-semibold text-xs transition-all mt-1 shadow-sm inline-flex items-center gap-1.5" onclick="switchTab('study-hub')">
              <span class="material-symbols-outlined text-xs">school</span>
              <span>Go to Study Co-Pilot</span>
            </button>
          </div>
        ` : notes.map(n => `
          <div class="p-3.5 rounded-xl bg-surface-container border border-outline/10 space-y-1.5 group">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="font-semibold text-on-surface text-body-sm">${escapeHtml(n.title)}</span>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-surface-container-high text-primary">${n.topic || 'Science'}</span>
              </div>
              <div class="flex items-center gap-1">
                <span class="text-[11px] text-outline mr-1">${n.date}</span>
                <button class="p-1 rounded text-outline hover:text-primary hover:bg-surface-container-high transition-colors" title="Copy Note" onclick="copyNoteSnippet('${n.id}')">
                  <span class="material-symbols-outlined text-base">content_copy</span>
                </button>
                <button class="p-1 rounded text-outline hover:text-error hover:bg-surface-container-high transition-colors" title="Delete Note" onclick="deleteNote('${n.id}')">
                  <span class="material-symbols-outlined text-base">delete</span>
                </button>
              </div>
            </div>
            <p class="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">${escapeHtml(n.summary)}</p>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function removeBookmark(cardId) {
  toggleBookmarkCard(cardId);
}

function copyNoteSnippet(noteId) {
  const note = (state.savedNotes || []).find(n => n.id === noteId);
  if (!note) return;
  const text = `${note.title} (${note.topic} - ${note.tier})\nDate: ${note.date}\n\n${note.summary}`;
  navigator.clipboard.writeText(text).then(() => {
    showToast('Note copied to clipboard!', 'success', 'content_copy');
  }).catch(() => {
    showToast('Failed to copy note', 'error');
  });
}

function exportNotesMarkdown() {
  const content = state.savedNotes.map(n => `## ${n.title} (${n.topic} - ${n.tier})\n*Saved: ${n.date}*\n\n${n.summary}\n\n---`).join('\n\n');
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nexora-notes-${Date.now()}.md`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Notes downloaded as Markdown!', 'success', 'download');
}

// ==========================================
// 10. MUSIC FLOW & POMODORO 2.0 HELPERS
// ==========================================
let pomodoroTimer = null;
let pomodoroDuration = 25 * 60; // 25 min default in seconds
let pomodoroTimeLeft = 25 * 60;
let pomodoroIsRunning = false;
let activeSoundscapeCategory = 'All';

function setPomodoroPreset(minutes) {
  if (pomodoroIsRunning) {
    clearInterval(pomodoroTimer);
    pomodoroIsRunning = false;
  }
  pomodoroDuration = minutes * 60;
  pomodoroTimeLeft = pomodoroDuration;
  updatePomodoroDisplay();

  const btn = document.getElementById('pomodoro-toggle-btn');
  if (btn) {
    btn.innerHTML = `<span class="material-symbols-outlined text-sm">play_arrow</span><span>Start Focus</span>`;
    btn.classList.remove('bg-amber-600', 'hover:bg-amber-500');
    btn.classList.add('bg-primary', 'hover:bg-primary-hover');
  }

  // Highlight active preset button
  document.querySelectorAll('[data-pomodoro-preset]').forEach(b => {
    const val = parseInt(b.getAttribute('data-pomodoro-preset'), 10);
    if (val === minutes) {
      b.className = "px-3 py-1.5 rounded-xl bg-primary text-white font-semibold text-xs shadow-sm transition-all";
    } else {
      b.className = "px-3 py-1.5 rounded-xl bg-surface-container text-on-surface-variant hover:text-on-surface font-medium text-xs transition-all";
    }
  });

  showToast(`Focus session set to ${minutes}m`, 'info', 'timer');
}

function togglePomodoro() {
  const btn = document.getElementById('pomodoro-toggle-btn');
  const autoPlay = document.getElementById('pomodoro-autoplay-checkbox');

  if (pomodoroIsRunning) {
    clearInterval(pomodoroTimer);
    pomodoroIsRunning = false;
    if (btn) {
      btn.innerHTML = `<span class="material-symbols-outlined text-sm">play_arrow</span><span>Resume</span>`;
      btn.classList.remove('bg-amber-600', 'hover:bg-amber-500');
      btn.classList.add('bg-primary', 'hover:bg-primary-hover');
    }
    showToast('Pomodoro session paused', 'info', 'pause');
  } else {
    pomodoroIsRunning = true;
    if (btn) {
      btn.innerHTML = `<span class="material-symbols-outlined text-sm">pause</span><span>Pause</span>`;
      btn.classList.remove('bg-primary', 'hover:bg-primary-hover');
      btn.classList.add('bg-amber-600', 'hover:bg-amber-500');
    }

    if (autoPlay && autoPlay.checked && !ambientAudio.isPlaying) {
      ambientAudio.play(ambientAudio.currentTrack || 'cosmic-lofi');
    }

    pomodoroTimer = setInterval(() => {
      if (pomodoroTimeLeft > 0) {
        pomodoroTimeLeft--;
        updatePomodoroDisplay();
      } else {
        completePomodoroSession();
      }
    }, 1000);

    showToast('Focus session started! Deep study flow active.', 'success', 'timer');
  }
}

function resetPomodoro() {
  if (pomodoroTimer) clearInterval(pomodoroTimer);
  pomodoroIsRunning = false;
  pomodoroTimeLeft = pomodoroDuration;
  updatePomodoroDisplay();

  const btn = document.getElementById('pomodoro-toggle-btn');
  if (btn) {
    btn.innerHTML = `<span class="material-symbols-outlined text-sm">play_arrow</span><span>Start Focus</span>`;
    btn.classList.remove('bg-amber-600', 'hover:bg-amber-500');
    btn.classList.add('bg-primary', 'hover:bg-primary-hover');
  }
  showToast('Pomodoro reset', 'info', 'replay');
}

function completePomodoroSession() {
  clearInterval(pomodoroTimer);
  pomodoroIsRunning = false;
  pomodoroTimeLeft = pomodoroDuration;
  updatePomodoroDisplay();

  const btn = document.getElementById('pomodoro-toggle-btn');
  if (btn) {
    btn.innerHTML = `<span class="material-symbols-outlined text-sm">play_arrow</span><span>Start Focus</span>`;
    btn.classList.remove('bg-amber-600', 'hover:bg-amber-500');
    btn.classList.add('bg-primary', 'hover:bg-primary-hover');
  }

  if (!state.pomodoroStats) {
    state.pomodoroStats = { completed: 0, focusMinutes: 0, xp: 0 };
  }
  const sessionMinutes = Math.round(pomodoroDuration / 60);
  state.pomodoroStats.completed += 1;
  state.pomodoroStats.focusMinutes += sessionMinutes;
  state.pomodoroStats.xp += 100;
  saveState();
  updatePomodoroStatsDisplay();

  showToast(`🎉 Focus Session Completed! +100 XP gained (${sessionMinutes}m deep work)`, 'success', 'celebration');
}

function updatePomodoroDisplay() {
  const mins = Math.floor(pomodoroTimeLeft / 60);
  const secs = pomodoroTimeLeft % 60;
  const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  const el = document.getElementById('pomodoro-timer-display');
  if (el) el.textContent = timeStr;
  const legacyEl = document.getElementById('pomodoro-display');
  if (legacyEl) legacyEl.textContent = timeStr;

  const progressBar = document.getElementById('pomodoro-progress-bar');
  if (progressBar && pomodoroDuration > 0) {
    const elapsedPercent = Math.min(100, Math.max(0, ((pomodoroDuration - pomodoroTimeLeft) / pomodoroDuration) * 100));
    progressBar.style.width = `${elapsedPercent}%`;
  }
}

function updatePomodoroStatsDisplay() {
  const stats = state.pomodoroStats || { completed: 0, focusMinutes: 0, xp: 0 };
  const compEl = document.getElementById('pomodoro-stat-completed');
  const minEl = document.getElementById('pomodoro-stat-minutes');
  const xpEl = document.getElementById('pomodoro-stat-xp');

  if (compEl) compEl.textContent = stats.completed || 0;
  if (minEl) minEl.textContent = `${stats.focusMinutes || 0}m`;
  if (xpEl) xpEl.textContent = `${stats.xp || 0} XP`;
}

let soundscapeSearchQuery = '';

function searchSoundscapes(query) {
  soundscapeSearchQuery = (query || '').trim().toLowerCase();
  safeRender(renderSoundscapesGrid, 'soundscapes-grid', 'Music Soundscapes');
}

function resetSoundscapeFilter() {
  soundscapeSearchQuery = '';
  activeSoundscapeCategory = 'All';
  const input = document.getElementById('soundscape-search-input');
  if (input) input.value = '';
  safeRender(() => renderSoundscapesGrid('All'), 'soundscapes-grid', 'Music Soundscapes');
}

function renderSoundscapesGrid(filterCategory) {
  if (filterCategory !== undefined) {
    activeSoundscapeCategory = filterCategory;
  }

  const container = document.getElementById('soundscapes-grid');
  if (!container) return;

  let filtered = activeSoundscapeCategory === 'All'
    ? MUSIC_SOUNDSCAPES
    : MUSIC_SOUNDSCAPES.filter(s => s.category === activeSoundscapeCategory);

  if (soundscapeSearchQuery) {
    filtered = filtered.filter(s => 
      s.title.toLowerCase().includes(soundscapeSearchQuery) ||
      s.subtitle.toLowerCase().includes(soundscapeSearchQuery) ||
      s.frequency.toLowerCase().includes(soundscapeSearchQuery) ||
      s.description.toLowerCase().includes(soundscapeSearchQuery)
    );
  }

  document.querySelectorAll('[data-soundscape-cat]').forEach(tab => {
    const cat = tab.getAttribute('data-soundscape-cat');
    if (cat === activeSoundscapeCategory) {
      tab.className = "px-3.5 py-1.5 rounded-xl bg-surface-container-high text-primary font-semibold text-xs shadow-sm transition-all";
    } else {
      tab.className = "px-3.5 py-1.5 rounded-xl bg-surface-container text-on-surface-variant hover:text-on-surface font-medium text-xs transition-all";
    }
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-12 px-4 text-center space-y-3 rounded-2xl bg-surface-container border border-outline-variant animate-fade-in">
        <div class="w-14 h-14 rounded-full bg-secondary/15 text-secondary flex items-center justify-center mx-auto">
          <span class="material-symbols-outlined text-3xl animate-float">headphones</span>
        </div>
        <h4 class="font-headline-sm text-base font-bold text-on-surface">No Soundscapes Found</h4>
        <p class="text-xs text-on-surface-variant max-w-sm mx-auto">
          ${soundscapeSearchQuery ? `No neuro-acoustic tracks match "${escapeHtml(soundscapeSearchQuery)}".` : 'No soundscapes available in this category.'}
        </p>
        <button class="px-4 py-2 rounded-xl bg-secondary text-white font-semibold text-xs shadow-md active:scale-95 transition-all inline-flex items-center gap-1.5" onclick="resetSoundscapeFilter()">
          <span class="material-symbols-outlined text-sm">cached</span>
          <span>View All 7 Soundscapes</span>
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(s => {
    const isThisActive = ambientAudio.isPlaying && ambientAudio.currentTrack === s.id;
    return `
      <div data-soundscape-card="${s.id}" class="rounded-2xl bg-surface-container p-4 border border-outline-variant shadow-md hover:shadow-lg transition-all flex flex-col justify-between group relative overflow-hidden ${isThisActive ? 'ring-2 ring-secondary bg-surface-container-high' : ''}">
        <div class="space-y-3">
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2.5">
              <div class="w-10 h-10 rounded-xl ${s.accentBg} flex items-center justify-center ${s.color} shrink-0">
                <span class="material-symbols-outlined text-xl">${s.icon}</span>
              </div>
              <div>
                <h4 class="font-headline-sm text-sm font-bold text-on-surface group-hover:text-primary transition-colors">${escapeHtml(s.title)}</h4>
                <p class="text-[11px] text-on-surface-variant line-clamp-1">${escapeHtml(s.subtitle)}</p>
              </div>
            </div>
            <button class="w-9 h-9 rounded-full bg-surface-container-highest hover:bg-primary hover:text-white text-on-surface flex items-center justify-center transition-all shadow-sm active:scale-95 shrink-0" onclick="toggleSoundscapeTrack('${s.id}')" title="Play / Pause ${escapeHtml(s.title)}">
              <span class="material-symbols-outlined text-lg soundscape-card-play-icon">${isThisActive ? 'pause' : 'play_arrow'}</span>
            </button>
          </div>

          <p class="text-xs text-on-surface-variant leading-relaxed">${escapeHtml(s.description)}</p>

          <div class="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/50 text-[11px] space-y-1">
            <div class="flex items-center justify-between font-mono text-[10px] text-outline">
              <span>Freq: <strong class="text-on-surface">${s.frequency}</strong></span>
              <span>Carrier: <strong class="text-on-surface">${s.carrier}</strong></span>
            </div>
            <p class="text-secondary/90 italic flex items-start gap-1">
              <span class="material-symbols-outlined text-xs shrink-0 text-secondary">psychology</span>
              <span>${escapeHtml(s.science)}</span>
            </p>
          </div>
        </div>

        <div class="flex items-center justify-between pt-3 mt-3 border-t border-outline-variant/60">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="px-2 py-0.5 rounded-md bg-surface-container-high font-label-sm text-[10px] font-semibold text-outline">${s.category}</span>
            <span class="px-2 py-0.5 rounded-md ${s.accentBg} font-label-sm text-[10px] font-semibold ${s.color}">${s.brainwave}</span>
          </div>
          <button class="text-[11px] text-primary hover:underline flex items-center gap-1 font-semibold" onclick="sendMusicPrompt('Explain the cognitive science of ${escapeHtml(s.title)} and how its ${s.frequency} frequency enhances focus.')">
            <span>Ask Co-Pilot</span>
            <span class="material-symbols-outlined text-xs">arrow_forward</span>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function toggleSoundscapeTrack(trackId) {
  if (ambientAudio.isPlaying && ambientAudio.currentTrack === trackId) {
    ambientAudio.stop();
  } else {
    ambientAudio.play(trackId);
  }
}

function formatMarkdownText(text) {
  if (!text) return '';
  let formatted = escapeHtml(text);
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-on-surface">$1</strong>');
  formatted = formatted.replace(/\*(.*?)\*/g, '<em class="italic text-on-surface-variant">$1</em>');
  formatted = formatted.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-surface-container-highest text-secondary text-xs font-mono">$1</code>');
  formatted = formatted.replace(/^[\*\-]\s+(.*)$/gm, '<li class="ml-4 list-disc text-on-surface-variant my-0.5">$1</li>');
  formatted = formatted.replace(/\n\n+/g, '</p><p class="mt-2 text-body-sm text-on-surface-variant leading-relaxed">');
  formatted = formatted.replace(/\n/g, '<br>');
  return `<div class="text-body-sm text-on-surface-variant leading-relaxed"><p>${formatted}</p></div>`;
}

async function sendMusicPrompt(promptText) {
  const input = document.getElementById('music-ai-input');
  const text = (promptText !== undefined ? promptText : (input ? input.value : '')).trim();

  if (!text) {
    showToast('Please type a music theory or acoustic science query', 'warning', 'music_note');
    if (input) input.focus();
    return;
  }

  if (input && promptText === undefined) {
    input.value = '';
  }

  const responseCard = document.getElementById('music-ai-response-card');
  const responseContainer = document.getElementById('music-ai-response');
  const responsePromptText = document.getElementById('music-ai-query-display');

  if (responseCard) responseCard.classList.remove('hidden');
  if (responsePromptText) responsePromptText.textContent = text;

  if (responseContainer) {
    responseContainer.innerHTML = `
      <div class="flex items-center gap-2 text-secondary animate-pulse text-xs py-3">
        <span class="material-symbols-outlined text-base">neurology</span>
        <span>Synthesizing acoustic theory, harmonic physics, and cognitive research...</span>
      </div>
    `;
  }

  showToast('Music Co-Pilot synthesizing answer...', 'info', 'headphones');

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        domain: 'music',
        topic: 'Music',
        tier: state.selectedTier || 'Undergrad',
        language: state.selectedLanguage || 'English'
      })
    });

    if (!res.ok) {
      let errData = {};
      try { errData = await res.json(); } catch (e) {}
      throw new Error(errData.message || `Server responded with status ${res.status}`);
    }

    if (!res.body) {
      throw new Error('Streaming endpoint not readable');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let accumulated = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const jsonStr = trimmed.slice(5).trim();
        try {
          const data = JSON.parse(jsonStr);
          if (data.chunk) {
            accumulated += data.chunk;
            if (responseContainer) {
              responseContainer.innerHTML = formatMarkdownText(accumulated);
            }
          }
          if (data.done) {
            if (responseContainer) {
              responseContainer.innerHTML = formatMarkdownText(data.fullText || accumulated);
            }
          }
        } catch (parseErr) {}
      }
    }

    if (responseCard) {
      responseCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  } catch (err) {
    if (responseContainer) {
      responseContainer.innerHTML = `
        <div class="p-3 rounded-xl bg-error/10 border border-error/20 text-error text-xs flex items-center gap-2">
          <span class="material-symbols-outlined text-sm">error</span>
          <span>${escapeHtml(err.message || 'Failed to synthesize response')}</span>
        </div>
      `;
    }
    showToast(err.message || 'Error from Music Co-Pilot', 'error', 'error');
  }
}

// ==========================================
// 10B. CINEMA PULSE & MOVIE MODE CONTROLLER
// ==========================================
let activeMovieCategory = 'all';
let currentMoviesList = [];
let movieSearchTimeout = null;
let activeModalMovie = null;

function renderMoviesSkeleton() {
  const grid = document.getElementById('movies-grid');
  if (!grid) return;
  grid.innerHTML = Array(10).fill(0).map(() => `
    <div class="rounded-2xl bg-surface-container overflow-hidden border border-outline-variant p-2 space-y-2 animate-pulse">
      <div class="aspect-[2/3] w-full skeleton rounded-xl"></div>
      <div class="h-3.5 skeleton rounded w-3/4"></div>
      <div class="h-3 skeleton rounded w-1/2"></div>
    </div>
  `).join('');
}

async function loadMovies(category = activeMovieCategory, search = '') {
  activeMovieCategory = category;
  const grid = document.getElementById('movies-grid');
  const tabs = document.getElementById('movie-category-tabs');

  if (category === 'watchlist') {
    renderWatchlistGrid();
    return;
  }

  // Update category filter tabs highlight
  if (tabs) {
    tabs.querySelectorAll('[data-movie-cat]').forEach(btn => {
      const cat = btn.getAttribute('data-movie-cat');
      if (cat === category) {
        btn.className = "px-3.5 py-1.5 rounded-xl bg-surface-container-high text-tertiary font-semibold text-xs shadow-sm transition-all whitespace-nowrap";
      } else {
        btn.className = "px-3.5 py-1.5 rounded-xl bg-surface-container text-on-surface-variant hover:text-on-surface font-medium text-xs transition-all whitespace-nowrap";
      }
    });
  }

  if (grid) {
    renderMoviesSkeleton();
  }

  try {
    const res = await fetch(`/api/movies?category=${encodeURIComponent(category)}&search=${encodeURIComponent(search)}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    currentMoviesList = data.movies || [];

    // Update Spotlight Card with first featured movie if not searching
    if (!search && currentMoviesList.length > 0) {
      updateMovieSpotlight(currentMoviesList[0]);
    }

    renderMoviesGrid(currentMoviesList);
    updateWatchlistBadges();
  } catch (err) {
    if (grid) {
      grid.innerHTML = `
        <div class="col-span-full p-6 text-center rounded-2xl bg-error/10 border border-error/20 text-error text-xs">
          Failed to load movies.
          <button class="mt-2 block mx-auto px-3 py-1.5 rounded-lg bg-surface-container text-on-surface font-semibold" onclick="loadMovies()">Retry</button>
        </div>
      `;
    }
  }
}

function updateMovieSpotlight(m) {
  const spotlight = document.getElementById('movie-spotlight-card');
  if (!spotlight || !m) return;

  const inWatchlist = isMovieInWatchlist(m.id);

  spotlight.innerHTML = `
    <div class="relative w-full rounded-3xl overflow-hidden bg-surface-container border border-outline-variant shadow-2xl min-h-[300px] flex flex-col justify-end p-6 md:p-8">
      <!-- High-res Backdrop Image with Multi-Stop Dark Gradient -->
      <img src="${escapeHtml(m.backdropUrl || m.posterUrl)}" alt="${escapeHtml(m.title)}" class="absolute inset-0 w-full h-full object-cover" onerror="handleImageFallback(this, '${escapeHtml(m.title)}', 'backdrop')">
      <div class="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30"></div>
      
      <!-- Top Badge Strip -->
      <div class="relative z-10 flex items-center justify-between pb-4">
        <span class="px-3 py-1 rounded-full bg-tertiary/20 backdrop-blur-md text-tertiary border border-tertiary/30 text-xs font-semibold flex items-center gap-1.5 shadow-sm">
          <span class="material-symbols-outlined text-sm">stars</span>
          <span>Featured Cinema Spotlight</span>
        </span>
        <span class="px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-amber-400 font-bold text-xs font-mono flex items-center gap-1 border border-amber-400/25">
          <span class="material-symbols-outlined text-sm">star</span>
          <span>${m.rating} Rating</span>
        </span>
      </div>

      <!-- Content -->
      <div class="relative z-10 max-w-2xl space-y-2.5">
        <h3 class="font-headline-lg text-2xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow-md">${escapeHtml(m.title)}</h3>
        <p class="text-xs sm:text-sm text-secondary font-medium italic drop-shadow">${escapeHtml(m.tagline || '')}</p>
        <p class="text-xs text-white/80 line-clamp-2 leading-relaxed drop-shadow-sm">${escapeHtml(m.overview)}</p>
        
        <div class="flex items-center gap-2 pt-1 flex-wrap">
          <span class="text-xs font-mono text-white/60">${m.year} • ${escapeHtml(m.runtime || '148m')} • Dir. ${escapeHtml(m.director)}</span>
          ${(m.genres || []).slice(0, 3).map(g => `<span class="px-2 py-0.5 rounded-md bg-white/10 backdrop-blur text-white text-[11px] font-medium">${escapeHtml(g)}</span>`).join('')}
        </div>

        <div class="flex items-center gap-3 pt-3 flex-wrap">
          <button class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-tertiary to-primary text-white font-semibold text-xs active:scale-95 transition-all shadow-lg flex items-center gap-2" onclick="openMovieModal(${m.id})">
            <span class="material-symbols-outlined text-base">play_circle</span>
            <span>Trailer & Film Breakdown</span>
          </button>
          <button class="px-4 py-2.5 rounded-xl ${inWatchlist ? 'bg-primary text-white shadow-md' : 'bg-white/10 hover:bg-white/20 text-white'} backdrop-blur border border-white/20 font-semibold text-xs active:scale-95 transition-all flex items-center gap-1.5" onclick="toggleWatchlist(${m.id})">
            <span class="material-symbols-outlined text-base">${inWatchlist ? 'bookmark_added' : 'bookmark_add'}</span>
            <span>${inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}</span>
          </button>
          <button class="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur border border-white/20 font-semibold text-xs active:scale-95 transition-all flex items-center gap-1.5" onclick="sendMoviePrompt('Analyze the cinematography, narrative themes, and directorial vision of ${escapeHtml(m.title)}')">
            <span class="material-symbols-outlined text-sm">auto_awesome</span>
            <span>AI Film Critique</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderMoviesGrid(movies) {
  const grid = document.getElementById('movies-grid');
  if (!grid) return;

  if (!movies || movies.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full py-16 text-center space-y-3">
        <div class="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center mx-auto text-outline">
          <span class="material-symbols-outlined text-3xl">movie_off</span>
        </div>
        <h4 class="font-headline-sm text-base font-bold text-on-surface">No Movies Found</h4>
        <p class="text-xs text-on-surface-variant max-w-sm mx-auto">Try clearing your search term or exploring a different cinematic category.</p>
        <button class="px-4 py-2 rounded-xl bg-tertiary text-white font-semibold text-xs shadow-md active:scale-95 transition-all inline-flex items-center gap-1.5" onclick="const inp=document.getElementById('movie-search-input'); if(inp) inp.value=''; loadMovies('all');">
          <span class="material-symbols-outlined text-xs">refresh</span>
          <span>View All Movies</span>
        </button>
      </div>
    `;
    return;
  }

  grid.innerHTML = movies.map(m => {
    const inWatchlist = isMovieInWatchlist(m.id);
    return `
      <div class="group relative rounded-2xl bg-surface-container overflow-hidden border border-outline-variant shadow-md hover:shadow-2xl transition-all duration-300 flex flex-col cursor-pointer" onclick="openMovieModal(${m.id})">
        <!-- Poster Container with Aspect Ratio -->
        <div class="aspect-[2/3] w-full overflow-hidden relative bg-surface-container-lowest">
          <img src="${escapeHtml(m.posterUrl)}" alt="${escapeHtml(m.title)}" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onerror="handleImageFallback(this, '${escapeHtml(m.title)}', 'poster')">
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-80 group-hover:opacity-90 transition-opacity"></div>
          
          <!-- Top Badge Strip: Rating & Watchlist Bookmark -->
          <div class="absolute top-2.5 inset-x-2.5 flex items-center justify-between z-10">
            <span class="px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-amber-400 font-bold text-[11px] font-mono flex items-center gap-1 shadow-sm border border-amber-400/25">
              <span class="material-symbols-outlined text-xs">star</span>
              <span>${m.rating}</span>
            </span>
            <button class="w-8 h-8 rounded-full ${inWatchlist ? 'bg-primary text-white shadow-[0_0_12px_rgba(0,166,224,0.6)]' : 'bg-black/60 text-white hover:bg-primary'} backdrop-blur-md flex items-center justify-center transition-all active:scale-90 shadow-md border border-white/10" onclick="toggleWatchlist(${m.id}, event)" title="${inWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}">
              <span class="material-symbols-outlined text-base">${inWatchlist ? 'bookmark_added' : 'bookmark_add'}</span>
            </button>
          </div>

          <!-- Bottom Poster Info: Runtime & Play Button -->
          <div class="absolute bottom-2.5 inset-x-2.5 flex items-center justify-between text-white/90 text-xs z-10">
            <span class="font-mono text-[10px] bg-black/50 px-1.5 py-0.5 rounded backdrop-blur">${escapeHtml(m.runtime || '120m')}</span>
            <span class="w-7 h-7 rounded-full bg-secondary/90 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              <span class="material-symbols-outlined text-sm">play_arrow</span>
            </span>
          </div>
        </div>

        <!-- Card Text Info -->
        <div class="p-3 space-y-1.5 flex-1 flex flex-col justify-between">
          <div>
            <h4 class="font-bold text-sm text-on-surface line-clamp-1 group-hover:text-primary transition-colors">${escapeHtml(m.title)}</h4>
            <p class="text-[11px] text-outline line-clamp-1">${m.year} • ${escapeHtml(m.director)}</p>
          </div>
          <div class="flex items-center gap-1 flex-wrap pt-1">
            ${(m.genres || []).slice(0, 2).map(g => `<span class="px-1.5 py-0.5 rounded bg-surface-container-high text-[10px] text-on-surface-variant font-medium">${escapeHtml(g)}</span>`).join('')}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function filterMovieCategory(category) {
  activeMovieCategory = category;
  loadMovies(category);
}

function searchMovies(query) {
  if (movieSearchTimeout) clearTimeout(movieSearchTimeout);
  movieSearchTimeout = setTimeout(() => {
    loadMovies(activeMovieCategory, query);
  }, 250);
}

function isMovieInWatchlist(id) {
  if (!state.watchlist || !Array.isArray(state.watchlist)) return false;
  const numId = parseInt(id, 10);
  return state.watchlist.some(m => m.id === numId);
}

function toggleWatchlist(movieId, event) {
  if (event && event.stopPropagation) event.stopPropagation();

  if (!state.watchlist || !Array.isArray(state.watchlist)) {
    state.watchlist = [];
  }

  const numId = parseInt(movieId, 10);
  const existsIdx = state.watchlist.findIndex(m => m.id === numId);

  if (existsIdx !== -1) {
    const title = state.watchlist[existsIdx].title;
    state.watchlist.splice(existsIdx, 1);
    saveState();
    showToast(`Removed "${title}" from Watchlist`, 'info', 'bookmark_remove');

    // Supabase RLS Cloud Sync: Delete
    if (window.supabaseClient && state.user?.isAuthenticated && state.user?.id) {
      window.supabaseClient
        .from('movie_watchlist')
        .delete()
        .eq('user_id', state.user.id)
        .eq('movie_id', numId)
        .then(({ error }) => {
          if (error) console.warn('[SupabaseWatchlist] Delete sync warning:', error);
        });
    }
  } else {
    const movieObj = currentMoviesList.find(m => m.id === numId) || activeModalMovie;
    if (movieObj) {
      const newItem = {
        id: movieObj.id,
        title: movieObj.title,
        year: movieObj.year,
        director: movieObj.director,
        rating: movieObj.rating,
        runtime: movieObj.runtime,
        posterUrl: movieObj.posterUrl,
        backdropUrl: movieObj.backdropUrl,
        genres: movieObj.genres || [],
        trailerKey: movieObj.trailerKey || 'zSWdZVtXT7E',
        status: 'plan',
        addedAt: new Date().toLocaleDateString()
      };
      state.watchlist.push(newItem);
      saveState();
      showToast(`Added "${movieObj.title}" to Watchlist!`, 'success', 'bookmark_added');

      // Supabase RLS Cloud Sync: Upsert
      if (window.supabaseClient && state.user?.isAuthenticated && state.user?.id) {
        window.supabaseClient
          .from('movie_watchlist')
          .upsert({
            user_id: state.user.id,
            movie_id: newItem.id,
            title: newItem.title,
            year: parseInt(newItem.year, 10) || null,
            director: newItem.director,
            rating: parseFloat(newItem.rating) || null,
            runtime: newItem.runtime,
            poster_url: newItem.posterUrl,
            backdrop_url: newItem.backdropUrl,
            genres: newItem.genres,
            trailer_key: newItem.trailerKey,
            status: newItem.status
          }, { onConflict: 'user_id,movie_id' })
          .then(({ error }) => {
            if (error) console.warn('[SupabaseWatchlist] Insert sync warning:', error);
          });
      }
    }
  }

  updateWatchlistBadges();
  updateModalWatchlistBtn(numId);

  if (activeMovieCategory === 'watchlist') {
    renderWatchlistGrid();
  } else {
    renderMoviesGrid(currentMoviesList);
  }
}

function updateWatchlistBadges() {
  const count = (state.watchlist || []).length;
  const badge1 = document.getElementById('watchlist-count-badge');
  const badge2 = document.getElementById('tab-watchlist-count');
  if (badge1) badge1.textContent = count;
  if (badge2) badge2.textContent = count;
}

function updateWatchlistStatus(id, newStatus) {
  if (!state.watchlist) return;
  const numId = parseInt(id, 10);
  const movie = state.watchlist.find(m => m.id === numId);
  if (movie) {
    movie.status = newStatus;
    saveState();
    showToast(`Status updated to: ${newStatus}`, 'info', 'check_circle');
    renderWatchlistGrid();

    // Supabase RLS Cloud Sync: Status Update
    if (window.supabaseClient && state.user?.isAuthenticated && state.user?.id) {
      window.supabaseClient
        .from('movie_watchlist')
        .update({ status: newStatus })
        .eq('user_id', state.user.id)
        .eq('movie_id', numId)
        .then(({ error }) => {
          if (error) console.warn('[SupabaseWatchlist] Status update sync warning:', error);
        });
    }
  }
}

function renderWatchlistGrid() {
  const grid = document.getElementById('movies-grid');
  const tabs = document.getElementById('movie-category-tabs');

  if (tabs) {
    tabs.querySelectorAll('[data-movie-cat]').forEach(btn => {
      const cat = btn.getAttribute('data-movie-cat');
      if (cat === 'watchlist') {
        btn.className = "px-3.5 py-1.5 rounded-xl bg-surface-container-high text-tertiary font-semibold text-xs shadow-sm transition-all whitespace-nowrap";
      } else {
        btn.className = "px-3.5 py-1.5 rounded-xl bg-surface-container text-on-surface-variant hover:text-on-surface font-medium text-xs transition-all whitespace-nowrap";
      }
    });
  }

  const list = state.watchlist || [];

  if (!grid) return;

  if (list.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full py-16 text-center space-y-4 rounded-3xl bg-surface-container p-8 border border-outline-variant">
        <div class="w-16 h-16 rounded-2xl bg-tertiary/15 flex items-center justify-center mx-auto text-tertiary">
          <span class="material-symbols-outlined text-3xl">bookmark_border</span>
        </div>
        <h4 class="font-headline-sm text-lg font-bold text-on-surface">Your Watchlist is Empty</h4>
        <p class="text-xs text-on-surface-variant max-w-md mx-auto leading-relaxed">Bookmark movies you want to watch or analyze. They will be saved here persistently for offline tracking.</p>
        <button class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-tertiary to-primary text-white font-semibold text-xs shadow-md active:scale-95 transition-all inline-flex items-center gap-1.5" onclick="filterMovieCategory('all')">
          <span class="material-symbols-outlined text-sm">explore</span>
          <span>Explore Cinema Masterpieces</span>
        </button>
      </div>
    `;
    return;
  }

  grid.innerHTML = `
    <div class="col-span-full flex items-center justify-between pb-2 border-b border-outline-variant/60">
      <div class="flex items-center gap-2">
        <span class="text-sm font-bold text-on-surface">Saved Films (${list.length})</span>
      </div>
      <button class="px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant text-xs font-semibold text-primary flex items-center gap-1.5 active:scale-95 transition-all" onclick="exportWatchlistMarkdown()">
        <span class="material-symbols-outlined text-sm">download</span>
        <span>Export Watchlist (Markdown)</span>
      </button>
    </div>
  ` + list.map(m => `
    <div class="group relative rounded-2xl bg-surface-container overflow-hidden border border-outline-variant shadow-md hover:shadow-2xl transition-all duration-300 flex flex-col">
      <!-- Poster -->
      <div class="aspect-[2/3] w-full overflow-hidden relative bg-surface-container-lowest cursor-pointer" onclick="openMovieModal(${m.id})">
        <img src="${escapeHtml(m.posterUrl)}" alt="${escapeHtml(m.title)}" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onerror="handleImageFallback(this, '${escapeHtml(m.title)}', 'poster')">
        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-80 group-hover:opacity-90 transition-opacity"></div>
        
        <div class="absolute top-2.5 inset-x-2.5 flex items-center justify-between z-10">
          <span class="px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-amber-400 font-bold text-[11px] font-mono flex items-center gap-1 shadow-sm border border-amber-400/25">
            <span class="material-symbols-outlined text-xs">star</span>
            <span>${m.rating}</span>
          </span>
          <button class="w-8 h-8 rounded-full bg-primary text-white backdrop-blur-md flex items-center justify-center transition-all active:scale-90 shadow-md border border-white/10" onclick="toggleWatchlist(${m.id}, event)" title="Remove from Watchlist">
            <span class="material-symbols-outlined text-base">bookmark_remove</span>
          </button>
        </div>

        <div class="absolute bottom-2.5 inset-x-2.5 flex items-center justify-between text-white/90 text-xs z-10">
          <span class="font-mono text-[10px] bg-black/50 px-1.5 py-0.5 rounded backdrop-blur">${escapeHtml(m.runtime || '120m')}</span>
          <span class="w-7 h-7 rounded-full bg-secondary/90 text-white flex items-center justify-center shadow-md">
            <span class="material-symbols-outlined text-sm">play_arrow</span>
          </span>
        </div>
      </div>

      <!-- Content & Status Control -->
      <div class="p-3 space-y-2 flex-1 flex flex-col justify-between">
        <div class="cursor-pointer" onclick="openMovieModal(${m.id})">
          <h4 class="font-bold text-sm text-on-surface line-clamp-1 group-hover:text-primary transition-colors">${escapeHtml(m.title)}</h4>
          <p class="text-[11px] text-outline line-clamp-1">${m.year} • ${escapeHtml(m.director)}</p>
        </div>

        <!-- Watchlist Status Selector -->
        <div class="pt-1 border-t border-outline-variant/60 flex items-center justify-between gap-1 text-[11px]">
          <span class="text-outline text-[10px] uppercase font-semibold">Status:</span>
          <select class="bg-surface-container-high text-on-surface rounded-lg px-2 py-0.5 text-[11px] border border-outline-variant focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer" onchange="updateWatchlistStatus(${m.id}, this.value)">
            <option value="plan" ${m.status === 'plan' ? 'selected' : ''}>Plan to Watch</option>
            <option value="watching" ${m.status === 'watching' ? 'selected' : ''}>Watching</option>
            <option value="watched" ${m.status === 'watched' ? 'selected' : ''}>Watched</option>
          </select>
        </div>
      </div>
    </div>
  `).join('');
}

async function openMovieModal(movieId) {
  const modal = document.getElementById('movie-details-modal');
  if (!modal) return;

  const numId = parseInt(movieId, 10);
  let movie = currentMoviesList.find(m => m.id === numId) || (state.watchlist || []).find(m => m.id === numId);

  if (!movie || !movie.cinematography) {
    try {
      const res = await fetch(`/api/movies/details?id=${numId}`);
      if (res.ok) {
        movie = await res.json();
      }
    } catch (e) {}
  }

  if (!movie) {
    showToast('Movie details could not be loaded.', 'warning', 'movie');
    return;
  }
  activeModalMovie = movie;

  // Hydrate Modal Content
  const backdrop = document.getElementById('modal-movie-backdrop');
  const poster = document.getElementById('modal-movie-poster');
  const title = document.getElementById('modal-movie-title');
  const tagline = document.getElementById('modal-movie-tagline');
  const rating = document.getElementById('modal-movie-rating');
  const yearBadge = document.getElementById('modal-movie-year-badge');
  const genres = document.getElementById('modal-movie-genres');
  const runtime = document.getElementById('modal-movie-runtime');
  const director = document.getElementById('modal-movie-director');
  const overview = document.getElementById('modal-movie-overview');
  const cinemaCraft = document.getElementById('modal-movie-cinematography');
  const cast = document.getElementById('modal-movie-cast');
  const themes = document.getElementById('modal-movie-themes');
  const trailerContainer = document.getElementById('modal-movie-trailer-container');

  if (backdrop) {
    backdrop.onerror = () => handleImageFallback(backdrop, movie.title, 'backdrop');
    backdrop.src = movie.backdropUrl || movie.posterUrl;
  }
  if (poster) {
    poster.onerror = () => handleImageFallback(poster, movie.title, 'poster');
    poster.src = movie.posterUrl;
  }
  if (title) title.textContent = movie.title;
  if (tagline) tagline.textContent = movie.tagline || '';
  if (rating) rating.textContent = movie.rating;
  if (yearBadge) yearBadge.textContent = movie.year;
  if (runtime) runtime.innerHTML = `<span class="material-symbols-outlined text-sm">schedule</span> ${movie.runtime || '120 min'}`;
  if (director) director.innerHTML = `<span class="material-symbols-outlined text-sm">movie_filter</span> Dir. ${escapeHtml(movie.director)}`;
  if (overview) overview.textContent = movie.overview;
  if (cinemaCraft) cinemaCraft.textContent = movie.cinematography || 'Framed with deliberate lighting, depth of field, and compositional balance.';
  if (cast) cast.textContent = (movie.cast || []).join(', ') || 'Ensemble cast';
  if (themes) themes.textContent = (movie.themes || []).join(' • ') || 'Narrative arc, cinematography';

  if (genres) {
    genres.innerHTML = (movie.genres || []).map(g => `
      <span class="px-2 py-0.5 rounded-md bg-surface-container text-outline text-[11px] font-semibold">${escapeHtml(g)}</span>
    `).join('');
  }

  // Inject YouTube Trailer
  if (trailerContainer) {
    const key = movie.trailerKey || 'zSWdZVtXT7E';
    trailerContainer.innerHTML = `
      <iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(key)}?rel=0&modestbranding=1" title="${escapeHtml(movie.title)} Official Trailer" class="w-full h-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
    `;
  }

  updateModalWatchlistBtn(numId);

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function updateModalWatchlistBtn(movieId) {
  const btn = document.getElementById('modal-movie-watchlist-btn');
  if (!btn) return;
  const inWatchlist = isMovieInWatchlist(movieId);
  if (inWatchlist) {
    btn.className = "px-4 py-2.5 rounded-xl bg-primary text-white font-semibold text-xs active:scale-95 transition-all flex items-center gap-1.5 shadow-md";
    btn.innerHTML = `<span class="material-symbols-outlined text-base">bookmark_added</span><span>In Watchlist</span>`;
  } else {
    btn.className = "px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-highest border border-outline-variant text-on-surface font-semibold text-xs active:scale-95 transition-all flex items-center gap-1.5";
    btn.innerHTML = `<span class="material-symbols-outlined text-base">bookmark_add</span><span>Add to Watchlist</span>`;
  }
}

function toggleModalMovieWatchlist() {
  if (activeModalMovie) {
    toggleWatchlist(activeModalMovie.id);
  }
}

function closeMovieModal() {
  const modal = document.getElementById('movie-details-modal');
  const trailerContainer = document.getElementById('modal-movie-trailer-container');
  if (trailerContainer) trailerContainer.innerHTML = '';
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  activeModalMovie = null;
}

function triggerMovieAnalysisFromModal() {
  if (!activeModalMovie) return;
  const title = activeModalMovie.title;
  closeMovieModal();
  sendMoviePrompt(`Analyze the cinematography, narrative themes, and directorial vision of ${title}`);
}

async function sendMoviePrompt(promptText) {
  const input = document.getElementById('movie-ai-input');
  const text = (promptText !== undefined ? promptText : (input ? input.value : '')).trim();

  if (!text) {
    showToast('Please type a film analysis or cinema theory question', 'warning', 'movie');
    if (input) input.focus();
    return;
  }

  if (input && promptText === undefined) {
    input.value = '';
  }

  const responseCard = document.getElementById('movie-ai-response-card');
  const responseContainer = document.getElementById('movie-ai-response');
  const responsePromptText = document.getElementById('movie-ai-query-display');

  if (responseCard) responseCard.classList.remove('hidden');
  if (responsePromptText) responsePromptText.textContent = text;

  if (responseContainer) {
    responseContainer.innerHTML = `
      <div class="flex items-center gap-2 text-tertiary animate-pulse text-xs py-3">
        <span class="material-symbols-outlined text-base">videocam</span>
        <span>Analyzing cinematography, screenplay architecture, and film craft...</span>
      </div>
    `;
  }

  showToast('Cinema Co-Pilot synthesizing film critique...', 'info', 'movie');

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        domain: 'movies',
        topic: 'Cinema',
        tier: state.selectedTier || 'Undergrad',
        language: state.selectedLanguage || 'English'
      })
    });

    if (!res.ok) {
      let errData = {};
      try { errData = await res.json(); } catch (e) {}
      throw new Error(errData.message || `Server responded with status ${res.status}`);
    }

    if (!res.body) throw new Error('Streaming endpoint not readable');

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let accumulated = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const jsonStr = trimmed.slice(5).trim();
        try {
          const data = JSON.parse(jsonStr);
          if (data.chunk) {
            accumulated += data.chunk;
            if (responseContainer) {
              responseContainer.innerHTML = formatMarkdownText(accumulated);
            }
          }
          if (data.done) {
            if (responseContainer) {
              responseContainer.innerHTML = formatMarkdownText(data.fullText || accumulated);
            }
          }
        } catch (parseErr) {}
      }
    }

    if (responseCard) {
      responseCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  } catch (err) {
    if (responseContainer) {
      responseContainer.innerHTML = `
        <div class="p-3 rounded-xl bg-error/10 border border-error/20 text-error text-xs flex items-center gap-2">
          <span class="material-symbols-outlined text-sm">error</span>
          <span>${escapeHtml(err.message || 'Failed to analyze cinema query')}</span>
        </div>
      `;
    }
    showToast(err.message || 'Error from Cinema Co-Pilot', 'error', 'error');
  }
}

function exportWatchlistMarkdown() {
  const list = state.watchlist || [];
  if (list.length === 0) {
    showToast('Your watchlist is empty!', 'warning', 'info');
    return;
  }

  let md = `# NEXORA AI — Cinema Watchlist\n\n`;
  md += `*Exported on: ${new Date().toLocaleDateString()}*\n\n`;
  md += `| Title | Year | Director | Rating | Status | Runtime |\n`;
  md += `|---|---|---|---|---|---|\n`;

  list.forEach(m => {
    md += `| **${m.title}** | ${m.year} | ${m.director} | ★ ${m.rating} | ${m.status ? m.status.toUpperCase() : 'PLAN'} | ${m.runtime || '120m'} |\n`;
  });

  md += `\n---\n*Curated with Nexora AI Cinema Pulse & TMDB Integration*`;

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nexora-watchlist-${Date.now()}.md`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Watchlist exported as Markdown!', 'success', 'download');
}

// ==========================================
// 11. ATTACHMENT CONTROLLER
// ==========================================
let attachedFile = null;

function triggerAttachmentPicker() {
  const input = document.getElementById('file-attachment-input');
  if (input) input.click();
}

function handleFileAttached(event) {
  const file = event.target.files[0];
  if (!file) return;

  attachedFile = file;
  const preview = document.getElementById('attachment-preview');
  if (preview) {
    preview.classList.remove('hidden');
    preview.classList.add('flex');
    preview.innerHTML = `
      <div class="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-surface-container-high text-xs text-on-surface border border-primary/20">
        <span class="material-symbols-outlined text-sm text-secondary">image</span>
        <span class="truncate max-w-[120px]">${escapeHtml(file.name)}</span>
        <button type="button" class="text-outline hover:text-error" onclick="clearAttachment()">
          <span class="material-symbols-outlined text-xs">close</span>
        </button>
      </div>
    `;
  }
  showToast(`Attached: ${file.name}`, 'info', 'attach_file');
}

function clearAttachment() {
  attachedFile = null;
  const preview = document.getElementById('attachment-preview');
  if (preview) {
    preview.classList.add('hidden');
    preview.classList.remove('flex');
    preview.innerHTML = '';
  }
  const input = document.getElementById('file-attachment-input');
  if (input) input.value = '';
}

// ==========================================
// 11. SELECTOR UI SYNCHRONIZATION ENGINE
// ==========================================
function updateSelectorUI() {
  // Topic Pills
  const topicPills = document.querySelectorAll('[data-topic-selector]');
  topicPills.forEach(pill => {
    const topic = pill.getAttribute('data-topic-selector');
    const isSelected = topic.toLowerCase() === state.selectedTopic.toLowerCase();
    if (isSelected) {
      pill.className = "px-3.5 py-1.5 rounded-full bg-primary-container text-white font-label-sm text-label-sm shrink-0 shadow-[0_0_16px_rgba(160,120,255,0.4)] flex items-center gap-1.5 font-semibold transition-all active:scale-95";
      const icon = pill.querySelector('.material-symbols-outlined');
      if (icon) icon.style.fontVariationSettings = "'FILL' 1";
    } else {
      pill.className = "px-3 py-1.5 rounded-full bg-surface-container-high text-on-surface font-label-sm text-label-sm shrink-0 active:scale-95 transition-all flex items-center gap-1.5 shadow-sm";
      const icon = pill.querySelector('.material-symbols-outlined');
      if (icon) icon.style.fontVariationSettings = "'FILL' 0";
    }
  });

  // Tier Pills
  const tierPills = document.querySelectorAll('[data-tier-selector]');
  tierPills.forEach(pill => {
    const tier = pill.getAttribute('data-tier-selector');
    const isSelected = tier.toLowerCase() === state.selectedTier.toLowerCase();
    if (isSelected) {
      pill.className = "px-2.5 py-1 rounded-lg bg-surface-container-highest text-primary font-label-sm text-label-sm font-semibold shadow-sm transition-all";
    } else {
      pill.className = "px-2.5 py-1 rounded-lg bg-surface-container text-on-surface-variant font-label-sm text-label-sm hover:text-on-surface active:bg-surface-container-high transition-colors";
    }
  });

  // Language Pills
  const langPills = document.querySelectorAll('[data-lang-selector]');
  langPills.forEach(pill => {
    const lang = pill.getAttribute('data-lang-selector');
    const isSelected = lang.toLowerCase() === state.selectedLanguage.toLowerCase();
    if (isSelected) {
      pill.className = "px-2.5 py-0.5 rounded-full bg-tertiary-container text-white font-label-sm text-label-sm font-semibold shadow-[0_0_12px_rgba(155,127,237,0.7)] flex items-center gap-1 transition-all";
    } else {
      pill.className = "px-2 py-0.5 text-xs rounded-full text-on-surface-variant font-label-sm text-label-sm hover:text-on-surface transition-colors";
    }
  });
}

// ==========================================
// 12. SUPABASE AUTH & ROW LEVEL SECURITY (RLS) CONTROLLER
// ==========================================
window.supabaseClient = null;
let authCurrentTab = 'signin';
let isSupabaseConfigured = false;

function getInitials(name) {
  if (!name || typeof name !== 'string') return 'AX';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

async function initSupabaseAuth() {
  const config = window.NEXORA_SERVER_CONFIG || {};
  const statusEl = document.getElementById('auth-supabase-status');
  
  if (config.supabaseConfigured && config.supabaseUrl && config.supabaseAnonKey) {
    isSupabaseConfigured = true;
    try {
      if (window.supabase && typeof window.supabase.createClient === 'function') {
        window.supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        });

        if (statusEl) {
          let host = 'Supabase Cloud';
          try { host = new URL(config.supabaseUrl).hostname; } catch (e) {}
          statusEl.innerHTML = `
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span class="text-on-surface font-medium text-[11px]">Connected: <strong class="text-primary">${escapeHtml(host)}</strong> (RLS Protected)</span>
          `;
        }

        // Listen for Supabase Auth state changes
        window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
          console.log('[SupabaseAuth] Auth state event:', event);
          if (session?.user) {
            await handleSupabaseUserAuthenticated(session.user);
          } else if (event === 'SIGNED_OUT') {
            handleSupabaseUserSignedOut();
          }
        });

        // Check for existing session
        const { data: { session }, error } = await window.supabaseClient.auth.getSession();
        if (session?.user) {
          await handleSupabaseUserAuthenticated(session.user);
        } else {
          updateUserUI();
          updateProfileModalUI();
        }
      } else {
        console.warn('[SupabaseAuth] Supabase library not loaded. Running in local mode.');
        updateUserUI();
        updateProfileModalUI();
      }
    } catch (err) {
      console.warn('[SupabaseAuth] Failed to initialize Supabase client:', err);
      if (statusEl) {
        statusEl.innerHTML = `
          <span class="w-2 h-2 rounded-full bg-amber-400"></span>
          <span class="text-outline text-[11px]">Local Session Active (Supabase init fallback)</span>
        `;
      }
      updateUserUI();
      updateProfileModalUI();
    }
  } else {
    isSupabaseConfigured = false;
    if (statusEl) {
      statusEl.innerHTML = `
        <span class="w-2 h-2 rounded-full bg-amber-400"></span>
        <span class="text-outline text-[11px]">Local Guest Mode • Set <code class="text-secondary font-mono">SUPABASE_URL</code> in <code class="text-secondary font-mono">.env</code> to connect Cloud Postgres</span>
      `;
    }
    updateUserUI();
    updateProfileModalUI();
  }
}

async function handleSupabaseUserAuthenticated(user) {
  if (!user) return;
  state.user = state.user || {};
  state.user.id = user.id;
  state.user.email = user.email || '';
  state.user.isAuthenticated = true;

  // Try to read profile row from public.profiles
  try {
    if (window.supabaseClient) {
      const { data: profile, error } = await window.supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        if (profile.display_name) state.user.displayName = profile.display_name;
        if (profile.academic_tier) state.user.academicTier = profile.academic_tier;
        if (profile.preferred_language) state.user.preferredLanguage = profile.preferred_language;
        if (profile.xp_points !== undefined) state.user.xp = profile.xp_points;
        if (profile.study_streak_days !== undefined) state.user.streakDays = profile.study_streak_days;
        if (profile.avatar_url) state.user.avatarUrl = profile.avatar_url;
      } else {
        const metaName = user.user_metadata?.full_name || user.user_metadata?.name;
        state.user.displayName = metaName || (user.email ? user.email.split('@')[0] : 'Scholar');
      }
    }
  } catch (err) {
    console.warn('[SupabaseAuth] Error loading user profile:', err);
  }

  saveState();
  updateUserUI();
  updateProfileModalUI();

  // Cloud Sync All 5 Scholar Artifacts (Watchlist, Notes, Flashcards, Quiz History, Chat)
  await syncAllDataWithSupabase();
}

function handleSupabaseUserSignedOut() {
  state.user = {
    id: null,
    email: '',
    displayName: 'Alex Mercer',
    avatarUrl: '',
    academicTier: state.selectedTier || 'Undergrad',
    preferredLanguage: state.selectedLanguage || 'Hinglish',
    xp: 1420,
    streakDays: 4,
    isAuthenticated: false
  };
  saveState();
  updateUserUI();
  updateProfileModalUI();
  showToast('Switched to Local Guest Mode', 'info', 'person_off');
}

function updateUserUI() {
  const user = state.user || defaultState.user;
  const initials = getInitials(user.displayName || 'Alex Mercer');
  const isAuth = Boolean(user.isAuthenticated);

  // 1. Sidebar desktop
  const sbAvatar = document.getElementById('sidebar-user-avatar');
  const sbName = document.getElementById('sidebar-user-name');
  const sbDot = document.getElementById('sidebar-user-dot');
  const sbStatus = document.getElementById('sidebar-user-status-text');

  if (sbAvatar) sbAvatar.textContent = initials;
  if (sbName) sbName.textContent = user.displayName || 'Scholar';
  if (sbDot) {
    sbDot.className = isAuth 
      ? "w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.8)]" 
      : "w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0";
  }
  if (sbStatus) {
    sbStatus.textContent = isAuth ? 'Cloud Synced (RLS)' : 'Local Guest';
  }

  // 2. Mobile drawer
  const mbAvatar = document.getElementById('mobile-user-avatar');
  const mbName = document.getElementById('mobile-user-name');
  const mbDot = document.getElementById('mobile-user-dot');
  const mbStatus = document.getElementById('mobile-user-status-text');

  if (mbAvatar) mbAvatar.textContent = initials;
  if (mbName) mbName.textContent = user.displayName || 'Scholar';
  if (mbDot) {
    mbDot.className = isAuth 
      ? "w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.8)]" 
      : "w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0";
  }
  if (mbStatus) {
    mbStatus.textContent = isAuth ? 'Cloud Synced' : 'Local Guest';
  }

  // 3. Top sticky header
  const hdAvatar = document.getElementById('header-user-avatar');
  const hdLabel = document.getElementById('header-auth-label');
  const hdDot = document.getElementById('header-auth-dot');

  if (hdAvatar) hdAvatar.textContent = initials;
  if (hdDot) {
    hdDot.className = isAuth 
      ? "w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.8)]" 
      : "w-2 h-2 rounded-full bg-amber-400 shrink-0";
  }
  if (hdLabel) {
    hdLabel.textContent = isAuth ? (user.displayName ? user.displayName.split(' ')[0] : 'Cloud') : 'Guest Mode';
  }
}

function updateProfileModalUI() {
  const user = state.user || defaultState.user;
  const isAuth = Boolean(user.isAuthenticated);
  const initials = getInitials(user.displayName || 'Alex Mercer');

  const avatarEl = document.getElementById('profile-modal-avatar');
  const nameEl = document.getElementById('profile-modal-name');
  const emailEl = document.getElementById('profile-modal-email');
  const badgeEl = document.getElementById('profile-modal-auth-badge');
  const tierEl = document.getElementById('profile-modal-tier');
  const streakEl = document.getElementById('profile-modal-streak');
  const xpEl = document.getElementById('profile-modal-xp');
  const actionsEl = document.getElementById('profile-modal-actions');
  const cloudDescEl = document.getElementById('profile-modal-cloud-desc');
  const secTagEl = document.getElementById('profile-modal-security-tag');

  if (avatarEl) avatarEl.textContent = initials;
  if (nameEl) nameEl.textContent = user.displayName || 'Alex Mercer';
  if (emailEl) emailEl.textContent = isAuth && user.email ? user.email : 'Local Session (Offline Guest)';

  if (badgeEl) {
    if (isAuth) {
      badgeEl.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-semibold text-emerald-400";
      badgeEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span><span>Supabase RLS Protected</span>`;
    } else {
      badgeEl.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container border border-outline-variant text-[11px] font-medium text-outline";
      badgeEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-400"></span><span>Local Guest Session</span>`;
    }
  }

  if (tierEl) {
    tierEl.innerHTML = `<span class="material-symbols-outlined text-sm">school</span><span>${escapeHtml(user.academicTier || state.selectedTier || 'Undergrad')}</span>`;
  }
  if (streakEl) {
    streakEl.innerHTML = `<span class="material-symbols-outlined text-sm">local_fire_department</span><span>${user.streakDays || 4}-Day Streak</span>`;
  }
  if (xpEl) {
    xpEl.textContent = `${(user.xp || 1420).toLocaleString()} XP`;
  }

  if (secTagEl) {
    secTagEl.textContent = isAuth ? 'Active • RLS Enforced' : 'Local Storage Mode';
    secTagEl.className = isAuth
      ? "px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 text-[10px] font-semibold"
      : "px-2 py-0.5 rounded-md bg-surface-container-high text-outline text-[10px] font-semibold";
  }

  if (cloudDescEl) {
    cloudDescEl.textContent = isAuth
      ? `Connected to Supabase PostgreSQL. Your watchlists, flashcard decks, and quiz scores are isolated to UID: ${user.id ? user.id.slice(0, 8) + '...' : ''}.`
      : 'Connect your Supabase project in .env to enable multi-device Postgres syncing with Row Level Security data isolation.';
  }

  if (actionsEl) {
    if (isAuth) {
      actionsEl.innerHTML = `
        <button onclick="syncWithSupabaseNow()" class="w-full py-2.5 rounded-xl bg-gradient-to-r from-secondary to-primary text-white font-semibold text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 hover:brightness-110">
          <span class="material-symbols-outlined text-base">sync</span>
          <span>Sync Watchlist &amp; Cloud Data</span>
        </button>
        <button onclick="handleSignOut()" class="w-full py-2 rounded-xl bg-surface-container hover:bg-error/15 text-error font-semibold text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5">
          <span class="material-symbols-outlined text-base">logout</span>
          <span>Sign Out</span>
        </button>
        <button onclick="closeModal('profile-modal')" class="w-full py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-xs transition-colors">
          Close Profile
        </button>
      `;
    } else {
      actionsEl.innerHTML = `
        <button onclick="closeModal('profile-modal'); openAuthModal('signin');" class="w-full py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-container text-white font-semibold text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 hover:brightness-110">
          <span class="material-symbols-outlined text-base">login</span>
          <span>Sign In / Connect Supabase</span>
        </button>
        <button onclick="closeModal('profile-modal'); openAuthModal('signup');" class="w-full py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-primary font-semibold text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5">
          <span class="material-symbols-outlined text-base">person_add</span>
          <span>Create Free Account</span>
        </button>
        <button onclick="closeModal('profile-modal')" class="w-full py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-xs transition-colors">
          Close Profile
        </button>
      `;
    }
  }
}

function handleProfileBarClick() {
  updateProfileModalUI();
  openModal('profile-modal');
}

function handleHeaderAuthClick() {
  if (state.user?.isAuthenticated) {
    updateProfileModalUI();
    openModal('profile-modal');
  } else {
    openAuthModal('signin');
  }
}

function openAuthModal(tab = 'signin') {
  const modal = document.getElementById('auth-modal');
  if (!modal) return;
  switchAuthTab(tab);
  clearAuthAlert();
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  clearAuthAlert();
}

function switchAuthTab(tab) {
  authCurrentTab = tab;
  const btnSignin = document.getElementById('auth-tab-btn-signin');
  const btnSignup = document.getElementById('auth-tab-btn-signup');
  const groupName = document.getElementById('auth-group-name');
  const submitText = document.getElementById('auth-submit-text');
  clearAuthAlert();

  if (tab === 'signup') {
    if (btnSignup) {
      btnSignup.className = "flex-1 py-2 rounded-xl text-center font-semibold transition-all bg-surface-container-high text-primary shadow-sm flex items-center justify-center gap-1.5";
    }
    if (btnSignin) {
      btnSignin.className = "flex-1 py-2 rounded-xl text-center font-semibold transition-all text-on-surface-variant hover:text-on-surface flex items-center justify-center gap-1.5";
    }
    if (groupName) groupName.classList.remove('hidden');
    if (submitText) submitText.textContent = "Create Account & Sync";
  } else {
    if (btnSignin) {
      btnSignin.className = "flex-1 py-2 rounded-xl text-center font-semibold transition-all bg-surface-container-high text-primary shadow-sm flex items-center justify-center gap-1.5";
    }
    if (btnSignup) {
      btnSignup.className = "flex-1 py-2 rounded-xl text-center font-semibold transition-all text-on-surface-variant hover:text-on-surface flex items-center justify-center gap-1.5";
    }
    if (groupName) groupName.classList.add('hidden');
    if (submitText) submitText.textContent = "Sign In to Nexora";
  }
}

function toggleAuthPasswordVisibility() {
  const pwdInput = document.getElementById('auth-input-password');
  const icon = document.getElementById('auth-password-toggle-icon');
  if (!pwdInput) return;
  if (pwdInput.type === 'password') {
    pwdInput.type = 'text';
    if (icon) icon.textContent = 'visibility_off';
  } else {
    pwdInput.type = 'password';
    if (icon) icon.textContent = 'visibility';
  }
}

function showAuthAlert(message, type = 'error') {
  const alertBox = document.getElementById('auth-alert-box');
  if (!alertBox) return;
  alertBox.classList.remove('hidden');
  alertBox.classList.add('flex');
  if (type === 'error') {
    alertBox.className = "p-3 rounded-xl text-xs flex items-center gap-2 border bg-error/10 border-error/25 text-error";
    alertBox.innerHTML = `<span class="material-symbols-outlined text-base shrink-0">error</span><span>${escapeHtml(message)}</span>`;
  } else {
    alertBox.className = "p-3 rounded-xl text-xs flex items-center gap-2 border bg-emerald-500/10 border-emerald-500/25 text-emerald-400";
    alertBox.innerHTML = `<span class="material-symbols-outlined text-base shrink-0">check_circle</span><span>${escapeHtml(message)}</span>`;
  }
}

function clearAuthAlert() {
  const alertBox = document.getElementById('auth-alert-box');
  if (alertBox) {
    alertBox.classList.add('hidden');
    alertBox.classList.remove('flex');
    alertBox.innerHTML = '';
  }
}

async function handleAuthSubmit(event) {
  if (event && event.preventDefault) event.preventDefault();

  const emailInput = document.getElementById('auth-input-email');
  const passwordInput = document.getElementById('auth-input-password');
  const nameInput = document.getElementById('auth-input-name');
  const submitBtn = document.getElementById('auth-submit-btn');

  const email = (emailInput?.value || '').trim();
  const password = (passwordInput?.value || '').trim();
  const fullName = (nameInput?.value || '').trim();

  if (!email || !password) {
    showAuthAlert('Please provide both email and password.');
    return;
  }

  if (password.length < 6) {
    showAuthAlert('Password must be at least 6 characters.');
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-75');
  }

  try {
    if (window.supabaseClient && isSupabaseConfigured) {
      if (authCurrentTab === 'signup') {
        const { data, error } = await window.supabaseClient.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName || email.split('@')[0] }
          }
        });
        if (error) throw error;

        if (data.user) {
          showAuthAlert('Account created successfully! Check email for confirmation if required.', 'success');
          showToast('Account registered with Supabase!', 'success', 'check_circle');
          setTimeout(() => {
            closeAuthModal();
          }, 1200);
        }
      } else {
        const { data, error } = await window.supabaseClient.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;

        if (data.user) {
          showAuthAlert('Signed in successfully! Syncing your data...', 'success');
          showToast(`Welcome back, ${data.user.email}!`, 'success', 'cloud_done');
          setTimeout(() => {
            closeAuthModal();
          }, 800);
        }
      }
    } else {
      // Local Scholar Simulation (when SUPABASE_URL is unconfigured or testing offline)
      state.user = {
        id: 'local-user-' + Math.random().toString(36).substring(2, 9),
        email,
        displayName: fullName || email.split('@')[0] || 'Scholar',
        avatarUrl: '',
        academicTier: state.selectedTier || 'Undergrad',
        preferredLanguage: state.selectedLanguage || 'Hinglish',
        xp: state.user?.xp || 1420,
        streakDays: state.user?.streakDays || 4,
        isAuthenticated: true
      };
      saveState();
      updateUserUI();
      updateProfileModalUI();
      showAuthAlert('Local Scholar Session activated. (Configure SUPABASE_URL in .env for live PostgreSQL RLS cloud sync).', 'success');
      showToast(`Signed in as ${state.user.displayName}`, 'success', 'login');
      setTimeout(() => {
        closeAuthModal();
      }, 1000);
    }
  } catch (err) {
    console.error('[SupabaseAuth] Auth error:', err);
    showAuthAlert(err.message || 'Authentication failed. Please verify credentials.');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove('opacity-75');
    }
  }
}

async function handleMagicLinkRequest() {
  const emailInput = document.getElementById('auth-input-email');
  const email = (emailInput?.value || '').trim();

  if (!email) {
    showAuthAlert('Please enter your email above to receive a magic link.');
    if (emailInput) emailInput.focus();
    return;
  }

  try {
    if (window.supabaseClient && isSupabaseConfigured) {
      const { error } = await window.supabaseClient.auth.signInWithOtp({ email });
      if (error) throw error;
      showAuthAlert(`Magic link dispatched to ${email}! Check your inbox.`, 'success');
      showToast('Magic link dispatched!', 'info', 'mark_email_read');
    } else {
      showAuthAlert('Magic links require SUPABASE_URL and SUPABASE_ANON_KEY configured in .env.');
    }
  } catch (err) {
    showAuthAlert(err.message || 'Could not send magic link.');
  }
}

function continueAsGuest() {
  closeAuthModal();
  showToast('Continuing in Local Guest Mode', 'info', 'person');
}

async function handleSignOut() {
  try {
    if (window.supabaseClient && isSupabaseConfigured) {
      await window.supabaseClient.auth.signOut();
    }
  } catch (e) {
    console.warn('[SupabaseAuth] SignOut error:', e);
  }
  handleSupabaseUserSignedOut();
  closeModal('profile-modal');
}

async function syncWithSupabaseNow() {
  if (!window.supabaseClient || !isSupabaseConfigured || !state.user?.isAuthenticated) {
    showToast('Connect a Supabase account to sync data', 'warning', 'cloud_off');
    return;
  }
  showToast('Synchronizing all scholar artifacts with Supabase Cloud...', 'info', 'sync');
  await syncAllDataWithSupabase();
  showToast('Cloud synchronization complete across all 5 artifacts!', 'success', 'cloud_done');
}

async function syncAllDataWithSupabase() {
  if (!window.supabaseClient || !state.user?.isAuthenticated || !state.user?.id) return;

  await Promise.allSettled([
    syncWatchlistWithSupabase(),
    syncNotesWithSupabase(),
    syncFlashcardsWithSupabase(),
    syncQuizHistoryWithSupabase(),
    syncChatHistoryWithSupabase()
  ]);
}

// 12.1 WATCHLIST SYNC
async function syncWatchlistWithSupabase() {
  if (!window.supabaseClient || !state.user?.isAuthenticated || !state.user?.id) {
    return;
  }

  try {
    const { data: remoteRows, error } = await window.supabaseClient
      .from('movie_watchlist')
      .select('*')
      .eq('user_id', state.user.id);

    if (error) {
      console.warn('[SupabaseWatchlist] Error fetching remote items:', error);
      return;
    }

    const localList = state.watchlist || [];
    const remoteList = (remoteRows || []).map(r => ({
      id: r.movie_id,
      title: r.title,
      year: r.year,
      director: r.director,
      rating: parseFloat(r.rating) || 8.0,
      runtime: r.runtime || '120m',
      posterUrl: r.poster_url || '',
      backdropUrl: r.backdrop_url || '',
      genres: r.genres || [],
      trailerKey: r.trailer_key || 'zSWdZVtXT7E',
      status: r.status || 'plan',
      addedAt: new Date(r.created_at).toLocaleDateString()
    }));

    const remoteMovieIds = new Set(remoteList.map(m => m.id));
    const itemsToUpload = localList.filter(l => !remoteMovieIds.has(l.id));

    if (itemsToUpload.length > 0) {
      const payload = itemsToUpload.map(m => ({
        user_id: state.user.id,
        movie_id: m.id,
        title: m.title,
        year: parseInt(m.year, 10) || null,
        director: m.director,
        rating: parseFloat(m.rating) || null,
        runtime: m.runtime,
        poster_url: m.posterUrl,
        backdrop_url: m.backdropUrl,
        genres: m.genres || [],
        trailer_key: m.trailerKey,
        status: m.status || 'plan'
      }));

      const { error: upsertErr } = await window.supabaseClient
        .from('movie_watchlist')
        .upsert(payload, { onConflict: 'user_id,movie_id' });

      if (upsertErr) {
        console.warn('[SupabaseWatchlist] Error uploading local items:', upsertErr);
      }
    }

    const mergedMap = new Map();
    remoteList.forEach(m => mergedMap.set(m.id, m));
    localList.forEach(m => {
      if (!mergedMap.has(m.id)) mergedMap.set(m.id, m);
    });

    state.watchlist = Array.from(mergedMap.values());
    saveState();
    updateWatchlistBadges();
    if (activeMovieCategory === 'watchlist') {
      renderWatchlistGrid();
    }
  } catch (err) {
    console.warn('[SupabaseWatchlist] Sync exception:', err);
  }
}

// 12.2 NOTES SYNC
async function syncNotesWithSupabase() {
  if (!window.supabaseClient || !state.user?.isAuthenticated || !state.user?.id) return;

  try {
    const { data: remoteRows, error } = await window.supabaseClient
      .from('study_notes')
      .select('*')
      .eq('user_id', state.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[SupabaseNotes] Error fetching notes:', error);
      return;
    }

    if (!Array.isArray(state.savedNotes)) state.savedNotes = [];

    const remoteNotes = (remoteRows || []).map(r => ({
      id: r.note_client_id || ('note-remote-' + r.id),
      title: r.title,
      topic: r.topic,
      tier: r.tier || 'Undergrad',
      date: new Date(r.created_at).toLocaleDateString(),
      summary: r.summary
    }));

    const remoteNoteIds = new Set(remoteNotes.map(n => n.id));
    const toUpload = state.savedNotes.filter(n => !remoteNoteIds.has(n.id));

    if (toUpload.length > 0) {
      const payload = toUpload.map(n => ({
        user_id: state.user.id,
        note_client_id: n.id,
        title: n.title,
        topic: n.topic,
        tier: n.tier,
        summary: n.summary
      }));

      const { error: upsertErr } = await window.supabaseClient
        .from('study_notes')
        .upsert(payload, { onConflict: 'user_id,note_client_id' });

      if (upsertErr) {
        console.warn('[SupabaseNotes] Error uploading local notes:', upsertErr);
      }
    }

    const noteMap = new Map();
    remoteNotes.forEach(n => noteMap.set(n.id, n));
    state.savedNotes.forEach(n => {
      if (!noteMap.has(n.id)) noteMap.set(n.id, n);
    });

    state.savedNotes = Array.from(noteMap.values());
    saveState();
    renderLibraryVault();
  } catch (err) {
    console.warn('[SupabaseNotes] Sync exception:', err);
  }
}

// 12.3 FLASHCARDS SYNC & REALTIME UPSERT
function upsertFlashcardToSupabase(cardId) {
  if (!window.supabaseClient || !state.user?.isAuthenticated || !state.user?.id) return;
  const card = FLASHCARDS.find(c => c.id === cardId);
  if (!card) return;

  const isBookmarked = Array.isArray(state.bookmarkedCards) && state.bookmarkedCards.includes(cardId);
  const isMastered = Array.isArray(state.masteredCards) && state.masteredCards.includes(cardId);

  window.supabaseClient
    .from('study_flashcards')
    .upsert({
      user_id: state.user.id,
      card_client_id: String(card.id),
      topic: card.topic || 'Science',
      tier: card.tier || 'Undergrad',
      difficulty: card.difficulty || 'Medium',
      front_title: card.frontTitle,
      front_subtitle: card.frontSubtitle || null,
      hint: card.hint || null,
      equation: card.equation || null,
      back_answer: card.backAnswer || '',
      is_bookmarked: isBookmarked,
      is_mastered: isMastered
    }, { onConflict: 'user_id,card_client_id' })
    .then(({ error }) => {
      if (error) console.warn('[SupabaseFlashcards] Upsert error:', error);
    });
}

async function syncFlashcardsWithSupabase() {
  if (!window.supabaseClient || !state.user?.isAuthenticated || !state.user?.id) return;

  try {
    const { data: remoteRows, error } = await window.supabaseClient
      .from('study_flashcards')
      .select('*')
      .eq('user_id', state.user.id);

    if (error) {
      console.warn('[SupabaseFlashcards] Error fetching flashcards:', error);
      return;
    }

    if (!Array.isArray(state.bookmarkedCards)) state.bookmarkedCards = [];
    if (!Array.isArray(state.masteredCards)) state.masteredCards = [];

    (remoteRows || []).forEach(r => {
      const cardId = parseInt(r.card_client_id, 10);
      if (!isNaN(cardId)) {
        if (r.is_bookmarked && !state.bookmarkedCards.includes(cardId)) {
          state.bookmarkedCards.push(cardId);
        }
        if (r.is_mastered && !state.masteredCards.includes(cardId)) {
          state.masteredCards.push(cardId);
        }
      }
    });

    const remoteCardIds = new Set((remoteRows || []).map(r => r.card_client_id));
    const allLocalIds = new Set([...state.bookmarkedCards, ...state.masteredCards]);

    for (const cardId of allLocalIds) {
      if (!remoteCardIds.has(String(cardId))) {
        upsertFlashcardToSupabase(cardId);
      }
    }

    saveState();
    renderFlashcardDeck();
    renderLibraryVault();
  } catch (err) {
    console.warn('[SupabaseFlashcards] Sync exception:', err);
  }
}

// 12.4 QUIZ RESULTS SYNC & REALTIME PERSISTENCE
function pushQuizAttemptToSupabase(attempt) {
  if (!window.supabaseClient || !state.user?.isAuthenticated || !state.user?.id) return;
  window.supabaseClient
    .from('study_quiz_history')
    .upsert({
      user_id: state.user.id,
      quiz_client_id: attempt.id,
      topic: attempt.topic,
      tier: attempt.tier || 'Undergrad',
      score: attempt.score,
      total_questions: attempt.totalQuestions,
      created_at: attempt.date
    }, { onConflict: 'user_id,quiz_client_id' })
    .then(({ error }) => {
      if (error) console.warn('[SupabaseQuiz] Upsert error:', error);
    });
}

async function syncQuizHistoryWithSupabase() {
  if (!window.supabaseClient || !state.user?.isAuthenticated || !state.user?.id) return;

  try {
    const { data: remoteRows, error } = await window.supabaseClient
      .from('study_quiz_history')
      .select('*')
      .eq('user_id', state.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[SupabaseQuiz] Error fetching quiz history:', error);
      return;
    }

    if (!Array.isArray(state.quizHistory)) state.quizHistory = [];

    const remoteQuizzes = (remoteRows || []).map(r => ({
      id: r.quiz_client_id || ('quiz-remote-' + r.id),
      topic: r.topic,
      tier: r.tier || 'Undergrad',
      score: r.score,
      totalQuestions: r.total_questions,
      percentage: parseFloat(r.percentage) || Math.round((r.score / r.total_questions) * 100),
      xpEarned: r.score * 50,
      date: r.created_at
    }));

    const remoteIds = new Set(remoteQuizzes.map(q => q.id));
    const toUpload = state.quizHistory.filter(q => !remoteIds.has(q.id));

    if (toUpload.length > 0) {
      const payload = toUpload.map(q => ({
        user_id: state.user.id,
        quiz_client_id: q.id,
        topic: q.topic,
        tier: q.tier || 'Undergrad',
        score: q.score,
        total_questions: q.totalQuestions,
        created_at: q.date
      }));

      const { error: upsertErr } = await window.supabaseClient
        .from('study_quiz_history')
        .upsert(payload, { onConflict: 'user_id,quiz_client_id' });

      if (upsertErr) {
        console.warn('[SupabaseQuiz] Error uploading local quizzes:', upsertErr);
      }
    }

    const quizMap = new Map();
    remoteQuizzes.forEach(q => quizMap.set(q.id, q));
    state.quizHistory.forEach(q => {
      if (!quizMap.has(q.id)) quizMap.set(q.id, q);
    });

    state.quizHistory = Array.from(quizMap.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
    saveState();
    renderLibraryVault();
  } catch (err) {
    console.warn('[SupabaseQuiz] Sync exception:', err);
  }
}

// 12.5 CHAT HISTORY SYNC & REALTIME PERSISTENCE
let currentChatSessionPromise = null;

async function getOrCreateSupabaseChatSession() {
  if (!window.supabaseClient || !state.user?.isAuthenticated || !state.user?.id) return null;
  if (state.currentChatSessionId) return state.currentChatSessionId;

  if (currentChatSessionPromise) return currentChatSessionPromise;

  currentChatSessionPromise = (async () => {
    try {
      const sessionClientId = 'session-' + Date.now();
      const domain = state.activeTab === 'music-flow' ? 'music' : (state.activeTab === 'cinema-pulse' ? 'movies' : 'study');
      const { data, error } = await window.supabaseClient
        .from('chat_sessions')
        .insert({
          user_id: state.user.id,
          session_client_id: sessionClientId,
          title: `Session (${state.selectedTopic || 'General'})`,
          domain: domain,
          topic: state.selectedTopic || 'Science',
          tier: state.selectedTier || 'Undergrad',
          language: state.selectedLanguage || 'Hinglish'
        })
        .select('id')
        .single();

      if (error) {
        console.warn('[SupabaseChat] Error creating session:', error);
        return null;
      }
      state.currentChatSessionId = data.id;
      saveState();
      return data.id;
    } catch (e) {
      console.warn('[SupabaseChat] Session exception:', e);
      return null;
    } finally {
      currentChatSessionPromise = null;
    }
  })();

  return currentChatSessionPromise;
}

async function pushChatMessageToSupabase(msg) {
  if (!window.supabaseClient || !state.user?.isAuthenticated || !state.user?.id) return;
  try {
    const sessionId = await getOrCreateSupabaseChatSession();
    if (!sessionId) return;

    const { error } = await window.supabaseClient
      .from('chat_messages')
      .upsert({
        session_id: sessionId,
        user_id: state.user.id,
        message_client_id: msg.id,
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
        domain: msg.domain || 'study'
      }, { onConflict: 'user_id,message_client_id' });

    if (error) {
      console.warn('[SupabaseChat] Error uploading chat message:', error);
    }
  } catch (err) {
    console.warn('[SupabaseChat] pushChatMessage error:', err);
  }
}

async function syncChatHistoryWithSupabase() {
  if (!window.supabaseClient || !state.user?.isAuthenticated || !state.user?.id) return;

  try {
    const { data: remoteRows, error } = await window.supabaseClient
      .from('chat_messages')
      .select('*')
      .eq('user_id', state.user.id)
      .order('created_at', { ascending: true })
      .limit(60);

    if (error) {
      console.warn('[SupabaseChat] Error fetching remote chat history:', error);
      return;
    }

    if (!Array.isArray(state.messages)) state.messages = [];

    const remoteMessages = (remoteRows || []).map(r => ({
      id: r.message_client_id || ('msg-remote-' + r.id),
      role: r.role,
      content: r.content,
      domain: r.domain,
      topic: 'Science',
      tier: 'Undergrad',
      timestamp: new Date(r.created_at).getTime()
    }));

    const remoteClientIds = new Set(remoteMessages.map(m => m.id));
    const toUpload = state.messages.filter(m => !remoteClientIds.has(m.id));

    if (toUpload.length > 0) {
      for (const m of toUpload) {
        await pushChatMessageToSupabase(m);
      }
    }

    const messageMap = new Map();
    state.messages.forEach(m => messageMap.set(m.id, m));
    remoteMessages.forEach(m => {
      if (!messageMap.has(m.id)) messageMap.set(m.id, m);
    });

    state.messages = Array.from(messageMap.values()).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    saveState();
  } catch (err) {
    console.warn('[SupabaseChat] Sync error:', err);
  }
}

function renderPersistedChatHistory() {
  const stream = document.getElementById('chat-stream');
  if (!stream || !Array.isArray(state.messages) || state.messages.length === 0) return;

  const recentMessages = state.messages.slice(-8);
  let html = '';

  recentMessages.forEach(msg => {
    if (msg.role === 'user') {
      html += `
        <div class="flex items-start justify-end gap-space-sm pl-8 animate-fade-in" data-persisted-msg-id="${msg.id}">
          <div class="flex flex-col items-end gap-1">
            <div class="rounded-2xl rounded-tr-xs bg-surface-container-highest px-space-md py-2.5 text-on-surface shadow-md">
              <p class="font-body-md text-body-md leading-relaxed">${escapeHtml(msg.content)}</p>
            </div>
            <span class="font-label-sm text-label-sm text-outline px-1">${msg.topic || 'Science'} • Saved Memory</span>
          </div>
          <div class="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant shrink-0 mt-0.5">
            <span class="material-symbols-outlined text-sm">person</span>
          </div>
        </div>
      `;
    } else {
      const domainName = msg.domain === 'music' ? 'Music Flow' : (msg.domain === 'movies' ? 'Cinema Pulse' : 'Study Hub');
      const domainIcon = msg.domain === 'music' ? 'headphones' : (msg.domain === 'movies' ? 'movie' : 'school');
      const domainColor = msg.domain === 'music' ? 'text-secondary' : (msg.domain === 'movies' ? 'text-tertiary' : 'text-primary');

      html += `
        <div class="flex items-start gap-space-sm pr-1 animate-fade-in" data-persisted-msg-id="${msg.id}">
          <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white shrink-0 mt-1 shadow-md">
            <span class="material-symbols-outlined text-base" style="font-variation-settings: 'FILL' 1;">auto_awesome</span>
          </div>
          <div class="flex-1 rounded-2xl rounded-tl-xs bg-surface-container p-space-md shadow-lg relative overflow-hidden space-y-space-md border border-outline-variant">
            <div class="flex items-center justify-between pb-1">
              <div class="flex items-center gap-1.5">
                <span class="px-2 py-0.5 rounded-full bg-surface-container-high ${domainColor} font-label-sm text-label-sm font-semibold flex items-center gap-1">
                  <span class="material-symbols-outlined text-xs">${domainIcon}</span>
                  ${domainName}
                </span>
                <span class="font-label-sm text-label-sm text-outline">• Restored Turn</span>
              </div>
              <span class="text-xs text-emerald-400 flex items-center gap-1">
                <span class="material-symbols-outlined text-xs">history</span>
                Persisted
              </span>
            </div>
            <div class="font-body-md text-body-md text-on-surface-variant leading-relaxed">
              <p class="leading-relaxed">${escapeHtml(msg.content)}</p>
            </div>
          </div>
        </div>
      `;
    }
  });

  if (html) {
    stream.innerHTML = html;
  }
}

// ==========================================
// 13. INITIALIZATION & EVENT BINDINGS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  // Bind Input Enter Key
  const input = document.getElementById('study-input');
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSend();
      }
    });
  }

  // Bind Submit Button
  const submitBtn = document.getElementById('study-submit-btn');
  if (submitBtn) {
    submitBtn.addEventListener('click', () => handleSend());
  }

  // Bind Topic Pills
  const topicPills = document.querySelectorAll('[data-topic-selector]');
  topicPills.forEach(pill => {
    pill.addEventListener('click', () => {
      state.selectedTopic = pill.getAttribute('data-topic-selector');
      state.quizTopicFilter = state.selectedTopic;
      state.flashcardTopicFilter = state.selectedTopic;
      saveState();
      updateSelectorUI();
      showToast(`Topic: ${state.selectedTopic}`, 'info', 'school');
    });
  });

  // Bind Tier Pills
  const tierPills = document.querySelectorAll('[data-tier-selector]');
  tierPills.forEach(pill => {
    pill.addEventListener('click', () => {
      state.selectedTier = pill.getAttribute('data-tier-selector');
      saveState();
      updateSelectorUI();
      showToast(`Academic Tier: ${state.selectedTier}`, 'info', 'military_tech');
    });
  });

  // Bind Language Pills
  const langPills = document.querySelectorAll('[data-lang-selector]');
  langPills.forEach(pill => {
    pill.addEventListener('click', () => {
      state.selectedLanguage = pill.getAttribute('data-lang-selector');
      saveState();
      updateSelectorUI();
      showToast(`Language: ${state.selectedLanguage}`, 'info', 'translate');
    });
  });

  // Bind Navigation Tabs
  const navTabs = document.querySelectorAll('nav a[data-path]');
  navTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      const path = tab.getAttribute('data-path');
      switchTab(path);
    });
  });

  // Setup Initial Flashcard flip on main view
  const staticCard = document.getElementById('flashcard');
  if (staticCard) {
    let flipped = false;
    staticCard.addEventListener('click', () => {
      const front = document.getElementById('card-front');
      flipped = !flipped;
      if (flipped) {
        front.innerHTML = `
          <p class="font-headline-sm text-headline-sm text-primary font-semibold">Answer:</p>
          <p class="font-body-md text-body-md text-on-surface leading-relaxed">
            <span class="font-semibold text-secondary">Light Reaction:</span> Thylakoid membrane (Grana) me hota hai.<br>
            <span class="font-semibold text-tertiary">Dark Reaction:</span> Chloroplast ke liquid <span class="text-on-surface font-semibold">Stroma</span> me hota hai.
          </p>
        `;
      } else {
        front.innerHTML = `
          <p class="font-headline-sm text-headline-sm text-on-surface font-semibold">Light vs Dark Reaction</p>
          <p class="font-body-sm text-body-sm text-on-surface-variant">Where does each take place in the cell?</p>
        `;
      }
    });
  }

  // Global Keyboard Navigation (Modals & Flashcards & Quiz)
  document.addEventListener('keydown', (e) => {
    const flashcardsModal = document.getElementById('flashcards-modal');
    const quizModal = document.getElementById('quiz-modal');
    const isFlashcardsOpen = flashcardsModal && !flashcardsModal.classList.contains('hidden');
    const isQuizOpen = quizModal && !quizModal.classList.contains('hidden');

    if (e.key === 'Escape') {
      const authModal = document.getElementById('auth-modal');
      if (authModal && !authModal.classList.contains('hidden')) closeAuthModal();
      const profModal = document.getElementById('profile-modal');
      if (profModal && !profModal.classList.contains('hidden')) closeModal('profile-modal');
      if (isFlashcardsOpen) closeModal('flashcards-modal');
      if (isQuizOpen) closeModal('quiz-modal');
      const notesDrawer = document.getElementById('notes-drawer');
      if (notesDrawer && !notesDrawer.classList.contains('hidden')) closeModal('notes-drawer');
      const summaryModal = document.getElementById('summary-modal');
      if (summaryModal && !summaryModal.classList.contains('hidden')) closeModal('summary-modal');
      const mindmapModal = document.getElementById('mindmap-modal');
      if (mindmapModal && !mindmapModal.classList.contains('hidden')) closeModal('mindmap-modal');
      const planModal = document.getElementById('plan-modal');
      if (planModal && !planModal.classList.contains('hidden')) closeModal('plan-modal');
      const movieModal = document.getElementById('movie-details-modal');
      if (movieModal && !movieModal.classList.contains('hidden')) closeMovieModal();
      return;
    }

    const isTyping = document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA');
    if (isTyping) return;

    if (isFlashcardsOpen) {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        flipMainDeckCard();
      } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'n') {
        e.preventDefault();
        nextFlashcard();
      } else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'p') {
        e.preventDefault();
        prevFlashcard();
      } else if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        const currentCards = getFilteredFlashcards();
        if (currentCards[state.activeCardIndex]) {
          toggleMasterCard(currentCards[state.activeCardIndex].id);
        }
      }
    } else if (isQuizOpen) {
      if (['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        selectQuizOption(parseInt(e.key, 10) - 1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (currentQuizIndex >= activeQuizQuestions.length) {
          restartQuiz();
        } else if (quizAnswered) {
          advanceQuiz();
        }
      }
    }
  });

  // Pre-load components, sync server config, and initialize theme
  updateProviderBadges();
  updateSelectorUI();
  syncServerConfig().then(() => updateSelectorUI());
  if (state.theme) {
    setTheme(state.theme);
  }
  renderFlashcardDeck();
  renderLibraryVault();
  renderExploreAgents();
  renderPersistedChatHistory();
  renderSoundscapesGrid();
  updatePomodoroStatsDisplay();
  updatePomodoroDisplay();
  loadMovies();
  updateWatchlistBadges();
  updateUserUI();
  updateProfileModalUI();
});
