import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { put } from '@vercel/blob';

export type SaveResult = { url: string; path: string };

export async function ensureDir(p: string) {
  await mkdir(p, { recursive: true });
}

export async function saveBufferPreferBlob(buf: Buffer, relPath: string): Promise<SaveResult> {
  // In prod use Vercel Blob (if token present), else write to /public for dev
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (token) {
    const { url } = await put(relPath.replace(/^\/+/, ''), buf, {
      access: 'public',
      token,
      addRandomSuffix: false,
    });
    return { url, path: relPath };
  }
  const abs = join(process.cwd(), 'public', relPath);
  await ensureDir(dirname(abs));
  await writeFile(abs, buf);
  return { url: `/${relPath}`, path: relPath };
}

export function datedAssetPrefix() {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `assets/${yyyy}/${mm}/${randomUUID()}`;
}