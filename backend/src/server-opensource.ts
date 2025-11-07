/**
 * Fastify Server for MuseForge Pro
 * Open-Source Music Generation Backend
 */

import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCors from '@fastify/cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { handleGeneration } from './api/generate.js';
import { verifyPythonDependencies } from './engines/python.js';
import { verifyFFmpeg } from './engines/ffmpeg.js';
import { env } from './env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create and configure Fastify app
 */
export async function createApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    },
  });

  // CORS
  await app.register(fastifyCors, {
    origin: true,
    credentials: true,
  });

  // Serve static assets
  await app.register(fastifyStatic, {
    root: path.join(process.cwd(), 'public'),
    prefix: '/assets/',
  });

  // Health check
  app.get('/health', async (request, reply) => {
    const pythonDeps = await verifyPythonDependencies();
    const ffmpegStatus = await verifyFFmpeg();
    
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      dependencies: {
        python: {
          riffusion: pythonDeps.riffusion,
          magenta: pythonDeps.magenta,
          coqui: pythonDeps.coqui,
          fluidsynth: pythonDeps.fluidsynth,
        },
        ffmpeg: ffmpegStatus.ffmpeg,
        ffprobe: ffmpegStatus.ffprobe,
      },
    };
  });

  // Main generation endpoint
  app.post('/api/generate', async (request, reply) => {
    try {
      const result = await handleGeneration(request.body);
      return result;
    } catch (error: any) {
      app.log.error(error);
      return reply.status(500).send({
        status: 'error',
        error: error.message,
      });
    }
  });

  return app;
}

/**
 * Start server (for local development)
 */
export async function startServer() {
  const app = await createApp();
  
  try {
    await app.listen({
      port: env.PORT,
      host: '0.0.0.0',
    });
    
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║  🎵  MuseForge Pro - Open Source Music Generation  🎵    ║
║                                                           ║
║  Server running on: http://localhost:${env.PORT}           ║
║                                                           ║
║  Endpoints:                                               ║
║  • GET  /health        - Health check                    ║
║  • POST /api/generate  - Generate music                  ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}
