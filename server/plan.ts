import { createHash } from 'node:crypto';

type Input = {
  musicPrompt: string;
  genres: string[];
  durationSec: number;
  artistInspiration?: string[];
  lyrics?: string;
  vocalLanguages?: string[];
  generateVideo?: boolean;
  videoStyles?: ('Lyric Video'|'Official Music Video'|'Abstract Visualizer')[];
};

export type Plan = {
  bpm: number;
  key: string;
  scale: 'minor'|'major';
  sections: { name: string; bars: number }[];
  chordsBySection: Record<string, string[]>;
  durationSec: number;
};

const GENRE_BPM: Record<string, number> = {
  lofi: 82, techno: 128, garage: 134, dnb: 174, ambient: 85
};

function hash5(s: string) {
  const h = createHash('sha1').update(s).digest();
  return h[0] + h[1] + h[2] + h[3] + h[4];
}

export async function generatePlan(input: Input): Promise<Plan> {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro-latest' });
      const prompt = `
Generate STRICT JSON, no prose.
Schema: {"bpm": number, "key": string, "scale": "minor"|"major",
"sections": [{"name": string, "bars": number}], "chordsBySection": Record<string,string[]>}
Use the user's request to pick bpm/key/scale and sections totaling ${Math.max(30, Math.min(120, input.durationSec))} seconds at the given bpm.

User:
musicPrompt: ${input.musicPrompt}
genres: ${input.genres?.join(', ') || 'unknown'}
artistInspiration: ${input.artistInspiration?.join(', ') || 'none'}
lyrics?: ${Boolean(input.lyrics)}
`;
      const res = await model.generateContent([{ text: prompt } as any]);
      const text = res.response.text().trim().replace(/```json|```/g, '');
      const parsed = JSON.parse(text);
      return {
        bpm: parsed.bpm ?? 120,
        key: parsed.key ?? 'A minor',
        scale: (parsed.scale === 'major' ? 'major' : 'minor'),
        sections: Array.isArray(parsed.sections) && parsed.sections.length ? parsed.sections : [
          { name: 'intro', bars: 8 }, { name: 'A', bars: 16 }, { name: 'B', bars: 16 }, { name: 'outro', bars: 8 }
        ],
        chordsBySection: parsed.chordsBySection ?? { A: ['i','VI','III','VII'], B: ['i','VI','III','VII'] },
        durationSec: Math.max(30, Math.min(120, input.durationSec))
      };
    } catch {
      // fall through to deterministic
    }
  }
  // deterministic fallback
  const bpms = input.genres?.map((g) => GENRE_BPM[g.toLowerCase()] ?? 120) || [120];
  const bpm = Math.round(bpms.reduce((a,b)=>a+b,0) / bpms.length);
  const keyIdx = hash5(input.musicPrompt || '') % 5;
  const key = ['A minor','C minor','D minor','E minor','G minor'][keyIdx];
  return {
    bpm,
    key,
    scale: 'minor',
    sections: [{ name: 'intro', bars: 8 }, { name: 'A', bars: 16 }, { name: 'B', bars: 16 }, { name: 'outro', bars: 8 }],
    chordsBySection: { intro: ['i','VI','III','VII'], A: ['i','VI','III','VII'], B: ['i','VI','III','VII'], outro: ['i','VI','III','VII'] },
    durationSec: Math.max(30, Math.min(120, input.durationSec || 60))
  };
}