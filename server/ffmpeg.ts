import ffmpegStatic from 'ffmpeg-static';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

export type FFMode = 'cli' | 'wasm';

export async function detectMode(): Promise<FFMode> {
  return ffmpegStatic ? 'cli' as const : 'wasm';
}

export async function runCli(args: string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const child = spawn(ffmpegStatic as string, args);
    child.stdout?.on('data', (d) => chunks.push(Buffer.from(d)));
    const errChunks: Buffer[] = [];
    child.stderr?.on('data', (d) => errChunks.push(Buffer.from(d)));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(Buffer.concat(chunks));
      else reject(new Error(`ffmpeg exited ${code}: ${Buffer.concat(errChunks).toString()}`));
    });
  });
}

export async function runFFmpeg(args: string[], mode: FFMode, files?: Record<string, Buffer>): Promise<Record<string, Buffer>> {
  if (mode === 'cli') {
    // For CLI we only support -f wav pipe:1 outputs; build per call where applicable.
    // High-level generator uses CLI to produce files, not return buffers.
    throw new Error('runFFmpeg(cli) buffer mode not used');
  }
  // wasm
  const ffmpeg = createFFmpeg({ log: false, corePath: undefined });
  await ffmpeg.load();
  if (files) {
    for (const [name, buf] of Object.entries(files)) {
      ffmpeg.FS('writeFile', name, await fetchFile(buf));
    }
  }
  // Not used directly; high-level functions load/exec with specific args.
  return {};
}