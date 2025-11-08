import { FastifyInstance } from 'fastify';

export async function registerDashboardRoute(app: FastifyInstance) {
  app.get('/api/dashboard/stats', async (request, reply) => {
    return reply.status(200).send({
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      queuedJobs: 0,
      message: 'Dashboard stats (stub implementation)',
    });
  });
  
  app.get('/api/dashboard/jobs', async (request, reply) => {
    return reply.status(200).send({
      jobs: [],
      total: 0,
      message: 'Job list (stub implementation)',
    });
  });
}
