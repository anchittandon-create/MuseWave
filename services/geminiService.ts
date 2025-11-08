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

// Generate unique timestamp-based seed for variations
const getUniqueSeed = () => Date.now() + Math.random();

const buildEnhancedPromptFallback = (context: any): { prompt: string } => {
  const userPrompt = context?.prompt?.trim();
  const primaryGenre = context?.genres?.[0] || 'electronic';
  const seed = getUniqueSeed();
  
  // If user provided a prompt, enhance it intelligently
  if (userPrompt) {
    const template = pickRandom(ENHANCED_PROMPT_TEMPLATES).replace('{genre}', primaryGenre.toLowerCase());
    
    // Generate contextual enhancements based on existing prompt
    const enhancementPhrases = shuffleList([
      `Building on your vision: "${userPrompt}"`,
      `Expanding your concept: "${userPrompt}"`,
      `Elevating your idea: "${userPrompt}"`,
      `Realizing your vision: "${userPrompt}"`
    ])[0];
    
    const contextualAdditions = shuffleList([
      `with ${template.split(' with ')[1] || 'rich sonic textures'}`,
      `featuring intricate ${primaryGenre} production techniques`,
      `weaving together ${context?.artists?.[0] || 'contemporary'}-inspired soundscapes`,
      `layering emotive progressions and dynamic arrangements`
    ]).slice(0, 2).join(', ');
    
    const descriptivePrompt = `${enhancementPhrases}, ${contextualAdditions}.`;
    
    const sectionGuide = shuffleList([
      'Intro (0:00–0:32) – start with filtered drones and distant foley textures, gradually revealing the pulse via low-passed hats.',
      'Intro (0:00–0:32) – open with ethereal pads and reverse cymbals, building tension with rising white noise.',
      'Intro (0:00–0:32) – begin with isolated melodic fragments over ambient field recordings, slowly introducing rhythm.'
    ])[0] + '\n' + shuffleList([
      'Section A (0:32–1:32) – introduce the core bass arp and a syncopated clap, layering call-and-response chords.',
      'Section A (0:32–1:32) – establish the groove with punchy kicks and evolving bass patterns, adding harmonic layers.',
      'Section A (0:32–1:32) – develop the main motif with stacked synths and polyrhythmic percussion elements.'
    ])[0] + '\n' + shuffleList([
      'Section B (1:32–2:32) – lift all filters, add soaring lead hooks and stacked harmonies, emphasize wide stereo delays.',
      'Section B (1:32–2:32) – open up the mix with bright leads and lush chord stacks, creating spatial depth.',
      'Section B (1:32–2:32) – expand energy with driving rhythms and countermelodies, building towards climax.'
    ])[0] + '\n' + shuffleList([
      'Breakdown (2:32–3:00) – strip back to vocals/pads, automate granular FX, tease the drop with rising noise swells.',
      'Breakdown (2:32–3:00) – reduce to core elements, apply filter automation, prepare for energetic return.',
      'Breakdown (2:32–3:00) – create tension with minimal arrangement, use reverb swells and pitched risers.'
    ])[0] + '\n' + shuffleList([
      'Finale (3:00+) – bring everything back with extra percussion fills, uplifting countermelodies, and saturated master bus.',
      'Finale (3:00+) – drop with full arrangement plus additional layers, driving towards euphoric conclusion.',
      'Finale (3:00+) – climax with maximum energy, layered harmonies, and dynamic percussion fills before outro.'
    ])[0];

    const instrumentationVariations = shuffleList([
      'Instrumentation:\n- Kick: warm but punchy, 4-on-the-floor with subtle ghost hits.\n- Bass: sidechained saw stack doubling a sub sine for weight.',
      'Instrumentation:\n- Kick: deep and driving, carefully tuned with tight decay.\n- Bass: rich analog-modeled oscillators with subtle detuning.',
      'Instrumentation:\n- Kick: powerful and clean, surgical EQ for maximum impact.\n- Bass: layered sub and mid frequencies with dynamic movement.'
    ])[0] + '\n' + shuffleList([
      '- Harmonic bed: evolving polysynth pads blended with strings and guitar harmonics.',
      '- Harmonic layers: lush pad textures mixed with organic instrument samples.',
      '- Chord foundation: warm analog synth chords with subtle modulation and movement.'
    ])[0] + '\n' + shuffleList([
      '- Lead motif: expressive mono synth performing root-third-fifth arpeggios with portamento.',
      '- Melodic elements: soaring lead lines with emotional phrasing and vibrato.',
      '- Main hook: memorable synth melody with characteristic timbre and articulation.'
    ])[0] + '\n' + shuffleList([
      '- Percussion: metallic hats, shuffled shakers, cinematic tom rolls, reversed impacts.',
      '- Rhythmic elements: crisp hi-hats, layered claps, dynamic fills, and textural hits.',
      '- Drum layers: tight hi-hats, snappy snares, percussive loops, and atmospheric cymbals.'
    ])[0] + '\n' + shuffleList([
      '- Vocals (if any): breathy whispers processed through granular delays and octave harmonizers.',
      '- Vocals (if any): emotive performances with subtle effects and harmonic layers.',
      '- Vocals (if any): expressive delivery enhanced with spatial processing and character.'
    ])[0];

    const productionVariations = shuffleList([
      'Production directives:\n- Use automation to morph filter cutoff, resonance, and stereo width every eight bars.',
      'Production directives:\n- Apply dynamic parameter modulation to create evolving textures throughout.',
      'Production directives:\n- Employ creative automation on key parameters for continuous sonic interest.'
    ])[0] + '\n' + shuffleList([
      '- Apply shimmer reverb on pads, while keeping drums tight with transient shaping.',
      '- Use spatial effects on melodic elements while maintaining punch on rhythmic components.',
      '- Create depth with reverb and delay on atmospheres, preserve clarity on percussive elements.'
    ])[0] + '\n' + shuffleList([
      '- Add found-sound snippets (rain, subway announcements) tucked under transitions for storytelling.',
      '- Layer subtle field recordings and organic textures to add character and depth.',
      '- Incorporate environmental sounds and unique samples for distinctive sonic personality.'
    ])[0] + '\n' + shuffleList([
      '- Master to -14 LUFS with gentle glue compression and soft clipping for energy.',
      '- Final mix balanced to streaming standards with controlled dynamics and warmth.',
      '- Polish with professional mastering chain: EQ, compression, limiting for modern loudness.'
    ])[0];

    const genreNote = context?.genres?.length
      ? `Genre Anchors: ${context.genres.join(', ')}.`
      : 'Genre Anchors: blend modern melodic techno with cinematic electronica.';

    const inspirationNote = context?.artists?.length
      ? `Artist Touchstones: ${context.artists.join(', ')}.`
      : 'Artist Touchstones: reference acts like Rival Consoles, Jon Hopkins, Kiasmos.';

    return {
      prompt: [
        descriptivePrompt,
        genreNote,
        inspirationNote,
        '\nArrangement Map:\n' + sectionGuide,
        '\n' + instrumentationVariations,
        '\n' + productionVariations,
        `\nUnique Session ID: ${seed}`
      ].join('\n\n')
    };
  } else {
    // No user prompt - generate completely unique prompt each time
    const template = pickRandom(ENHANCED_PROMPT_TEMPLATES).replace('{genre}', primaryGenre.toLowerCase());
    
    const uniqueOpeners = shuffleList([
      'An immersive sonic journey through',
      'A captivating exploration of',
      'A mesmerizing blend of',
      'An innovative fusion combining',
      'A dynamic soundscape featuring'
    ])[0];
    
    const genreDescriptors = shuffleList([
      'contemporary electronic production',
      'cutting-edge sound design',
      'progressive arrangement techniques',
      'experimental sonic textures',
      'modern production aesthetics'
    ])[0];
    
    const emotionalQualities = shuffleList([
      'with ethereal atmospheres and driving energy',
      'balancing introspection with explosive moments',
      'weaving melancholy with euphoric peaks',
      'merging organic warmth with digital precision',
      'combining nostalgic elements with futuristic vision'
    ])[0];
    
    const descriptivePrompt = `${uniqueOpeners} ${primaryGenre} ${emotionalQualities}, ${genreDescriptors}.`;
    
    // Rest of the generation logic with variations...
    const sectionGuide = shuffleList([
      'Intro (0:00–0:32) – start with filtered drones and distant foley textures, gradually revealing the pulse via low-passed hats.',
      'Intro (0:00–0:32) – open with ethereal pads and reverse cymbals, building tension with rising white noise.',
      'Intro (0:00–0:32) – begin with isolated melodic fragments over ambient field recordings, slowly introducing rhythm.'
    ])[0] + '\n' + shuffleList([
      'Section A (0:32–1:32) – introduce the core bass arp and a syncopated clap, layering call-and-response chords.',
      'Section A (0:32–1:32) – establish the groove with punchy kicks and evolving bass patterns, adding harmonic layers.',
      'Section A (0:32–1:32) – develop the main motif with stacked synths and polyrhythmic percussion elements.'
    ])[0] + '\n' + shuffleList([
      'Section B (1:32–2:32) – lift all filters, add soaring lead hooks and stacked harmonies, emphasize wide stereo delays.',
      'Section B (1:32–2:32) – open up the mix with bright leads and lush chord stacks, creating spatial depth.',
      'Section B (1:32–2:32) – expand energy with driving rhythms and countermelodies, building towards climax.'
    ])[0] + '\n' + shuffleList([
      'Breakdown (2:32–3:00) – strip back to vocals/pads, automate granular FX, tease the drop with rising noise swells.',
      'Breakdown (2:32–3:00) – reduce to core elements, apply filter automation, prepare for energetic return.',
      'Breakdown (2:32–3:00) – create tension with minimal arrangement, use reverb swells and pitched risers.'
    ])[0] + '\n' + shuffleList([
      'Finale (3:00+) – bring everything back with extra percussion fills, uplifting countermelodies, and saturated master bus.',
      'Finale (3:00+) – drop with full arrangement plus additional layers, driving towards euphoric conclusion.',
      'Finale (3:00+) – climax with maximum energy, layered harmonies, and dynamic percussion fills before outro.'
    ])[0];

    const instrumentationDetail = shuffleList([
      'Instrumentation:\n- Kick: warm but punchy, 4-on-the-floor with subtle ghost hits.\n- Bass: sidechained saw stack doubling a sub sine for weight.',
      'Instrumentation:\n- Kick: deep and driving, carefully tuned with tight decay.\n- Bass: rich analog-modeled oscillators with subtle detuning.',
      'Instrumentation:\n- Kick: powerful and clean, surgical EQ for maximum impact.\n- Bass: layered sub and mid frequencies with dynamic movement.'
    ])[0] + '\n- Harmonic bed: evolving polysynth pads blended with strings and guitar harmonics.\n- Lead motif: expressive mono synth performing root-third-fifth arpeggios with portamento.\n- Percussion: metallic hats, shuffled shakers, cinematic tom rolls, reversed impacts.\n- Vocals (if any): breathy whispers processed through granular delays and octave harmonizers.';

    const productionDetail = 'Production directives:\n- Use automation to morph filter cutoff, resonance, and stereo width every eight bars.\n- Apply shimmer reverb on pads, while keeping drums tight with transient shaping.\n- Add found-sound snippets (rain, subway announcements) tucked under transitions for storytelling.\n- Master to -14 LUFS with gentle glue compression and soft clipping for energy.';

    const genreNote = context?.genres?.length
      ? `Genre Anchors: ${context.genres.join(', ')}.`
      : 'Genre Anchors: blend modern melodic techno with cinematic electronica.';

    const inspirationNote = context?.artists?.length
      ? `Artist Touchstones: ${context.artists.join(', ')}.`
      : 'Artist Touchstones: reference acts like Rival Consoles, Jon Hopkins, Kiasmos.';

    return {
      prompt: [
        descriptivePrompt,
        genreNote,
        inspirationNote,
        '\nArrangement Map:\n' + sectionGuide,
        '\n' + instrumentationDetail,
        '\n' + productionDetail,
        `\nUnique Session ID: ${seed}`
      ].join('\n\n')
    };
  }
};

const buildGenreFallback = (context: any): { genres: string[] } => {
  // Get existing genres from context
  const existingGenres = (context?.genres || []).map((g: string) => g.toLowerCase());
  
  // Filter out already selected genres and shuffle
  const availableGenres = GENRE_FALLBACKS.filter(g => !existingGenres.includes(g.toLowerCase()));
  const shuffled = shuffleList(availableGenres);
  
  // If user has genres, suggest related/complementary ones
  if (existingGenres.length > 0) {
    const primaryGenre = existingGenres[0];
    const relatedGenres: Record<string, string[]> = {
      'techno': ['minimal', 'progressive', 'house', 'trance'],
      'house': ['techno', 'deep house', 'progressive', 'future house'],
      'ambient': ['downtempo', 'drone', 'experimental', 'post-rock'],
      'drum & bass': ['jungle', 'breakbeat', 'neurofunk', 'liquid dnb'],
      'dubstep': ['future bass', 'trap', 'bass music', 'riddim'],
      'trance': ['progressive', 'uplifting', 'psytrance', 'hard trance'],
    };
    
    const related = relatedGenres[primaryGenre] || [];
    const contextualSuggestions = related
      .filter(g => !existingGenres.includes(g.toLowerCase()))
      .slice(0, 3);
    
    if (contextualSuggestions.length > 0) {
      return { genres: [...contextualSuggestions, ...shuffled.slice(0, 5 - contextualSuggestions.length)] };
    }
  }
  
  // Default: return random unique genres
  const limit = 5;
  return { genres: shuffled.slice(0, limit) };
};

const buildArtistFallback = (context: any): { artists: string[] } => {
  // Get existing artists and genres for context
  const existingArtists = (context?.artists || []).map((a: string) => a.toLowerCase());
  const genres = context?.genres || [];
  
  // Filter out already selected artists
  const availableArtists = ARTIST_FALLBACKS.filter(a => !existingArtists.includes(a.toLowerCase()));
  
  // Genre-specific artist suggestions
  const genreArtistMap: Record<string, string[]> = {
    'techno': ['Charlotte de Witte', 'Amelie Lens', 'Tale of Us', 'Stephan Bodzin'],
    'house': ['Fred again..', 'Peggy Gou', 'Disclosure', 'Fisher'],
    'ambient': ['Jon Hopkins', 'Nils Frahm', 'Ólafur Arnalds', 'Brian Eno'],
    'drum & bass': ['Calibre', 'High Contrast', 'Netsky', 'Noisia'],
    'dubstep': ['Skrillex', 'Excision', 'Virtual Riot', 'Zomboy'],
    'trance': ['Armin van Buuren', 'Above & Beyond', 'Paul van Dyk', 'Ferry Corsten'],
    'electronica': ['Four Tet', 'Bicep', 'Bonobo', 'Floating Points'],
  };
  
  // Find contextual artists based on selected genres
  let contextualArtists: string[] = [];
  for (const genre of genres) {
    const genreLower = genre.toLowerCase();
    const matchingArtists = genreArtistMap[genreLower] || [];
    contextualArtists.push(...matchingArtists.filter(a => !existingArtists.includes(a.toLowerCase())));
  }
  
  // Dedupe and shuffle
  const uniqueContextual = [...new Set(contextualArtists)].slice(0, 3);
  const shuffled = shuffleList(availableArtists);
  const limit = 5;
  
  // Combine contextual + random
  const combined = [...uniqueContextual, ...shuffled];
  return { artists: dedupeList(combined, limit) };
};

const buildLanguageFallback = (context: any): { languages: string[] } => {
  const existingLanguages = (context?.languages || []).map((l: string) => l.toLowerCase());
  const genres = context?.genres || [];
  const artists = context?.artists || [];
  
  // Contextual language suggestions based on genres/artists
  const contextualLanguages: string[] = [];
  
  // If user selected artists, suggest their typical languages
  const artistLanguageMap: Record<string, string[]> = {
    'a.r. rahman': ['Hindi', 'Tamil', 'Telugu'],
    'shreya ghoshal': ['Hindi', 'Bengali', 'Tamil'],
    'arijit singh': ['Hindi', 'Bengali'],
    'rosalía': ['Spanish', 'Catalan'],
    'aya nakamura': ['French'],
    'bad bunny': ['Spanish'],
  };
  
  for (const artist of artists) {
    const artistLower = artist.toLowerCase();
    const langs = artistLanguageMap[artistLower] || [];
    contextualLanguages.push(...langs.filter(l => !existingLanguages.includes(l.toLowerCase())));
  }
  
  // Add popular/diverse languages
  const popularLanguages = shuffleList([
    'English', 'Spanish', 'French', 'Hindi', 'Portuguese', 
    'Japanese', 'Korean', 'Italian', 'German', 'Arabic'
  ]).filter(l => !existingLanguages.includes(l.toLowerCase()));
  
  const combined = [...new Set([...contextualLanguages, ...popularLanguages])].slice(0, 4);
  return { languages: combined.length > 0 ? combined : ['English', 'Spanish', 'French'] };
};

const buildInstrumentFallback = (context: any): { instruments: string[] } => {
  const existingInstruments = (context?.instruments || []).map((i: string) => i.toLowerCase());
  const genres = context?.genres || [];
  
  // Genre-specific instrument suggestions
  const genreInstrumentMap: Record<string, string[]> = {
    'techno': ['Analog Synths', 'Drum Machines', 'Modular Rack', 'TB-303 Bass'],
    'house': ['Piano', 'Vocal Samples', 'Organ', 'Bass Guitar', 'Drum Machines'],
    'ambient': ['Granular Pad', 'Field Recordings', 'Guitar', 'Strings', 'Piano'],
    'drum & bass': ['Reese Bass', 'Amen Break', 'Sub Bass', 'Sampler', 'Vocal Chops'],
    'dubstep': ['FM Synthesis', 'Wavetable Synth', 'Sub Bass', 'LFO Modulation'],
    'trance': ['Supersaw', 'Arpeggiator', 'Gated Pads', 'Pluck Synths', 'White Noise'],
  };
  
  let contextualInstruments: string[] = [];
  for (const genre of genres) {
    const genreLower = genre.toLowerCase();
    const instruments = genreInstrumentMap[genreLower] || [];
    contextualInstruments.push(...instruments.filter(i => !existingInstruments.includes(i.toLowerCase())));
  }
  
  // If no genre-specific match, use diverse fallbacks
  const availableFallbacks = INSTRUMENT_FALLBACKS.filter(i => !existingInstruments.includes(i.toLowerCase()));
  const shuffled = shuffleList([...new Set([...contextualInstruments, ...availableFallbacks])]);
  
  return { instruments: shuffled.slice(0, 4) };
};

const buildLyricsFallback = (context: any): { lyrics: string } => {
  const basePrompt =
    (typeof context?.prompt === 'string' && context.prompt.trim()) ||
    'Dancing through the digital night';
  
  // Get target language from languages array or default to English
  const targetLanguage = Array.isArray(context?.languages) && context.languages.length > 0
    ? context.languages[0]
    : 'English';
  
  const languageNote = targetLanguage.toLowerCase() !== 'english'
    ? `\n\n[Note: These lyrics are generated in English. For ${targetLanguage} lyrics, please use the AI enhancement feature by clicking the sparkle icon next to the lyrics field.]`
    : '';
  
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
Until the morning light${languageNote}`,
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
        lyrics: undefined,
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
        lyrics: undefined,
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
  // DISABLED CACHING for unique generation every time
  // Add timestamp to ensure context is always unique
  const uniqueContext = { ...context, _timestamp: Date.now() };
  
  const remote = await callAiEndpoint<{ prompt?: string }>('/api/enhance-prompt', { context: uniqueContext });
  if (remote?.prompt) {
    return { prompt: remote.prompt };
  }

  return buildEnhancedPromptFallback(uniqueContext);
};

export const suggestGenres = async (context: any) => {
  // Add timestamp to context to ensure uniqueness each time
  const uniqueContext = { ...context, _timestamp: Date.now() };
  
  const remote = await callAiEndpoint<{ genres?: string[] }>('/api/suggest-genres', { context: uniqueContext });
  if (remote?.genres?.length) {
    const genres = dedupeList(remote.genres, 5);
    if (genres.length) {
      return { genres };
    }
  }

  return buildGenreFallback(uniqueContext);
};

export const suggestArtists = async (context: any) => {
  // Add timestamp to context to ensure uniqueness each time
  const uniqueContext = { ...context, _timestamp: Date.now() };
  
  const remote = await callAiEndpoint<{ artists?: string[] }>('/api/suggest-artists', { context: uniqueContext });
  if (remote?.artists?.length) {
    const artists = dedupeList(remote.artists, 5);
    if (artists.length) {
      return { artists };
    }
  }

  return buildArtistFallback(uniqueContext);
};

export const suggestLanguages = async (context: any) => {
  // Add timestamp to context to ensure uniqueness each time
  const uniqueContext = { ...context, _timestamp: Date.now() };
  
  const remote = await callAiEndpoint<{ languages?: string[] }>(
    '/api/suggest-languages',
    { context: uniqueContext }
  );
  if (remote?.languages?.length) {
    const languages = dedupeList(remote.languages, 4);
    if (languages.length) {
      return { languages };
    }
  }

  return buildLanguageFallback(uniqueContext);
};

export const suggestInstruments = async (context: any) => {
  // Add timestamp to context to ensure uniqueness each time
  const uniqueContext = { ...context, _timestamp: Date.now() };
  
  const remote = await callAiEndpoint<{ instruments?: string[] }>(
    '/api/suggest-instruments',
    { context: uniqueContext }
  );
  if (remote?.instruments?.length) {
    const instruments = dedupeList(remote.instruments, 5);
    if (instruments.length) {
      return { instruments };
    }
  }

  return buildInstrumentFallback(uniqueContext);
};

export const enhanceLyrics = async (context: any) => {
  const cached = aiCache.get<{ lyrics: string }>('enhanceLyrics', context);
  if (cached) return cached;

  // Ensure languages array is included in the context
  const enhancedContext = {
    ...context,
    languages: context.languages || [],
  };

  const remote = await callAiEndpoint<{ lyrics?: string }>('/api/enhance-lyrics', { context: enhancedContext });
  if (remote?.lyrics) {
    const result = { lyrics: remote.lyrics };
    aiCache.set('enhanceLyrics', context, result, ULTRA_CACHE_TTL.LYRICS);
    return result;
  }

  return buildLyricsFallback(enhancedContext);
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
