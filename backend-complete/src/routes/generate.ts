import { FastifyInstance } from 'fastify';
import { z } from 'zod';

const generateRequestSchema = z.object({
  prompt: z.string().min(10).max(1000),
  duration: z.number().min(30).max(300).default(90),
  genres: z.array(z.string()).optional(),
  artists: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  lyrics: z.string().optional(),
  videoStyle: z.string().optional(),
});

export async function registerGenerateRoute(app: FastifyInstance) {
  app.post('/api/generate', async (request, reply) => {
    try {
      const body = generateRequestSchema.parse(request.body);
      
      // Return mock response for now
      return reply.status(200).send({
        jobId: `job_${Date.now()}`,
        status: 'queued',
        message: 'Generation started (stub implementation)',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: error.errors,
        });
      }
      
      app.log.error(error);
      return reply.status(500).send({
        error: 'Generation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}
