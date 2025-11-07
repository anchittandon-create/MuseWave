import { mkdir, writeFile } from 'fs/promises';
import { createWriteStream } from 'fs';
import { join, relative } from 'path';
import { randomUUID } from 'crypto';
import { env } from '../env.js';

export async function ensureDir(path: string) {
  await mkdir(path, { recursive: true });
}

export async function mkAssetDir() {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const uuid = randomUUID();
  const dir = join(process.cwd(), 'public', 'assets', year, month, uuid);
  await ensureDir(dir);
  const prefix = `/assets/${year}/${month}/${uuid}`;
  return { dir, prefix };
}

export async function writeBuffer(path: string, data: Buffer) {
  await writeFile(path, data);
}

export function publicUrl(absPath: string): string {
  const rel = relative(join(process.cwd(), 'public'), absPath);
  return env.ASSETS_BASE_URL.replace(/\/$/, '') + '/' + rel.replace(/\\/g, '/');
}

export function createFileStream(path: string) {
  return createWriteStream(path);
}
