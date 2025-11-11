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
  quotaExceeded?: boolean;
  quotaMessage?: string;
};

type GenerationMode = 'complete' | 'oss';

type LocalJobState = {
  status: string;
  label: string;
  progress: number;
  plan: any;
  result?: OrchestratorResult;
  error?: string;
  timers: Array<number | ReturnType<typeof setTimeout>>;
};

const LOCAL_JOB_STORE = new Map<string, LocalJobState>();

type EnvRecord = Record<string, string | boolean | undefined>;

const metaEnv: EnvRecord | undefined =
  typeof import.meta !== 'undefined'
    ? (import.meta as unknown as { env?: EnvRecord }).env
    : undefined;

const nodeProcess: { env?: Record<string, string | undefined> } | undefined =
  typeof globalThis !== 'undefined' && 'process' in globalThis
    ? (globalThis as any).process
    : undefined;

function readEnv(key: string): string | undefined {
  const value =
    (metaEnv && (metaEnv[key] as string | undefined)) ??
    nodeProcess?.env?.[key];
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }
  return undefined;
}

function getBackendUrl(): string | undefined {
  const candidate =
    readEnv('VITE_BACKEND_NEO_URL') ||
    readEnv('VITE_BACKEND_URL') ||
    readEnv('BACKEND_NEO_URL') ||
    (typeof window !== 'undefined'
      ? (window as any).__BACKEND_NEO_URL
      : undefined);

  if (typeof candidate === 'string') {
    return candidate.replace(/\/$/, '');
  }
  return undefined;
}

function getAuthToken(): string {
  return (
    readEnv('VITE_API_KEY') ||
    readEnv('VITE_BACKEND_API_KEY') ||
    readEnv('DEFAULT_API_KEY') ||
    ''
  );
}

const localStages = [
  { status: 'planning', label: 'Drafting lyrics with Cohere...', pct: 10, delay: 800 },
  { status: 'generating-instruments', label: 'Building instrumental with MusicGen...', pct: 45, delay: 1600 },
  { status: 'synthesizing-vocals', label: 'Rendering vocals with Coqui TTS...', pct: 70, delay: 1500 },
  { status: 'mixing-mastering', label: 'Mastering mix with FFmpeg...', pct: 85, delay: 1200 },
  { status: 'rendering-video', label: 'Generating spectrum visualizer...', pct: 95, delay: 1200 },
];

const setDelay = typeof window !== 'undefined' && window.setTimeout ? window.setTimeout.bind(window) : setTimeout;
const clearDelay =
  typeof window !== 'undefined' && window.clearTimeout ? window.clearTimeout.bind(window) : clearTimeout;

const LOCAL_AUDIO_FALLBACK = '/test-create-45s.wav';
const LOCAL_VIDEO_FALLBACK = {
  lyric: '/test-lyric-video.mp4',
  official: '/test-official-video.mp4',
};

function buildLocalPlan(payload: Record<string, any>) {
  const prompt = (payload.musicPrompt as string) || 'Untitled MuseWave Track';
  const title = prompt.length > 3 ? `${prompt.slice(0, 40)} Mix` : 'MuseWave OSS Mix';
  const genres = Array.isArray(payload.genres) && payload.genres.length ? payload.genres : ['Electronic'];
  const languages = Array.isArray(payload.languages) && payload.languages.length ? payload.languages : ['English'];

  return {
    title,
    genre: genres[0],
    bpm: 96,
    key: 'C Minor',
    overallStructure: 'Intro → Verse → Chorus → Bridge → Outro',
    lyrics: payload.lyrics || `This is a free MuseWave OSS demo inspired by ${prompt}`,
    randomSeed: Math.floor(Math.random() * 100000),
    sections: [
      { name: 'Intro', sectionType: 'intro', durationBars: 8, chordProgression: ['Cm', 'Ab', 'Eb', 'Bb'], lyrics: '' },
      {
        name: 'Verse',
        sectionType: 'verse',
        durationBars: 16,
        chordProgression: ['Cm', 'Ab', 'Eb', 'Bb'],
        lyrics: payload.lyrics || 'Feel the open-source groove tonight',
      },
      { name: 'Chorus', sectionType: 'chorus', durationBars: 16, chordProgression: ['Cm', 'Bb', 'Ab', 'Eb'], lyrics: payload.lyrics || '' },
    ],
    stems: {
      vocals: true,
      drums: true,
      bass: true,
      instruments: true,
    },
    languages,
  };
}

function buildLocalResult(payload: Record<string, any>, plan: any): OrchestratorResult {
  const generateVideo = Boolean(payload.generateVideo);
  return {
    audioUrl: LOCAL_AUDIO_FALLBACK,
    videoUrls: generateVideo ? { ...LOCAL_VIDEO_FALLBACK } : null,
    plan,
  };
}

function scheduleLocalJob(jobId: string, payload: Record<string, any>, plan: any) {
  const job = LOCAL_JOB_STORE.get(jobId);
  if (!job) return;
  job.status = 'planning';
  job.label = localStages[0].label;
  job.progress = 5;

  let elapsed = 0;
  localStages.forEach((stage) => {
    elapsed += stage.delay;
    const timer = setDelay(() => {
      const current = LOCAL_JOB_STORE.get(jobId);
      if (!current) return;
      current.status = stage.status;
      current.label = stage.label;
      current.progress = stage.pct;
    }, elapsed);
    job.timers.push(timer);
  });

  const completionTimer = setDelay(() => {
    const current = LOCAL_JOB_STORE.get(jobId);
    if (!current) return;
    current.status = 'complete';
    current.label = 'Song ready! 🎶';
    current.progress = 100;
    current.result = buildLocalResult(payload, plan);
  }, elapsed + 1200);
  job.timers.push(completionTimer);
}

function startLocalGeneration(payload: Record<string, any>) {
  const jobId = `oss-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const plan = buildLocalPlan(payload);
  LOCAL_JOB_STORE.set(jobId, {
    status: 'planning',
    label: 'Drafting lyrics...',
    progress: 5,
    plan,
    timers: [],
  });
  scheduleLocalJob(jobId, payload, plan);
  return { jobId, plan };
}

function cleanupLocalJob(jobId: string) {
  const job = LOCAL_JOB_STORE.get(jobId);
  if (!job) return;
  job.timers.forEach((timer) => clearDelay(timer as any));
  LOCAL_JOB_STORE.delete(jobId);
}


export async function startGeneration(
  payload: Record<string, unknown>,
  options?: { mode?: GenerationMode }
) {
  const mode = options?.mode ?? 'complete';
  if (mode === 'oss') {
    return startLocalGeneration(payload);
  }

  // Require backend URL to be configured
  const backendUrl = getBackendUrl();
  
  if (!backendUrl) {
    throw new Error(
      'Backend URL not configured. Please set VITE_BACKEND_NEO_URL environment variable. ' +
      'For local development: VITE_BACKEND_NEO_URL=http://localhost:3002 ' +
      'For production: Set in Vercel environment variables'
    );
  }

  console.info(`[MuseWave] Connecting to backend: ${backendUrl}`);
  
  try {
    const authToken = getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const response = await fetch(`${backendUrl}/api/generate/pipeline`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Generation failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.jobId) {
      throw new Error('Backend did not return a job ID');
    }
    
    return { 
      jobId: data.jobId, 
      plan: data.plan || null 
    };
  } catch (error) {
    console.error('[MuseWave] Backend generation failed:', error);
    throw error instanceof Error ? error : new Error('Failed to start generation');
  }
}

export function subscribeToJob(
  jobId: string,
  onEvent: (event: OrchestratorEvent) => void,
  onError: (err: any) => void,
  options?: { mode?: GenerationMode }
) {
  const mode = options?.mode ?? 'complete';
  if (mode === 'oss') {
    let closed = false;
    const tick = () => {
      if (closed) return;
      const job = LOCAL_JOB_STORE.get(jobId);
      if (!job) {
        onError(new Error('Local job not found'));
        return;
      }
      if (job.error) {
        onEvent({ status: 'error', error: job.error });
        closed = true;
        cleanupLocalJob(jobId);
        return;
      }
      onEvent({
        status: job.status,
        label: job.label,
        pct: job.progress,
      });
      if (job.status === 'complete') {
        closed = true;
        return;
      }
      setDelay(tick, 1200);
    };
    tick();
    return {
      close() {
        closed = true;
      },
    };
  }

  let polling = true;
  let pollCount = 0;
  // Increased from 60 to 900 to support 30-minute generations (900 * 2s = 1800s = 30 min)
  const maxPolls = 900;
  
  console.log(`[OrchestratorClient] Starting subscription for job ${jobId}`);

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
    
    // Real backend polling only - no mock fallback
    const backendUrl = getBackendUrl();
    
    if (!backendUrl) {
      onError(new Error('Backend URL not configured. Set VITE_BACKEND_NEO_URL environment variable.'));
      polling = false;
      return;
    }
    
    try {
      const authToken = getAuthToken();
      const headers: Record<string, string> = {};
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }

      // Call backend-neo jobs endpoint
      const response = await fetch(`${backendUrl}/api/jobs/${jobId}`, {
        headers,
      });
      
      if (!response.ok) {
        throw new Error(`Job fetch failed: ${response.statusText}`);
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

export async function fetchJobResult(
  jobId: string,
  options?: { mode?: GenerationMode }
): Promise<OrchestratorResult> {
  const mode = options?.mode ?? 'complete';
  if (mode === 'oss') {
    const job = LOCAL_JOB_STORE.get(jobId);
    if (!job) {
      return { error: 'Job not found' };
    }
    if (job.result) {
      return job.result;
    }
    if (job.error) {
      return { error: job.error };
    }
    return { error: 'Job not complete' };
  }

  const backendUrl = getBackendUrl();

  if (!backendUrl) {
    return { 
      error: 'Backend URL not configured. Set VITE_BACKEND_NEO_URL environment variable.' 
    };
  }

  try {
    const authToken = getAuthToken();
    const headers: Record<string, string> = {};
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const response = await fetch(`${backendUrl}/api/jobs/${jobId}`, {
      headers,
    });
    
    if (!response.ok) {
      return { error: `Fetch failed: ${response.statusText}` };
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
