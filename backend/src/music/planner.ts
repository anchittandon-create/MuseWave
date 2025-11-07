/**
 * Music Planning System
 * Derives BPM, key, scale from genres and artist inspiration
 */

interface MusicPlan {
  bpm: number;
  key: string;
  scale: 'major' | 'minor';
  timeSignature: string;
  mood: string;
}

interface PlannerInput {
  genres: string[];
  artistInspiration?: string[];
  musicPrompt?: string;
}

// Genre BPM medians (from music theory and production standards)
const GENRE_BPM_MAP: Record<string, number> = {
  'lofi': 82,
  'lo-fi': 82,
  'chill': 85,
  'ambient': 85,
  'downtempo': 90,
  'trip-hop': 95,
  'jazz': 100,
  'blues': 95,
  'soul': 100,
  'r&b': 95,
  'hip-hop': 95,
  'trap': 140,
  'pop': 116,
  'indie': 110,
  'rock': 120,
  'alternative': 115,
  'punk': 160,
  'metal': 140,
  'edm': 128,
  'house': 128,
  'techno': 128,
  'trance': 138,
  'dubstep': 140,
  'drum-and-bass': 174,
  'dnb': 174,
  'breakbeat': 135,
  'uk-garage': 130,
  'jungle': 165,
  'electronic': 120,
  'synthwave': 120,
  'vaporwave': 85,
  'chillwave': 90,
  'cinematic': 110,
  'orchestral': 100,
  'classical': 90,
  'folk': 105,
  'country': 110,
  'bluegrass': 130,
  'reggae': 90,
  'ska': 140,
  'funk': 108,
  'disco': 120,
  'afrobeat': 115,
  'latin': 120,
  'salsa': 180,
  'bossa-nova': 130,
  'samba': 180,
  'world': 110,
  'experimental': 100,
  'noise': 120,
  'industrial': 130,
};

// Key pool (most common in music production)
const KEYS = [
  'A minor', 'C major', 'D minor', 'E minor', 'G minor', 'F major',
  'G major', 'B♭ major', 'C minor', 'D major', 'A major', 'E major'
];

// Artist BPM/mood associations
const ARTIST_CHARACTERISTICS: Record<string, { bpm: number; mood: string; scale: 'major' | 'minor' }> = {
  'hans zimmer': { bpm: 110, mood: 'epic', scale: 'minor' },
  'daft punk': { bpm: 120, mood: 'energetic', scale: 'major' },
  'deadmau5': { bpm: 128, mood: 'progressive', scale: 'minor' },
  'aphex twin': { bpm: 135, mood: 'experimental', scale: 'minor' },
  'boards of canada': { bpm: 90, mood: 'nostalgic', scale: 'major' },
  'tycho': { bpm: 100, mood: 'dreamy', scale: 'major' },
  'bonobo': { bpm: 95, mood: 'groovy', scale: 'minor' },
  'burial': { bpm: 138, mood: 'dark', scale: 'minor' },
  'radiohead': { bpm: 105, mood: 'melancholic', scale: 'minor' },
  'pink floyd': { bpm: 100, mood: 'psychedelic', scale: 'minor' },
  'the beatles': { bpm: 120, mood: 'upbeat', scale: 'major' },
  'tame impala': { bpm: 110, mood: 'psychedelic', scale: 'major' },
  'flume': { bpm: 140, mood: 'experimental', scale: 'major' },
  'odesza': { bpm: 128, mood: 'uplifting', scale: 'major' },
  'porter robinson': { bpm: 128, mood: 'emotional', scale: 'major' },
  'skrillex': { bpm: 140, mood: 'aggressive', scale: 'minor' },
  'bassnectar': { bpm: 150, mood: 'heavy', scale: 'minor' },
  'caribou': { bpm: 120, mood: 'danceable', scale: 'major' },
  'four tet': { bpm: 128, mood: 'hypnotic', scale: 'major' },
  'jon hopkins': { bpm: 125, mood: 'euphoric', scale: 'minor' },
};

// Mood-based key selection
const MOOD_KEY_MAP: Record<string, string[]> = {
  'epic': ['D minor', 'C minor', 'A minor'],
  'energetic': ['E major', 'D major', 'A major'],
  'melancholic': ['A minor', 'E minor', 'D minor'],
  'upbeat': ['C major', 'G major', 'D major'],
  'dark': ['E minor', 'C minor', 'G minor'],
  'dreamy': ['C major', 'F major', 'G major'],
  'aggressive': ['E minor', 'D minor', 'C minor'],
  'uplifting': ['C major', 'G major', 'D major'],
};

/**
 * Generate music plan (BPM, key, scale) from input parameters
 */
export function generateMusicPlan(input: PlannerInput): MusicPlan {
  const { genres, artistInspiration, musicPrompt } = input;
  
  // 1. Calculate BPM
  let bpm = calculateBPM(genres, artistInspiration);
  
  // 2. Determine mood and scale
  const { mood, scale } = determineMoodAndScale(genres, artistInspiration, musicPrompt);
  
  // 3. Select key
  const key = selectKey(mood, scale);
  
  // 4. Time signature (default 4/4, could be extended)
  const timeSignature = '4/4';
  
  return { bpm, key, scale, timeSignature, mood };
}

/**
 * Calculate BPM from genres and artists
 */
function calculateBPM(genres: string[], artistInspiration?: string[]): number {
  const bpms: number[] = [];
  
  // Add genre BPMs
  genres.forEach(genre => {
    const normalizedGenre = genre.toLowerCase().trim();
    if (GENRE_BPM_MAP[normalizedGenre]) {
      bpms.push(GENRE_BPM_MAP[normalizedGenre]);
    }
  });
  
  // Add artist BPMs
  if (artistInspiration && artistInspiration.length > 0) {
    artistInspiration.forEach(artist => {
      const normalizedArtist = artist.toLowerCase().trim();
      if (ARTIST_CHARACTERISTICS[normalizedArtist]) {
        bpms.push(ARTIST_CHARACTERISTICS[normalizedArtist].bpm);
      }
    });
  }
  
  // Calculate median BPM
  if (bpms.length === 0) {
    return 120; // Default
  }
  
  bpms.sort((a, b) => a - b);
  const mid = Math.floor(bpms.length / 2);
  return bpms.length % 2 === 0 ? Math.round((bpms[mid - 1] + bpms[mid]) / 2) : bpms[mid];
}

/**
 * Determine mood and scale from input
 */
function determineMoodAndScale(
  genres: string[],
  artistInspiration?: string[],
  musicPrompt?: string
): { mood: string; scale: 'major' | 'minor' } {
  let mood = 'neutral';
  let scale: 'major' | 'minor' = 'minor';
  
  // Check artist characteristics first
  if (artistInspiration && artistInspiration.length > 0) {
    const artist = artistInspiration[0].toLowerCase().trim();
    if (ARTIST_CHARACTERISTICS[artist]) {
      mood = ARTIST_CHARACTERISTICS[artist].mood;
      scale = ARTIST_CHARACTERISTICS[artist].scale;
      return { mood, scale };
    }
  }
  
  // Analyze prompt for mood keywords
  if (musicPrompt) {
    const prompt = musicPrompt.toLowerCase();
    
    // Major scale indicators
    if (/happy|joy|upbeat|bright|cheerful|positive|uplifting|energetic|fun/.test(prompt)) {
      scale = 'major';
      mood = 'upbeat';
    }
    // Minor scale indicators
    else if (/sad|dark|melancholic|moody|emotional|deep|atmospheric|cinematic|epic/.test(prompt)) {
      scale = 'minor';
      mood = /epic|cinematic/.test(prompt) ? 'epic' : 'melancholic';
    }
  }
  
  // Genre-based mood defaults
  const genreLower = genres[0]?.toLowerCase() || '';
  if (/ambient|chill|lofi/.test(genreLower)) {
    mood = 'dreamy';
    scale = 'major';
  } else if (/metal|industrial|noise/.test(genreLower)) {
    mood = 'aggressive';
    scale = 'minor';
  } else if (/cinematic|orchestral/.test(genreLower)) {
    mood = 'epic';
    scale = 'minor';
  }
  
  return { mood, scale };
}

/**
 * Select appropriate key based on mood and scale
 */
function selectKey(mood: string, scale: 'major' | 'minor'): string {
  // Check mood-specific keys first
  if (MOOD_KEY_MAP[mood]) {
    const moodKeys = MOOD_KEY_MAP[mood].filter(k => 
      k.toLowerCase().includes(scale)
    );
    if (moodKeys.length > 0) {
      return moodKeys[Math.floor(Math.random() * moodKeys.length)];
    }
  }
  
  // Fallback to scale-based selection
  const scaleKeys = KEYS.filter(k => k.toLowerCase().includes(scale));
  return scaleKeys[Math.floor(Math.random() * scaleKeys.length)] || 'A minor';
}

/**
 * Validate and adjust BPM to realistic range
 */
export function validateBPM(bpm: number): number {
  return Math.max(60, Math.min(200, Math.round(bpm)));
}

/**
 * Get genre-specific recommendations
 */
export function getGenreRecommendations(genre: string): Partial<MusicPlan> {
  const normalizedGenre = genre.toLowerCase().trim();
  const bpm = GENRE_BPM_MAP[normalizedGenre] || 120;
  
  return {
    bpm,
    timeSignature: '4/4',
  };
}
