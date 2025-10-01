import type { VideoStyle, JobStatus } from '../lib/types';

export type UIToWorkerMessage =
  | { command: 'start-procedural'; musicPlan: string; videoStyles: VideoStyle[]; }
  | { command: 'cancel' };

export type WorkerToUIMessage =
  | { status: 'progress'; progress: number; message: string }
  | { status: 'complete'; results: { audio: Blob, videos: Partial<Record<VideoStyle, Blob>> } }
  | { status: 'error'; message: string }
  | { status: 'switch-step'; nextStatus: JobStatus };