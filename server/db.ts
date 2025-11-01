import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL!;
export const sql = neon(connectionString);

export async function touchJob(
  id: string,
  patch: Partial<{
    status: string;
    progress: number;
    eta_seconds: number;
    plan: any;
    assets: any;
    error: string | null;
  }>
) {
  const keys = Object.keys(patch);
  if (keys.length === 0) return;
  const set = keys.map((k, i) => `${k === 'eta_seconds' ? 'eta_seconds' : k} = $${i + 2}`).join(', ');
  await sql(
    `update jobs set ${set}, updated_at=now() where id = $1`,
    id,
    ...keys.map((k) => (patch as any)[k]),
  );
}