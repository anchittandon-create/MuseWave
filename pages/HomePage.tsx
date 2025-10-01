


import React, { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useLocation, useNavigate } from 'react-router-dom';
// FIX: Changed import path to point to .tsx file.
import { useToast } from '../hooks/useToast.tsx';
import type { MusicPlan, AuditResult, Job, JobStatus, VideoStyle, FinalPlan, JobLog } from '../lib/types';
// FIX: Changed import path to point to .tsx file.
import type { WorkerToUIMessage } from '../workers/workerTypes.tsx';

// FIX: Changed import path to point to .tsx file.
import * as geminiService from '../services/geminiService.tsx';
import PageHeader from '../components/PageHeader';
import MuseForgeForm, { FormState, EnhancingField } from '../components/MuseForgeForm';
import Progress from '../components/ui/Progress';
import Button from '../components/ui/Button';
import MusicPlayer from '../components/MusicPlayer';
import AIAudioTranscript from '../components/AIAudioTranscript';

// Icons
const ClipboardIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>
);
const CheckIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
);

const JOB_STEPS: JobStatus[] = [
    'planning',
    'generating-instruments',
    'synthesizing-vocals',
    'mixing-mastering',
    'rendering-video',
    'finalizing'
];

const STATUS_ETAS: Partial<Record<JobStatus, number>> = {
    'planning': 20,
    'generating-instruments': 15,
    'synthesizing-vocals': 10,
    'mixing-mastering': 8,
    'rendering-video': 12,
    'finalizing': 5,
};

const HomePage = () => {
    const [formState, setFormState] = useState<FormState>({
        prompt: '',
        genres: [],
        duration: 90,
        artists: [],
        lyrics: '',
        generateVideo: false,
        videoStyles: ['lyrical'],
    });
    const [job, setJob] = useState<Job | null>(null);
    const [enhancingField, setEnhancingField] = useState<EnhancingField | null>(null);
    
    const [displayProgress, setDisplayProgress] = useState(0);
    const [jobStartTime, setJobStartTime] = useState<number | null>(null);
    const [timeLeft, setTimeLeft] = useState('00:00');

    const progressAnimatorRef = useRef<number | null>(null);
    const timerRef = useRef<number | null>(null);
    const workerRef = useRef<Worker | null>(null);
    const { toast } = useToast();
    const location = useLocation();
    const navigate = useNavigate();

    // Smoothly animates the progress bar
    const animateProgress = useCallback((target: number, duration: number) => {
        if (progressAnimatorRef.current) cancelAnimationFrame(progressAnimatorRef.current);
        const startProgress = displayProgress;
        const startTime = performance.now();

        const frame = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progressFraction = Math.min(elapsed / (duration * 1000), 1);
            const newProgress = startProgress + (target - startProgress) * progressFraction;
            setDisplayProgress(newProgress);

            if (progressFraction < 1) {
                progressAnimatorRef.current = requestAnimationFrame(frame);
            }
        };
        progressAnimatorRef.current = requestAnimationFrame(frame);
    }, [displayProgress]);

    // Effect to handle remixing a job from the dashboard
    useEffect(() => {
        if (location.state && location.state.jobToRemix) {
            const jobToRemix: JobLog = location.state.jobToRemix;
            setFormState({
                prompt: jobToRemix.prompt,
                genres: jobToRemix.genres,
                duration: jobToRemix.duration,
                artists: jobToRemix.artists,
                lyrics: jobToRemix.lyrics,
                generateVideo: jobToRemix.generateVideo,
                videoStyles: jobToRemix.videoStyles,
            });
            toast('Remix loaded! Adjust and create something new.', 'success');
            // Clear state to prevent re-loading on refresh
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location, navigate, toast]);


    // Effect to manage the procedural generation worker
    useEffect(() => {
        workerRef.current = new Worker('./workers/procedural.worker.ts', { type: 'module' });

        workerRef.current.onmessage = (event: MessageEvent<WorkerToUIMessage>) => {
            const { data } = event;
            const activeSteps = JOB_STEPS.filter(step => step !== 'rendering-video' || formState.generateVideo);

            if (data.status === 'progress') {
                setJob(prev => {
                    if (!prev || !prev.totalSteps) return null;
                    const currentStepInfo = activeSteps.indexOf(prev.status);
                    if (currentStepInfo === -1) return prev;
                    
                    const stepStartProgress = (currentStepInfo / prev.totalSteps) * 100;
                    const stepProgressRange = (1 / prev.totalSteps) * 100;
                    const totalProgress = stepStartProgress + (data.progress * stepProgressRange / 100);

                    animateProgress(totalProgress, 1);
                    return { ...prev, message: data.message };
                });
            } else if (data.status === 'switch-step') {
                const nextStepIndex = activeSteps.indexOf(data.nextStatus);
                if (nextStepIndex !== -1) {
                    setJobStep(data.nextStatus, 'Starting next phase...', nextStepIndex + 1, activeSteps.length);
                }
            } else if (data.status === 'complete') {
                 const { audio, videos } = data.results;
                 const audioUrl = URL.createObjectURL(audio);
                 const videoUrls: Partial<Record<VideoStyle, string>> = {};
                 for (const style in videos) {
                     if (Object.prototype.hasOwnProperty.call(videos, style)) {
                          videoUrls[style as VideoStyle] = URL.createObjectURL(videos[style as VideoStyle]!);
                     }
                 }
                 
                 setJob(prev => {
                     if (!prev) return prev;
                     URL.revokeObjectURL(prev.audioUrl || '');
                     Object.values(prev.videoUrls || {}).forEach(URL.revokeObjectURL);

                     const finalJob: Job = {
                         ...prev,
                         status: 'complete',
                         message: '✅ Song created successfully. Vocals synced. Video generated.',
                         progress: 100,
                         audioUrl,
                         videoUrls,
                     };
                     
                     // Log job to local storage
                     try {
                         const history: JobLog[] = JSON.parse(localStorage.getItem('museforge_job_history') || '[]');
                         history.unshift(finalJob);
                         localStorage.setItem('museforge_job_history', JSON.stringify(history.slice(0, 50))); // Limit history size
                     } catch (e) {
                         console.error("Failed to save job history:", e);
                     }

                     return finalJob;
                 });
                 animateProgress(100, 0.5);
                 setJobStartTime(null);
             } else if (data.status === 'error') {
                  setJob(prev => ({...prev!, status: 'error', message: data.message, rca: data.message}));
                  setJobStartTime(null);
            }
        };

        const currentWorker = workerRef.current;

        return () => {
            currentWorker.terminate();
        };
    }, [animateProgress, formState.generateVideo]);


    // Effect for the ETA countdown timer
    useEffect(() => {
        if (jobStartTime && job?.totalEta && !['complete', 'error', 'cancelled'].includes(job.status)) {
            timerRef.current = window.setInterval(() => {
                const elapsedSeconds = Math.floor((Date.now() - jobStartTime) / 1000);
                const remainingSeconds = Math.max(0, job.totalEta! - elapsedSeconds);
                const m = Math.floor(remainingSeconds / 60);
                const s = remainingSeconds % 60;
                setTimeLeft(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [jobStartTime, job?.status, job?.totalEta]);

    const cleanup = useCallback(() => {
        if (job) {
             URL.revokeObjectURL(job.audioUrl || '');
             Object.values(job.videoUrls || {}).forEach(URL.revokeObjectURL);
        }
        setJob(null);
        if (progressAnimatorRef.current) cancelAnimationFrame(progressAnimatorRef.current);
        if (timerRef.current) clearInterval(timerRef.current);
        setJobStartTime(null);
    }, [job]);

    useEffect(() => {
        return () => cleanup();
    }, [cleanup]);

    const setJobStep = useCallback((status: JobStatus, message: string, step: number, totalSteps: number) => {
        const progressTarget = (step / totalSteps) * 100;
        const prevProgressTarget = ((step - 1) / totalSteps) * 100;

        setJob(prev => ({
            ...prev!,
            status,
            message,
            step,
            totalSteps,
            progress: prevProgressTarget,
        }));
        
        const duration = STATUS_ETAS[status] || 5;
        animateProgress(progressTarget, duration);
    }, [animateProgress]);
    
    const handleSuggestion = useCallback(async (field: EnhancingField) => {
        if (!field) return;
        setEnhancingField(field);
        try {
            let result;
            const context = { ...formState };
            switch(field) {
                case 'prompt': result = await geminiService.enhancePrompt(context); break;
                case 'genres': result = await geminiService.suggestGenres(context); break;
                case 'artists': result = await geminiService.suggestArtists(context); break;
                case 'lyrics': result = await geminiService.enhanceLyrics(context); break;
            }
            if (result) {
                setFormState(prev => ({...prev, ...result}));
                toast(`${field.charAt(0).toUpperCase() + field.slice(1)} enhanced!`, 'success');
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message : `Failed to enhance ${field}.`;
            toast(msg, 'error');
        } finally {
            setEnhancingField(null);
        }
    }, [formState, toast]);
    
    const handleGenerate = useCallback(async () => {
        const activeSteps = JOB_STEPS.filter(step => step !== 'rendering-video' || formState.generateVideo);
        const totalSteps = activeSteps.length;
        const totalEta = activeSteps.reduce((acc, step) => acc + (STATUS_ETAS[step] || 0), 0);
        const creativitySeed = Math.floor(Math.random() * 999999) + 1;
        
        const newJob: Job = {
            id: uuidv4(),
            status: 'idle',
            progress: 0,
            message: 'Starting job...',
            finalPlan: null,
            conditioningString: `Seed: ${creativitySeed}`,
            rca: null,
            totalEta,
            step: 0,
            totalSteps,
            createdAt: new Date().toISOString(),
            ...formState
        };
        setJob(newJob);
        setDisplayProgress(0);
        setJobStartTime(Date.now());

        try {
            // --- AI PLANNING PHASE ---
            setJobStep('planning', 'Contacting AI composer for master plan...', 1, totalSteps);
            let plan: MusicPlan | null = null;
            let audit: AuditResult | null = null;
            
            for (let i = 0; i < 3; i++) {
                if (job?.status === 'cancelled') throw new Error("Generation cancelled by user.");
                
                const tempPlan = await geminiService.generateMusicPlan(formState, creativitySeed);
                audit = await geminiService.auditMusicPlan(tempPlan, formState);

                if (audit.passed) {
                    plan = tempPlan;
                    toast('AI plan audit passed!', 'success');
                    break;
                } else {
                    toast(`AI audit failed: ${audit.feedback}. Retrying...`, 'error');
                    setJob(prev => ({...prev!, rca: audit.feedback }));
                    if (i < 2) await new Promise(res => setTimeout(res, 1000));
                }
            }

            if (!plan || !audit?.passed) {
                throw new Error(job?.rca || "Failed to create a valid music plan after multiple attempts.");
            }
            
            let finalPlan: FinalPlan;
             const conditioningString = `Trance anthem ${formState.genres.join(', ')} at ${formState.duration}s. Inspired by ${formState.artists.join(', ')}. Prompt: ${formState.prompt}. Seed: ${creativitySeed}`;

            if (formState.generateVideo) {
                const creativeAssets = await geminiService.generateCreativeAssets(plan, formState.videoStyles, formState.lyrics);
                finalPlan = { plan, lyricsAlignment: creativeAssets.lyricsAlignment, conditioningString, videoStoryboard: creativeAssets.videoStoryboard };
            } else {
                finalPlan = { plan, conditioningString };
            }
            
            setJob(prev => ({ ...prev!, finalPlan }));

            // --- MEDIA GENERATION PHASE ---
            const nextStepIndex = 1; // Index of generating-instruments
            setJobStep(activeSteps[nextStepIndex], 'Initializing media generation...', nextStepIndex + 1, totalSteps);

            workerRef.current?.postMessage({
                command: 'start-procedural',
                musicPlan: JSON.stringify(finalPlan.plan),
                videoStyles: formState.generateVideo ? formState.videoStyles : []
            });

        } catch (error) {
             const msg = error instanceof Error ? error.message : 'An unknown error occurred.';
             setJob(prev => {
                if (!prev || prev.status === 'cancelled') return prev;
                return {...prev, status: 'error', message: msg, rca: prev.rca || msg };
             });
             setJobStartTime(null);
        }
    }, [formState, setJobStep, toast, job?.status]);

    const handleCancel = useCallback(() => {
         setJob(prev => prev ? {...prev, status: 'cancelled', message: 'Cancelling...'} : null);
         cleanup();
         handleReset();
    }, [cleanup]);

    const handleReset = useCallback(() => {
        cleanup();
        setFormState({ prompt: '', genres: [], duration: 90, artists: [], lyrics: '', generateVideo: false, videoStyles: ['lyrical'] });
    }, [cleanup]);

    const isLoading = job && !['complete', 'error', 'cancelled'].includes(job.status);

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
                    <div>
                         <Button variant="ghost" size="icon" onClick={handleCopy} aria-label="Copy JSON">
                            {copied ? <CheckIcon className="h-5 w-5 text-green-400" /> : <ClipboardIcon className="h-5 w-5" />}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setIsOpen(!isOpen)}>
                            {isOpen ? 'Hide' : 'Show'}
                        </Button>
                    </div>
                </div>
                {isOpen && (
                    <pre className="p-4 text-xs overflow-x-auto bg-black/20 rounded-b-lg max-h-96">
                        <code>{JSON.stringify(job.finalPlan, null, 2)}</code>
                    </pre>
                )}
            </div>
        );
    };

    return (
        <div className="flex-1 flex flex-col p-4 md:p-8 space-y-8">
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
                    isLoading={!!isLoading || !!enhancingField}
                    enhancingField={enhancingField}
                />
                
                {job && job.status !== 'idle' && (
                    <div className="mt-8 space-y-4">
                        {isLoading && (
                            <div className="text-center space-y-2 animate-in fade-in duration-300">
                                <div className="flex justify-between items-baseline">
                                    <h3 className="text-lg font-semibold capitalize text-left">{job.status.replace(/-/g, ' ')}...</h3>
                                    {job.step > 0 && job.totalSteps > 0 && (
                                         <p className="text-sm text-muted-foreground font-mono">
                                            Step {job.step} of {job.totalSteps}
                                        </p>
                                    )}
                                </div>
                                <Progress value={displayProgress} />
                                <div className="flex justify-between items-center text-sm">
                                    <p className="text-muted-foreground text-left">{job.message}</p>
                                    <p className="text-muted-foreground font-mono">
                                        ETA: {timeLeft}
                                    </p>
                                </div>
                                <div className="pt-4">
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
                                
                                <MusicPlayer job={job} audioUrl={job.audioUrl} videoUrls={job.videoUrls} />
                                
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
    );
};

export default HomePage;