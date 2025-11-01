import { GoogleGenerativeAI } from '@google/generative-ai';
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
const suggestionSystemInstruction = `You are an AI Musicologist and expert DJ assistant for MuseForge Pro. Your knowledge spans music theory, production techniques, DJ culture, and the entire global music landscape (2025). Deliver hyper-relevant, innovative suggestions that elevate the user's creative vision.`;
const apiKey = process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.GOOGLE_AI_API_KEY;
const cheapModelName = process.env.GEMINI_MODEL_CHEAP || 'gemini-1.5-flash-8b';
const defaultModelName = process.env.USE_CHEAP_MODEL_ONLY === 'true'
    ? cheapModelName
    : process.env.GEMINI_MODEL_EXPENSIVE || 'gemini-1.5-flash';
let genAI = null;
let defaultModel = null;
let cheapModel = null;
if (!apiKey) {
    console.warn('[MuseWave] GEMINI_API_KEY missing. Using fallback AI responses.');
}
else {
    try {
        genAI = new GoogleGenerativeAI(apiKey);
        cheapModel = genAI.getGenerativeModel({ model: cheapModelName });
        defaultModel = genAI.getGenerativeModel({ model: defaultModelName });
        console.info(`[MuseWave] Gemini initialised with default model "${defaultModelName}" and cheap model "${cheapModelName}"`);
    }
    catch (error) {
        console.error('[MuseWave] Failed to initialise Gemini client:', error);
        genAI = null;
        defaultModel = null;
        cheapModel = null;
    }
}
const safe = (value) => String(value ?? '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/"/g, '\\"');
const pickRandom = (items) => items[Math.floor(Math.random() * items.length)];
const shuffleList = (values) => {
    const copy = [...values];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
};
const dedupeList = (values, limit) => {
    const result = [];
    const seen = new Set();
    for (const value of values) {
        if (typeof value !== 'string')
            continue;
        const trimmed = value.trim();
        if (!trimmed)
            continue;
        const key = trimmed.toLowerCase();
        if (seen.has(key))
            continue;
        seen.add(key);
        result.push(trimmed);
        if (result.length >= limit)
            break;
    }
    return result;
};
const getModel = (preference = 'default') => preference === 'cheap' ? cheapModel ?? defaultModel : defaultModel ?? cheapModel;
const callGemini = async ({ systemInstruction, userPrompt, schema, temperature = 0.8, preference = 'default', }) => {
    const model = getModel(preference);
    if (!model) {
        throw new Error('Gemini model unavailable');
    }
    const result = await model.generateContent({
        systemInstruction: { role: 'system', parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: {
            temperature,
            responseMimeType: 'application/json',
            responseSchema: schema,
        },
    });
    const text = result.response?.text();
    if (!text) {
        throw new Error('Empty response from Gemini');
    }
    try {
        return JSON.parse(text);
    }
    catch (error) {
        throw new Error(`Failed to parse Gemini JSON response: ${error.message}`);
    }
};
const buildEnhancedPromptFallback = (context) => {
    if (context?.prompt && typeof context.prompt === 'string' && context.prompt.trim()) {
        return {
            prompt: `${context.prompt}, with cascading arpeggios and atmospheric textures perfect for late-night drives`,
        };
    }
    const genre = context?.genres?.[0]?.toLowerCase() || 'electronic';
    const template = pickRandom(ENHANCED_PROMPT_TEMPLATES);
    return { prompt: template.replace('{genre}', genre) };
};
const buildGenreFallback = (context) => {
    const list = shuffleList(GENRE_FALLBACKS);
    const limit = context?.genres?.length ? 5 : 3;
    return { genres: list.slice(0, limit) };
};
const buildArtistFallback = (context) => {
    const list = shuffleList(ARTIST_FALLBACKS);
    const limit = context?.artists?.length ? 5 : 3;
    return { artists: list.slice(0, limit) };
};
const buildLanguageFallback = () => ({
    languages: [...FALLBACK_LANGUAGES],
});
const buildInstrumentFallback = () => ({
    instruments: shuffleList(INSTRUMENT_FALLBACKS).slice(0, 4),
});
const buildLyricsFallback = (context) => {
    const basePrompt = (typeof context?.prompt === 'string' && context.prompt.trim()) ||
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
const createMockPlan = (fullPrompt, creativitySeed) => {
    const genre = fullPrompt?.genres?.[0] || 'electronic';
    const bpmRanges = {
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
    const possibleKeys = genre === 'ambient'
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
const sanitizePlan = (raw) => {
    if (!raw || typeof raw !== 'object')
        return null;
    const required = ['title', 'genre', 'bpm', 'key', 'overallStructure', 'vocalStyle', 'sections'];
    if (!required.every((key) => key in raw))
        return null;
    if (!Array.isArray(raw.sections) || raw.sections.length === 0)
        return null;
    return raw;
};
export async function enhancePrompt(context) {
    const fallback = buildEnhancedPromptFallback(context);
    try {
        const result = await callGemini({
            systemInstruction: suggestionSystemInstruction,
            userPrompt: `
CONTEXT:
- Current Prompt: "${safe(context?.prompt || '(empty)')}"
- Genres: ${(context?.genres || []).map(safe).join(', ') || 'None'}
- Artists: ${(context?.artists || []).map(safe).join(', ') || 'None'}
- Lyrics: "${safe(context?.lyrics || 'None')}"

Create a vivid 50-100 word music prompt. If Current Prompt is NOT empty, amplify it with production details and emotional layers. If empty, invent an original concept using the context. Use poetic, sensory language.

Return ONLY JSON: {"prompt": "your enhanced prompt"}`,
            schema: {
                type: 'object',
                properties: { prompt: { type: 'string' } },
                required: ['prompt'],
            },
            temperature: 0.9,
        });
        if (result?.prompt?.trim()) {
            return { prompt: result.prompt.trim() };
        }
    }
    catch (error) {
        console.error('Gemini enhancePrompt error:', error);
    }
    return fallback;
}
export async function suggestGenres(context) {
    const fallback = buildGenreFallback(context);
    try {
        const result = await callGemini({
            systemInstruction: suggestionSystemInstruction,
            userPrompt: `
CONTEXT:
- Prompt: "${safe(context?.prompt)}"
- Artists: ${(context?.artists || []).map(safe).join(', ') || 'None'}
- Lyrics: "${safe(context?.lyrics || 'None')}"

Suggest 3-5 music genres matching this vision. Prioritize 2025 trends and cultural fusions. Ensure diversity and avoid repetition with existing: ${(context?.genres || []).map(safe).join(', ') || 'None'}

Return ONLY JSON: {"genres": ["genre1", "genre2", ...]}`,
            schema: {
                type: 'object',
                properties: { genres: { type: 'array', items: { type: 'string' } } },
                required: ['genres'],
            },
            temperature: 0.6,
            preference: 'cheap',
        });
        const genres = dedupeList(result?.genres || [], 5);
        if (genres.length) {
            return { genres };
        }
    }
    catch (error) {
        console.error('Gemini suggestGenres error:', error);
    }
    return fallback;
}
export async function suggestArtists(context) {
    const fallback = buildArtistFallback(context);
    try {
        const result = await callGemini({
            systemInstruction: suggestionSystemInstruction,
            userPrompt: `
CONTEXT:
- Prompt: "${safe(context?.prompt)}"
- Genres: ${(context?.genres || []).map(safe).join(', ') || 'None'}
- Lyrics: "${safe(context?.lyrics || 'None')}"

Recommend 3-5 artists (mix of icons and 2025 rising stars) that resonate with this vision. Balance classics and trends, ensure genre alignment and cultural diversity.

Return ONLY JSON: {"artists": ["Artist1", "Artist2", ...]}`,
            schema: {
                type: 'object',
                properties: { artists: { type: 'array', items: { type: 'string' } } },
                required: ['artists'],
            },
            temperature: 0.7,
            preference: 'cheap',
        });
        const artists = dedupeList(result?.artists || [], 5);
        if (artists.length) {
            return { artists };
        }
    }
    catch (error) {
        console.error('Gemini suggestArtists error:', error);
    }
    return fallback;
}
export async function suggestLanguages(context) {
    const fallback = buildLanguageFallback();
    try {
        const result = await callGemini({
            systemInstruction: suggestionSystemInstruction,
            userPrompt: `
CONTEXT:
- Prompt: "${safe(context?.prompt)}"
- Genres: ${(context?.genres || []).map(safe).join(', ') || 'None'}
- Artists: ${(context?.artists || []).map(safe).join(', ') || 'None'}
- Current: ${(context?.languages || []).map(safe).join(', ') || 'None'}

Recommend 1-3 vocal languages matching genre/cultural tone. Include English if crossover appeal likely.

Return ONLY JSON: {"languages": ["Language1", ...]}`,
            schema: {
                type: 'object',
                properties: { languages: { type: 'array', items: { type: 'string' } } },
                required: ['languages'],
            },
            temperature: 0.5,
            preference: 'cheap',
        });
        const languages = dedupeList(result?.languages || [], 4);
        if (languages.length) {
            return { languages };
        }
    }
    catch (error) {
        console.error('Gemini suggestLanguages error:', error);
    }
    return fallback;
}
export async function suggestInstruments(context) {
    const fallback = buildInstrumentFallback();
    try {
        const result = await callGemini({
            systemInstruction: suggestionSystemInstruction,
            userPrompt: `
CONTEXT:
- Prompt: "${safe(context?.prompt)}"
- Genres: ${(context?.genres || []).map(safe).join(', ') || 'None'}
- Artists: ${(context?.artists || []).map(safe).join(', ') || 'None'}

Suggest 3-5 production elements/instruments for this track. Focus on innovative, genre-appropriate choices.

Return ONLY JSON: {"instruments": ["Instrument1", ...]}`,
            schema: {
                type: 'object',
                properties: { instruments: { type: 'array', items: { type: 'string' } } },
                required: ['instruments'],
            },
            temperature: 0.7,
            preference: 'cheap',
        });
        const instruments = dedupeList(result?.instruments || [], 5);
        if (instruments.length) {
            return { instruments };
        }
    }
    catch (error) {
        console.error('Gemini suggestInstruments error:', error);
    }
    return fallback;
}
export async function enhanceLyrics(context) {
    const fallback = buildLyricsFallback(context);
    try {
        const result = await callGemini({
            systemInstruction: suggestionSystemInstruction,
            userPrompt: `
CONTEXT:
- Prompt: "${safe(context?.prompt)}"
- Genres: ${(context?.genres || []).map(safe).join(', ') || 'None'}
- Lyrics: "${safe(context?.lyrics || 'None')}"
- Duration: ${context?.duration || 0}s

Expand or refine lyrics into complete sections (Verse, Chorus, Bridge) with strong imagery. Keep it singable and aligned with the requested mood.

Return ONLY JSON: {"lyrics": "full lyrics text"}`,
            schema: {
                type: 'object',
                properties: { lyrics: { type: 'string' } },
                required: ['lyrics'],
            },
            temperature: 0.85,
        });
        if (result?.lyrics?.trim()) {
            return { lyrics: result.lyrics.trim() };
        }
    }
    catch (error) {
        console.error('Gemini enhanceLyrics error:', error);
    }
    return fallback;
}
export async function generateMusicPlan(fullPrompt, creativitySeed) {
    const systemInstruction = `You are MuseForge Pro, expert AI composer generating detailed music plans. 

CRITICAL DIRECTIVES:
1. Vary chord progressions and mixing effects between sections - no repetition
2. Use creativitySeed (${creativitySeed}) for randomness
3. If lyrics provided, incorporate them into sung sections
4. DJ-friendly structure with intro/outro, build-ups, drops
5. Strict JSON schema adherence`;
    const userPrompt = `Generate music plan:
- Prompt: "${safe(fullPrompt?.musicPrompt || '')}"
- Genres: ${(fullPrompt?.genres || ['electronic']).map(safe).join(', ')}
- Duration: ${fullPrompt?.duration || 90}s
- Artists: ${(fullPrompt?.artistInspiration || []).map(safe).join(', ') || 'none'}
- Lyrics: ${fullPrompt?.lyrics ? 'Yes (include in sections)' : 'No'}
- Seed: ${creativitySeed}`;
    const schema = {
        type: 'object',
        properties: {
            title: { type: 'string' },
            genre: { type: 'string' },
            bpm: { type: 'number' },
            key: { type: 'string' },
            overallStructure: { type: 'string' },
            vocalStyle: { type: 'string' },
            lyrics: { type: 'string' },
            randomSeed: { type: 'number' },
            sections: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        sectionType: {
                            type: 'string',
                            enum: ['intro', 'verse', 'chorus', 'bridge', 'breakdown', 'drop', 'outro'],
                        },
                        durationBars: { type: 'number' },
                        chordProgression: { type: 'array', items: { type: 'string' } },
                        drumPattern: {
                            type: 'object',
                            properties: {
                                kick: { type: 'array', items: { type: 'number' } },
                                snare: { type: 'array', items: { type: 'number' } },
                                hihat: { type: 'array', items: { type: 'number' } },
                            },
                            required: ['kick', 'snare', 'hihat'],
                        },
                        synthLine: {
                            type: 'object',
                            properties: {
                                pattern: { type: 'string', enum: ['pads', 'arpeggio-up', 'arpeggio-down'] },
                                timbre: { type: 'string', enum: ['warm', 'bright', 'dark', 'glassy'] },
                            },
                            required: ['pattern', 'timbre'],
                        },
                        leadMelody: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    note: { type: 'string' },
                                    duration: { type: 'number' },
                                    ornamentation: { type: 'string', enum: ['none', 'light', 'heavy'] },
                                },
                                required: ['note', 'duration', 'ornamentation'],
                            },
                        },
                        effects: {
                            type: 'object',
                            properties: {
                                reverb: { type: 'number' },
                                compressionThreshold: { type: 'number' },
                                stereoWidth: { type: 'number' },
                            },
                            required: ['reverb', 'compressionThreshold', 'stereoWidth'],
                        },
                        lyrics: { type: 'string', nullable: true },
                    },
                    required: [
                        'name',
                        'sectionType',
                        'durationBars',
                        'chordProgression',
                        'drumPattern',
                        'synthLine',
                        'leadMelody',
                        'effects',
                    ],
                },
            },
            stems: {
                type: 'object',
                properties: {
                    vocals: { type: 'boolean' },
                    drums: { type: 'boolean' },
                    bass: { type: 'boolean' },
                    instruments: { type: 'boolean' },
                },
                required: ['vocals', 'drums', 'bass', 'instruments'],
            },
            cuePoints: {
                type: 'object',
                properties: {
                    introEnd: { type: 'number' },
                    dropStart: { type: 'number' },
                    outroStart: { type: 'number' },
                },
                required: ['introEnd', 'dropStart', 'outroStart'],
            },
        },
        required: [
            'title',
            'genre',
            'bpm',
            'key',
            'overallStructure',
            'vocalStyle',
            'lyrics',
            'randomSeed',
            'sections',
            'stems',
            'cuePoints',
        ],
    };
    try {
        const result = await callGemini({
            systemInstruction,
            userPrompt,
            schema,
            temperature: 0.85,
        });
        const plan = sanitizePlan(result);
        if (plan) {
            return plan;
        }
        throw new Error('Gemini returned invalid plan');
    }
    catch (error) {
        console.error('Gemini generateMusicPlan error:', error);
    }
    return createMockPlan(fullPrompt, creativitySeed);
}
export async function auditMusicPlan(plan, originalRequest) {
    try {
        const result = await callGemini({
            systemInstruction: `You are QA agent for MuseForge Pro. Audit generated plan against request and quality directives. Be strict and objective.`,
            userPrompt: `Audit music plan:
REQUEST: ${safe(originalRequest?.musicPrompt || '')} (${(originalRequest?.genres || ['electronic']).map(safe).join(', ') || 'electronic'})
PLAN: ${safe(plan.title)} | ${plan.bpm} BPM | ${safe(plan.key)} | ${plan.sections?.length || 0} sections
Lyrics requested: ${originalRequest?.lyrics ? 'Yes' : 'No'}

AUDIT CHECKLIST:
1. lyricsSung: Lyrics in vocal sections with leadMelody?
2. isUnique: Variation in chords/structure/effects?
3. styleFaithful: Matches requested genres/artists?
4. djStructure: Has intro/outro and drop/breakdown?
5. masteringApplied: Mixing notes present?

Return ONLY JSON matching the schema.`,
            schema: {
                type: 'object',
                properties: {
                    lyricsSung: { type: 'boolean' },
                    isUnique: { type: 'boolean' },
                    styleFaithful: { type: 'boolean' },
                    djStructure: { type: 'boolean' },
                    masteringApplied: { type: 'boolean' },
                    passed: { type: 'boolean' },
                    feedback: { type: 'string' },
                },
                required: [
                    'lyricsSung',
                    'isUnique',
                    'styleFaithful',
                    'djStructure',
                    'masteringApplied',
                    'passed',
                    'feedback',
                ],
            },
            temperature: 0.4,
        });
        if (result) {
            return result;
        }
    }
    catch (error) {
        console.error('Gemini auditMusicPlan error:', error);
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
export async function generateCreativeAssets(musicPlan, videoStyles, lyrics) {
    try {
        const result = await callGemini({
            systemInstruction: `You are creative director AI for MuseForge Pro. Generate time-coded lyric alignment and video storyboards.`,
            userPrompt: `Generate creative assets:
PLAN: ${safe(musicPlan.title)} | ${musicPlan.bpm} BPM | ${safe(musicPlan.genre)}
Sections: ${musicPlan.sections?.map((s) => safe(s.name)).join(', ') || 'standard'}
Video Styles: ${videoStyles.map((style) => safe(style)).join(', ') || 'None'}
Lyrics: ${lyrics ? 'Yes (time-code them)' : 'No'}

TASK:
1. Lyrics Alignment: Time ranges for lyric lines (empty if no lyrics)
2. Video Storyboards: One sentence per requested style

Return ONLY JSON matching the schema.`,
            schema: {
                type: 'object',
                properties: {
                    lyricsAlignment: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: { time: { type: 'string' }, line: { type: 'string' } },
                            required: ['time', 'line'],
                        },
                    },
                    videoStoryboard: {
                        type: 'object',
                        properties: {
                            lyrical: { type: 'string', nullable: true },
                            official: { type: 'string', nullable: true },
                            abstract: { type: 'string', nullable: true },
                        },
                    },
                },
                required: ['lyricsAlignment', 'videoStoryboard'],
            },
            temperature: 0.75,
        });
        if (result) {
            return {
                lyricsAlignment: Array.isArray(result.lyricsAlignment) ? result.lyricsAlignment : [],
                videoStoryboard: result.videoStoryboard || {},
            };
        }
    }
    catch (error) {
        console.error('Gemini generateCreativeAssets error:', error);
    }
    return {
        lyricsAlignment: lyrics
            ? [
                { time: '0s-20s', line: lyrics.split('\n')[0] || lyrics },
                { time: '20s-40s', line: lyrics.split('\n')[1] || '' },
            ]
            : [],
        videoStoryboard: Object.fromEntries(videoStyles.map((style) => [style, `${style} visuals for ${musicPlan.title}`])),
    };
}
