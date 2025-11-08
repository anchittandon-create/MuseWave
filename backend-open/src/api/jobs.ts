import { FastifyInstance } from 'fastify';
import { getJob } from '../utils/jobs.js';

export function registerJobsRoute(app: FastifyInstance) {
  app.get('/api/jobs/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const job = getJob(id);
    
    if (!job) {
      return reply.status(404).send({ error: 'Job not found' });
    }
    
    // Return job status in format expected by frontend
    return reply.send({
      id: job.id,
      status: job.status,
      progress: job.progress,
      message: job.message,
      currentStage: job.currentStage,
      error: job.error,
      // Result URLs when complete
      audioUrl: job.result?.audio,
      videoUrls: job.result?.videos,
      result: job.result
    });
  });
}
