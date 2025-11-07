/**
 * File and URL utilities
 */

import { join } from 'path';

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
