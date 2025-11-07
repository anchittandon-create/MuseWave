/**
 * Integration tests for production queue system
 */

import { productionQueue } from '../../src/queue/productionQueue';
import type { GenerationJobData } from '../../src/types';

describe('Production Queue Integration', () => {
  const testJobData: GenerationJobData = {
    musicPrompt: 'Epic orchestral music with soaring strings',
    genres: ['orchestral', 'epic'],
    durationSec: 30,
    videoStyle: 'waveform',
  };

  afterAll(async () => {
    await productionQueue.shutdown();
  });

  it('should add job to queue', async () => {
    const job = await productionQueue.addJob(testJobData);

    expect(job).toBeDefined();
    expect(job.id).toBeDefined();
    expect(job.data).toEqual(testJobData);
  });

  it('should get job status', async () => {
    const job = await productionQueue.addJob(testJobData);

    const status = await productionQueue.getJobStatus(job.id!);

    expect(status).toBeDefined();
    expect(status.state).toBeDefined();
    expect(['waiting', 'active', 'completed', 'failed']).toContain(status.state);
  });

  it('should get queue stats', async () => {
    const stats = await productionQueue.getStats();

    expect(stats).toBeDefined();
    expect(typeof stats.waiting).toBe('number');
    expect(typeof stats.active).toBe('number');
    expect(typeof stats.completed).toBe('number');
    expect(typeof stats.failed).toBe('number');
  });

  it('should cancel job', async () => {
    const job = await productionQueue.addJob(testJobData, { delay: 60000 });

    await productionQueue.cancelJob(job.id!);

    await expect(productionQueue.getJobStatus(job.id!)).rejects.toThrow();
  });

  it('should handle job priority', async () => {
    const lowPriorityJob = await productionQueue.addJob(testJobData, { priority: 10 });
    const highPriorityJob = await productionQueue.addJob(testJobData, { priority: 1 });

    expect(lowPriorityJob.opts?.priority).toBe(10);
    expect(highPriorityJob.opts?.priority).toBe(1);
  });

  it('should clean old jobs', async () => {
    await productionQueue.cleanJobs(0); // Clean all immediately

    // Should not throw
    expect(true).toBe(true);
  });
});
