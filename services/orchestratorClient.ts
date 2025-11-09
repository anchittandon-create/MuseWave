import type { VideoStyle } from '../lib/types';

export type OrchestratorEvent = {
  step?: number;
  label?: string;
  pct?: number;
  status?: string;
  error?: string;
  etaSeconds?: number;
  stageEtaSeconds?: number;
  totalEtaSeconds?: number;
};

export type OrchestratorResult = {
  audioUrl?: string | null;
  videoUrls?: Partial<Record<VideoStyle | string, string>> | null;
  plan?: any;
  error?: string;
};

export async function startGeneration(payload: Record<string, unknown>) {
  // DEVELOPMENT MODE: Use local mock generation
  if (process.env.NODE_ENV === 'development' || !process.env.BACKEND_NEO_URL) {
    console.info('[MuseWave] Using local mock generation (backend not available)');
    
    // Generate a mock job ID and plan
    const mockJobId = `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const mockPlan = {
      title: (payload.musicPrompt as string)?.substring(0, 30) || 'Generated Track',
      genre: (payload.genres as string[])?.[0] || 'electronic',
      bpm: 120 + Math.floor(Math.random() * 20),
      duration: payload.duration || 90,
      sections: ['intro', 'verse', 'chorus', 'bridge', 'outro'],
    };
    
    return { 
      jobId: mockJobId, 
      plan: mockPlan 
    };
  }

  // PRODUCTION MODE: Call real backend-neo API
  const backendUrl = process.env.BACKEND_NEO_URL || 'http://localhost:3002';
  
  try {
    const response = await fetch(`${backendUrl}/api/generate/pipeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Generation failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    return { 
      jobId: data.jobId, 
      plan: data.plan || null 
    };
  } catch (error) {
    console.warn('[MuseWave] Backend not available, falling back to mock generation');
    
    // Fallback to mock generation if backend fails
    const mockJobId = `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const mockPlan = {
      title: (payload.musicPrompt as string)?.substring(0, 30) || 'Generated Track',
      genre: (payload.genres as string[])?.[0] || 'electronic',
      bpm: 120 + Math.floor(Math.random() * 20),
      duration: payload.duration || 90,
      sections: ['intro', 'verse', 'chorus', 'bridge', 'outro'],
    };
    
    return { 
      jobId: mockJobId, 
      plan: mockPlan 
    };
  }
}

export function subscribeToJob(
  jobId: string,
  onEvent: (event: OrchestratorEvent) => void,
  onError: (err: any) => void
) {
  let polling = true;
  let pollCount = 0;
  // Increased from 60 to 900 to support 30-minute generations (900 * 2s = 1800s = 30 min)
  const maxPolls = 900;
  const isMockJob = jobId.startsWith('mock-');
  
  console.log(`[OrchestratorClient] Starting subscription for job ${jobId} (mock: ${isMockJob})`);

  const pickNumber = (...values: unknown[]): number | undefined => {
    for (const value of values) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
    }
    return undefined;
  };

  const normalizeStage = (stage?: string | null, status?: string | null): string => {
    const value = (stage || '').toLowerCase();
    switch (value) {
      case 'planning':
      case 'generating-instruments':
      case 'synthesizing-vocals':
      case 'mixing-mastering':
      case 'rendering-video':
      case 'finalizing':
        return value;
      case 'complete':
        return 'finalizing';
    }

    const statusValue = (status || '').toLowerCase();
    switch (statusValue) {
      case 'pending':
      case 'queued':
        return 'planning';
      case 'processing':
      case 'running':
        return 'generating-instruments';
      case 'finalizing':
        return 'finalizing';
      default:
        return 'generating-instruments';
    }
  };
  
  const poll = async () => {
    if (!polling) {
      return;
    }
    
    pollCount++;
    
    // Log every 30 polls (1 minute) to track progress
    if (pollCount % 30 === 0) {
      console.log(`[OrchestratorClient] Poll #${pollCount}/${maxPolls} for job ${jobId}`);
    }
    
    if (isMockJob) {
      // Simulate mock job progression with more realistic stages
      if (pollCount >= maxPolls) {
        console.log('[OrchestratorClient] Mock job completing');
        onEvent({ status: 'complete', pct: 100, label: 'Mock generation complete! 🎉' });
        polling = false;
        return;
      }
      
      const progress = Math.min(95, Math.floor((pollCount / maxPolls) * 100));
      const stages = [
        { status: 'planning', label: 'Planning your track...' },
        { status: 'generating-instruments', label: 'Generating instruments...' },
        { status: 'synthesizing-vocals', label: 'Creating melodies and vocals...' },
        { status: 'mixing-mastering', label: 'Mixing and mastering...' },
        { status: 'rendering-video', label: 'Rendering video content...' },
        { status: 'finalizing', label: 'Finalizing output...' }
      ];
      
      const stageIndex = Math.floor((pollCount / maxPolls) * stages.length);
      const stage = stages[Math.min(stageIndex, stages.length - 1)];
      
      onEvent({ 
        status: stage.status, 
        pct: progress,
        label: stage.label
      });
      
      setTimeout(poll, 2000);
      return;
    }
    
    // Real backend polling - check backend-neo first
    const backendUrl = process.env.BACKEND_NEO_URL || 'http://localhost:3002';
    
    if (pollCount === 1 && !process.env.BACKEND_NEO_URL) {
      console.warn('[OrchestratorClient] BACKEND_NEO_URL not configured, using default:', backendUrl);
    }
    
    try {
      // Try backend-neo jobs endpoint first
      let response = await fetch(`${backendUrl}/api/jobs/${jobId}`);
      
      if (!response.ok) {
        // Fallback to vercel API endpoint
        response = await fetch(`/api/jobs/${jobId}`);
        if (!response.ok) {
          throw new Error(`Job fetch failed: ${response.statusText}`);
        }
      }
      
      const job = await response.json();
      
      const statusValue = (job.status || '').toLowerCase();
      const etaSeconds = pickNumber(
        job.remainingSeconds,
        job.remaining_seconds,
        job.etaSeconds,
        job.eta_seconds,
        job.eta
      );
      const totalEtaSeconds = pickNumber(
        job.totalEtaSeconds,
        job.total_eta_seconds,
        job.estimatedSeconds,
        job.estimated_seconds,
        etaSeconds
      );
      const stageEtaSeconds = pickNumber(
        job.stageEtaSeconds,
        job.stage_eta_seconds,
        job.stageRemainingSeconds,
        job.stage_remaining_seconds
      );

      // Map backend status to frontend with real-time progress
      if (statusValue === 'succeeded' || statusValue === 'completed' || statusValue === 'complete') {
        onEvent({ status: 'complete', pct: 100, label: 'Complete! 🎉', etaSeconds: 0, totalEtaSeconds: 0, stageEtaSeconds: 0 });
        polling = false;
      } else if (statusValue === 'failed' || statusValue === 'error') {
        onEvent({ status: 'error', error: job.error || job.message || 'Generation failed' });
        polling = false;
      } else if (statusValue === 'running' || statusValue === 'processing') {
        // Use real backend progress data
        const progressRaw = pickNumber(
          job.progress,
          job.pct,
          job.percentage,
          job.percentComplete,
          job.percent_complete
        );
        const progress =
          progressRaw !== undefined
            ? Math.min(99.5, Math.max(1, progressRaw))
            : Math.min(95, Math.floor((pollCount / maxPolls) * 100));
        const message = job.message || job.label || 'Processing...';
        const stage = normalizeStage(job.currentStage, job.status);

        onEvent({ 
          status: stage, 
          pct: progress,
          label: message,
          etaSeconds: etaSeconds,
          totalEtaSeconds: totalEtaSeconds,
          stageEtaSeconds,
        });
        setTimeout(poll, 1500); // Poll more frequently for real jobs
      } else if (statusValue === 'pending' || statusValue === 'queued') {
        const pendingProgress = pickNumber(job.progress, job.pct, job.percentage, job.percentComplete);
        const progress =
          pendingProgress !== undefined
            ? Math.max(1, Math.min(15, pendingProgress))
            : 2;
        onEvent({ 
          status: 'planning', 
          pct: progress,
          label: job.message || 'Queued for processing...',
          etaSeconds,
          totalEtaSeconds: totalEtaSeconds ?? etaSeconds,
          stageEtaSeconds,
        });
        setTimeout(poll, 3000); // Poll less frequently for queued jobs
      } else {
        // Handle any other status
        const genericProgress = pickNumber(job.progress, job.pct, job.percentage, job.percentComplete);
        const progress =
          genericProgress !== undefined
            ? Math.min(95, Math.max(1, genericProgress))
            : Math.min(50, Math.floor((pollCount / maxPolls) * 100));
        onEvent({ 
          status: normalizeStage(job.currentStage, job.status), 
          pct: progress,
          label: job.message || job.label || 'Processing...',
          etaSeconds,
          totalEtaSeconds,
          stageEtaSeconds,
        });
        setTimeout(poll, 2000);
      }
    } catch (err) {
      console.error('[OrchestratorClient] Job polling error:', err);
      
      // Check if we've exceeded timeout
      if (pollCount > maxPolls) {
        console.error(`[OrchestratorClient] Real job ${jobId} timed out after ${maxPolls * 2} seconds`);
        onError(new Error(`Generation timed out after ${Math.floor(maxPolls * 2 / 60)} minutes. This might mean the backend is not responding or the job is taking longer than expected.`));
        polling = false;
        return;
      }
      
      // Don't immediately fail - try a few more times
      if (pollCount < 5) {
        console.log('[OrchestratorClient] Retrying in 5 seconds...');
        setTimeout(poll, 5000); // Retry in 5 seconds
      } else {
        console.error('[OrchestratorClient] Multiple polling errors, stopping');
        onError(err);
        polling = false;
      }
    }
  };
  
  poll();
  
  return {
    close() {
      polling = false;
    },
  };
}

export async function fetchJobResult(jobId: string): Promise<OrchestratorResult> {
  const isMockJob = jobId.startsWith('mock-');
  
  if (isMockJob) {
    // Return mock result for demo purposes
    return {
      audioUrl: '/test.wav', // Demo audio file
      videoUrls: {
        lyric: '/test-lyric-video.mp4', // Mock lyric video
        official: '/test-official-video.mp4', // Mock official video
      },
      plan: {
        title: 'Mock Generated Track',
        genre: 'electronic',
        bpm: 120,
        sections: ['intro', 'verse', 'chorus', 'outro']
      },
    };
  }

  const backendUrl = process.env.BACKEND_NEO_URL || 'http://localhost:3002';

  try {
    // Try backend-neo jobs endpoint first
    let response = await fetch(`${backendUrl}/api/jobs/${jobId}`);
    
    if (!response.ok) {
      // Fallback to vercel API endpoint
      response = await fetch(`/api/jobs/${jobId}`);
      if (!response.ok) {
        return { error: `Fetch failed: ${response.statusText}` };
      }
    }
    
    const job = await response.json();
    
    if (job.status === 'succeeded' || job.status === 'completed' || job.status === 'complete') {
      const coerceUrl = (value?: string | null) => {
        if (!value) return null;
        if (/^https?:\/\//i.test(value) || value.startsWith('/')) {
          return value;
        }
        return `/api/assets/${value.replace(/^\/+/, '')}`;
      };

      const extractFromAssets = (assetType: string) => {
        if (!Array.isArray(job.assets)) return null;
        const match = job.assets.find((asset: any) => {
          const type = (asset?.type || asset?.kind || '').toLowerCase();
          return type === assetType.toLowerCase();
        });
        if (!match) return null;
        return coerceUrl(match.url || match.path);
      };

      const normalizeVideoMap = (input: any): Partial<Record<VideoStyle | string, string>> | null => {
        if (!input || typeof input !== 'object') return null;
        const entries = Object.entries(input)
          .map(([style, value]) => {
            const url = coerceUrl(typeof value === 'string' ? value : (value as any)?.url);
            return url ? [style, url] : null;
          })
          .filter((entry): entry is [string, string] => Array.isArray(entry));
        return entries.length ? Object.fromEntries(entries) : null;
      };

      const audioUrl =
        coerceUrl(job.audioUrl) ??
        coerceUrl(job.result?.audio) ??
        extractFromAssets('audio') ??
        extractFromAssets('mix') ??
        extractFromAssets('preview');

      const directVideoMap =
        normalizeVideoMap(job.videoUrls) ?? normalizeVideoMap(job.result?.videos);

      const singleVideo =
        coerceUrl(job.result?.video) ??
        coerceUrl(job.videoUrl) ??
        extractFromAssets('video');

      const videoUrls =
        directVideoMap ??
        (singleVideo
          ? {
              [job.videoStyle || 'lyric']: singleVideo,
            }
          : null);

      let planData: any = job.result?.plan ?? job.plan ?? null;
      if (typeof planData === 'string') {
        try {
          planData = JSON.parse(planData);
        } catch {
          // ignore parse errors and fall back to string form
        }
      }

      return {
        audioUrl: audioUrl || null,
        videoUrls,
        plan: planData,
      };
    } else if (job.status === 'failed' || job.status === 'error') {
      return { error: job.error || job.message || 'Generation failed' };
    } else {
      return { error: 'Job not complete' };
    }
  } catch (error) {
    console.warn('[MuseWave] Failed to fetch from backend, trying local cache');
    return { 
      error: error instanceof Error ? error.message : 'Failed to fetch job result' 
    };
  }
}
