/**
 * NEXORA AI — Movie Mode & TMDB Integration Data Repository
 * 
 * Provides live integration with The Movie Database (TMDB) API
 * with a high-fidelity curated fallback dataset for zero-configuration resilience.
 */

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

// Curated Masterpiece Cinema Catalog (Fallback and Curated Collections)
const CURATED_MOVIES = [
  {
    id: 157336,
    title: 'Interstellar',
    tagline: 'Mankind was born on Earth. It was never meant to die here.',
    year: 2014,
    releaseDate: '2014-11-05',
    director: 'Christopher Nolan',
    cast: ['Matthew McConaughey', 'Anne Hathaway', 'Jessica Chastain', 'Michael Caine'],
    rating: 8.7,
    voteCount: 35800,
    runtime: '169 min',
    runtimeMinutes: 169,
    genres: ['Sci-Fi & STEM', 'Mind-Bending', 'Adventure', 'Drama'],
    category: 'scifi',
    overview: 'The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel and conquer the vast distances involved in an interstellar voyage.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/xJHokMbljvjADYdit5fK5VQsXEG.jpg',
    trailerKey: 'zSWdZVtXT7E',
    cinematography: 'Shot by Hoyte van Hoytema using 65mm IMAX and 35mm anamorphic film. Practical cockpit rigs with front-projection screens replaced green screen to create genuine pupil dilation.',
    themes: ['Relativistic Time Dilation', 'Gravitational Singularity', 'Parental Love as a Higher Dimension']
  },
  {
    id: 27205,
    title: 'Inception',
    tagline: 'Your mind is the scene of the crime.',
    year: 2010,
    releaseDate: '2010-07-15',
    director: 'Christopher Nolan',
    cast: ['Leonardo DiCaprio', 'Joseph Gordon-Levitt', 'Elliot Page', 'Tom Hardy', 'Ken Watanabe'],
    rating: 8.8,
    voteCount: 36200,
    runtime: '148 min',
    runtimeMinutes: 148,
    genres: ['Sci-Fi & STEM', 'Mind-Bending', 'Action', 'Thriller'],
    category: 'mind-bending',
    overview: 'Cobb, a skilled thief who commits corporate espionage by infiltrating the subconscious of his targets, is offered a chance to regain his old life as payment for a task considered to be impossible: "inception", the implantation of another person\'s idea into a target\'s subconscious.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg',
    trailerKey: 'YoHD9XEInc0',
    cinematography: 'Wally Pfister crafted distinct optical color palettes for each dream level. The revolving hallway fight utilized a 100-foot full-scale centrifugal gimbal rig operating at 8 RPM.',
    themes: ['Subconscious Architecture', 'Limbo & Time Elasticity', 'Totems & Epistemic Doubt']
  },
  {
    id: 872585,
    title: 'Oppenheimer',
    tagline: 'The world forever changes.',
    year: 2023,
    releaseDate: '2023-07-19',
    director: 'Christopher Nolan',
    cast: ['Cillian Murphy', 'Emily Blunt', 'Matt Damon', 'Robert Downey Jr.', 'Florence Pugh'],
    rating: 8.9,
    voteCount: 14500,
    runtime: '180 min',
    runtimeMinutes: 180,
    genres: ['Masterpiece Drama', 'History', 'Biography'],
    category: 'top-rated',
    overview: 'The story of J. Robert Oppenheimer\'s role in the development of the atomic bomb during World War II, exploring the moral and political consequences of scientific discovery.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg',
    trailerKey: 'uYPbbksJxIg',
    cinematography: 'Hoyte van Hoytema utilized custom 65mm black-and-white IMAX film stock developed exclusively by Kodak to contrast subjective perspective (color) with objective inquiry (monochrome).',
    themes: ['Quantum Mechanics', 'Promethean Responsibility', 'Geopolitical Fission']
  },
  {
    id: 496243,
    title: 'Parasite',
    tagline: 'Act like you own the place.',
    year: 2019,
    releaseDate: '2019-05-30',
    director: 'Bong Joon-ho',
    cast: ['Song Kang-ho', 'Lee Sun-kyun', 'Cho Yeo-jeong', 'Choi Woo-shik', 'Park So-dam'],
    rating: 8.5,
    voteCount: 18200,
    runtime: '132 min',
    runtimeMinutes: 132,
    genres: ['Masterpiece Drama', 'Cinematic Thriller', 'Comedy'],
    category: 'top-rated',
    overview: 'All unemployed, Ki-taek\'s family takes peculiar interest in the wealthy and glamorous Parks for their livelihood until they get entangled in an unexpected incident.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/hiKmpZMGZsrkA3cdce8a7Dpos1j.jpg',
    trailerKey: '5xH0R_4204Q',
    cinematography: 'Hong Kyung-pyo employed deliberate vertical architectural staging (stairs, underground descents, downpours) to physically embody socioeconomic hierarchy.',
    themes: ['Spatial Class Separation', 'Parasitic Symbiosis', 'Smell as Sensory Boundary']
  },
  {
    id: 155,
    title: 'The Dark Knight',
    tagline: 'Welcome to a world without rules.',
    year: 2008,
    releaseDate: '2008-07-16',
    director: 'Christopher Nolan',
    cast: ['Christian Bale', 'Heath Ledger', 'Aaron Eckhart', 'Michael Caine', 'Gary Oldman'],
    rating: 9.0,
    voteCount: 32500,
    runtime: '152 min',
    runtimeMinutes: 152,
    genres: ['Cinematic Thriller', 'Action', 'Crime'],
    category: 'top-rated',
    overview: 'Batman raises the stakes in his war on crime. With the help of Lt. Jim Gordon and District Attorney Harvey Dent, Batman sets out to dismantle the remaining criminal organizations that plague the streets.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/dqK9Hag1054tghRQSqLSfrkvQnA.jpg',
    trailerKey: 'EXeTwQWrcwY',
    cinematography: 'Groundbreaking first major feature to capture action sequences in 15/70mm IMAX format, using expansive vertical resolution to heighten Gotham’s architectural claustrophobia.',
    themes: ['Escalation Theory', 'Moral Nihilism vs Deontology', 'Prisoner\'s Dilemma Ferry Climax']
  },
  {
    id: 335984,
    title: 'Blade Runner 2049',
    tagline: 'There\'s still a page left.',
    year: 2017,
    releaseDate: '2017-10-04',
    director: 'Denis Villeneuve',
    cast: ['Ryan Gosling', 'Harrison Ford', 'Ana de Armas', 'Sylvia Hoeks', 'Robin Wright'],
    rating: 8.0,
    voteCount: 13900,
    runtime: '164 min',
    runtimeMinutes: 164,
    genres: ['Sci-Fi & STEM', 'Mind-Bending', 'Mystery'],
    category: 'scifi',
    overview: 'Thirty years after the events of the first film, a new blade runner, LAPD Officer K, unearths a long-buried secret that has the potential to plunge what\'s left of society into chaos.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/ilRyASDvt7v69979vH5kxyy7F9j.jpg',
    trailerKey: 'gCcx85zbxz4',
    cinematography: 'Roger Deakins won his first Academy Award for this masterwork, utilizing moving light rings, neon atmospheric diffusion, and radioactive amber monochromatic color schemes in Las Vegas ruins.',
    themes: ['Artificial Consciousness', 'Digital Loneliness', 'Miracle of Organic Birth']
  },
  {
    id: 62,
    title: '2001: A Space Odyssey',
    tagline: 'The ultimate trip.',
    year: 1968,
    releaseDate: '1968-04-02',
    director: 'Stanley Kubrick',
    cast: ['Keir Dullea', 'Gary Lockwood', 'William Sylvester', 'Douglas Rain (HAL 9000)'],
    rating: 8.3,
    voteCount: 11400,
    runtime: '149 min',
    runtimeMinutes: 149,
    genres: ['Sci-Fi & STEM', 'Mind-Bending', 'Mystery'],
    category: 'scifi',
    overview: 'Humanity finds a mysterious object buried beneath the lunar surface and sets off on a quest to find its origins with the help of HAL 9000, the world\'s most advanced supercomputer.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/ve72VxNqjGM69UmKAdETso9B3te.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/9l9f9a4tNf3W25s1r8wQh9rF0l.jpg',
    trailerKey: 'oR_e9y-VQm8',
    cinematography: 'Kubrick and Geoffrey Unsworth pioneered the match cut transition from bone to orbiting satellite (a leap of millions of years of human tool-making) and slit-scan photography for the Stargate sequence.',
    themes: ['Human Evolution & Transhumanism', 'Artificial Intelligence Rebellion', 'Cosmic Monoliths']
  },
  {
    id: 244786,
    title: 'Whiplash',
    tagline: 'The road to greatness can take you to the edge.',
    year: 2014,
    releaseDate: '2014-10-10',
    director: 'Damien Chazelle',
    cast: ['Miles Teller', 'J.K. Simmons', 'Paul Reiser', 'Melissa Benoist'],
    rating: 8.5,
    voteCount: 15300,
    runtime: '107 min',
    runtimeMinutes: 107,
    genres: ['Masterpiece Drama', 'Music', 'Cinematic Thriller'],
    category: 'top-rated',
    overview: 'Under the direction of a ruthless instructor, a talented young drummer begins to pursue perfection at any cost, pushing his physical and mental limits.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/7fn624j5lj3xTme2SgiLCeuedmO.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/5s15xY4vQ87o41Z0c8Hh87j0k1.jpg',
    trailerKey: '7d_jQycdQGo',
    cinematography: 'Sharply rhythmic editing by Tom Cross mimicking jazz double-time swing. Close-ups on beads of sweat, bleeding fingertips, and cymbals turn musical rehearsal into visceral psychological combat.',
    themes: ['Perfectionism vs Abuse', 'Artistic Obsession', 'Buddy Rich Legacy']
  },
  {
    id: 129,
    title: 'Spirited Away',
    tagline: 'The tunnel led to a world of wonder and peril.',
    year: 2001,
    releaseDate: '2001-07-20',
    director: 'Hayao Miyazaki',
    cast: ['Rumi Hiiragi', 'Miyu Irino', 'Mari Natsuki', 'Takashi Naito'],
    rating: 8.6,
    voteCount: 16700,
    runtime: '125 min',
    runtimeMinutes: 125,
    genres: ['Animation & Art', 'Fantasy', 'Adventure'],
    category: 'top-rated',
    overview: 'A ten-year-old girl, Chihiro, wanders into a strange spirit world ruled by witches and spirits, where humans are changed into beasts and she must work to free herself and her parents.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/393r3eYA0MBRYgO7flv1qy7718W.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/mSDmv9F6m4lV8t3F8zQk2u6yX1.jpg',
    trailerKey: 'ByXuk9QqQkk',
    cinematography: 'Hand-drawn watercolor backgrounds and mastery of "Ma" (intentional negative space / pauses in narrative flow) allowing viewers to absorb the bathhouse atmosphere and train journey over water.',
    themes: ['Shinto Animism & Environmentalism', 'Loss of Name/Identity', 'Coming-of-Age Resilience']
  },
  {
    id: 603,
    title: 'The Matrix',
    tagline: 'Welcome to the Real World.',
    year: 1999,
    releaseDate: '1999-03-30',
    director: 'Lana & Lilly Wachowski',
    cast: ['Keanu Reeves', 'Laurence Fishburne', 'Carrie-Anne Moss', 'Hugo Weaving'],
    rating: 8.7,
    voteCount: 25400,
    runtime: '136 min',
    runtimeMinutes: 136,
    genres: ['Sci-Fi & STEM', 'Mind-Bending', 'Action'],
    category: 'mind-bending',
    overview: 'Set in the 22nd century, The Matrix tells the story of a computer hacker who joins a group of underground insurgents fighting the vast and powerful computers who now rule the earth.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/7u3fh9nd38KX9098482bC3g8f.jpg',
    trailerKey: 'vKQi3bBA1y8',
    cinematography: 'Bill Pope and John Gaeta invented the "Bullet Time" multi-camera array rig. Green-tinted color grading symbolized the digital illusion, while desaturated cool tones signified the brutal reality of Zion.',
    themes: ['Baudrillard’s Simulacra and Simulation', 'The Red Pill Epistemology', 'Cybernetic Determinism']
  },
  {
    id: 693134,
    title: 'Dune: Part Two',
    tagline: 'Long live the fighters.',
    year: 2024,
    releaseDate: '2024-02-27',
    director: 'Denis Villeneuve',
    cast: ['Timothée Chalamet', 'Zendaya', 'Rebecca Ferguson', 'Javier Bardem', 'Austin Butler'],
    rating: 8.6,
    voteCount: 9200,
    runtime: '166 min',
    runtimeMinutes: 166,
    genres: ['Sci-Fi & STEM', 'Adventure', 'Drama'],
    category: 'trending',
    overview: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family. Facing a choice between the love of his life and the fate of the universe, he endeavors to prevent a terrible future only he can foresee.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/xOMo8BRK7PfcJv9xpH57bu2x6wL.jpg',
    trailerKey: 'Way9Dexny3w',
    cinematography: 'Greig Fraser shot the Harkonnen Giedi Prime gladiatorial arena sequence using converted infrared sensors on ARRI Alexa LF cameras, rendering human skin translucent and eyes ink-black under a black sun.',
    themes: ['Messianic Myth Deconstruction', 'Ecological Resource Colonization', 'Voice & Bene Gesserit Genetic Engineering']
  },
  {
    id: 680,
    title: 'Pulp Fiction',
    tagline: 'Just because you are a character doesn\'t mean you have character.',
    year: 1994,
    releaseDate: '1994-09-10',
    director: 'Quentin Tarantino',
    cast: ['John Travolta', 'Samuel L. Jackson', 'Uma Thurman', 'Bruce Willis'],
    rating: 8.9,
    voteCount: 27100,
    runtime: '154 min',
    runtimeMinutes: 154,
    genres: ['Masterpiece Drama', 'Crime'],
    category: 'top-rated',
    overview: 'A burger-loving hit man, his philosophical partner, a drug-addled gangster\'s moll and a washed-up boxer converge in this sprawling, comedic crime caper.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/suaEOtk1916guXd249Rp8969f6P.jpg',
    trailerKey: 's7EdQ4FqbhY',
    cinematography: 'Andrzej Sekula used low-sensitivity 50 ASA film stock requiring intense lighting, resulting in ultra-saturated colors and pristine depth of field across non-linear triptych storytelling.',
    themes: ['Non-Linear Narrative Circularity', 'Banal vs Sacred Dialogue', 'Divine Intervention']
  },
  {
    id: 329865,
    title: 'Arrival',
    tagline: 'Why are they here?',
    year: 2016,
    releaseDate: '2016-11-10',
    director: 'Denis Villeneuve',
    cast: ['Amy Adams', 'Jeremy Renner', 'Forest Whitaker', 'Michael Stuhlbarg'],
    rating: 7.9,
    voteCount: 17200,
    runtime: '116 min',
    runtimeMinutes: 116,
    genres: ['Sci-Fi & STEM', 'Mind-Bending', 'Mystery'],
    category: 'scifi',
    overview: 'Taking place after alien crafts land around the world, an expert linguist is recruited by the military to determine whether they come in peace or are a threat.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/yIZ1xendyqKvY37DCWuq80G2987.jpg',
    trailerKey: 'tFMo3UJ4B4g',
    cinematography: 'Bradford Young embraced natural, underexposed, moody lighting and shallow depth-of-field to frame memory as an intimate, tactile sensory experience.',
    themes: ['Sapir-Whorf Hypothesis (Language Shapes Cognition)', 'Non-Zero-Sum Game Theory', 'Non-Linear Time Perception']
  },
  {
    id: 569094,
    title: 'Spider-Man: Across the Spider-Verse',
    tagline: 'It\'s how you wear the mask that matters.',
    year: 2023,
    releaseDate: '2023-05-31',
    director: 'Joaquim Dos Santos, Kemp Powers, Justin K. Thompson',
    cast: ['Shameik Moore', 'Hailee Steinfeld', 'Oscar Isaac', 'Daniel Kaluuya'],
    rating: 8.7,
    voteCount: 7100,
    runtime: '140 min',
    runtimeMinutes: 140,
    genres: ['Animation & Art', 'Action', 'Sci-Fi & STEM'],
    category: 'trending',
    overview: 'After reuniting with Gwen Stacy, Brooklyn\'s full-time, friendly neighborhood Spider-Man is catapulted across the Multiverse, where he encounters the Spider Society, a team of Spider-People charged with protecting the Multiverse\'s very existence.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/4HodYYKEIsGOdinkGi2Ucz6X9i0.jpg',
    trailerKey: 'cqGjhVJWtEg',
    cinematography: 'Hybrid visual revolution merging hand-drawn comic book halftone printing dots, watercolor drip animation for Gwen Stacy’s Earth-65, Syd Mead industrial sci-fi, and punk rock collage art styles.',
    themes: ['Canon Event Determinism vs Free Will', 'Parental Expectation', 'Multiversal Entropy']
  },
  {
    id: 545611,
    title: 'Everything Everywhere All at Once',
    tagline: 'The universe is so much bigger than you realize.',
    year: 2022,
    releaseDate: '2022-03-24',
    director: 'Daniel Kwan, Daniel Scheinert',
    cast: ['Michelle Yeoh', 'Ke Huy Quan', 'Stephanie Hsu', 'Jamie Lee Curtis'],
    rating: 7.8,
    voteCount: 6800,
    runtime: '139 min',
    runtimeMinutes: 139,
    genres: ['Sci-Fi & STEM', 'Mind-Bending', 'Comedy', 'Drama'],
    category: 'mind-bending',
    overview: 'An aging Chinese immigrant is swept up in an insane adventure, where she alone can save what\'s important to her by connecting with the lives she could have led in other universes.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/w3LxiVYPqrlxqPYSUTY4QZAk32v.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/70Q54n4UqWwE4zD19yQ790kOa44.jpg',
    trailerKey: 'wxN1T1uxQ2g',
    cinematography: 'Rapid-fire variable aspect ratio shifts (1.85:1, 2.39:1, 4:3) and practical in-camera optical stunts created by a core team of only 5 visual effects artists.',
    themes: ['Cosmic Nihilism vs Gentle Kindness', 'Intergenerational Immigrant Trauma', 'Quantum Branching Possibility']
  },
  {
    id: 550,
    title: 'Fight Club',
    tagline: 'Mischief. Mayhem. Soap.',
    year: 1999,
    releaseDate: '1999-10-15',
    director: 'David Fincher',
    cast: ['Edward Norton', 'Brad Pitt', 'Helena Bonham Carter', 'Meat Loaf'],
    rating: 8.8,
    voteCount: 29100,
    runtime: '139 min',
    runtimeMinutes: 139,
    genres: ['Mind-Bending', 'Cinematic Thriller', 'Drama'],
    category: 'mind-bending',
    overview: 'A ticking-time-bomb insomniac and a slippery soap salesman channel primal male aggression into a shocking new form of therapy. Their concept catches on, with underground "fight clubs" forming in every town.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/hZkgoQYus5vegHoetLkCJzb17zJ.jpg',
    trailerKey: 'O1nDozs-96U',
    cinematography: 'Jeff Cronenweth utilized fluorescents with green and magenta spikes to depict corporate fluorescent malaise, intercut with subliminal 1-frame flashes and photorealistic CGI zoom-outs through cigarette burns.',
    themes: ['Consumerist Alienation', 'Dissociative Identity Disorder', 'Fragility of Masculine Hegemony']
  }
];

// Curated Category Definitions
const MOVIE_CATEGORIES = [
  { id: 'all', name: 'All Masterpieces', icon: 'auto_awesome', count: CURATED_MOVIES.length },
  { id: 'trending', name: 'Trending & New', icon: 'local_fire_department', count: CURATED_MOVIES.filter(m => m.category === 'trending').length },
  { id: 'top-rated', name: 'Top Rated All-Time', icon: 'hotel_class', count: CURATED_MOVIES.filter(m => m.category === 'top-rated').length },
  { id: 'scifi', name: 'Sci-Fi & STEM', icon: 'rocket_launch', count: CURATED_MOVIES.filter(m => m.genres.includes('Sci-Fi & STEM')).length },
  { id: 'mind-bending', name: 'Mind-Bending Paradoxes', icon: 'psychology', count: CURATED_MOVIES.filter(m => m.genres.includes('Mind-Bending')).length },
  { id: 'watchlist', name: 'My Watchlist', icon: 'bookmark', count: 0 }
];

// Film Theory & Craft Prompt Suggestions for Movie Co-Pilot
const CINEMA_PROMPTS = [
  {
    title: 'Interstellar Docking Sequence',
    prompt: 'Analyze the cinematography, editing tempo, and Hans Zimmer organ score during the Interstellar spinning docking scene.',
    icon: 'cyclone'
  },
  {
    title: 'Parasite Vertical Architecture',
    prompt: 'Explain how Bong Joon-ho uses staircases, semi-basement windows, and rainfall to visually communicate social hierarchy in Parasite.',
    icon: 'stairs'
  },
  {
    title: 'Nolan vs Villeneuve Visual Style',
    prompt: 'Compare Christopher Nolan and Denis Villeneuve: use of practical film vs digital cinematography, sound mix, and temporal manipulation.',
    icon: 'compare'
  },
  {
    title: 'Psychological Dutch Angle',
    prompt: 'What makes the Dutch Angle (canted frame) psychologically effective in cinema, and how did film noir pioneer it?',
    icon: 'screen_rotation'
  },
  {
    title: 'Blade Runner 2049 Lighting',
    prompt: 'How did Roger Deakins use moving architectural light rigs and monochromatic color palettes in Blade Runner 2049?',
    icon: 'wb_sunny'
  }
];

/**
 * Fetch from TMDB API helper with timeout & resilience
 */
async function fetchFromTmdb(endpoint, queryParams = {}, apiKey = null) {
  const key = apiKey || process.env.TMDB_API_KEY;
  if (!key) return null;

  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  url.searchParams.set('api_key', key);
  for (const [k, v] of Object.entries(queryParams)) {
    if (v !== undefined && v !== null && v !== '') {
      url.searchParams.set(k, String(v));
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    clearTimeout(timer);
    return null;
  }
}

/**
 * Transform raw TMDB movie object to clean standard schema
 */
function transformTmdbMovie(m) {
  const year = m.release_date ? parseInt(m.release_date.split('-')[0], 10) : (m.year || 2024);
  const posterUrl = m.poster_path ? `${TMDB_IMAGE_BASE}/w500${m.poster_path}` : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&q=80';
  const backdropUrl = m.backdrop_path ? `${TMDB_IMAGE_BASE}/w1280${m.backdrop_path}` : posterUrl;
  
  // Extract director from credits if available
  let director = 'Cinematic Master';
  let cast = [];
  if (m.credits) {
    const dirObj = m.credits.crew?.find(c => c.job === 'Director');
    if (dirObj) director = dirObj.name;
    cast = (m.credits.cast || []).slice(0, 5).map(c => c.name);
  }

  // Extract YouTube trailer key if available
  let trailerKey = 'dQw4w9WgXcQ';
  if (m.videos && m.videos.results) {
    const ytTrailer = m.videos.results.find(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'));
    if (ytTrailer) trailerKey = ytTrailer.key;
  }

  const genreMap = {
    28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
    80: 'Crime', 99: 'Documentary', 18: 'Drama', 14: 'Fantasy',
    27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance',
    878: 'Sci-Fi & STEM', 53: 'Cinematic Thriller'
  };

  const genres = Array.isArray(m.genres) 
    ? m.genres.map(g => (typeof g === 'object' ? g.name : g))
    : (m.genre_ids ? m.genre_ids.map(id => genreMap[id] || 'Cinema').slice(0, 3) : ['Cinema']);

  return {
    id: m.id,
    title: m.title || m.original_title || 'Untitled Film',
    tagline: m.tagline || 'Experience the cinema craft.',
    year: year || 2024,
    releaseDate: m.release_date || `${year}-01-01`,
    director: m.director || director,
    cast: m.cast || cast,
    rating: parseFloat((m.vote_average || 8.0).toFixed(1)),
    voteCount: m.vote_count || 1200,
    runtime: m.runtime ? `${m.runtime} min` : '120 min',
    runtimeMinutes: m.runtime || 120,
    genres: genres.length > 0 ? genres : ['Cinema', 'Drama'],
    overview: m.overview || 'A cinematic narrative structured with compelling cinematography and rich subtext.',
    posterUrl: m.posterUrl || posterUrl,
    backdropUrl: m.backdropUrl || backdropUrl,
    trailerKey: m.trailerKey || trailerKey,
    cinematography: m.cinematography || 'Exquisite lighting design, aspect ratio consideration, and deliberate framing designed for deep immersive viewing.',
    themes: m.themes || ['Narrative Architecture', 'Cinematic Soundscape', 'Character Arc']
  };
}

/**
 * Retrieve movies based on category, search query, or TMDB live data
 */
async function getMovies({ category = 'all', search = '', page = 1, tmdbApiKey = null } = {}) {
  const apiKey = tmdbApiKey || process.env.TMDB_API_KEY;

  // 1. Live Search via TMDB if API Key is configured and search query provided
  if (apiKey && search && search.trim()) {
    const tmdbSearch = await fetchFromTmdb('/search/movie', {
      query: search.trim(),
      page: String(Math.max(1, parseInt(String(page), 10) || 1)),
      include_adult: 'false'
    }, apiKey);

    if (tmdbSearch && tmdbSearch.results && tmdbSearch.results.length > 0) {
      return {
        source: 'tmdb_live',
        category: 'search',
        query: search.trim(),
        totalResults: tmdbSearch.total_results || tmdbSearch.results.length,
        movies: tmdbSearch.results.map(transformTmdbMovie)
      };
    }
  }

  // 2. Live Category via TMDB if API Key is configured
  if (apiKey && !search) {
    let endpoint = '/trending/movie/week';
    if (category === 'top-rated') endpoint = '/movie/top_rated';
    if (category === 'scifi') endpoint = '/discover/movie';

    /** @type {Record<string, string>} */
    const params = { page: String(Math.max(1, parseInt(String(page), 10) || 1)) };
    if (category === 'scifi') params.with_genres = '878'; // Sci-Fi

    const tmdbData = await fetchFromTmdb(endpoint, params, apiKey);
    if (tmdbData && tmdbData.results && tmdbData.results.length > 0) {
      return {
        source: 'tmdb_live',
        category,
        totalResults: tmdbData.total_results || tmdbData.results.length,
        movies: tmdbData.results.map(transformTmdbMovie)
      };
    }
  }

  // 3. High-fidelity Curated Fallback (always reliable, immediate & zero external dependency)
  let list = [...CURATED_MOVIES];

  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter(m => 
      m.title.toLowerCase().includes(q) ||
      m.director.toLowerCase().includes(q) ||
      m.genres.some(g => g.toLowerCase().includes(q)) ||
      m.overview.toLowerCase().includes(q)
    );
  } else if (category && category !== 'all' && category !== 'watchlist') {
    if (category === 'trending') {
      list = list.filter(m => m.category === 'trending' || m.year >= 2022);
    } else if (category === 'top-rated') {
      list = list.filter(m => m.rating >= 8.5);
    } else if (category === 'scifi') {
      list = list.filter(m => m.genres.includes('Sci-Fi & STEM'));
    } else if (category === 'mind-bending') {
      list = list.filter(m => m.genres.includes('Mind-Bending'));
    }
  }

  return {
    source: apiKey ? 'curated_fallback' : 'curated_masterpieces',
    category,
    totalResults: list.length,
    movies: list
  };
}

/**
 * Retrieve movie details by ID (with TMDB live fallback)
 */
async function getMovieDetails(id, { tmdbApiKey = null } = {}) {
  const numericId = parseInt(id, 10);
  const curated = CURATED_MOVIES.find(m => m.id === numericId);

  const apiKey = tmdbApiKey || process.env.TMDB_API_KEY;
  if (apiKey) {
    const tmdbDetail = await fetchFromTmdb(`/movie/${numericId}`, {
      append_to_response: 'videos,credits'
    }, apiKey);

    if (tmdbDetail) {
      const transformed = transformTmdbMovie(tmdbDetail);
      if (curated) {
        // Merge with curated rich cinematic notes
        transformed.cinematography = curated.cinematography;
        transformed.themes = curated.themes;
        if (curated.trailerKey) transformed.trailerKey = curated.trailerKey;
      }
      return transformed;
    }
  }

  return curated || CURATED_MOVIES[0];
}

module.exports = {
  CURATED_MOVIES,
  MOVIE_CATEGORIES,
  CINEMA_PROMPTS,
  getMovies,
  getMovieDetails,
  transformTmdbMovie
};
