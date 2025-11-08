import initSqlJs, { Database } from 'sql.js';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { env } from '../config/env.js';

let db: Database | null = null;

/**
 * Initialize SQLite database
 */
export async function initDatabase(): Promise<void> {
  const SQL = await initSqlJs();

  // Load existing DB or create new
  if (existsSync(env.DATABASE_PATH)) {
    const buffer = await readFile(env.DATABASE_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();

    // Create schema
    db.run(`
      CREATE TABLE IF NOT EXISTS generations (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        music_prompt TEXT NOT NULL,
        genres TEXT, -- JSON array
        duration_sec INTEGER NOT NULL,
        bpm INTEGER NOT NULL,
        song_key TEXT NOT NULL,
        scale TEXT NOT NULL,
        artist_inspiration TEXT, -- JSON array
        lyrics TEXT,
        vocal_languages TEXT, -- JSON array
        video_styles TEXT, -- JSON array
        instrumental_url TEXT NOT NULL,
        vocals_url TEXT,
        mix_url TEXT NOT NULL,
        video_url TEXT,
        engines TEXT NOT NULL, -- JSON object
        processing_time_ms INTEGER NOT NULL,
        status TEXT NOT NULL
      )
    `);

    // Create indexes
    db.run('CREATE INDEX IF NOT EXISTS idx_created_at ON generations(created_at DESC)');
    db.run('CREATE INDEX IF NOT EXISTS idx_status ON generations(status)');

    await saveDatabase();
  }
}

/**
 * Save database to disk
 */
async function saveDatabase(): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  const data = db.export();
  const buffer = Buffer.from(data);
  await writeFile(env.DATABASE_PATH, buffer);
}

export interface Generation {
  id: string;
  createdAt: string;
  musicPrompt: string;
  genres: string[];
  durationSec: number;
  bpm: number;
  key: string;
  scale: string;
  artistInspiration?: string[];
  lyrics?: string;
  vocalLanguages?: string[];
  videoStyles?: string[];
  instrumentalUrl: string;
  vocalsUrl?: string;
  mixUrl: string;
  videoUrl?: string;
  engines: {
    music: string;
    melody: string;
    vocals: string;
    video: string;
  };
  processingTimeMs: number;
  status: string;
}

/**
 * Save generation to database
 */
export async function saveGeneration(generation: Generation): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  db.run(
    `INSERT INTO generations VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      generation.id,
      generation.createdAt,
      generation.musicPrompt,
      JSON.stringify(generation.genres),
      generation.durationSec,
      generation.bpm,
      generation.key,
      generation.scale,
      generation.artistInspiration ? JSON.stringify(generation.artistInspiration) : null,
      generation.lyrics || null,
      generation.vocalLanguages ? JSON.stringify(generation.vocalLanguages) : null,
      generation.videoStyles ? JSON.stringify(generation.videoStyles) : null,
      generation.instrumentalUrl,
      generation.vocalsUrl || null,
      generation.mixUrl,
      generation.videoUrl || null,
      JSON.stringify(generation.engines),
      generation.processingTimeMs,
      generation.status,
    ]
  );

  await saveDatabase();
}

/**
 * Get generations with pagination
 */
export async function getGenerations(limit: number, offset: number): Promise<Generation[]> {
  if (!db) throw new Error('Database not initialized');

  const stmt = db.prepare(
    'SELECT * FROM generations ORDER BY created_at DESC LIMIT ? OFFSET ?'
  );
  stmt.bind([limit, offset]);

  const results: Generation[] = [];

  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push({
      id: row.id as string,
      createdAt: row.created_at as string,
      musicPrompt: row.music_prompt as string,
      genres: JSON.parse(row.genres as string),
      durationSec: row.duration_sec as number,
      bpm: row.bpm as number,
      key: row.song_key as string,
      scale: row.scale as string,
      artistInspiration: row.artist_inspiration
        ? JSON.parse(row.artist_inspiration as string)
        : undefined,
      lyrics: (row.lyrics as string) || undefined,
      vocalLanguages: row.vocal_languages
        ? JSON.parse(row.vocal_languages as string)
        : undefined,
      videoStyles: row.video_styles ? JSON.parse(row.video_styles as string) : undefined,
      instrumentalUrl: row.instrumental_url as string,
      vocalsUrl: (row.vocals_url as string) || undefined,
      mixUrl: row.mix_url as string,
      videoUrl: (row.video_url as string) || undefined,
      engines: JSON.parse(row.engines as string),
      processingTimeMs: row.processing_time_ms as number,
      status: row.status as string,
    });
  }

  stmt.free();

  return results;
}

/**
 * Get dashboard statistics
 */
export async function getStats(): Promise<{
  totalGenerations: number;
  totalDurationSec: number;
  averageBpm: number;
  popularGenres: Array<{ genre: string; count: number }>;
}> {
  if (!db) throw new Error('Database not initialized');

  // Total count and aggregates
  const stmt = db.prepare(
    'SELECT COUNT(*) as total, SUM(duration_sec) as total_duration, AVG(bpm) as avg_bpm FROM generations'
  );
  stmt.step();
  const row = stmt.getAsObject();
  stmt.free();

  const totalGenerations = (row.total as number) || 0;
  const totalDurationSec = (row.total_duration as number) || 0;
  const averageBpm = Math.round((row.avg_bpm as number) || 0);

  // Popular genres (requires parsing JSON - simplified)
  const popularGenres: Array<{ genre: string; count: number }> = [];

  return {
    totalGenerations,
    totalDurationSec,
    averageBpm,
    popularGenres,
  };
}
