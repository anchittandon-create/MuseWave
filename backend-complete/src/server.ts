import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { join } from 'path';
import { env } from './config/env.js';
import { initDatabase } from './database/db.js';
import { registerGenerateRoute } from './routes/generate.js';
import { registerSuggestionsRoute } from './routes/suggestions.js';
import { registerDashboardRoute } from './routes/dashboard.js';
import { registerAssetsRoute } from './routes/assets.js';
import { registerAutosuggestRoute } from './routes/autosuggest.js';
import { verifyPythonDependencies } from './services/python-bridge.js';

const app = Fastify({
  logger: {
    level: env.LOG_LEVEL,
    transport: env.LOG_PRETTY && env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  },
});

/**
 * Initialize server
 */
async function start() {
  try {
    // CORS
    await app.register(cors, {
      origin: true,
      credentials: true,
    });

    // Static assets
    await app.register(fastifyStatic, {
      root: join(process.cwd(), 'public'),
      prefix: '/',
    });

    // Initialize database
    await initDatabase();

    // Health check
    app.get('/health', async () => {
      const deps = await verifyPythonDependencies();
      return {
        status: 'ok',
        version: '2.0.0',
        environment: env.NODE_ENV,
        dependencies: deps,
        timestamp: new Date().toISOString(),
      };
    });

    // Register routes
    await registerGenerateRoute(app);
    await registerSuggestionsRoute(app);
    await registerDashboardRoute(app);
    await registerAssetsRoute(app);
    await registerAutosuggestRoute(app);

    // Start server
    const port = env.PORT;
    const host = env.HOST;

    if (env.VERCEL) {
      // Vercel serverless export
      module.exports = async (req: any, res: any) => {
        await app.ready();
        app.server.emit('request', req, res);
      };
    } else {
      // Local server
      await app.listen({ port, host });
      app.log.info(`🎵 MuseForge Pro Backend running on http://${host}:${port}`);
      app.log.info(`📊 Dashboard: http://${host}:${port}/api/dashboard/stats`);
      app.log.info(`🎹 Generate: POST http://${host}:${port}/api/generate`);
    }
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
