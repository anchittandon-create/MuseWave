import { mkdir, writeFile as fsWriteFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env.js';

export interface AssetPaths {
  directory: string;
  instrumental: string;
  vocals: string;
  mix: string;
  video: string;
  subtitles: string;
  midi: string;
}

/**
 * Create asset directory structure: /YYYY/MM/UUID/
 */
export async function createAssetDirectory(): Promise<AssetPaths> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const id = uuidv4();

  const directory = join(env.ASSETS_DIR, String(year), month, id);

  // Create directory recursively
  await mkdir(directory, { recursive: true });

  return {
    directory,
    instrumental: join(directory, 'instrumental.wav'),
    vocals: join(directory, 'vocals.wav'),
    mix: join(directory, 'mix.wav'),
    video: join(directory, 'video.mp4'),
    subtitles: join(directory, 'subtitles.srt'),
    midi: join(directory, 'melody.mid'),
  };
}

/**
 * Save buffer to file with directory creation
 */
export async function saveBuffer(buffer: Buffer, filePath: string): Promise<void> {
  await fsWriteFile(filePath, buffer);
}

/**
 * Convert absolute file path to public URL
 */
export function getAssetUrl(absolutePath: string): string {
  // Convert absolute path to relative from ASSETS_DIR
  const relativePath = absolutePath.replace(env.ASSETS_DIR, '').replace(/^\//, '');
  return `/assets/${relativePath}`;
}
