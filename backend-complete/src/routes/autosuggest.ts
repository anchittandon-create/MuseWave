import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { generateAutosuggestions } from '../services/autosuggestion.js';

const SuggestRequestSchema = z.object({
  field: z.enum(['genres', 'artistInspiration', 'vocalLanguages']),
  input: z.string().min(0).max(100),
  context: z.object({
    musicPrompt: z.string().optional(),
    genres: z.array(z.string()).optional(),
    artistInspiration: z.array(z.string()).optional(),
    vocalLanguages: z.array(z.string()).optional(),
    lyrics: z.string().optional(),
  }).optional(),
});

type SuggestRequest = z.infer<typeof SuggestRequestSchema>;

export async function registerAutosuggestRoute(app: FastifyInstance) {
  app.post<{ Body: SuggestRequest }>('/api/suggest', async (request, reply) => {
    try {
      // Validate request
      const body = SuggestRequestSchema.parse(request.body);
      
      const { field, input, context = {} } = body;
      
      // Generate AI-powered suggestions
      const suggestions = await generateAutosuggestions(field, input, context);
      
      return {
        field,
        input,
        suggestions,
        cached: false,
        timestamp: new Date().toISOString(),
      };
      
    } catch (error: any) {
      app.log.error({ error }, 'Autosuggestion failed');
      
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Invalid request',
          details: error.errors,
        });
      }
      
      return reply.status(500).send({
        error: 'Suggestion generation failed',
        message: error.message,
        suggestions: [], // Return empty array as fallback
      });
    }
  });
}
