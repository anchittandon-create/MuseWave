import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { existsSync, mkdirSync } from 'fs';

let db: Database.Database | null = null;

function init(): Database.Database {
  const file = join(process.cwd(), 'backend-open', 'data', 'generations.db');
  if (!existsSync(dirname(file))) mkdirSync(dirname(file), { recursive: true });
  const instance = new Database(file);
  instance
    .prepare(
      `CREATE TABLE IF NOT EXISTS generations (
        id TEXT PRIMARY KEY,
        payload TEXT,
        bpm INT,
        song_key TEXT,
        mix_url TEXT,
        instrumental_url TEXT,
        vocals_url TEXT,
        video_url TEXT,
        engines TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    )
    .run();
  return instance;
}

export function getDb(): Database.Database {
  if (!db) db = init();
  return db;
}
