import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { sql, touchJob } from '../server/db';
import { requireApiKey } from '../server/auth';

export const config = { runtime: 'nodejs' };

const InputSchema = z.object({
  musicPrompt: z.string(),
  genres: z.array(z.string()).default([]),
  durationSec: z.number().int().min(30).max(120),
  artistInspiration: z.array(z.string()).optional(),
  lyrics: z.string().optional(),
  vocalLanguages: z.array(z.string()).optional(),
  generateVideo: z.boolean().optional(),
  videoStyles: z.array(z.enum(['Lyric Video','Official Music Video','Abstract Visualizer'])).optional()
});

export default async function handler(req: Request) {
  try {
    await requireApiKey(req);
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 401 });
  }
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  let body: any;
  try {
    body = InputSchema.parse(await req.json());
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid body', detail: e instanceof Error ? e.message : String(e) }), { status: 400 });
  }

  const id = randomUUID();
  await sql`
    insert into jobs (id, status, progress, eta_seconds, payload)
    values (${id}, 'queued', 0, 45, ${body})
  `;

  // fire-and-forget trigger to run the job
  try {
    // no-await to return immediately
    fetch(`${new URL(req.url).origin}/api/generate/run?id=${id}`, { method: 'POST', headers: { 'x-api-key': req.headers.get('x-api-key') || '' }, body: JSON.stringify(body) }).catch(()=>{});
  } catch {}
  await touchJob(id, { status: 'queued', progress: 1, eta_seconds: 45 });
  return new Response(JSON.stringify({ jobId: id }), { headers: { 'content-type': 'application/json' } });
}