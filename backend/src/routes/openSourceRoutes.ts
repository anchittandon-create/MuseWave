/**
 * API Routes for Open-Source Music Generation
 * Vercel-compatible serverless functions
 */
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { openSourceOrchestrator, OpenSourceRequest } from '../services/openSourceOrchestrator';
import { logger } from '../logger.js';

// Request validation schema
const GenerateRequestSchema = z.object({
  musicPrompt: z.string().min(1).max(1000),
  genres: z.array(z.string()).min(1).max(5),
  durationSec: z.number().int().min(10).max(300),
  artistInspiration: z.array(z.string()).optional(),
  lyrics: z.string().max(5000).optional(),
  vocalLanguages: z.array(z.string()).optional(),
  generateVideo: z.boolean().optional().default(false),
  videoStyles: z.array(z.string()).optional()
});

export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;

/**
 * POST /api/generate-opensource
 * Generate music using open-source models
 */
export async function registerOpenSourceRoutes(fastify: FastifyInstance) {
  
  fastify.post('/api/generate-opensource', async (
    request: FastifyRequest<{ Body: GenerateRequest }>,
    reply: FastifyReply
  ) => {
    try {
      // Validate request
      const validated = GenerateRequestSchema.parse(request.body);

      logger.info({ request: validated }, 'Starting open-source generation');

      // Generate
      const result = await openSourceOrchestrator.generate(validated);

      // Return response
      return reply.code(result.success ? 200 : 500).send(result);

    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn({ errors: error.errors }, 'Validation error');
        return reply.code(400).send({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
      }

      logger.error({ error }, 'Generation endpoint error');
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/capabilities
   * Check which models are available
   */
  fastify.get('/api/capabilities', async (request, reply) => {
    try {
      const { openSourceBridge } = await import('../services/openSourceBridge');
      const capabilities = await openSourceBridge.detectCapabilities();

      return reply.send({
        success: true,
        capabilities,
        models: {
          riffusion: {
            available: capabilities.riffusion,
            description: 'Text-to-music diffusion model',
            license: 'MIT'
          },
          magenta: {
            available: capabilities.magenta,
            description: 'MIDI melody generation',
            license: 'Apache 2.0'
          },
          coquiTTS: {
            available: capabilities.coquiTTS,
            description: 'Text-to-speech synthesis',
            license: 'MPL 2.0'
          },
          fluidSynth: {
            available: capabilities.fluidSynth,
            description: 'MIDI to audio synthesis',
            license: 'LGPL'
          },
          ffmpeg: {
            available: capabilities.ffmpeg,
            description: 'Audio mixing and video generation',
            license: 'GPL/LGPL'
          }
        }
      });
    } catch (error) {
      logger.error({ error }, 'Capabilities check failed');
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/health
   * Health check endpoint
   */
  fastify.get('/api/health', async (request, reply) => {
    return reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });
}
