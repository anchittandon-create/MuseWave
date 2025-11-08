/**
 * Genre Ontology & BPM Mappings for AI Suggestions
 */

export const GENRE_BPM_MAP: Record<string, number> = {
  // Electronic
  'techno': 128,
  'house': 124,
  'trance': 138,
  'dubstep': 140,
  'drum-and-bass': 174,
  'synthwave': 110,
  'ambient': 85,
  'downtempo': 95,
  'edm': 128,
  'future-bass': 150,

  // Hip-Hop / Urban
  'hiphop': 92,
  'trap': 140,
  'lofi': 82,
  'boom-bap': 88,
  'grime': 140,

  // Rock / Metal
  'rock': 120,
  'alternative': 116,
  'post-rock': 100,
  'indie': 115,
  'metal': 145,
  'punk': 180,

  // Pop / Mainstream
  'pop': 116,
  'r-and-b': 72,
  'soul': 78,
  'funk': 110,
  'disco': 120,

  // Cinematic / Orchestral
  'cinematic': 110,
  'orchestral': 100,
  'soundtrack': 105,
  'epic': 90,
  'ambient-cinematic': 70,

  // World / Regional
  'reggae': 80,
  'reggaeton': 95,
  'afrobeat': 110,
  'latin': 100,
  'bossa-nova': 130,

  // Experimental
  'glitch': 100,
  'idm': 120,
  'breakcore': 200,
  'vaporwave': 75,
  'chillwave': 88,
};

export const GENRE_ONTOLOGY: Record<string, string[]> = {
  'electronic': ['techno', 'house', 'ambient', 'synthwave', 'trance', 'edm'],
  'cinematic': ['orchestral', 'soundtrack', 'epic', 'ambient-cinematic', 'hybrid'],
  'hiphop': ['trap', 'lofi', 'boom-bap', 'grime', 'experimental-hip-hop'],
  'rock': ['alternative', 'post-rock', 'indie', 'shoegaze', 'progressive'],
  'pop': ['synth-pop', 'indie-pop', 'electro-pop', 'art-pop'],
  'ambient': ['drone', 'dark-ambient', 'space-ambient', 'organic-ambient'],
  'experimental': ['glitch', 'idm', 'breakcore', 'noise', 'avant-garde'],
};

export const GENRE_CROSSOVERS: Record<string, string[]> = {
  'electronic': ['cinematic', 'rock', 'hiphop'],
  'cinematic': ['electronic', 'ambient', 'orchestral'],
  'hiphop': ['electronic', 'jazz', 'soul'],
  'rock': ['electronic', 'cinematic', 'metal'],
  'ambient': ['electronic', 'cinematic', 'experimental'],
};

export const ARTIST_BY_GENRE: Record<string, string[]> = {
  'electronic': ['Daft Punk', 'Tycho', 'BT', 'Aphex Twin', 'Fred again..', 'Bonobo', 'Four Tet', 'Burial'],
  'techno': ['Richie Hawtin', 'Carl Cox', 'Nina Kraviz', 'Ben Klock', 'Adam Beyer'],
  'house': ['Disclosure', 'Duke Dumont', 'Kaytranada', 'Tchami', 'Chris Lake'],
  'cinematic': ['Hans Zimmer', 'Junkie XL', 'Hybrid', 'Brian Eno', 'Max Richter', 'Ólafur Arnalds'],
  'orchestral': ['John Williams', 'Thomas Newman', 'Howard Shore', 'James Newton Howard'],
  'lofi': ['J Dilla', 'Nujabes', 'Idealism', 'Jinsang', 'Tomppabeats'],
  'hiphop': ['Kanye West', 'Kendrick Lamar', 'Travis Scott', 'Tyler, The Creator', 'Metro Boomin'],
  'trap': ['Metro Boomin', 'Zaytoven', 'Southside', 'Lex Luger', 'TM88'],
  'ambient': ['Brian Eno', 'Biosphere', 'Stars of the Lid', 'Tim Hecker', 'Grouper'],
  'synthwave': ['Kavinsky', 'Perturbator', 'Carpenter Brut', 'Gunship', 'Com Truise'],
  'rock': ['Radiohead', 'Muse', 'Arctic Monkeys', 'The Strokes', 'Queens of the Stone Age'],
  'post-rock': ['Explosions in the Sky', 'Mogwai', 'God Is an Astronaut', 'This Will Destroy You'],
  'pop': ['The Weeknd', 'Billie Eilish', 'Tame Impala', 'ODESZA', 'Lorde'],
};

export const KEY_MODES = [
  'A minor', 'A major',
  'B minor', 'B major',
  'C minor', 'C major',
  'D minor', 'D major',
  'E minor', 'E major',
  'F minor', 'F major',
  'G minor', 'G major',
  'Ab minor', 'Ab major',
  'Bb minor', 'Bb major',
  'Eb minor', 'Eb major',
];

export const SCALES = ['minor', 'major', 'pentatonic', 'blues', 'dorian', 'phrygian', 'mixolydian'];

export const MOOD_KEYWORDS = {
  uplifting: ['inspiring', 'hopeful', 'bright', 'joyful', 'energetic'],
  melancholic: ['sad', 'nostalgic', 'reflective', 'somber', 'wistful'],
  aggressive: ['intense', 'powerful', 'heavy', 'brutal', 'relentless'],
  dreamy: ['ethereal', 'floating', 'atmospheric', 'surreal', 'hazy'],
  cinematic: ['epic', 'dramatic', 'sweeping', 'grandiose', 'emotional'],
  dark: ['ominous', 'haunting', 'mysterious', 'brooding', 'sinister'],
  chill: ['relaxed', 'mellow', 'laid-back', 'peaceful', 'tranquil'],
};

export const INSTRUMENT_FOCUS = [
  'synth bass', 'strings', 'ambient pads', 'modular drums', 
  'electric guitars', 'piano', 'brass', 'woodwinds', 
  'orchestral percussion', 'analog synths', 'digital textures',
  'vocal chops', 'arpeggiated synths', 'sub bass', 'plucked strings'
];

export const ATMOSPHERE_DESCRIPTORS = [
  'urban nightscapes', 'cosmic ambience', 'neon haze', 
  'retro nostalgia', 'digital calm', 'industrial textures',
  'organic warmth', 'crystalline clarity', 'analog warmth',
  'futuristic dystopia', 'natural serenity', 'chaotic energy',
  'minimal space', 'lush soundscapes', 'raw emotion'
];

export const VOCAL_LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Italian',
  'Portuguese', 'Japanese', 'Korean', 'Hindi', 'Arabic',
  'Russian', 'Mandarin', 'Dutch', 'Swedish', 'Turkish'
];

export const VIDEO_STYLE_OPTIONS = [
  'Official Music Video',
  'Lyric Video',
  'Abstract Visualizer',
  'Spectrum Analyzer',
  'Waveform Animation',
  'Geometric Patterns',
  'Particle Effects',
  'Cinematic Montage'
];

export const LYRIC_THEMES = {
  space: ['stars', 'cosmos', 'void', 'distance', 'silence', 'orbit', 'gravity', 'nebula'],
  urban: ['city', 'lights', 'streets', 'crowd', 'concrete', 'skyline', 'midnight', 'neon'],
  nature: ['forest', 'ocean', 'mountains', 'rivers', 'wind', 'storm', 'earth', 'horizon'],
  emotion: ['heart', 'soul', 'dreams', 'pain', 'hope', 'fear', 'love', 'loss'],
  time: ['past', 'future', 'memory', 'moment', 'eternity', 'tomorrow', 'yesterday', 'now'],
  technology: ['digital', 'code', 'signal', 'binary', 'machine', 'network', 'data', 'electric'],
};

export const PROMPT_TEMPLATES = [
  'A {tone} {genre} piece blending {instrument} and {atmosphere}, inspired by {artist}',
  '{mood} {genre} with {instrument} creating a sense of {atmosphere}',
  'An experimental fusion of {genre} and {crossover}, featuring {instrument}',
  '{artist}-inspired {genre} with evolving {instrument} and {atmosphere}',
  'A pulse-pounding {genre} hybrid with {mood} tension and {instrument}',
];
