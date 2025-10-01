import { GoogleGenAI, Type } from "@google/genai";
import type { MusicPlan, VideoStyle } from '../lib/types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const musicPlanSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "A creative title for the song." },
    genre: { type: Type.STRING, description: "The primary genre of the song, derived from user input." },
    bpm: { type: Type.NUMBER, description: "The tempo of the song in beats per minute (e.g., 120)." },
    key: { type: Type.STRING, description: "The musical key of the song (e.g., 'C Minor', 'F# Major')." },
    overallStructure: { type: Type.STRING, description: "A brief description of the song's arrangement and energy flow." },
    vocalStyle: { type: Type.STRING, description: "A description of the synthesized vocal style." },
    lyrics: { type: Type.STRING, description: "The full lyrics to be sung in the song." },
    randomSeed: { type: Type.NUMBER, description: "The numeric seed used to ensure creative uniqueness for this specific plan." },
    sections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          sectionType: { type: Type.STRING, enum: ['intro', 'verse', 'chorus', 'bridge', 'breakdown', 'drop', 'outro'] },
          durationBars: { type: Type.NUMBER },
          chordProgression: { type: Type.ARRAY, items: { type: Type.STRING } },
          drumPattern: {
            type: Type.OBJECT,
            properties: {
              kick: { type: Type.ARRAY, items: { type: Type.NUMBER, nullable: true } },
              snare: { type: Type.ARRAY, items: { type: Type.NUMBER, nullable: true } },
              hihat: { type: Type.ARRAY, items: { type: Type.NUMBER, nullable: true } },
            },
            required: ['kick', 'snare', 'hihat']
          },
          synthLine: {
            type: Type.OBJECT,
            properties: {
              pattern: { type: Type.STRING, enum: ['pads', 'arpeggio-up', 'arpeggio-down'] },
              timbre: { type: Type.STRING, enum: ['warm', 'bright', 'dark', 'glassy'] },
            },
             required: ['pattern', 'timbre']
          },
          leadMelody: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                note: { type: Type.STRING },
                duration: { type: Type.NUMBER },
                ornamentation: { type: Type.STRING, enum: ['none', 'light', 'heavy'] },
              },
              required: ['note', 'duration', 'ornamentation']
            }
          },
          effects: {
            type: Type.OBJECT,
            properties: {
              reverb: { type: Type.NUMBER },
              compressionThreshold: { type: Type.NUMBER },
              stereoWidth: { type: Type.NUMBER },
            },
            required: ['reverb', 'compressionThreshold', 'stereoWidth']
          },
          lyrics: { type: Type.STRING, description: "The lyrics for this specific section. Leave empty for instrumental sections.", nullable: true },
        },
         required: ['name', 'sectionType', 'durationBars', 'chordProgression', 'drumPattern', 'synthLine', 'leadMelody', 'effects']
      }
    },
     stems: {
        type: Type.OBJECT,
        properties: {
            vocals: { type: Type.BOOLEAN },
            drums: { type: Type.BOOLEAN },
            bass: { type: Type.BOOLEAN },
            instruments: { type: Type.BOOLEAN },
        },
        required: ['vocals', 'drums', 'bass', 'instruments']
    },
    cuePoints: {
        type: Type.OBJECT,
        properties: {
            introEnd: { type: Type.NUMBER },
            dropStart: { type: Type.NUMBER },
            outroStart: { type: Type.NUMBER },
        },
        required: ['introEnd', 'dropStart', 'outroStart']
    }
  },
  required: ['title', 'genre', 'bpm', 'key', 'overallStructure', 'vocalStyle', 'lyrics', 'randomSeed', 'sections', 'stems', 'cuePoints']
};

const auditSchema = {
    type: Type.OBJECT,
    properties: {
        lyricsSung: { type: Type.BOOLEAN },
        isUnique: { type: Type.BOOLEAN },
        styleFaithful: { type: Type.BOOLEAN },
        djStructure: { type: Type.BOOLEAN },
        masteringApplied: { type: Type.BOOLEAN },
        passed: { type: Type.BOOLEAN },
        feedback: { type: Type.STRING },
    },
    required: ['lyricsSung', 'isUnique', 'styleFaithful', 'djStructure', 'masteringApplied', 'passed', 'feedback']
};

const creativeAssetsSchema = {
    type: Type.OBJECT,
    properties: {
        lyricsAlignment: {
            type: Type.ARRAY,
            description: "Time-coded alignment of lyrics. Should be an empty array if no lyrics were provided in the input.",
            items: {
                type: Type.OBJECT,
                properties: {
                    time: { type: Type.STRING, description: "Time range for the line (e.g., '0s-10s')." },
                    line: { type: Type.STRING, description: "The lyric line." }
                },
                required: ['time', 'line']
            }
        },
        videoStoryboard: {
            type: Type.OBJECT,
            description: "Concise storyboards for each requested video style. Keys for non-requested styles should be omitted.",
            properties: {
                lyrical: { type: Type.STRING, description: "Storyboard for the lyrical video.", nullable: true },
                official: { type: Type.STRING, description: "Storyboard for the official music video.", nullable: true },
                abstract: { type: Type.STRING, description: "Storyboard for the abstract visualizer.", nullable: true }
            }
        }
    },
    required: ['lyricsAlignment', 'videoStoryboard']
};


const callGemini = async (systemInstruction, userPrompt, schema) => {
    try {
        const result = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: userPrompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: 0.9,
            },
        });
        const text = result.text;
        if (!text) {
            throw new Error("Received an empty response from the AI.");
        }
        return JSON.parse(text);
    } catch (error) {
        console.error("Full AI Error Details:", error); 
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        const detailedMessage = (error as any)?.response?.data?.error?.message || errorMessage;
        throw new Error(`AI generation failed. Reason: ${detailedMessage}`);
    }
}

// --- Suggestion Functions (Cascading Context) ---
const suggestionSystemInstruction = `You are an AI Musicologist and expert DJ assistant for MuseForge Pro. Your knowledge is vast, current, and encyclopedic, mirroring a real-time connection to every piece of music data on the internet. You are deeply familiar with:

1.  **Music Theory & History:** From classical harmony to modern microtonal music.
2.  **Production Techniques:** Synthesis, mixing, mastering, and the signature sounds of various genres.
3.  **DJ Culture & Practice:** Song structure for mixing (e.g., intros/outros), harmonic mixing (key compatibility), energy flow management, and the needs of professional DJs.
4.  **The Entire Global Music Landscape:** This includes:
    - **Historical Icons:** All foundational artists from every genre.
    - **Current & Trending Artists:** You are an expert on contemporary scenes and artists like Fred again.., Anyma, Skrillex, Bicep, Peggy Gou, and underground scenes. You know who is currently popular and influential.
    - **Niche & Obscure Genres:** You can provide deep cuts and unique suggestions beyond the mainstream.

Your primary goal is to provide **world-class, non-generic, and inspiring suggestions** that are directly relevant to the user's input. Your suggestions should feel like they are coming from a seasoned industry professional who is passionate about music.`;

export const enhancePrompt = async (context) => {
    const userPrompt = `
CONTEXT:
- Current Prompt: "${context.prompt || '(empty)'}"
- Selected Genres: ${context.genres.join(', ') || 'None'}
- Artist Influences: ${context.artists.join(', ') || 'None'}
- Lyrical Theme: "${context.lyrics || 'None'}"

TASK:
Your task is to generate a creative, descriptive, and inspiring music prompt for our music generation AI.

- If the "Current Prompt" is NOT empty, creatively rewrite and expand upon it to make it more vivid and detailed.
- If the "Current Prompt" IS empty, generate a completely new and original prompt from scratch.

In either case, you MUST incorporate ideas from the other context fields (genres, artists, lyrics) if they are provided. The goal is a rich, evocative prompt. Return a JSON object with a single key "prompt".`;
    return callGemini(suggestionSystemInstruction, userPrompt, { type: Type.OBJECT, properties: { prompt: { type: Type.STRING } } });
}

export const suggestGenres = async (context) => {
    const userPrompt = `
CONTEXT:
- Current Prompt: "${context.prompt}"
- Artist Influences: ${context.artists.join(', ') || 'None'}
- Lyrical Theme: "${context.lyrics || 'None'}"

TASK:
Based on the provided context and your vast knowledge of music history and current trends, suggest 3-5 relevant genres. Return a JSON object with a single key "genres" which is an array of strings.`;
     return callGemini(suggestionSystemInstruction, userPrompt, { type: Type.OBJECT, properties: { genres: { type: Type.ARRAY, items: { type: Type.STRING } } } });
}

export const suggestArtists = async (context) => {
    const userPrompt = `
CONTEXT:
- Current Prompt: "${context.prompt}"
- Selected Genres: ${context.genres.join(', ') || 'None'}
- Lyrical Theme: "${context.lyrics || 'None'}"

TASK:
Based on the context and your expert knowledge, suggest 3-5 relevant artist influences. Provide a mix of foundational artists and **currently trending, modern artists** (e.g., Fred again.., Anyma, Bicep). The suggestions must be insightful and directly related to the user's input. Return a JSON object with a single key "artists" which is an array of strings.`;
     return callGemini(suggestionSystemInstruction, userPrompt, { type: Type.OBJECT, properties: { artists: { type: Type.ARRAY, items: { type: Type.STRING } } } });
}

export const enhanceLyrics = async (context) => {
    const userPrompt = `
CONTEXT:
- Current Prompt: "${context.prompt}"
- Selected Genres: ${context.genres.join(', ') || 'None'}
- Artist Influences: ${context.artists.join(', ') || 'None'}
- Current Lyrics: "${context.lyrics || 'None'}"
- Desired Duration (seconds): ${context.duration}

TASK:
Expand or rewrite the "Current Lyrics" into a more complete lyrical theme suitable for a song of the specified duration. The theme should match the mood of the other context fields. Structure it with clear sections if possible (e.g., Verse 1, Chorus). Return a JSON object with a single key "lyrics".`;
    return callGemini(suggestionSystemInstruction, userPrompt, { type: Type.OBJECT, properties: { lyrics: { type: Type.STRING } } });
}


// --- Generation and Audit Functions ---

export async function generateMusicPlan(fullPrompt, creativitySeed) {
    const systemInstruction = `You are MuseForge Pro, an expert AI composer. Your mandate is to generate a unique, detailed, and professional music plan for a combined audio and video production.

EXECUTION MANDATE:
1.  **CRITICAL DIRECTIVE ON UNIQUENESS & DYNAMICS:** Your primary goal is to avoid generic and repetitive musical structures. Failure to do so is a critical error. To achieve this:
    -   **VARY CHORD PROGRESSIONS:** You are STRICTLY PROHIBITED from using the exact same chord progression across all sections of the song (e.g., Intro, Verse, Chorus, etc.). Introduce variations, inversions, or entirely different progressions between sections to create musical interest and development.
    -   **VARY MIXING EFFECTS:** The 'effects' object (reverb, compressionThreshold, stereoWidth) MUST have different values for different section types. For example, a 'drop' section should have a wider stereo field and different reverb settings than a 'verse' to create dynamic contrast. Do not apply static mixing.
    -   **USE THE SEED FOR VARIATION:** The provided "creativitySeed": "${creativitySeed}" MUST be used as the source of randomness for ALL creative decisions, ensuring both uniqueness on each run and the necessary variation between the song's internal sections. You must also embed this seed in the 'randomSeed' field of the final JSON plan.

2.  **LYRICS INTEGRATION:** If lyrics are provided in the user request, they are NOT optional. You MUST incorporate them as a sung vocal melody. To do this, you must first distribute the lyrics into the \`lyrics\` field of appropriate song sections (e.g., verse, chorus). Then, for every section that contains lyrics, you MUST generate a corresponding \`leadMelody\`. The melody's rhythm and phrasing must plausibly match the syllables and cadence of the lyrics to create a "sung" vocal line. Instrumental sections MUST have an empty \`lyrics\` field and an empty \`leadMelody\` array.
3.  **DJ & VIDEO STRUCTURE:** The plan must be suitable for both DJs and video production, featuring DJ-friendly elements like a beat-only 'intro' and 'outro' (8 or 16 bars), clear build-ups, and a 'drop' or 'breakdown'. Calculate and include BPM, Key, and cue points in seconds.
4.  **SCHEMA ADHERENCE:** The output MUST be a single, valid JSON object that strictly adheres to the provided schema. No extra text, explanations, or markdown is permitted.`;

    const userPrompt = `Generate a complete music plan based on the following user request:\n${JSON.stringify(fullPrompt, null, 2)}`;
    return callGemini(systemInstruction, userPrompt, musicPlanSchema);
}


export async function auditMusicPlan(plan, originalRequest) {
     const systemInstruction = `You are an AI Quality Assurance agent for MuseForge Pro. Your task is to audit a generated music plan against the user's request and a set of critical quality directives. Be strict and objective. Your feedback will be used as a Root Cause Analysis (RCA) if the plan fails.`;
     const userPrompt = `
Original User Request:
${JSON.stringify(originalRequest, null, 2)}

Generated Music Plan to Audit:
${JSON.stringify(plan, null, 2)}

AUDIT CHECKLIST (provide a boolean and brief feedback for each):
1.  lyricsSung: If lyrics were in the request, are they properly assigned to vocal sections AND is there a corresponding leadMelody for each lyrical part?
2.  isUnique: Does the plan seem generic? Or does it show creative variation in chords, structure, and effects that would make it unique? Was the randomSeed used?
3.  styleFaithful: Does the instrumentation, BPM, and mood in the plan align with the requested genres and artists?
4.  djStructure: Does the plan include DJ-friendly elements like a clear intro/outro and a drop or breakdown?
5.  masteringApplied: Does the plan include specific mixing notes for effects like reverb, compression, and stereo width?

Based on the above, set 'passed' to true only if ALL checks are satisfactory. Provide a final summary in the 'feedback' field, framed as an RCA if it fails.
`;
    return callGemini(systemInstruction, userPrompt, auditSchema);
}


export async function generateCreativeAssets(musicPlan, videoStyles, lyrics) {
    const systemInstruction = `You are a creative director AI for MuseForge Pro. Based on a detailed music plan, you will generate two key assets: a time-coded lyric alignment and a set of concise video storyboards.`;
    
    const userPrompt = `
Music Plan:
${JSON.stringify(musicPlan, null, 2)}

Requested Video Styles: ${videoStyles.join(', ') || 'None'}
Lyrics Provided: "${lyrics || 'None'}"

TASK:
1.  **Lyrics Alignment:** Analyze the music plan's structure, BPM, and lyrics. Create an array aligning lyric lines to time ranges (in seconds). The time ranges should be logical based on the section durations. If no lyrics were provided, this MUST be an empty array.
2.  **Video Storyboards:** For each requested video style (${videoStyles.join(', ')}), write a single, concise sentence describing the visual concept. The final JSON object should only contain keys for the styles that were requested. If no video styles were requested, this should be an empty object.

Return a single JSON object adhering to the provided schema.
`;
     return callGemini(systemInstruction, userPrompt, creativeAssetsSchema);
}