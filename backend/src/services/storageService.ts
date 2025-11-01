import { mkdir, copyFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { ulid } from 'ulid';
import { logger } from '../logger.js';

export class StorageService {
  private baseDir: string;

  constructor() {
    // Use public/assets in the parent directory
    this.baseDir = path.join(process.cwd(), '..', 'public', 'assets');
  }

  /**
   * Store a file in the asset storage with proper directory structure
   * Returns the public URL path
   */
  async storeFile(sourcePath: string, fileExtension: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const uuid = ulid();

    // Create directory structure: /public/assets/YYYY/MM/
    const targetDir = path.join(this.baseDir, String(year), month);
    if (!existsSync(targetDir)) {
      await mkdir(targetDir, { recursive: true });
    }

    // Generate filename with UUID
    const filename = `${uuid}.${fileExtension}`;
    const targetPath = path.join(targetDir, filename);

    // Copy file to target location
    await copyFile(sourcePath, targetPath);
    logger.info({ sourcePath, targetPath }, 'File stored successfully');

    // Return public URL path
    return `/assets/${year}/${month}/${filename}`;
  }

  /**
   * Get the full file system path from a public URL
   */
  getFullPath(publicUrl: string): string {
    return path.join(process.cwd(), '..', 'public', publicUrl);
  }
}

export const storageService = new StorageService();
