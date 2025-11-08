import { FastifyInstance } from 'fastify';

export async function registerAssetsRoute(app: FastifyInstance) {
  app.get('/api/assets/:jobId', async (request, reply) => {
    const { jobId } = request.params as { jobId: string };
    
    return reply.status(200).send({
      jobId,
      audioUrl: null,
      videoUrl: null,
      message: 'Assets endpoint (stub implementation)',
    });
  });
}
