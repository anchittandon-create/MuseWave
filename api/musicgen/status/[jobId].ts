import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Poll MusicGen generation status
 * 
 * Checks Replicate prediction status and returns audio URL when ready
 */

interface ReplicateResponse {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: string | string[]; // URL(s) to generated audio
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { jobId } = req.query;

    if (!jobId || typeof jobId !== 'string') {
      res.status(400).json({ error: 'Job ID is required' });
      return;
    }

    const replicateApiKey = process.env.REPLICATE_API_TOKEN || process.env.VITE_REPLICATE_API_TOKEN;
    
    if (!replicateApiKey) {
      res.status(503).json({ 
        error: 'MusicGen not configured',
        message: 'Replicate API key not set.'
      });
      return;
    }

    // Fetch prediction status from Replicate
    const response = await fetch(`https://api.replicate.com/v1/predictions/${jobId}`, {
      headers: {
        'Authorization': `Token ${replicateApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[MusicGen] Status check error:', errorData);
      res.status(response.status).json({
        error: 'Failed to check status',
        details: errorData,
      });
      return;
    }

    const prediction: ReplicateResponse = await response.json();

    // Map Replicate status to our job status format
    const statusMap: Record<string, string> = {
      'starting': 'pending',
      'processing': 'processing',
      'succeeded': 'completed',
      'failed': 'error',
      'canceled': 'error',
    };

    const mappedStatus = statusMap[prediction.status] || 'processing';

    // Calculate progress percentage based on status
    let progress = 0;
    if (prediction.status === 'starting') progress = 5;
    else if (prediction.status === 'processing') progress = 50;
    else if (prediction.status === 'succeeded') progress = 100;

    // Prepare response
    const responseData: any = {
      jobId,
      status: mappedStatus,
      pct: progress,
      message: getStatusMessage(prediction.status),
    };

    // Add audio URL if generation succeeded
    if (prediction.status === 'succeeded' && prediction.output) {
      const audioUrl = Array.isArray(prediction.output) 
        ? prediction.output[0] 
        : prediction.output;
      
      responseData.audioUrl = audioUrl;
      responseData.result = {
        audio: audioUrl,
        generationTime: prediction.metrics?.predict_time,
      };
    }

    // Add error details if failed
    if (prediction.status === 'failed') {
      responseData.error = prediction.error || 'Generation failed';
      responseData.logs = prediction.logs;
    }

    res.status(200).json(responseData);

  } catch (error) {
    console.error('[MusicGen] Status check error:', error);
    res.status(500).json({
      error: 'Status check failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

function getStatusMessage(status: string): string {
  const messages: Record<string, string> = {
    'starting': 'Initializing MusicGen model...',
    'processing': 'Generating music with AI...',
    'succeeded': 'Music generation complete! 🎵',
    'failed': 'Generation failed',
    'canceled': 'Generation canceled',
  };

  return messages[status] || 'Processing...';
}
