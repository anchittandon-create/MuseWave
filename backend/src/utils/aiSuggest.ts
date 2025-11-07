/**
 * AI Suggestion Engine
 * Generates intelligent defaults for empty form fields
 */

interface SuggestionInput {
  musicPrompt?: string;
  genres?: string[];
  artistInspiration?: string[];
  lyrics?: string;
  vocalLanguages?: string[];
  videoStyles?: string[];
  durationSec?: number;
}

interface AISuggestions {
  genres: string[];
  artistInspiration: string[];
  lyrics: string;
  vocalLanguages: string[];
  videoStyles: string[];
  musicPrompt?: string;
}

// Genre associations from keywords
const KEYWORD_GENRE_MAP: Record<string, string[]> = {
  'epic': ['Cinematic', 'Orchestral', 'Soundtrack'],
  'cinematic': ['Cinematic', 'Orchestral', 'Ambient'],
  'chill': ['Lofi', 'Chillwave', 'Downtempo'],
  'lofi': ['Lofi', 'Jazz', 'Hip-Hop'],
  'electronic': ['Electronic', 'Synthwave', 'EDM'],
  'techno': ['Techno', 'Electronic', 'House'],
  'ambient': ['Ambient', 'Atmospheric', 'Downtempo'],
  'trap': ['Trap', 'Hip-Hop', 'Electronic'],
  'house': ['House', 'Dance', 'Electronic'],
  'jazz': ['Jazz', 'Blues', 'Soul'],
  'rock': ['Rock', 'Alternative', 'Indie'],
  'pop': ['Pop', 'Indie-Pop', 'Synth-Pop'],
  'classical': ['Classical', 'Orchestral', 'Baroque'],
  'dark': ['Dark-Ambient', 'Industrial', 'Experimental'],
  'upbeat': ['Pop', 'Dance', 'Funk'],
  'relaxing': ['Ambient', 'New-Age', 'Chillout'],
  'energetic': ['EDM', 'Electro', 'Drum-and-Bass'],
  'dreamy': ['Dream-Pop', 'Shoegaze', 'Ambient'],
  'aggressive': ['Metal', 'Industrial', 'Hard-Rock'],
  'space': ['Space-Ambient', 'Synthwave', 'Electronic'],
  'retro': ['Synthwave', '80s', 'Vaporwave'],
  'sad': ['Sad', 'Melancholic', 'Emotional'],
  'happy': ['Happy', 'Uplifting', 'Cheerful'],
};

// Genre to artist mapping
const GENRE_ARTIST_MAP: Record<string, string[]> = {
  'cinematic': ['Hans Zimmer', 'Two Steps From Hell', 'Audiomachine'],
  'orchestral': ['John Williams', 'Howard Shore', 'Ludovico Einaudi'],
  'lofi': ['Jinsang', 'Idealism', 'SwuM'],
  'electronic': ['Daft Punk', 'Deadmau5', 'Aphex Twin'],
  'techno': ['Carl Cox', 'Richie Hawtin', 'Jeff Mills'],
  'ambient': ['Brian Eno', 'Boards of Canada', 'Tycho'],
  'edm': ['Avicii', 'Martin Garrix', 'Zedd'],
  'house': ['Disclosure', 'Duke Dumont', 'CamelPhat'],
  'trap': ['RL Grime', 'Baauer', 'Flosstradamus'],
  'hip-hop': ['J Dilla', 'Madlib', 'Nujabes'],
  'jazz': ['Miles Davis', 'John Coltrane', 'Bill Evans'],
  'rock': ['Pink Floyd', 'Radiohead', 'The Beatles'],
  'metal': ['Metallica', 'Tool', 'Gojira'],
  'pop': ['Max Martin', 'The Weeknd', 'Dua Lipa'],
  'indie': ['Tame Impala', 'MGMT', 'Arctic Monkeys'],
  'synthwave': ['Kavinsky', 'Perturbator', 'Carpenter Brut'],
  'drum-and-bass': ['Netsky', 'Pendulum', 'Sub Focus'],
  'dubstep': ['Skrillex', 'Excision', 'Zomboy'],
  'trance': ['Armin van Buuren', 'Above & Beyond', 'Paul van Dyk'],
  'funk': ['Daft Punk', 'Jamiroquai', 'Vulfpeck'],
  'soul': ['Marvin Gaye', 'Al Green', 'Aretha Franklin'],
};

// Genre to lyric theme mapping
const GENRE_LYRIC_THEMES: Record<string, string[]> = {
  'cinematic': [
    'Rising above the storm, we find our strength within.',
    'Echoes of destiny calling through the night.',
    'Warriors rise as shadows fall, the battle has begun.',
  ],
  'lofi': [
    'Rainy days and coffee cups, lost in thought.',
    'City lights blur through the window, time moves slow.',
    'Floating through a calm digital ocean.',
  ],
  'ambient': [
    'Drifting through endless skies of color and light.',
    'Time dissolves in waves of sound.',
    'Breathing in the space between moments.',
  ],
  'electronic': [
    'Electric dreams pulse through the night.',
    'Binary stars guide us home.',
    'Circuits and souls intertwine.',
  ],
  'rock': [
    'Breaking free from chains that bind.',
    'Thunder rolls across the sky, we stand defiant.',
    'Fire burns within our hearts tonight.',
  ],
  'pop': [
    'Dancing under neon lights, feeling so alive.',
    'Hearts collide like shooting stars tonight.',
    'This moment lasts forever in our minds.',
  ],
  'trap': [
    'Rising from the bottom, now we at the top.',
    'Grinding every day, never gonna stop.',
    'Bass hit hard, got that energy.',
  ],
  'jazz': [
    'Smooth melodies flow like wine at midnight.',
    'Swinging through the city with a rhythm in our soul.',
    'Blue notes paint the evening sky.',
  ],
};

/**
 * Generate AI suggestions for empty fields
 */
export function generateAISuggestions(input: SuggestionInput): AISuggestions {
  const suggestions: AISuggestions = {
    genres: input.genres || [],
    artistInspiration: input.artistInspiration || [],
    lyrics: input.lyrics || '',
    vocalLanguages: input.vocalLanguages || ['English'],
    videoStyles: input.videoStyles || [],
  };
  
  // 1. Generate genres if empty
  if (suggestions.genres.length === 0) {
    suggestions.genres = suggestGenres(input.musicPrompt);
  }
  
  // 2. Generate music prompt if empty
  if (!input.musicPrompt && suggestions.genres.length > 0) {
    suggestions.musicPrompt = generateMusicPrompt(suggestions.genres);
  }
  
  // 3. Suggest artists based on genres
  if (suggestions.artistInspiration.length === 0) {
    suggestions.artistInspiration = suggestArtists(suggestions.genres);
  }
  
  // 4. Generate lyrics if empty
  if (!suggestions.lyrics) {
    suggestions.lyrics = generateLyrics(suggestions.genres, input.musicPrompt);
  }
  
  // 5. Default vocal languages
  if (suggestions.vocalLanguages.length === 0) {
    suggestions.vocalLanguages = ['English'];
  }
  
  // 6. Suggest video styles
  if (suggestions.videoStyles.length === 0) {
    suggestions.videoStyles = suggestVideoStyles(input.lyrics, suggestions.genres);
  }
  
  return suggestions;
}

/**
 * Suggest genres based on music prompt keywords
 */
function suggestGenres(prompt?: string): string[] {
  if (!prompt) {
    return ['Electronic', 'Ambient', 'Chillout'];
  }
  
  const promptLower = prompt.toLowerCase();
  const matchedGenres = new Set<string>();
  
  // Match keywords to genres
  Object.entries(KEYWORD_GENRE_MAP).forEach(([keyword, genres]) => {
    if (promptLower.includes(keyword)) {
      genres.forEach(g => matchedGenres.add(g));
    }
  });
  
  // Return top 3 or default
  const genres = Array.from(matchedGenres).slice(0, 3);
  return genres.length > 0 ? genres : ['Electronic', 'Ambient', 'Chillout'];
}

/**
 * Generate music prompt from genres
 */
function generateMusicPrompt(genres: string[]): string {
  const templates = [
    `Create a ${genres[0]} track with ${genres[1] || 'ambient'} vibes and ${genres[2] || 'electronic'} elements.`,
    `Produce an inspiring ${genres[0]} composition featuring ${genres[1] || 'melodic'} progressions.`,
    `Generate a ${genres[0]} soundscape with rich textures and emotional depth.`,
    `Craft a ${genres[0]} piece that blends ${genres[1] || 'atmospheric'} layers with dynamic energy.`,
  ];
  
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Suggest artists based on genres
 */
function suggestArtists(genres: string[]): string[] {
  const artists = new Set<string>();
  
  genres.forEach(genre => {
    const genreLower = genre.toLowerCase();
    const genreArtists = GENRE_ARTIST_MAP[genreLower] || [];
    genreArtists.slice(0, 2).forEach(a => artists.add(a));
  });
  
  const artistArray = Array.from(artists).slice(0, 3);
  return artistArray.length > 0 ? artistArray : ['Brian Eno', 'Hans Zimmer', 'Daft Punk'];
}

/**
 * Generate lyrics based on genre and prompt
 */
function generateLyrics(genres: string[], prompt?: string): string {
  const genre = genres[0]?.toLowerCase() || 'ambient';
  
  // Get theme-based lyrics
  const themes = GENRE_LYRIC_THEMES[genre] || GENRE_LYRIC_THEMES['ambient'];
  const selectedTheme = themes[Math.floor(Math.random() * themes.length)];
  
  // Add chorus variation
  const chorus = `Oh, ${selectedTheme.split(',')[0].toLowerCase()}, we rise again.`;
  
  return `${selectedTheme}\n${chorus}`;
}

/**
 * Suggest video styles based on content
 */
function suggestVideoStyles(lyrics?: string, genres?: string[]): string[] {
  // If lyrics exist, prefer lyric video
  if (lyrics && lyrics.trim().length > 0) {
    return ['Lyric Video'];
  }
  
  // Genre-based video style suggestions
  const genre = genres?.[0]?.toLowerCase() || '';
  
  if (/cinematic|orchestral|epic/.test(genre)) {
    return ['Official Music Video'];
  } else if (/electronic|techno|house|edm/.test(genre)) {
    return ['Abstract Visualizer'];
  } else if (/ambient|chill|lofi/.test(genre)) {
    return ['Abstract Visualizer'];
  }
  
  return ['Abstract Visualizer'];
}

/**
 * Enhance existing prompt with AI suggestions
 */
export function enhancePrompt(prompt: string, genres: string[]): string {
  const enhancements = [
    'with rich textures and dynamic layers',
    'featuring emotional depth and atmospheric elements',
    'with powerful arrangements and intricate details',
    'blending organic and synthetic sounds seamlessly',
    'with cinematic build-ups and epic crescendos',
  ];
  
  const enhancement = enhancements[Math.floor(Math.random() * enhancements.length)];
  return `${prompt} ${enhancement}`;
}

/**
 * Detect language from lyrics (basic detection)
 */
export function detectLanguage(lyrics: string): string {
  // Simple regex-based detection (can be enhanced with proper NLP)
  const text = lyrics.toLowerCase();
  
  if (/[àâäéèêëïîôùûüÿœæç]/.test(text)) return 'French';
  if (/[áéíóúñü¿¡]/.test(text)) return 'Spanish';
  if (/[äöüß]/.test(text)) return 'German';
  if (/[àèéìòù]/.test(text)) return 'Italian';
  if (/[ąćęłńóśźż]/.test(text)) return 'Polish';
  if (/[а-яА-ЯёЁ]/.test(text)) return 'Russian';
  if (/[ぁ-んァ-ヶ一-龠]/.test(text)) return 'Japanese';
  if (/[가-힣]/.test(text)) return 'Korean';
  if (/[\u4e00-\u9fff]/.test(text)) return 'Chinese';
  
  return 'English';
}
