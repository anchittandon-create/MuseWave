const genreBpm: Record<string, number> = {
  lofi: 82,
  techno: 128,
  dnb: 174,
  ambient: 85,
  pop: 116,
  trance: 132,
  rock: 110
};

const keys = ['A minor', 'C minor', 'D minor', 'E minor', 'G minor', 'C major', 'F major'];

export type Plan = {
  bpm: number;
  key: string;
  scale: 'major' | 'minor';
  sections: Array<{ name: string; bars: number }>;
  chordsBySection: Record<string, string[]>;
};

export function planFromInput(input: {
  musicPrompt: string;
  genres: string[];
  durationSec: number;
}): Plan {
  const primary = input.genres[0]?.toLowerCase() || 'default';
  const bpm = genreBpm[primary] || 120;
  const key = keys[Math.floor(hash(input.musicPrompt) % keys.length)];
  const scale: 'major' | 'minor' = key.includes('major') ? 'major' : 'minor';

  const totalBars = Math.max(32, Math.min(128, Math.round((input.durationSec / 60) * (bpm / 4))));
  const sections = [
    { name: 'intro', bars: Math.max(4, Math.floor(totalBars * 0.15)) },
    { name: 'A', bars: Math.max(8, Math.floor(totalBars * 0.35)) },
    { name: 'B', bars: Math.max(8, Math.floor(totalBars * 0.35)) },
    { name: 'outro', bars: Math.max(4, totalBars - Math.floor(totalBars * 0.85)) }
  ];

  const poolMinor = ['i', 'VI', 'III', 'VII', 'iv', 'v'];
  const poolMajor = ['I', 'V', 'vi', 'IV', 'ii', 'iii'];
  const pool = scale === 'minor' ? poolMinor : poolMajor;

  const chordsBySection: Record<string, string[]> = {};
  sections.forEach((section, idx) => {
    const chords: string[] = [];
    for (let i = 0; i < 4; i++) {
      chords.push(pool[(hash(section.name + i) + idx + i) % pool.length]);
    }
    chordsBySection[section.name] = chords;
  });

  return { bpm, key, scale, sections, chordsBySection };
}

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}
