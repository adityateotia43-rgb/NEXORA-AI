/**
 * Curated Study Mode Repository: High-Yield Quizzes & Cognitive Flashcards
 * Covering: Science, Mathematics, CS, English, GK across High School, Undergrad, and Competitive levels.
 */

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

/**
 * Filter flashcards by subject topic and academic tier
 */
function getFlashcards({ topic = null, tier = null, limit = null } = {}) {
  let filtered = [...FLASHCARDS];

  if (topic && topic.toLowerCase() !== 'all') {
    filtered = filtered.filter(c => c.topic.toLowerCase() === topic.toLowerCase());
  }

  if (tier && tier.toLowerCase() !== 'all') {
    filtered = filtered.filter(c => c.tier.toLowerCase() === tier.toLowerCase());
  }

  if (limit && limit > 0) {
    filtered = filtered.slice(0, limit);
  }

  return filtered;
}

/**
 * Filter quiz questions by topic and tier
 */
function getQuizQuestions({ topic = null, tier = null, count = 5 } = {}) {
  let filtered = [...QUIZ_QUESTIONS];

  if (topic && topic.toLowerCase() !== 'all') {
    filtered = filtered.filter(q => q.topic.toLowerCase() === topic.toLowerCase());
  }

  if (tier && tier.toLowerCase() !== 'all') {
    filtered = filtered.filter(q => q.tier.toLowerCase() === tier.toLowerCase());
  }

  // If filtered list is smaller than requested count, fill from remaining questions
  if (filtered.length < count && topic && topic.toLowerCase() !== 'all') {
    const remaining = QUIZ_QUESTIONS.filter(q => !filtered.some(f => f.id === q.id));
    filtered = filtered.concat(remaining);
  }

  // Shuffle and slice count
  const shuffled = [...filtered].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

module.exports = {
  FLASHCARDS,
  QUIZ_QUESTIONS,
  getFlashcards,
  getQuizQuestions
};
