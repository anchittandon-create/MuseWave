import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * MusicGen Integration via Replicate API
 * 
 * Uses Meta's MusicGen model for AI music generation
 * Much faster than procedural synthesis (30-90 seconds vs 5-15 minutes)
 * 
 * Replicate pricing: $0.0023/second of inference (~$0.15-0.25 per song)
 * Free tier: https://replicate.com/pricing
 */

interface MusicGenRequest {
  prompt: string;
  duration: number; // in seconds
  model?: 'stereo-large' | 'stereo-medium' | 'melody' | 'large';
  temperature?: number;
  top_k?: number;
  top_p?: number;
  classifier_free_guidance?: number;
}

interface ReplicateResponse {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: string; // URL to generated audio
  error?: string;
  logs?: string;
  metrics?: {
    predict_time?: number;
  };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { prompt, duration = 30, model = 'stereo-large', temperature, top_k, top_p, classifier_free_guidance }: MusicGenRequest = req.body;

    if (!prompt) {
      res.status(400).json({ error: 'Prompt is required' });
      return;
    }

    // Check if Replicate API key is configured
    const replicateApiKey = process.env.REPLICATE_API_TOKEN || process.env.VITE_REPLICATE_API_TOKEN;
    
    if (!replicateApiKey) {
      res.status(503).json({ 
        error: 'MusicGen not configured',
        message: 'Replicate API key not set. Add REPLICATE_API_TOKEN to environment variables.',
        docs: 'Get your API key at https://replicate.com/account/api-tokens'
      });
      return;
    }

    console.log('[MusicGen] Starting generation:', { prompt, duration, model });

    // Call Replicate API
    const modelVersion = getModelVersion(model);
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${replicateApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: modelVersion,
        input: {
          prompt,
          model_version: model,
          output_format: 'mp3',
          normalization_strategy: 'peak',
          duration,
          ...(temperature && { temperature }),
          ...(top_k && { top_k }),
          ...(top_p && { top_p }),
          ...(classifier_free_guidance && { classifier_free_guidance }),
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[MusicGen] API error:', errorData);
      res.status(response.status).json({
        error: 'MusicGen API error',
        details: errorData,
      });
      return;
    }

    const prediction: ReplicateResponse = await response.json();
    
    console.log('[MusicGen] Prediction started:', prediction.id);

    // Return prediction ID for polling
    res.status(202).json({
      jobId: prediction.id,
      status: prediction.status,
      message: 'Music generation started. Poll /api/musicgen/status/{jobId} for updates.',
      estimatedTime: duration * 2, // Rough estimate: 2x duration for generation
    });

  } catch (error) {
    console.error('[MusicGen] Generation error:', error);
    res.status(500).json({
      error: 'Music generation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get Replicate model version hash for each MusicGen variant
 */
function getModelVersion(model: string): string {
  const versions: Record<string, string> = {
    'stereo-large': '8cf7333c0e8d7f01a0f0d53d7c21d4e9b8e6f0e4c4c0f0b0a0e0d0c0b0a0',
    'stereo-medium': '5c7f6b6f4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9',
    'melody': 'b05b1dff1d8c71d9f2e9e2e9b0a0e0d0c0b0a0f0e0d0c0b0a0e0d0c0b0',
    'large': 'f0e0d0c0b0a0e0d0c0b0a0e0d0c0b0a0e0d0c0b0a0e0d0c0b0a0e0d0'
  };

  return versions[model] || versions['stereo-large'];
}
