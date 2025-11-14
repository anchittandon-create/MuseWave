import React, { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import { useGenerationQuota, type GenerationCategory } from '../src/contexts/GenerationQuotaContext';
import { useAppVersion } from '../src/contexts/AppVersionContext';
import type { Job, JobStatus, VideoStyle, FinalPlan, JobLog, MusicPlan, Section, DrumPattern, LeadMelodyNote } from '../lib/types';
import * as geminiService from '../services/geminiService';
import { startGeneration, subscribeToJob, fetchJobResult, type OrchestratorEvent } from '../services/orchestratorClient';
import PageHeader from '../components/PageHeader';
import MuseForgeForm, { FormState, EnhancingField } from '../components/MuseForgeForm';
import Progress from '../components/ui/Progress';
import Button from '../components/ui/Button';
import MusicPlayer from '../components/MusicPlayer';
import AIAudioTranscript from '../components/AIAudioTranscript';

// Small inline icons used by this page (kept local to avoid cross-file imports)
const ClipboardIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <rect x="9" y="9" width="10" height="10" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const CheckIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const STAGE_SEQUENCE: JobStatus[] = [
  'planning',
  'generating-instruments',
  'synthesizing-vocals',
  'mixing-mastering',
  'rendering-video',
  'finalizing',
];

const STATUS_ETAS: Partial<Record<JobStatus, number>> = {
  'planning': 18,
  'generating-instruments': 6,
  'synthesizing-vocals': 6,
  'mixing-mastering': 5,
  'rendering-video': 12,
  'finalizing': 4,
};

const formatSeconds = (seconds?: number | null) => {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) {
    return '--:--';
  }
  const clamped = Math.max(0, Math.round(seconds));
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const mapSectionType = (label: string): Section['sectionType'] => {
  const lower = label.toLowerCase();
  if (lower.includes('intro')) return 'intro';
  if (lower.includes('verse')) return 'verse';
  if (lower.includes('chorus')) return 'chorus';
  if (lower.includes('bridge')) return 'bridge';
  if (lower.includes('drop')) return 'drop';
  if (lower.includes('break')) return 'breakdown';
  if (lower.includes('outro')) return 'outro';
  return 'verse';
};

const createDrumPattern = (bars: number): DrumPattern => {
  const steps = Math.max(1, bars * 4);
  const patternLength = steps * 4;
  const kick = Array.from({ length: patternLength }, (_, i) => (i % 4 === 0 ? 1 : 0));
  const snare = Array.from({ length: patternLength }, (_, i) => (i % 8 === 4 ? 1 : 0));
  const hat = Array.from({ length: patternLength }, () => 1);
  return { kick, snare, hihat: hat };
};

const adaptPlan = (backendPlan: any, req: FormState, seed: number): MusicPlan => {
  const durationSec = backendPlan?.duration_sec ?? req.duration;
  const sections: string[] = Array.isArray(backendPlan?.sections) ? backendPlan.sections : ['Intro', 'Verse', 'Chorus', 'Bridge', 'Outro'];
  const barsPerSection: number = backendPlan?.bars_per_section ?? 8;

  const adaptedSections = sections.map((name) => {
    const sectionType = mapSectionType(name);
    const durationBars = barsPerSection;
    const chordProgression: string[] = Array.isArray(backendPlan?.chord_progressions?.[name]) 
      ? backendPlan.chord_progressions[name] 
      : [];
    
    const lyricsLines = Array.isArray(backendPlan?.lyrics_lines) ? backendPlan.lyrics_lines : [];
    const lyricsForSection = lyricsLines
      .filter((line: any) => line && line.section === name)
      .map((line: any) => line.text || '')
      .join(' ');

    return {
      name,
      sectionType,
      durationBars,
      chordProgression,
      drumPattern: createDrumPattern(durationBars),
      synthLine: { 
        pattern: 'pads' as const, 
        timbre: 'warm' as const 
      },
      leadMelody: [] as LeadMelodyNote[],
      effects: {
        reverb: 30,
        compressionThreshold: -18,
        stereoWidth: 60,
      },
      lyrics: lyricsForSection,
    };
  });

  const lyricsLines = Array.isArray(backendPlan?.lyrics_lines) ? backendPlan.lyrics_lines : [];
  const lyricsCombined = req.lyrics || lyricsLines.map((l: any) => l?.text || '').join('\n') || '';

  const cuePoints = {
    introEnd: Math.round(durationSec * 0.15),
    dropStart: Math.round(durationSec * 0.5),
    outroStart: Math.max(Math.round(durationSec * 0.85), Math.round(durationSec - 12)),
  };

  return {
    title: backendPlan?.title || (req as any).prompt?.slice(0, 48) || 'MuseForge Track',
    genre: backendPlan?.genre || (Array.isArray(req.genres) ? req.genres[0] : undefined) || 'Electronic',
    bpm: backendPlan?.bpm || 120,
    key: backendPlan?.key || 'C',
    overallStructure: sections.join(' → '),
    vocalStyle: Array.isArray(backendPlan?.artist_style_notes) 
      ? backendPlan.artist_style_notes.join(', ') 
      : 'Adaptive vocal style',
    lyrics: lyricsCombined,
    randomSeed: seed,
    sections: adaptedSections,
    stems: {
      vocals: Boolean(lyricsCombined.trim().length),
      drums: true,
      bass: true,
      instruments: true,
    },
    cuePoints,
  };
};

const HomePage = () => {
  const [formState, setFormState] = useState<FormState>({
    prompt: '',
    genres: [],
    duration: 90,
    artists: [],
    lyrics: '',
    languages: [],
    generateVideo: false, // COST OPTIMIZATION: Default to audio-only (lazy generation)
    videoStyles: ['lyric'] as VideoStyle[],
  });
  const [job, setJob] = useState<Job | null>(null);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [totalTimeLeft, setTotalTimeLeft] = useState(formatSeconds(undefined));
  const [stageTimeLeft, setStageTimeLeft] = useState(formatSeconds(undefined));
  const [enhancingField, setEnhancingField] = useState<EnhancingField | null>(null);

  const eventSourceRef = useRef<{ close(): void } | null>(null);
  const progressAnimatorRef = useRef<number | null>(null);
  const lastProgressRef = useRef(0);
  const jobStartRef = useRef<number | null>(null);
  const stageInfoRef = useRef<{ status: JobStatus; startedAt: number; baseline: number } | null>(null);
  const { toast } = useToast();
  const { canStartGeneration, recordGeneration, remaining } = useGenerationQuota();
  const { version } = useAppVersion();
  const location = useLocation();
  const navigate = useNavigate();

  const updateTotalEta = useCallback(
    (pct: number, etaSeconds?: number | null, totalEtaSeconds?: number | null) => {
      const preferred = etaSeconds ?? totalEtaSeconds;
      if (preferred !== null && preferred !== undefined && Number.isFinite(preferred)) {
        // Cap ETA at 30 minutes (1800 seconds) for sanity
        const cappedEta = Math.min(preferred, 1800);
        setTotalTimeLeft(formatSeconds(cappedEta));
        return;
      }

      if (!jobStartRef.current || pct <= 0) {
        setTotalTimeLeft(formatSeconds(undefined));
        return;
      }

      const elapsed = (Date.now() - jobStartRef.current) / 1000;
      if (elapsed <= 0) {
        setTotalTimeLeft(formatSeconds(undefined));
        return;
      }

      const remaining = Math.max(0, (elapsed * (100 - pct)) / pct);
      // Cap calculated ETA at 30 minutes as well
      const cappedRemaining = Math.min(remaining, 1800);
      setTotalTimeLeft(formatSeconds(cappedRemaining));
    },
    []
  );

  const updateStageTimer = useCallback(
    (status: JobStatus, stageEtaSeconds?: number | null) => {
      const now = Date.now();
      const previous = stageInfoRef.current;
      const baselineDefault = STATUS_ETAS[status] ?? 10;

      if (!previous || previous.status !== status) {
        // Cap stage ETA at 2 minutes (120 seconds)
        const baseline = stageEtaSeconds !== null && stageEtaSeconds !== undefined 
          ? Math.min(stageEtaSeconds, 120) 
          : baselineDefault;
        stageInfoRef.current = { status, startedAt: now, baseline };
        setStageTimeLeft(formatSeconds(baseline));
        return;
      }

      const elapsed = (now - previous.startedAt) / 1000;
      const updatedBaseline =
        stageEtaSeconds !== null && stageEtaSeconds !== undefined
          ? Math.min(stageEtaSeconds + elapsed, 120)  // Cap at 2 minutes
          : previous.baseline ?? baselineDefault;

      stageInfoRef.current = {
        status,
        startedAt: previous.startedAt,
        baseline: updatedBaseline,
      };

      const remaining = Math.max(0, updatedBaseline - elapsed);
      setStageTimeLeft(formatSeconds(remaining));
    },
    []
  );

  // Load remix payload from navigation state
  useEffect(() => {
    if (location.state && (location.state as any).jobToRemix) {
      const jobToRemix = (location.state as any).jobToRemix as JobLog;
      setFormState({
        prompt: jobToRemix.prompt,
        genres: jobToRemix.genres,
        duration: jobToRemix.duration,
        artists: jobToRemix.artists,
        lyrics: jobToRemix.lyrics,
        languages: jobToRemix.languages || [],
        generateVideo: jobToRemix.generateVideo,
      videoStyles: (jobToRemix.videoStyles || []),
      });
      toast('Remix loaded! Adjust and create something new.', 'success');
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate, toast]);

  const resetJob = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (progressAnimatorRef.current) {
      cancelAnimationFrame(progressAnimatorRef.current);
      progressAnimatorRef.current = null;
    }
    setJob(null);
    setDisplayProgress(0);
    lastProgressRef.current = 0;
    jobStartRef.current = null;
    stageInfoRef.current = null;
    setTotalTimeLeft(formatSeconds(undefined));
    setStageTimeLeft(formatSeconds(undefined));
  }, []);

  useEffect(() => resetJob, [resetJob]);

  useEffect(() => {
    lastProgressRef.current = displayProgress;
  }, [displayProgress]);

  useEffect(() => {
    return () => {
      if (progressAnimatorRef.current) {
        cancelAnimationFrame(progressAnimatorRef.current);
        progressAnimatorRef.current = null;
      }
    };
  }, []);

  const animateProgress = useCallback((target: number, durationMs = 600) => {
    const startValue = lastProgressRef.current;
    const clampedTarget = Math.min(100, Math.max(startValue, target));
    if (progressAnimatorRef.current) {
      cancelAnimationFrame(progressAnimatorRef.current);
    }
    if (clampedTarget <= startValue) {
      setDisplayProgress(clampedTarget);
      return;
    }
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      const eased = startValue + (clampedTarget - startValue) * (1 - Math.pow(1 - t, 3));
      setDisplayProgress(eased);
      if (t < 1) {
        progressAnimatorRef.current = requestAnimationFrame(step);
      } else {
        progressAnimatorRef.current = null;
      }
    };
    progressAnimatorRef.current = requestAnimationFrame(step);
  }, []);

  const handleSuggestion = useCallback(async (field: EnhancingField) => {
    if (!field) return;
    setEnhancingField(field);
    try {
      let result: any;
      const context = { ...formState };
      switch (field) {
        case 'prompt':
          result = await geminiService.enhancePrompt(context);
          break;
        case 'genres':
          result = await geminiService.suggestGenres(context);
          break;
        case 'artists':
          result = await geminiService.suggestArtists(context);
          break;
        case 'lyrics':
          result = await geminiService.enhanceLyrics(context);
          break;
        case 'languages':
          result = await geminiService.suggestLanguages(context);
          break;
      }
      if (result) {
        setFormState(prev => {
          switch (field) {
            case 'prompt':
              return result.prompt ? { ...prev, prompt: result.prompt } : prev;
            case 'genres': {
              const next = Array.isArray(result.genres) ? result.genres : [];
              if (!next.length) return prev;
              const currentGenres = Array.isArray(prev.genres) ? prev.genres : [];
              const merged = Array.from(new Set([...currentGenres, ...next]));
              return { ...prev, genres: merged };
            }
            case 'artists': {
              const next = Array.isArray(result.artists) ? result.artists : [];
              if (!next.length) return prev;
              const currentArtists = Array.isArray(prev.artists) ? prev.artists : [];
              const merged = Array.from(new Set([...currentArtists, ...next]));
              return { ...prev, artists: merged };
            }
            case 'lyrics':
              return result.lyrics ? { ...prev, lyrics: result.lyrics } : prev;
            case 'languages': {
              const next = Array.isArray(result.languages) ? result.languages : [];
              if (!next.length) return prev;
              const currentLanguages = Array.isArray(prev.languages) ? prev.languages : [];
              const merged = Array.from(new Set([...currentLanguages, ...next]));
              return { ...prev, languages: merged };
            }
            default:
              return prev;
          }
        });
        toast(`${field.charAt(0).toUpperCase() + field.slice(1)} enhanced!`, 'success');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : `Failed to enhance ${field}.`;
      toast(msg, 'error');
    } finally {
      setEnhancingField(null);
    }
  }, [formState, toast]);

  const saveJobToHistory = (jobRecord: Job) => {
    try {
      const history: JobLog[] = JSON.parse(localStorage.getItem('museforge_job_history') || '[]');
      history.unshift(jobRecord);
      localStorage.setItem('museforge_job_history', JSON.stringify(history.slice(0, 50)));
    } catch (error) {
      console.error('Failed to save job history', error);
    }
  };

  const handleGenerate = useCallback(async () => {
    if (!formState.prompt && (!Array.isArray(formState.genres) || formState.genres.length === 0)) {
      toast('Please provide a prompt or at least one genre to start.', 'error');
      return;
    }

    if (formState.generateVideo && (!Array.isArray(formState.videoStyles) || formState.videoStyles.length === 0)) {
      toast('Please select at least one video style when video generation is enabled.', 'error');
      return;
    }

    const requiredCategories: GenerationCategory[] = ['song', 'audio'];
    if (formState.generateVideo) {
      requiredCategories.push('video');
    }
    if (!canStartGeneration(requiredCategories)) {
      const exhausted = requiredCategories
        .filter(type => remaining[type] !== null && (remaining[type] ?? 0) <= 0)
        .map(type => type === 'song' ? 'song' : type);
      const exhaustedList = exhausted.length ? exhausted.join(' & ') : 'requested assets';
      toast(`Quota reached for ${exhaustedList}. Switch to Free Open Source Version or wait for reset.`, 'error');
      return;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const seed = Math.floor(Math.random() * 999999) + 1;
    jobStartRef.current = Date.now();
    stageInfoRef.current = {
      status: 'planning',
      startedAt: jobStartRef.current,
      baseline: STATUS_ETAS['planning'] ?? 15,
    };
    lastProgressRef.current = 0;

    const baseJob: Job = {
      id: uuidv4(),
      status: 'planning',
      progress: 1,
      message: 'Contacting AI composer for master plan...',
      finalPlan: null,
      conditioningString: `Seed: ${seed}`,
      rca: null,
      totalEta: undefined,
      step: 1,
      totalSteps: STAGE_SEQUENCE.length,
      audioUrl: null,
      videoUrls: null,
      prompt: formState.prompt,
      genres: formState.genres,
      duration: formState.duration,
      artists: formState.artists,
      lyrics: formState.lyrics,
      generateVideo: formState.generateVideo,
      videoStyles: formState.videoStyles,
      createdAt: new Date().toISOString(),
      languages: formState.languages,
    };
    setJob(baseJob);
    animateProgress(1, 250);
    setTotalTimeLeft(formatSeconds(undefined));
    setStageTimeLeft(formatSeconds(stageInfoRef.current?.baseline));

    try {
      const payload = {
        musicPrompt: formState.prompt,
        genres: Array.isArray(formState.genres) ? formState.genres : [],
        duration: formState.duration,
        artistInspiration: Array.isArray(formState.artists) ? formState.artists : [],
        lyrics: formState.lyrics || undefined,
        videoStyles: Array.isArray(formState.videoStyles) ? formState.videoStyles : [],
        generateVideo: formState.generateVideo,
        languages: Array.isArray(formState.languages) ? formState.languages : [],
        seed,
      };

    console.info('[MuseWave] Triggering generation with payload', payload);
    const response = await startGeneration(payload, { mode: version });
    console.info('[MuseWave] startGeneration resolved', response);
      const adaptedPlan = adaptPlan(response.plan, formState, seed);

      setJob(prev => prev ? {
        ...prev,
        finalPlan: {
          plan: adaptedPlan,
          conditioningString: `Seed ${seed} | Genres: ${formState.genres.join(', ')}`,
          // backend shape for video_storyboard may vary; coerce to any
          videoStoryboard: (response.plan as any)?.video_storyboard as any,
        },
      } : prev);

      eventSourceRef.current = subscribeToJob(
        response.jobId,
        (event: OrchestratorEvent) => {
          console.info('[MuseWave] Orchestrator event', response.jobId, event);
          if (event.error) {
            setJob(prev => prev ? { 
              ...prev, 
              status: 'error' as JobStatus, 
              message: event.error || 'Generation failed', 
              rca: event.error || 'Unknown error' 
            } : prev);
            toast(event.error, 'error');
            jobStartRef.current = null;
            stageInfoRef.current = null;
            setTotalTimeLeft(formatSeconds(undefined));
            setStageTimeLeft(formatSeconds(undefined));
            return;
          }

          if (event.status === 'error') {
            const message = event.error || 'Generation failed.';
            setJob(prev => prev ? { ...prev, status: 'error', message, rca: message } : prev);
            toast(message, 'error');
            jobStartRef.current = null;
            stageInfoRef.current = null;
            setTotalTimeLeft(formatSeconds(undefined));
            setStageTimeLeft(formatSeconds(undefined));
            return;
          }

          if (event.status === 'complete') {
            fetchJobResult(response.jobId, { mode: version })
              .then(result => {
                console.info('[MuseWave] Job result received', result);
                if (result.error) {
                  setJob(prev => prev ? { 
                    ...prev, 
                    status: 'error' as JobStatus, 
                    message: result.error || 'Generation failed', 
                    rca: result.error || 'Unknown error' 
                  } : prev);
                  toast(result.error, 'error');
                  return;
                }

                // Show quota message if present
                if (result.quotaExceeded || result.quotaMessage) {
                  toast(result.quotaMessage || 'Quota exceeded for this feature. Further generations may be blocked.', 'error');
                }

                const updatedPlan = adaptPlan(result.plan, formState, seed);
                const completedJob: Job = {
                  id: response.jobId,
                  status: 'complete',
                  progress: 100,
                  message: '✅ Song created successfully. Vocals synced. Video generated.',
                  finalPlan: {
                    plan: updatedPlan,
                    conditioningString: `Seed ${seed} | Genres: ${formState.genres.join(', ')}`,
                    videoStoryboard: (result.plan as any)?.video_storyboard as any,
                  },
                  conditioningString: `Seed: ${seed}`,
                  rca: null,
                  totalEta: 0,
                  step: STAGE_SEQUENCE.length,
                  totalSteps: STAGE_SEQUENCE.length,
                  audioUrl: result.audioUrl || null,
                  videoUrls: result.videoUrls || null,
                  prompt: formState.prompt,
                  genres: formState.genres,
                  duration: formState.duration,
                  artists: formState.artists,
                  lyrics: formState.lyrics,
                  generateVideo: formState.generateVideo,
                  videoStyles: formState.videoStyles,
                  createdAt: new Date().toISOString(),
                  languages: formState.languages,
                };
                setJob(completedJob);
                animateProgress(100, 400);
                setTotalTimeLeft(formatSeconds(0));
                setStageTimeLeft(formatSeconds(0));
                jobStartRef.current = null;
                stageInfoRef.current = null;
                saveJobToHistory(completedJob);
                recordGeneration(requiredCategories);
              })
              .catch(error => {
                const message = error instanceof Error ? error.message : 'Failed to fetch job result';
                setJob(prev => prev ? { ...prev, status: 'error', message, rca: message } : prev);
                toast(message, 'error');
                jobStartRef.current = null;
                stageInfoRef.current = null;
                setTotalTimeLeft(formatSeconds(undefined));
                setStageTimeLeft(formatSeconds(undefined));
              })
              .finally(() => {
                if (eventSourceRef.current) {
                  eventSourceRef.current.close();
                  eventSourceRef.current = null;
                }
              });
            return;
          }

          if (!event.status) return;

          const status = (event.status as JobStatus) || 'generating-instruments';
          const stageIndex = STAGE_SEQUENCE.indexOf(status);
          if (stageIndex !== -1) {
            setJob(prev => prev ? {
              ...prev,
              status,
              progress: event.pct ?? prev.progress,
              message: event.label || prev.message,
              step: stageIndex + 1,
              totalSteps: STAGE_SEQUENCE.length,
            } : prev);
          }

          const nextPct =
            event.pct !== undefined && event.pct !== null
              ? Math.max(0, Math.min(99.5, event.pct))
              : Math.min(99, lastProgressRef.current + 3);

          animateProgress(nextPct, 450);
          updateStageTimer(status, event.stageEtaSeconds ?? null);
          updateTotalEta(nextPct, event.etaSeconds ?? null, event.totalEtaSeconds ?? null);
        },
        (err) => {
          console.error('SSE error', err);
          toast('Connection to orchestrator lost. Check backend logs.', 'error');
        },
        { mode: version }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start generation.';
      toast(message, 'error');
      setJob(prev => prev ? { ...prev, status: 'error', message } : prev);
      jobStartRef.current = null;
      stageInfoRef.current = null;
      setTotalTimeLeft(formatSeconds(undefined));
      setStageTimeLeft(formatSeconds(undefined));
    }
  }, [formState, toast, animateProgress, updateStageTimer, updateTotalEta, canStartGeneration, recordGeneration, remaining, version]);

  const handleCancel = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (progressAnimatorRef.current) {
      cancelAnimationFrame(progressAnimatorRef.current);
      progressAnimatorRef.current = null;
    }
    setJob(prev => prev ? { ...prev, status: 'cancelled', message: 'Generation cancelled by user.' } : prev);
    jobStartRef.current = null;
    stageInfoRef.current = null;
    setTotalTimeLeft(formatSeconds(undefined));
    setStageTimeLeft(formatSeconds(undefined));
  };

  const handleReset = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (progressAnimatorRef.current) {
      cancelAnimationFrame(progressAnimatorRef.current);
      progressAnimatorRef.current = null;
    }
    setFormState({ 
      prompt: '', 
      genres: [], 
      duration: 90, 
      artists: [], 
      lyrics: '', 
      languages: [], 
      generateVideo: false, // COST OPTIMIZATION: Always default to audio-only
      videoStyles: ['lyric'] as VideoStyle[] 
    });
    setJob(null);
    setDisplayProgress(0);
    lastProgressRef.current = 0;
    jobStartRef.current = null;
    stageInfoRef.current = null;
    setTotalTimeLeft(formatSeconds(undefined));
    setStageTimeLeft(formatSeconds(undefined));
  };

  const isInProgress = job && !['complete', 'error', 'cancelled'].includes(job.status);

  const PlanOutputViewer = () => {
    const [copied, setCopied] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    if (!job || !job.finalPlan) return null;

    const handleCopy = () => {
      navigator.clipboard.writeText(JSON.stringify(job.finalPlan, null, 2));
      setCopied(true);
      toast('Plan copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div className="bg-secondary/50 backdrop-blur-sm border border-border rounded-lg animate-in fade-in duration-500">
        <div className="p-4 border-b border-border/50 flex justify-between items-center">
          <h3 className="font-semibold">Execution Plan JSON</h3>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleCopy} aria-label="Copy JSON">
              {copied ? <CheckIcon className="h-5 w-5 text-green-400" /> : <ClipboardIcon className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(!isOpen)}>
              {isOpen ? 'Hide' : 'Show'}
            </Button>
          </div>
        </div>
        {isOpen && (
          <div className="max-h-[60vh] overflow-auto bg-black/20">
            <pre className="p-4 text-xs md:text-sm leading-relaxed whitespace-pre-wrap break-words">
              <code>{JSON.stringify(job.finalPlan, null, 2)}</code>
            </pre>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8">
      <div className="w-full max-w-5xl mx-auto space-y-8">
        <PageHeader
          title="MuseForge Pro"
          description="Craft unique, royalty-free electronic music with the power of generative AI."
        />
        <div className="bg-secondary/80 p-6 rounded-lg border border-border shadow-lg">
          <MuseForgeForm
            formState={formState}
            setFormState={setFormState}
            onSubmit={handleGenerate}
            onSuggestion={handleSuggestion}
            isLoading={!!enhancingField || !!(job && !['complete', 'error', 'cancelled'].includes(job.status))}
            enhancingField={enhancingField}
          />

          {job && (
            <div className="mt-8 space-y-4">
              {isInProgress && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="text-left text-sm font-mono text-muted-foreground">
                      <p>{job.step} / {job.totalSteps} Stages</p>
                      <p>Stage ETA: {stageTimeLeft}</p>
                    </div>
                    <div className="flex-1 text-center space-y-1">
                      <h3 className="text-lg font-semibold capitalize">{job.status.replace(/-/g, ' ')}</h3>
                      <p className="text-sm text-muted-foreground">{job.message}</p>
                    </div>
                    <div className="text-right text-sm font-mono text-muted-foreground">
                      <p>Total ETA: {totalTimeLeft}</p>
                    </div>
                  </div>
                  <Progress value={displayProgress} />
                  <div className="pt-2">
                    <Button variant="destructive" onClick={handleCancel}>Cancel Generation</Button>
                  </div>
                </div>
              )}

              {job.status === 'error' && (
                <div className="text-destructive border border-destructive/50 bg-destructive/10 p-4 rounded-md">
                  <h3 className="text-xl font-semibold">An Error Occurred</h3>
                  <p className="text-sm whitespace-pre-wrap my-2">{job.message}</p>
                  {job.rca && <p className="text-xs text-left whitespace-pre-wrap bg-background/20 p-2 rounded-sm"><b>RCA:</b> {job.rca}</p>}
                  <Button variant="outline" onClick={handleReset} className="mt-4">Start Over</Button>
                </div>
              )}

              {job.status === 'complete' && job.finalPlan && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <h2 className="text-2xl font-bold tracking-tight text-center">Your masterpiece is ready!</h2>
                  <MusicPlayer 
                    job={job} 
                    audioUrl={job.audioUrl || null} 
                    videoUrls={job.videoUrls || null} 
                  />
                  {job.finalPlan.plan.lyrics && (
                    <AIAudioTranscript lyrics={job.finalPlan.plan.lyrics} />
                  )}
                  <PlanOutputViewer />
                  <div className="text-center">
                    <Button onClick={handleReset}>Create Another Track</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
