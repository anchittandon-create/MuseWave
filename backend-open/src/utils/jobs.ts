/**
 * In-memory job store for async generation tracking
 * For production, replace with Redis or database
 */

export type JobStatus = 'queued' | 'processing' | 'succeeded' | 'failed';

export interface Job {
  id: string;
  status: JobStatus;
  progress: number;
  message: string;
  currentStage?: string;
  result?: {
    audio?: string;
    video?: string;
    videos?: Record<string, string>;
    plan?: any;
  };
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

const jobs = new Map<string, Job>();

export function createJob(id: string): Job {
  const job: Job = {
    id,
    status: 'queued',
    progress: 0,
    message: 'Queued for processing...',
    createdAt: new Date(),
  };
  jobs.set(id, job);
  return job;
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

export function updateJob(id: string, updates: Partial<Job>): Job | undefined {
  const job = jobs.get(id);
  if (!job) return undefined;
  
  Object.assign(job, updates);
  if (updates.status === 'succeeded' || updates.status === 'failed') {
    job.completedAt = new Date();
  }
  
  jobs.set(id, job);
  return job;
}

export function deleteJob(id: string): boolean {
  return jobs.delete(id);
}

// Clean up old jobs after 1 hour
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [id, job] of jobs.entries()) {
    if (job.completedAt && job.completedAt.getTime() < oneHourAgo) {
      jobs.delete(id);
    }
  }
}, 15 * 60 * 1000); // Run every 15 minutes
