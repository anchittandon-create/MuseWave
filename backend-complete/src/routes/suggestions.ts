import { FastifyInstance } from 'fastify';
import { z } from 'zod';

const suggestionRequestSchema = z.object({
  field: z.enum(['genres', 'artists', 'languages', 'lyrics']),
  context: z.object({
    prompt: z.string(),
    genres: z.array(z.string()).optional(),
    artists: z.array(z.string()).optional(),
    languages: z.array(z.string()).optional(),
  }),
});

export async function registerSuggestionsRoute(app: FastifyInstance) {
  app.post('/api/suggestions', async (request, reply) => {
    try {
      const body = suggestionRequestSchema.parse(request.body);
      
      // Return mock suggestions for now
      return reply.status(200).send({
        field: body.field,
        suggestions: ['suggestion1', 'suggestion2', 'suggestion3'],
        message: 'AI suggestions (stub implementation)',
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
        error: 'Suggestion generation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}
