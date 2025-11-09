import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Stream audio generation progress via Server-Sent Events (SSE)
 * 
 * This provides real-time updates without polling
 * FREE - no additional cost, just HTTP streaming
 * 
 * Client usage:
 * const eventSource = new EventSource('/api/stream-generation?jobId=xxx');
 * eventSource.onmessage = (event) => {
 *   const data = JSON.parse(event.data);
 *   console.log('Progress:', data.pct);
 * };
 */

interface StreamUpdate {
  jobId: string;
  status: string;
  pct: number;
  message: string;
  audioUrl?: string;
  error?: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { jobId, backend } = req.query;

  if (!jobId || typeof jobId !== 'string') {
    res.status(400).json({ error: 'Job ID is required' });
    return;
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering in Nginx
  res.setHeader('Access-Control-Allow-Origin', '*');

  console.log('[Stream] Starting SSE for job:', jobId);

  // Send initial connection message
  sendSSE(res, { 
    jobId, 
    status: 'connected', 
    pct: 0, 
    message: 'Connected to generation stream' 
  });

  // Determine which backend to poll (MusicGen or backend-neo)
  const isMusicGen = backend === 'musicgen';
  const maxPolls = 180; // 3 minutes max (2s intervals)
  let pollCount = 0;

  // Poll for updates and stream to client
  const pollInterval = setInterval(async () => {
    pollCount++;

    try {
      let update: StreamUpdate | null = null;

      if (isMusicGen) {
        // Poll MusicGen status
        const replicateApiKey = process.env.REPLICATE_API_TOKEN || process.env.VITE_REPLICATE_API_TOKEN;
        if (!replicateApiKey) {
          sendSSE(res, { 
            jobId, 
            status: 'error', 
            pct: 0, 
            message: 'MusicGen not configured',
            error: 'Missing REPLICATE_API_TOKEN'
          });
          clearInterval(pollInterval);
          res.end();
          return;
        }

        const response = await fetch(`https://api.replicate.com/v1/predictions/${jobId}`, {
          headers: {
            'Authorization': `Token ${replicateApiKey}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          update = mapReplicateToUpdate(jobId, data);
        }
      } else {
        // Poll backend-neo
        const backendUrl = process.env.VITE_BACKEND_NEO_URL || process.env.BACKEND_NEO_URL;
        if (!backendUrl) {
          sendSSE(res, { 
            jobId, 
            status: 'error', 
            pct: 0, 
            message: 'Backend not configured',
            error: 'Missing VITE_BACKEND_NEO_URL'
          });
          clearInterval(pollInterval);
          res.end();
          return;
        }

        const response = await fetch(`${backendUrl}/api/jobs/${jobId}`);
        if (response.ok) {
          const data = await response.json();
          update = mapBackendNeoToUpdate(jobId, data);
        }
      }

      // Send update to client
      if (update) {
        sendSSE(res, update);

        // Close stream if job is complete or failed
        if (update.status === 'completed' || update.status === 'error') {
          clearInterval(pollInterval);
          console.log('[Stream] Job finished:', jobId, update.status);
          res.end();
        }
      }

      // Timeout check
      if (pollCount >= maxPolls) {
        sendSSE(res, { 
          jobId, 
          status: 'error', 
          pct: 0, 
          message: 'Generation timeout',
          error: 'Maximum polling time exceeded'
        });
        clearInterval(pollInterval);
        res.end();
      }

    } catch (error) {
      console.error('[Stream] Poll error:', error);
      sendSSE(res, { 
        jobId, 
        status: 'error', 
        pct: 0, 
        message: 'Polling error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      clearInterval(pollInterval);
      res.end();
    }
  }, 2000); // Poll every 2 seconds

  // Cleanup on client disconnect
  req.on('close', () => {
    clearInterval(pollInterval);
    console.log('[Stream] Client disconnected for job:', jobId);
  });
}

/**
 * Send Server-Sent Event to client
 */
function sendSSE(res: VercelResponse, data: StreamUpdate) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

/**
 * Map Replicate response to stream update
 */
function mapReplicateToUpdate(jobId: string, data: any): StreamUpdate {
  const statusMap: Record<string, string> = {
    'starting': 'pending',
    'processing': 'processing',
    'succeeded': 'completed',
    'failed': 'error',
    'canceled': 'error',
  };

  const status = statusMap[data.status] || 'processing';
  let pct = 0;
  if (data.status === 'starting') pct = 5;
  else if (data.status === 'processing') pct = 50;
  else if (data.status === 'succeeded') pct = 100;

  const update: StreamUpdate = {
    jobId,
    status,
    pct,
    message: getStatusMessage(data.status),
  };

  if (data.status === 'succeeded' && data.output) {
    update.audioUrl = Array.isArray(data.output) ? data.output[0] : data.output;
  }

  if (data.status === 'failed') {
    update.error = data.error || 'Generation failed';
  }

  return update;
}

/**
 * Map backend-neo response to stream update
 */
function mapBackendNeoToUpdate(jobId: string, data: any): StreamUpdate {
  return {
    jobId,
    status: data.status || 'processing',
    pct: data.progress || data.pct || 0,
    message: data.message || data.label || 'Processing...',
    audioUrl: data.audioUrl || data.result?.audio,
    error: data.error,
  };
}

function getStatusMessage(status: string): string {
  const messages: Record<string, string> = {
    'starting': 'Initializing AI model...',
    'processing': 'Generating music... 🎵',
    'succeeded': 'Complete! 🎉',
    'failed': 'Failed',
    'canceled': 'Canceled',
  };

  return messages[status] || 'Processing...';
}
