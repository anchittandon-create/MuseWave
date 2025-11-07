/**
 * Production health monitoring and metrics endpoints
 */

import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { register } from 'prom-client';
import { logger } from '../utils/logger';

export const healthRoute: FastifyPluginAsync = async (app) => {
  /**
   * Liveness probe - is server running?
   */
  app.get('/health/live', async () => {
    return { status: 'ok', timestamp: Date.now() };
  });

  /**
   * Readiness probe - is server ready to accept traffic?
   */
  app.get('/health/ready', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Check database
      await app.prisma.$queryRaw`SELECT 1`;
      
      return {
        status: 'ready',
        timestamp: Date.now(),
        services: {
          database: 'up',
          ffmpeg: app.ffmpeg.available ? 'available' : 'unavailable',
        },
      };
    } catch (error) {
      reply.code(503);
      return {
        status: 'not ready',
        timestamp: Date.now(),
        services: {
          database: 'down',
          ffmpeg: app.ffmpeg.available ? 'available' : 'unavailable',
        },
      };
    }
  });

  /**
   * Detailed health check with all services
   */
  app.get('/health', async (request, reply) => {
    const checks: any = {
      status: 'healthy',
      timestamp: Date.now(),
      uptime: process.uptime(),
      services: {},
      system: {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
      },
    };

    // Check database
    try {
      await app.prisma.$queryRaw`SELECT 1`;
      checks.services.database = { status: 'up' };
    } catch (error) {
      checks.services.database = { status: 'down', error: String(error) };
      checks.status = 'unhealthy';
      reply.code(503);
    }

    // Check ffmpeg
    checks.services.ffmpeg = {
      status: app.ffmpeg.available ? 'available' : 'unavailable',
    };

    // Check queue if available
    if (app.queue) {
      try {
        const queueStats = await app.queue.getJobCounts();
        checks.services.queue = {
          status: 'ok',
          stats: queueStats,
        };
      } catch (error) {
        checks.services.queue = { status: 'error', error: String(error) };
        checks.status = 'degraded';
      }
    }

    return checks;
  });

  /**
   * Prometheus metrics endpoint
   */
  app.get('/metrics', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.header('Content-Type', register.contentType);
    return register.metrics();
  });

  /**
   * System info endpoint
   */
  app.get('/health/system', async () => {
    return {
      status: 'ok',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      platform: process.platform,
      nodeVersion: process.version,
      env: process.env.NODE_ENV || 'development',
      timestamp: Date.now(),
    };
  });

  logger.info('Health and metrics routes registered');
};
