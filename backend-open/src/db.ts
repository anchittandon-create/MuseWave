import { join, dirname } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';

const dataDir = join(process.cwd(), 'backend-open', 'data');
const jsonPath = join(dataDir, 'generations.json');

type GenerationRecord = {
  id: string;
  payload: Record<string, unknown>;
  bpm: number;
  song_key: string;
  mix_url: string;
  instrumental_url: string;
  vocals_url?: string | null;
  video_url?: string | null;
  engines: Record<string, unknown>;
  created_at: string;
};

function loadAll(): GenerationRecord[] {
  if (!existsSync(jsonPath)) return [];
  try {
    const raw = readFileSync(jsonPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function recordGeneration(record: GenerationRecord): void {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  const entries = loadAll();
  entries.push(record);
  writeFileSync(jsonPath, JSON.stringify(entries, null, 2));
}
