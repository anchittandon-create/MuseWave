/**
 * Production-Grade Queue System with BullMQ
 * Features:
 * - Job prioritization
 * - Retry logic with exponential backoff
 * - Progress tracking
 * - Dead letter queue
 * - Rate limiting
 * - Metrics collection
 */

import { Queue, Worker, Job, QueueEvents, ConnectionOptions } from 'bullmq';
import { Redis } from 'ioredis';
import { logger } from '../utils/logger';
import { metrics } from '../utils/metrics';
import { CircuitBreaker } from '../utils/circuitBreaker';
import type { GenerationJobData, GenerationJobResult } from '../types';

const connection: ConnectionOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

export class ProductionQueueSystem {
  private queue: Queue<GenerationJobData, GenerationJobResult>;
  private worker: Worker<GenerationJobData, GenerationJobResult>;
  private queueEvents: QueueEvents;
  private dlq: Queue; // Dead Letter Queue
  private redis: Redis;
  private circuitBreaker: CircuitBreaker;

  constructor() {
    this.redis = new Redis(connection);
    
    // Main job queue
    this.queue = new Queue('music-generation', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000, // Start with 2s delay
        },
        removeOnComplete: {
          age: 3600, // Keep completed jobs for 1 hour
          count: 1000, // Keep last 1000 completed jobs
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // Keep failed jobs for 7 days
        },
      },
    });

    // Dead Letter Queue for permanently failed jobs
    this.dlq = new Queue('music-generation-dlq', { connection });

    // Queue events for monitoring
    this.queueEvents = new QueueEvents('music-generation', { connection });

    // Circuit breaker for external services
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 300000, // 5 minutes
      resetTimeout: 60000, // 1 minute
    });

    this.setupWorker();
    this.setupEventListeners();
    this.setupMetrics();
  }

  /**
   * Setup worker with concurrency and rate limiting
   */
  private setupWorker() {
    const concurrency = parseInt(process.env.WORKER_CONCURRENCY || '2');

    this.worker = new Worker<GenerationJobData, GenerationJobResult>(
      'music-generation',
      async (job: Job<GenerationJobData>) => {
        return await this.circuitBreaker.execute(() => this.processJob(job));
      },
      {
        connection,
        concurrency,
        limiter: {
          max: 10, // Max 10 jobs
          duration: 1000, // per second
        },
        lockDuration: 600000, // 10 minutes lock
        stalledInterval: 30000, // Check for stalled jobs every 30s
      }
    );

    logger.info({ concurrency }, 'Worker initialized');
  }

  /**
   * Setup comprehensive event listeners
   */
  private setupEventListeners() {
    // Job lifecycle events
    this.queueEvents.on('completed', ({ jobId, returnvalue }) => {
      logger.info({ jobId, result: returnvalue }, 'Job completed successfully');
      metrics.jobCompleted.inc();
      metrics.jobDuration.observe(returnvalue.metadata?.durationMs || 0);
    });

    this.queueEvents.on('failed', async ({ jobId, failedReason }) => {
      logger.error({ jobId, error: failedReason }, 'Job failed');
      metrics.jobFailed.inc();

      // Move to DLQ if max attempts reached
      const job = await this.queue.getJob(jobId);
      if (job && job.attemptsMade >= (job.opts.attempts || 3)) {
        await this.dlq.add('failed-job', {
          originalJobId: jobId,
          data: job.data,
          error: failedReason,
          timestamp: Date.now(),
        });
        logger.warn({ jobId }, 'Job moved to DLQ');
      }
    });

    this.queueEvents.on('progress', ({ jobId, data }) => {
      logger.debug({ jobId, progress: data }, 'Job progress update');
      metrics.jobProgress.set(data.progress || 0);
    });

    this.queueEvents.on('stalled', ({ jobId }) => {
      logger.warn({ jobId }, 'Job stalled');
      metrics.jobStalled.inc();
    });

    this.queueEvents.on('retrying', ({ jobId, attemptsMade }) => {
      logger.info({ jobId, attemptsMade }, 'Job retrying');
      metrics.jobRetried.inc();
    });

    // Worker events
    this.worker.on('error', (error) => {
      logger.error({ error }, 'Worker error');
      metrics.workerErrors.inc();
    });

    this.worker.on('stalled', (jobId) => {
      logger.warn({ jobId }, 'Worker detected stalled job');
    });
  }

  /**
   * Setup Prometheus metrics
   */
  private setupMetrics() {
    // Update queue metrics periodically
    setInterval(async () => {
      try {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
          this.queue.getWaitingCount(),
          this.queue.getActiveCount(),
          this.queue.getCompletedCount(),
          this.queue.getFailedCount(),
          this.queue.getDelayedCount(),
        ]);

        metrics.queueWaiting.set(waiting);
        metrics.queueActive.set(active);
        metrics.queueCompleted.set(completed);
        metrics.queueFailed.set(failed);
        metrics.queueDelayed.set(delayed);
      } catch (error) {
        logger.error({ error }, 'Failed to update queue metrics');
      }
    }, 5000); // Every 5 seconds
  }

  /**
   * Process individual job with comprehensive error handling
   */
  private async processJob(job: Job<GenerationJobData>): Promise<GenerationJobResult> {
    const startTime = Date.now();
    
    logger.info({ jobId: job.id, data: job.data }, 'Processing job');

    try {
      // Update progress: 10% - Starting
      await job.updateProgress({ progress: 10, stage: 'initializing' });

      // Import orchestrator dynamically to avoid circular deps
      const { openSourceOrchestrator } = await import('../services/openSourceOrchestrator');

      // Check cache first
      const cached = await this.checkCache(job.data);
      if (cached) {
        logger.info({ jobId: job.id }, 'Cache hit');
        metrics.cacheHits.inc();
        return cached;
      }
      metrics.cacheMisses.inc();

      // Update progress: 20% - Plan generation
      await job.updateProgress({ progress: 20, stage: 'generating-plan' });

      // Generate music
      const result = await openSourceOrchestrator.generate(job.data, {
        onProgress: async (progress: number, stage: string) => {
          await job.updateProgress({ progress: 20 + progress * 0.7, stage });
        },
      });

      if (!result.success) {
        throw new Error(result.error || 'Generation failed');
      }

      // Update progress: 90% - Finalizing
      await job.updateProgress({ progress: 90, stage: 'finalizing' });

      // Validate output
      await this.validateOutput(result);

      // Cache result
      await this.cacheResult(job.data, result);

      // Update progress: 100% - Complete
      await job.updateProgress({ progress: 100, stage: 'complete' });

      const duration = Date.now() - startTime;
      logger.info({ jobId: job.id, duration }, 'Job completed');

      return {
        ...result,
        metadata: {
          ...result.metadata,
          durationMs: duration,
          cached: false,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error({ jobId: job.id, error, duration }, 'Job failed');
      
      throw error; // Let BullMQ handle retry logic
    }
  }

  /**
   * Check cache for existing result
   */
  private async checkCache(data: GenerationJobData): Promise<GenerationJobResult | null> {
    try {
      const cacheKey = this.getCacheKey(data);
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }
      
      return null;
    } catch (error) {
      logger.error({ error }, 'Cache check failed');
      return null;
    }
  }

  /**
   * Cache generation result
   */
  private async cacheResult(data: GenerationJobData, result: GenerationJobResult): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(data);
      const ttl = 3600; // 1 hour
      
      await this.redis.setex(cacheKey, ttl, JSON.stringify(result));
      
      logger.debug({ cacheKey }, 'Result cached');
    } catch (error) {
      logger.error({ error }, 'Failed to cache result');
    }
  }

  /**
   * Generate cache key from job data
   */
  private getCacheKey(data: GenerationJobData): string {
    const normalized = {
      prompt: data.musicPrompt.toLowerCase().trim(),
      genres: data.genres.sort(),
      duration: data.durationSec,
      lyrics: data.lyrics?.toLowerCase().trim(),
    };
    
    return `generation:${Buffer.from(JSON.stringify(normalized)).toString('base64')}`;
  }

  /**
   * Validate output files exist and are valid
   */
  private async validateOutput(result: GenerationJobResult): Promise<void> {
    const fs = await import('fs-extra');
    const path = await import('path');

    // Check audio file
    if (result.assets.mixUrl) {
      const audioPath = path.join(process.cwd(), 'public', result.assets.mixUrl);
      
      if (!await fs.pathExists(audioPath)) {
        throw new Error(`Audio file not found: ${audioPath}`);
      }

      const stats = await fs.stat(audioPath);
      if (stats.size < 1000) {
        throw new Error(`Audio file too small: ${stats.size} bytes`);
      }
    }

    // Check video file if generated
    if (result.assets.videoUrl) {
      const videoPath = path.join(process.cwd(), 'public', result.assets.videoUrl);
      
      if (!await fs.pathExists(videoPath)) {
        throw new Error(`Video file not found: ${videoPath}`);
      }

      const stats = await fs.stat(videoPath);
      if (stats.size < 1000) {
        throw new Error(`Video file too small: ${stats.size} bytes`);
      }
    }
  }

  /**
   * Add job to queue with priority
   */
  async addJob(
    data: GenerationJobData,
    options: {
      priority?: number;
      delay?: number;
      userId?: string;
    } = {}
  ): Promise<Job<GenerationJobData>> {
    const jobId = `gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const job = await this.queue.add('generate', data, {
      jobId,
      priority: options.priority || 0, // Lower number = higher priority
      delay: options.delay || 0,
      ...this.queue.opts.defaultJobOptions,
    });

    logger.info({ jobId, userId: options.userId }, 'Job added to queue');
    metrics.jobEnqueued.inc();

    return job;
  }

  /**
   * Get job status with progress
   */
  async getJobStatus(jobId: string): Promise<{
    state: string;
    progress: any;
    result?: GenerationJobResult;
    error?: string;
  }> {
    const job = await this.queue.getJob(jobId);

    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    const state = await job.getState();
    const progress = job.progress;
    const result = job.returnvalue;
    const failedReason = job.failedReason;

    return {
      state,
      progress,
      result,
      error: failedReason,
    };
  }

  /**
   * Cancel job
   */
  async cancelJob(jobId: string): Promise<void> {
    const job = await this.queue.getJob(jobId);

    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    await job.remove();
    logger.info({ jobId }, 'Job cancelled');
  }

  /**
   * Get queue statistics
   */
  async getStats() {
    const [waiting, active, completed, failed, delayed, dlqCount] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
      this.dlq.getWaitingCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      dlq: dlqCount,
      workers: this.worker.concurrency,
    };
  }

  /**
   * Clean old jobs
   */
  async cleanJobs(age: number = 24 * 3600 * 1000) {
    const counts = await Promise.all([
      this.queue.clean(age, 100, 'completed'),
      this.queue.clean(age * 7, 100, 'failed'), // Keep failed longer
    ]);

    logger.info({ completed: counts[0], failed: counts[1] }, 'Jobs cleaned');
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    logger.info('Shutting down queue system');

    await this.worker.close();
    await this.queue.close();
    await this.queueEvents.close();
    await this.dlq.close();
    await this.redis.quit();

    logger.info('Queue system shutdown complete');
  }
}

// Singleton instance
export const productionQueue = new ProductionQueueSystem();
