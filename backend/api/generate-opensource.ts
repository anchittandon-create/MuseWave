/**
 * Vercel Serverless Function - Open-Source Music Generation
 * Entry point for /api/generate-opensource
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { openSourceOrchestrator } from '../src/services/openSourceOrchestrator';

// Request validation
const GenerateRequestSchema = z.object({
  musicPrompt: z.string().min(1).max(1000),
  genres: z.array(z.string()).min(1).max(5),
  durationSec: z.number().int().min(10).max(300),
  artistInspiration: z.array(z.string()).optional(),
  lyrics: z.string().max(5000).optional(),
  vocalLanguages: z.array(z.string()).optional(),
  generateVideo: z.boolean().optional().default(false),
  videoStyles: z.array(z.string()).optional()
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    // Validate request
    const validated = GenerateRequestSchema.parse(req.body);

    console.log('[Vercel] Starting generation:', validated);

    // Generate (with timeout for serverless)
    const timeoutMs = 290000; // 290s (Vercel has 300s limit)
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Generation timeout')), timeoutMs)
    );

    const generationPromise = openSourceOrchestrator.generate(validated);

    const result = await Promise.race([generationPromise, timeoutPromise]) as any;

    return res.status(result.success ? 200 : 500).json(result);

  } catch (error) {
    console.error('[Vercel] Generation error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
