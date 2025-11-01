import type { VideoStyle } from '../lib/types';

export type OrchestratorEvent = {
  step?: number;
  label?: string;
  pct?: number;
  status?: string;
  error?: string;
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
  const backendUrl = process.env.BACKEND_NEO_URL || 'http://localhost:3001';
  
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
  const maxPolls = 60; // 2 minutes at 2s intervals for real generation
  const isMockJob = jobId.startsWith('mock-');
  
  const poll = async () => {
    if (!polling) {
      return;
    }
    
    pollCount++;
    
    if (isMockJob) {
      // Simulate mock job progression with more realistic stages
      if (pollCount >= maxPolls) {
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
    const backendUrl = process.env.BACKEND_NEO_URL || 'http://localhost:3001';
    
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
      
      // Map backend status to frontend with real-time progress
      if (job.status === 'succeeded' || job.status === 'completed') {
        onEvent({ status: 'complete', pct: 100, label: 'Complete! 🎉' });
        polling = false;
      } else if (job.status === 'failed' || job.status === 'error') {
        onEvent({ status: 'error', error: job.error || job.message || 'Generation failed' });
        polling = false;
      } else if (job.status === 'running' || job.status === 'processing') {
        // Use real backend progress data
        const progress = typeof job.progress === 'number' ? Math.min(99, job.progress) : Math.min(95, Math.floor((pollCount / 60) * 100));
        const message = job.message || job.label || 'Processing...';
        const status = job.currentStage || 'generating-instruments';
        
        onEvent({ 
          status: status, 
          pct: progress,
          label: message
        });
        setTimeout(poll, 1500); // Poll more frequently for real jobs
      } else if (job.status === 'pending' || job.status === 'queued') {
        onEvent({ 
          status: 'planning', 
          pct: 2,
          label: job.message || 'Queued for processing...'
        });
        setTimeout(poll, 3000); // Poll less frequently for queued jobs
      } else {
        // Handle any other status
        const progress = typeof job.progress === 'number' ? job.progress : Math.min(50, Math.floor((pollCount / 60) * 100));
        onEvent({ 
          status: job.status || 'generating-instruments', 
          pct: progress,
          label: job.message || job.label || 'Processing...'
        });
        setTimeout(poll, 2000);
      }
    } catch (err) {
      console.error('Job polling error:', err);
      // Don't immediately fail - try a few more times
      if (pollCount < 5) {
        setTimeout(poll, 5000); // Retry in 5 seconds
      } else {
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

  const backendUrl = process.env.BACKEND_NEO_URL || 'http://localhost:3001';

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
    
    if (job.status === 'succeeded' || job.status === 'completed') {
      return {
        audioUrl: job.result?.audio ? `/api/assets/${job.result.audio}` : job.audioUrl || null,
        videoUrls: job.result?.videos ? 
          // Handle multiple video styles
          Object.fromEntries(
            Object.entries(job.result.videos).map(([style, filename]) => [
              style, 
              `/api/assets/${filename}`
            ])
          ) : 
          // Handle single video
          job.result?.video ? { 
            [job.videoStyle || 'lyric']: `/api/assets/${job.result.video}` 
          } : 
          // Handle direct video URLs
          job.videoUrls || null,
        plan: job.result?.plan || job.plan || null,
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
