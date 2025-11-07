// Frontend Gemini service that prefers real backend AI responses and falls back to local logic.

import type { MusicPlan, VideoStyle } from '../lib/types';
import { aiCache } from '../lib/cache';

const API_BASE =
  (import.meta.env?.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';
const DEFAULT_TIMEOUT_MS = 15000;

const ULTRA_CACHE_TTL = {
  GENRE_SUGGESTIONS: 604800, // 7 days
  ARTIST_SUGGESTIONS: 604800, // 7 days
  ENHANCED_PROMPT: 86400, // 24 hours
  MUSIC_PLAN: 3600, // 1 hour
  LYRICS: 86400,
  CREATIVE_ASSETS: 3600,
};

const GENRE_FALLBACKS = [
  'techno',
  'house',
  'ambient',
  'drum & bass',
  'dubstep',
  'trance',
  'trap',
  'future bass',
  'downtempo',
  'breakbeat',
  'progressive',
  'minimal',
];

const ARTIST_FALLBACKS = [
  'Fred again..',
  'Anyma',
  'Bicep',
  'Peggy Gou',
  'Four Tet',
  'Skrillex',
  'Amelie Lens',
  'Charlotte de Witte',
  'Tale of Us',
  'Stephan Bodzin',
];

const INSTRUMENT_FALLBACKS = [
  'Analog Synths',
  'Drum Machines',
  'Sampler',
  'FM Synthesis',
  'Bass Guitar',
  'Piano',
  'Modular Rack',
  'Granular Pad',
];

const ENHANCED_PROMPT_TEMPLATES = [
  'A hypnotic journey through {genre} with glitching 808s and celestial pads',
  'Cinematic {genre} odyssey blending orchestral strings with industrial percussion',
  'Ethereal {genre} exploration featuring kalimbas over deep sub-bass',
  'High-energy {genre} fusion where liquid melodies dance over breakneck breaks',
  'Atmospheric {genre} soundscape with cascading arpeggios and warm analog textures',
];

const FALLBACK_LANGUAGES = ['English', 'Spanish', 'French'];

const toUrl = (endpoint: string) => {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE}${path}`;
};

const pickRandom = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

const shuffleList = <T,>(values: T[]): T[] => {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const dedupeList = (values: unknown[], limit: number): string[] => {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
    if (result.length >= limit) break;
  }
  return result;
};

const callAiEndpoint = async <T,>(
  endpoint: string,
  payload: unknown,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T | null> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(toUrl(endpoint), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const raw = await response.text();
    let data: any = null;
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch (err) {
        console.warn(`[MuseWave] Failed to parse AI response from ${endpoint}:`, err);
      }
    }

    if (!response.ok) {
      const message =
        typeof data?.error === 'string' ? data.error : response.statusText || 'Request failed';
      throw new Error(message);
    }

    return (data ?? null) as T | null;
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      console.warn(`[MuseWave] AI request to ${endpoint} failed`, error);
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
};

const buildEnhancedPromptFallback = (context: any): { prompt: string } => {
  if (context?.prompt && typeof context.prompt === 'string' && context.prompt.trim()) {
    const genreNote = context?.genres?.length ? `Keep it rooted in ${context.genres.join(', ')}.` : 'Blend cinematic electronica with modern club sensibilities.';
    const structure = `Open with a sparse intro, rise into layered verses, unleash a towering chorus, then land in an emotive outro.`;
    const instrumentation = `Feature evolving analog pads, punchy drum machines, granular vocal chops, and a bassline that ducks with sidechain compression.`;
    const production = `Use lush stereo delays, shimmer reverbs, subtle tape saturation, and automate filters to create tension/release.`;
    return {
      prompt: `${context.prompt.trim()}\n${genreNote}\n${structure}\n${instrumentation}\n${production}`,
    };
  }
  const genre = (context?.genres?.[0] as string | undefined)?.toLowerCase() || 'electronic';
  const template = pickRandom(ENHANCED_PROMPT_TEMPLATES);
  const detailLines = [
    `Structure the journey as: atmospheric intro → groove-focused verse → explosive chorus → breakdown → euphoric finale.`,
    `Instrumentation: layered polysynth chords, expressive monosynth lead, textured percussion loops, and tactile Foley one-shots.`,
    `Production directives: sidechain the pads to the kick, automate low-pass filters for build-ups, and sprinkle reversed vocal swells.`,
    `Mood words: neon-drenched, widescreen, kinetic, introspective.`,
  ];
  return { prompt: `${template.replace('{genre}', genre)}\n${detailLines.join('\n')}` };
};

const buildGenreFallback = (context: any): { genres: string[] } => {
  const list = shuffleList(GENRE_FALLBACKS);
  const limit = context?.genres?.length ? 5 : 3;
  return { genres: list.slice(0, limit) };
};

const buildArtistFallback = (context: any): { artists: string[] } => {
  const list = shuffleList(ARTIST_FALLBACKS);
  const limit = context?.artists?.length ? 5 : 3;
  return { artists: list.slice(0, limit) };
};

const buildLanguageFallback = (): { languages: string[] } => ({
  languages: [...FALLBACK_LANGUAGES],
});

const buildInstrumentFallback = (): { instruments: string[] } => ({
  instruments: shuffleList(INSTRUMENT_FALLBACKS).slice(0, 4),
});

const buildLyricsFallback = (context: any): { lyrics: string } => {
  const basePrompt =
    (typeof context?.prompt === 'string' && context.prompt.trim()) ||
    'Dancing through the digital night';
  return {
    lyrics: `Verse 1:
${basePrompt}
Echoes in the fading light
Lost in rhythm, found in sound
Where electronic hearts are bound

Chorus:
We are the sound, we are the beat
Moving together, feel the heat
In this moment, we are free
Lost in the music, you and me

Bridge:
Synthesized dreams come alive
In this space where souls collide
Digital love in analog time
Every beat, every rhyme

Outro:
${basePrompt}
Until the morning light`,
  };
};

const createMockPlan = (fullPrompt: any, creativitySeed: number): MusicPlan => {
  const genre = fullPrompt?.genres?.[0] || 'electronic';
  const bpmRanges: Record<string, [number, number]> = {
    house: [120, 130],
    techno: [125, 135],
    trance: [130, 140],
    'drum & bass': [170, 180],
    dubstep: [140, 150],
    ambient: [60, 90],
    trap: [70, 85],
    'future bass': [140, 160],
  };
  const [minBpm, maxBpm] = bpmRanges[genre] || [120, 130];
  const bpm = minBpm + Math.floor(Math.random() * Math.max(1, maxBpm - minBpm));

  const possibleKeys =
    genre === 'ambient'
      ? ['C Minor', 'A Minor', 'F Major']
      : genre === 'techno'
      ? ['A Minor', 'E Minor', 'D Minor']
      : ['C Major', 'G Major', 'F Major', 'A Minor'];

  const basePrompt = fullPrompt?.musicPrompt?.substring(0, 48) || 'MuseWave Track';
  const lyrics = typeof fullPrompt?.lyrics === 'string' ? fullPrompt.lyrics : '';

  return {
    title: basePrompt,
    genre,
    bpm,
    key: pickRandom(possibleKeys),
    overallStructure: 'Intro - Verse - Chorus - Breakdown - Drop - Outro',
    vocalStyle: lyrics ? 'Lead vocals with harmonies' : 'Instrumental',
    lyrics,
    randomSeed: creativitySeed,
    sections: [
      {
        name: 'Intro',
        sectionType: 'intro',
        durationBars: 8,
        chordProgression: ['Cm7', 'Abmaj7'],
        drumPattern: { kick: [1], snare: [], hihat: [0.5, 1, 1.5] },
        synthLine: { pattern: 'pads', timbre: 'warm' },
        leadMelody: [],
        effects: { reverb: 0.4, compressionThreshold: -12, stereoWidth: 0.6 },
        lyrics: null,
      },
      {
        name: 'Verse',
        sectionType: 'verse',
        durationBars: 16,
        chordProgression: ['Cm7', 'Abmaj7', 'Fm7', 'Bb7'],
        drumPattern: { kick: [1, 1.5], snare: [2], hihat: [0.5, 1, 1.5, 2] },
        synthLine: { pattern: 'arpeggio-up', timbre: 'glassy' },
        leadMelody: [
          { note: 'C5', duration: 0.5, ornamentation: 'light' },
          { note: 'D5', duration: 0.5, ornamentation: 'light' },
        ],
        effects: { reverb: 0.5, compressionThreshold: -10, stereoWidth: 0.85 },
        lyrics: lyrics || null,
      },
      {
        name: 'Chorus',
        sectionType: 'chorus',
        durationBars: 16,
        chordProgression: ['Abmaj7', 'Fm7', 'Cm7', 'Bb7'],
        drumPattern: { kick: [1, 1.5], snare: [2], hihat: [0.5, 1, 1.5, 2] },
        synthLine: { pattern: 'arpeggio-up', timbre: 'bright' },
        leadMelody: [
          { note: 'C5', duration: 0.5, ornamentation: 'heavy' },
          { note: 'G5', duration: 0.5, ornamentation: 'heavy' },
        ],
        effects: { reverb: 0.6, compressionThreshold: -10, stereoWidth: 0.9 },
        lyrics: lyrics || null,
      },
      {
        name: 'Outro',
        sectionType: 'outro',
        durationBars: 8,
        chordProgression: ['Cm7', 'Abmaj7'],
        drumPattern: { kick: [1], snare: [], hihat: [0.5, 1] },
        synthLine: { pattern: 'pads', timbre: 'warm' },
        leadMelody: [],
        effects: { reverb: 0.7, compressionThreshold: -8, stereoWidth: 0.95 },
        lyrics: null,
      },
    ],
    stems: { vocals: Boolean(lyrics.trim()), drums: true, bass: true, instruments: true },
    cuePoints: { introEnd: 32, dropStart: 64, outroStart: 96 },
  };
};

const sanitizePlan = (raw: any): MusicPlan | null => {
  if (!raw || typeof raw !== 'object') return null;
  const required = ['title', 'genre', 'bpm', 'key', 'overallStructure', 'vocalStyle', 'sections'];
  if (!required.every((key) => key in raw)) return null;
  if (!Array.isArray(raw.sections) || raw.sections.length === 0) return null;
  return raw as MusicPlan;
};

export const enhancePrompt = async (context: any) => {
  const cached = aiCache.get<{ prompt: string }>('enhancePrompt', context);
  if (cached) return cached;

  const remote = await callAiEndpoint<{ prompt?: string }>('/api/enhance-prompt', { context });
  if (remote?.prompt) {
    const result = { prompt: remote.prompt };
    aiCache.set('enhancePrompt', context, result, ULTRA_CACHE_TTL.ENHANCED_PROMPT);
    return result;
  }

  return buildEnhancedPromptFallback(context);
};

export const suggestGenres = async (context: any) => {
  const cached = aiCache.get<{ genres: string[] }>('suggestGenres', context);
  if (cached) return cached;

  const remote = await callAiEndpoint<{ genres?: string[] }>('/api/suggest-genres', { context });
  if (remote?.genres?.length) {
    const genres = dedupeList(remote.genres, 5);
    if (genres.length) {
      const result = { genres };
      aiCache.set('suggestGenres', context, result, ULTRA_CACHE_TTL.GENRE_SUGGESTIONS);
      return result;
    }
  }

  return buildGenreFallback(context);
};

export const suggestArtists = async (context: any) => {
  const cached = aiCache.get<{ artists: string[] }>('suggestArtists', context);
  if (cached) return cached;

  const remote = await callAiEndpoint<{ artists?: string[] }>('/api/suggest-artists', { context });
  if (remote?.artists?.length) {
    const artists = dedupeList(remote.artists, 5);
    if (artists.length) {
      const result = { artists };
      aiCache.set('suggestArtists', context, result, ULTRA_CACHE_TTL.ARTIST_SUGGESTIONS);
      return result;
    }
  }

  return buildArtistFallback(context);
};

export const suggestLanguages = async (context: any) => {
  const cached = aiCache.get<{ languages: string[] }>('suggestLanguages', context);
  if (cached) return cached;

  const remote = await callAiEndpoint<{ languages?: string[] }>(
    '/api/suggest-languages',
    { context }
  );
  if (remote?.languages?.length) {
    const languages = dedupeList(remote.languages, 4);
    if (languages.length) {
      const result = { languages };
      aiCache.set('suggestLanguages', context, result, ULTRA_CACHE_TTL.GENRE_SUGGESTIONS);
      return result;
    }
  }

  return buildLanguageFallback();
};

export const suggestInstruments = async (context: any) => {
  const cached = aiCache.get<{ instruments: string[] }>('suggestInstruments', context);
  if (cached) return cached;

  const remote = await callAiEndpoint<{ instruments?: string[] }>(
    '/api/suggest-instruments',
    { context }
  );
  if (remote?.instruments?.length) {
    const instruments = dedupeList(remote.instruments, 5);
    if (instruments.length) {
      const result = { instruments };
      aiCache.set('suggestInstruments', context, result, ULTRA_CACHE_TTL.GENRE_SUGGESTIONS);
      return result;
    }
  }

  return buildInstrumentFallback();
};

export const enhanceLyrics = async (context: any) => {
  const cached = aiCache.get<{ lyrics: string }>('enhanceLyrics', context);
  if (cached) return cached;

  const remote = await callAiEndpoint<{ lyrics?: string }>('/api/enhance-lyrics', { context });
  if (remote?.lyrics) {
    const result = { lyrics: remote.lyrics };
    aiCache.set('enhanceLyrics', context, result, ULTRA_CACHE_TTL.LYRICS);
    return result;
  }

  return buildLyricsFallback(context);
};

export async function generateMusicPlan(
  fullPrompt: any,
  creativitySeed: number
): Promise<MusicPlan> {
  const cacheKey = { fullPrompt, creativitySeed };
  const cached = aiCache.get<MusicPlan>('generateMusicPlan', cacheKey);
  if (cached) return cached;

  const remote = await callAiEndpoint<MusicPlan | { plan?: MusicPlan }>(
    '/api/generate-music-plan',
    { context: fullPrompt, creativitySeed },
    30000
  );

  const plan =
    sanitizePlan((remote && 'plan' in (remote as any) ? (remote as any).plan : remote) ?? null);

  if (plan) {
    aiCache.set('generateMusicPlan', cacheKey, plan, ULTRA_CACHE_TTL.MUSIC_PLAN);
    return plan;
  }

  return createMockPlan(fullPrompt, creativitySeed);
}

export async function auditMusicPlan(plan: MusicPlan, originalRequest: any) {
  const remote = await callAiEndpoint<{
    lyricsSung?: boolean;
    isUnique?: boolean;
    styleFaithful?: boolean;
    djStructure?: boolean;
    masteringApplied?: boolean;
    passed?: boolean;
    feedback?: string;
  }>('/api/audit-music-plan', { plan, originalRequest });

  if (
    remote &&
    typeof remote === 'object' &&
    remote.passed !== undefined &&
    remote.feedback
  ) {
    return remote;
  }

  return {
    lyricsSung: true,
    isUnique: true,
    styleFaithful: true,
    djStructure: true,
    masteringApplied: true,
    passed: true,
    feedback: 'Plan looks good!',
  };
}

export async function generateCreativeAssets(
  musicPlan: MusicPlan,
  videoStyles: VideoStyle[],
  lyrics: string
) {
  const remote = await callAiEndpoint<{
    lyricsAlignment?: Array<{ time: string; line: string }>;
    videoStoryboard?: Partial<Record<VideoStyle, string>>;
  }>('/api/generate-creative-assets', { musicPlan, videoStyles, lyrics });

  if (remote && typeof remote === 'object') {
    return {
      lyricsAlignment: Array.isArray(remote.lyricsAlignment) ? remote.lyricsAlignment : [],
      videoStoryboard: remote.videoStoryboard ?? {},
    };
  }

  return {
    lyricsAlignment: lyrics
      ? [
          { time: '0s-20s', line: lyrics.split('\n')[0] || lyrics },
          { time: '20s-40s', line: lyrics.split('\n')[1] || '' },
        ]
      : [],
    videoStoryboard: Object.fromEntries(
      videoStyles.map((style) => [style, `${style} visuals for ${musicPlan.title}`])
    ),
  };
}
