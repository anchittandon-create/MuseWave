/**
 * File and URL utilities
 */

import { join } from 'path';
import path from 'path';
import fs from 'fs-extra';
import { nanoid } from 'nanoid';
import { env } from '../env.js';

/**
 * Convert absolute file path to public URL
 */
export function getAssetUrl(absolutePath: string): string {
  const publicDir = join(process.cwd(), 'public');
  const relativePath = absolutePath.replace(publicDir, '');
  
  // Get base URL from environment or default to localhost
  const baseUrl = process.env.ASSETS_BASE_URL || 
                  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                  'http://localhost:3000';
  
  return `${baseUrl}${relativePath}`;
}

/**
 * Sanitize filename to prevent directory traversal
 */
export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Get file extension from MIME type
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const mimeMap: Record<string, string> = {
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/ogg': 'ogg',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'image/png': 'png',
    'image/jpeg': 'jpg',
  };
  
  return mimeMap[mimeType] || 'bin';
}

/**
 * Generate asset path with UUID structure: /YYYY/MM/UUID/filename
 */
export function generateAssetPath(filename: string, customId?: string): {
  fullPath: string;
  relativePath: string;
  publicUrl: string;
} {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const id = customId || nanoid(12);
  
  const relativePath = path.join(String(year), month, id, filename);
  const fullPath = path.join(env.ASSETS_DIR, relativePath);
  const publicUrl = `/assets/${relativePath}`;
  
  return { fullPath, relativePath, publicUrl };
}

/**
 * Create asset directory structure
 */
export async function createAssetDirectory(customId?: string): Promise<{
  id: string;
  dirPath: string;
  relativePath: string;
}> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const id = customId || nanoid(12);
  
  const relativePath = path.join(String(year), month, id);
  const dirPath = path.join(env.ASSETS_DIR, relativePath);
  
  await fs.ensureDir(dirPath);
  
  return { id, dirPath, relativePath };
}

/**
 * Get public URL for asset
 */
export function getPublicUrl(relativePath: string): string {
  return `/assets/${relativePath}`;
}

/**
 * Delete asset directory and all contents
 */
export async function deleteAssetDirectory(id: string): Promise<boolean> {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    const dirPath = path.join(env.ASSETS_DIR, String(year), month, id);
    
    if (await fs.pathExists(dirPath)) {
      await fs.remove(dirPath);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error deleting asset directory:', error);
    return false;
  }
}
