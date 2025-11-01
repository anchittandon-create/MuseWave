import { sql } from './db';

export async function requireApiKey(req: Request): Promise<void> {
  const key = (req.headers.get('x-api-key') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '').trim();
  if (!key) throw new Error('Missing API key');
  const rows = await sql<{ active: boolean }>`select active from api_keys where key=${key}`;
  if (!rows.length || !rows[0].active) throw new Error('Invalid API key');
}