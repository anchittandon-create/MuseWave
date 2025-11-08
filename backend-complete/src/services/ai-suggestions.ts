import {
  GENRE_ONTOLOGY,
  GENRE_CROSSOVERS,
  ARTIST_BY_GENRE,
  MOOD_KEYWORDS,
  INSTRUMENT_FOCUS,
  ATMOSPHERE_DESCRIPTORS,
  PROMPT_TEMPLATES,
  LYRIC_THEMES,
  VOCAL_LANGUAGES,
  VIDEO_STYLE_OPTIONS,
} from '../config/ai-ontology.js';
import { env } from '../config/env.js';

/**
 * AI Suggestion Engine with Context-Aware, Non-Repetitive Generation
 * Uses weighted randomness, semantic relationships, and LRU cache
 */

interface SuggestionContext {
  musicPrompt?: string;
  genres?: string[];
  artistInspiration?: string[];
  lyrics?: string;
  durationSec?: number;
}

class SuggestionCache {
  private cache: Map<string, string[]> = new Map();
  private maxSize: number;

  constructor(maxSize: number = env.SUGGESTION_CACHE_SIZE) {
    this.maxSize = maxSize;
  }

  add(field: string, value: string): void {
    const existing = this.cache.get(field) || [];
    const updated = [value, ...existing].slice(0, this.maxSize);
    this.cache.set(field, updated);
  }

  has(field: string, value: string): boolean {
    const cached = this.cache.get(field) || [];
    return cached.includes(value);
  }

  getSimilarity(str1: string, str2: string): number {
    const words1 = str1.toLowerCase().split(/\s+/);
    const words2 = str2.toLowerCase().split(/\s+/);
    const intersection = words1.filter(w => words2.includes(w));
    return intersection.length / Math.max(words1.length, words2.length);
  }

  isTooSimilar(field: string, value: string, threshold: number = env.SUGGESTION_UNIQUE_THRESHOLD): boolean {
    const cached = this.cache.get(field) || [];
    return cached.some(cached => this.getSimilarity(cached, value) > threshold);
  }

  clear(): void {
    this.cache.clear();
  }
}

const suggestionCache = new SuggestionCache();

/**
 * Utility Functions
 */
function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomChoices<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, array.length));
}

function shouldCrossover(): boolean {
  return Math.random() < env.SUGGESTION_CROSSOVER_CHANCE;
}

function extractKeywords(text: string): string[] {
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3);
  return [...new Set(words)];
}

function detectTheme(text: string): string {
  const keywords = extractKeywords(text);
  const themeScores: Record<string, number> = {};

  for (const [theme, themeWords] of Object.entries(LYRIC_THEMES)) {
    const matches = keywords.filter(kw => 
      themeWords.some(tw => kw.includes(tw) || tw.includes(kw))
    );
    themeScores[theme] = matches.length;
  }

  const bestTheme = Object.entries(themeScores)
    .sort((a, b) => b[1] - a[1])[0];

  return bestTheme && bestTheme[1] > 0 ? bestTheme[0] : 'emotion';
}

/**
 * Generate AI Suggestions
 */

export function suggestMusicPrompt(context: SuggestionContext): string {
  const { genres = [], artistInspiration = [] } = context;

  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const genre = genres[0] || 'electronic';
    const mood = randomChoice(Object.keys(MOOD_KEYWORDS));
    const tone = randomChoice(MOOD_KEYWORDS[mood as keyof typeof MOOD_KEYWORDS]);
    const instrument = randomChoice(INSTRUMENT_FOCUS);
    const atmosphere = randomChoice(ATMOSPHERE_DESCRIPTORS);
    const artist = artistInspiration[0] || randomChoice(ARTIST_BY_GENRE[genre] || ARTIST_BY_GENRE['electronic']);
    
    // Add crossover genre occasionally
    const crossover = shouldCrossover() && GENRE_CROSSOVERS[genre]
      ? randomChoice(GENRE_CROSSOVERS[genre])
      : genre;

    const template = randomChoice(PROMPT_TEMPLATES);
    const prompt = template
      .replace('{tone}', tone)
      .replace('{genre}', crossover)
      .replace('{mood}', mood)
      .replace('{instrument}', instrument)
      .replace('{atmosphere}', atmosphere)
      .replace('{artist}', artist)
      .replace('{crossover}', crossover);

    // Check uniqueness
    if (!suggestionCache.isTooSimilar('musicPrompt', prompt)) {
      suggestionCache.add('musicPrompt', prompt);
      return prompt;
    }

    attempts++;
  }

  // Fallback if all attempts too similar
  return `An experimental ${genres[0] || 'electronic'} composition exploring ${randomChoice(ATMOSPHERE_DESCRIPTORS)}`;
}

export function suggestGenres(context: SuggestionContext): string[] {
  const { genres = [], musicPrompt = '' } = context;

  const baseGenre = genres[0] || 'electronic';
  const keywords = extractKeywords(musicPrompt);

  // Find related subgenres
  let subgenres = GENRE_ONTOLOGY[baseGenre] || GENRE_ONTOLOGY['electronic'];
  
  // Filter by keywords if present
  if (keywords.length > 0) {
    const keywordGenres = keywords
      .map(kw => Object.keys(GENRE_ONTOLOGY).find(g => g.includes(kw)))
      .filter(Boolean) as string[];
    
    if (keywordGenres.length > 0) {
      subgenres = [...new Set([...subgenres, ...keywordGenres])];
    }
  }

  // Select 2-3 subgenres
  let selected = randomChoices(subgenres, 2 + Math.floor(Math.random() * 2));

  // Add crossover genre with probability
  if (shouldCrossover() && GENRE_CROSSOVERS[baseGenre]) {
    const crossoverGenre = randomChoice(GENRE_CROSSOVERS[baseGenre]);
    const crossoverSubs = GENRE_ONTOLOGY[crossoverGenre] || [crossoverGenre];
    selected.push(randomChoice(crossoverSubs));
  }

  // Ensure uniqueness
  selected = [...new Set(selected)];

  // Cache
  selected.forEach(g => suggestionCache.add('genres', g));

  return selected.slice(0, 3);
}

export function suggestArtists(context: SuggestionContext): string[] {
  const { genres = [], artistInspiration = [] } = context;

  const allArtists: string[] = [];

  // Gather artists from all genres
  for (const genre of genres) {
    const genreArtists = ARTIST_BY_GENRE[genre] || 
                        ARTIST_BY_GENRE[genre.split('-')[0]] ||
                        [];
    allArtists.push(...genreArtists);
  }

  // If no genre match, use electronic
  if (allArtists.length === 0) {
    allArtists.push(...ARTIST_BY_GENRE['electronic']);
  }

  // Remove existing artists from context
  const filtered = allArtists.filter(a => !artistInspiration.includes(a));

  // Select 2-4 unique artists
  const count = 2 + Math.floor(Math.random() * 3);
  let selected = randomChoices(filtered.length > 0 ? filtered : allArtists, count);

  // Ensure uniqueness across cache
  selected = selected.filter(a => !suggestionCache.has('artists', a));
  
  // If all cached, clear cache and retry
  if (selected.length === 0) {
    suggestionCache.clear();
    selected = randomChoices(allArtists, count);
  }

  selected.forEach(a => suggestionCache.add('artists', a));

  return selected.slice(0, 4);
}

export function suggestLyrics(context: SuggestionContext): string {
  const { musicPrompt = '', genres = [], durationSec = 90 } = context;

  const theme = detectTheme(musicPrompt);
  const themeWords = LYRIC_THEMES[theme as keyof typeof LYRIC_THEMES] || LYRIC_THEMES['emotion'];

  // Determine structure based on duration
  const linesCount = Math.floor(durationSec / 15); // ~1 line per 15 seconds
  const hasChorus = linesCount >= 4;

  const lines: string[] = [];

  // Generate verse lines
  const verseLines = Math.min(4, linesCount);
  for (let i = 0; i < verseLines; i++) {
    const word1 = randomChoice(themeWords);
    const word2 = randomChoice(themeWords);
    const verb = randomChoice(['rise', 'fall', 'drift', 'shine', 'fade', 'break', 'soar', 'melt']);
    
    const structures = [
      `Through ${word1} we ${verb}`,
      `${word1} and ${word2} collide`,
      `Lost in ${word1}, we find ${word2}`,
      `Beyond the ${word1}, ${word2} awaits`,
      `${word1} echoes in the ${word2}`,
    ];

    lines.push(randomChoice(structures));
  }

  // Add chorus if duration allows
  if (hasChorus && linesCount > 4) {
    const chorusWord = randomChoice(themeWords);
    const chorusVerb = randomChoice(['ignite', 'awaken', 'transcend', 'illuminate', 'resonate']);
    lines.push('');
    lines.push(`[Chorus]`);
    lines.push(`${chorusWord.charAt(0).toUpperCase() + chorusWord.slice(1)} will ${chorusVerb} tonight`);
    lines.push(`Through the ${randomChoice(themeWords)} we find our light`);
  }

  const lyrics = lines.join('\n');

  // Check uniqueness
  if (!suggestionCache.isTooSimilar('lyrics', lyrics, 0.5)) {
    suggestionCache.add('lyrics', lyrics);
    return lyrics;
  }

  // Fallback
  return `Floating through ${randomChoice(themeWords)}\nEchoes of ${randomChoice(themeWords)} remain\nWe ${randomChoice(['rise', 'drift', 'soar'])} beyond the ${randomChoice(themeWords)}`;
}

export function suggestVocalLanguages(context: SuggestionContext): string[] {
  const { vocalLanguages = [], genres = [] } = context;

  const languages = ['English']; // Always include English

  // Add regional variant based on genre or random chance
  if (Math.random() < env.SUGGESTION_CROSSOVER_CHANCE) {
    const regionalOptions = VOCAL_LANGUAGES.filter(l => l !== 'English' && !vocalLanguages.includes(l));
    
    // Genre-specific preferences
    const genreLanguageMap: Record<string, string[]> = {
      'latin': ['Spanish', 'Portuguese'],
      'reggaeton': ['Spanish'],
      'bossa-nova': ['Portuguese'],
      'afrobeat': ['French', 'Arabic'],
      'bollywood': ['Hindi'],
      'k-pop': ['Korean'],
      'j-pop': ['Japanese'],
    };

    for (const genre of genres) {
      if (genreLanguageMap[genre]) {
        languages.push(randomChoice(genreLanguageMap[genre]));
        break;
      }
    }

    // Random additional language if none matched
    if (languages.length === 1 && regionalOptions.length > 0) {
      languages.push(randomChoice(regionalOptions));
    }
  }

  return [...new Set(languages)];
}

export function suggestVideoStyles(context: SuggestionContext): string[] {
  const { lyrics, genres = [], musicPrompt = '' } = context;

  const hasLyrics = !!lyrics && lyrics.length > 20;
  const keywords = extractKeywords(musicPrompt);

  let styles: string[] = [];

  // Primary style based on lyrics
  if (hasLyrics) {
    styles.push(Math.random() > 0.5 ? 'Lyric Video' : 'Official Music Video');
  } else {
    styles.push('Abstract Visualizer');
  }

  // Secondary style based on genre
  const genreStyleMap: Record<string, string[]> = {
    'cinematic': ['Cinematic Montage', 'Particle Effects'],
    'electronic': ['Spectrum Analyzer', 'Geometric Patterns'],
    'ambient': ['Abstract Visualizer', 'Particle Effects'],
    'techno': ['Spectrum Analyzer', 'Waveform Animation'],
    'orchestral': ['Cinematic Montage'],
  };

  for (const genre of genres) {
    if (genreStyleMap[genre]) {
      const secondary = randomChoice(genreStyleMap[genre]);
      if (!styles.includes(secondary)) {
        styles.push(secondary);
        break;
      }
    }
  }

  // Random cross-style with low probability
  if (shouldCrossover() * 0.3 > Math.random()) {
    const remaining = VIDEO_STYLE_OPTIONS.filter(s => !styles.includes(s));
    if (remaining.length > 0) {
      styles.push(randomChoice(remaining));
    }
  }

  return styles.slice(0, 2); // Max 2 styles
}

/**
 * Generate All Suggestions at Once
 */
export function generateAllSuggestions(context: SuggestionContext = {}): {
  musicPrompt: string;
  genres: string[];
  artistInspiration: string[];
  lyrics: string;
  vocalLanguages: string[];
  videoStyles: string[];
} {
  // Generate in dependency order
  const genres = context.genres || suggestGenres(context);
  const extendedContext = { ...context, genres };

  const musicPrompt = suggestMusicPrompt(extendedContext);
  const fullContext = { ...extendedContext, musicPrompt };

  return {
    musicPrompt,
    genres,
    artistInspiration: suggestArtists(fullContext),
    lyrics: suggestLyrics(fullContext),
    vocalLanguages: suggestVocalLanguages(fullContext),
    videoStyles: suggestVideoStyles(fullContext),
  };
}

/**
 * Clear suggestion cache (useful for testing)
 */
export function clearSuggestionCache(): void {
  suggestionCache.clear();
}
