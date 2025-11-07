/**
 * WebSocket server for real-time job progress streaming
 * Provides live updates to clients as generation progresses
 */

import { FastifyInstance } from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import { WebSocket } from 'ws';
import { EventEmitter } from 'eventemitter3';
import { logger } from '../utils/logger';
import { metrics } from '../utils/metrics';

export interface ProgressUpdate {
  jobId: string;
  progress: number; // 0-100
  stage: string;
  message?: string;
  timestamp: number;
}

export interface JobCompletedEvent {
  jobId: string;
  success: boolean;
  result?: any;
  error?: string;
  timestamp: number;
}

export class ProgressStreamer extends EventEmitter {
  private connections: Map<string, Set<WebSocket>> = new Map();
  private activeConnections: number = 0;

  /**
   * Register WebSocket routes with Fastify
   */
  async register(fastify: FastifyInstance) {
    await fastify.register(fastifyWebsocket);

    fastify.get('/ws/progress/:jobId', { websocket: true }, (connection, req) => {
      const { jobId } = req.params as { jobId: string };
      this.handleConnection(jobId, connection.socket);
    });

    // Health check endpoint
    fastify.get('/ws/health', async () => {
      return {
        status: 'ok',
        activeConnections: this.activeConnections,
        subscribedJobs: this.connections.size,
      };
    });

    logger.info('WebSocket progress streamer registered');
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(jobId: string, ws: WebSocket) {
    logger.debug({ jobId }, 'WebSocket connection established');

    // Add to connections map
    if (!this.connections.has(jobId)) {
      this.connections.set(jobId, new Set());
    }
    this.connections.get(jobId)!.add(ws);
    this.activeConnections++;

    // Send welcome message
    this.sendToSocket(ws, {
      type: 'connected',
      jobId,
      timestamp: Date.now(),
    });

    // Handle client messages
    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleClientMessage(jobId, ws, message);
      } catch (error) {
        logger.error({ error, data: data.toString() }, 'Invalid message from client');
      }
    });

    // Handle disconnect
    ws.on('close', () => {
      logger.debug({ jobId }, 'WebSocket connection closed');
      this.removeConnection(jobId, ws);
    });

    // Handle errors
    ws.on('error', (error: Error) => {
      logger.error({ jobId, error }, 'WebSocket error');
      this.removeConnection(jobId, ws);
    });

    // Set ping interval to keep connection alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      } else {
        clearInterval(pingInterval);
      }
    }, 30000); // Every 30 seconds

    metrics.httpRequestsTotal.inc({ method: 'WS', path: '/ws/progress', status: '101' });
  }

  /**
   * Handle messages from client
   */
  private handleClientMessage(jobId: string, ws: WebSocket, message: any) {
    switch (message.type) {
      case 'ping':
        this.sendToSocket(ws, { type: 'pong', timestamp: Date.now() });
        break;

      case 'subscribe':
        // Already subscribed, just acknowledge
        this.sendToSocket(ws, {
          type: 'subscribed',
          jobId,
          timestamp: Date.now(),
        });
        break;

      case 'unsubscribe':
        this.removeConnection(jobId, ws);
        ws.close();
        break;

      default:
        logger.warn({ jobId, type: message.type }, 'Unknown message type');
    }
  }

  /**
   * Remove connection from tracking
   */
  private removeConnection(jobId: string, ws: WebSocket) {
    const connections = this.connections.get(jobId);
    if (connections) {
      connections.delete(ws);
      this.activeConnections--;

      if (connections.size === 0) {
        this.connections.delete(jobId);
      }
    }
  }

  /**
   * Send progress update to all subscribers of a job
   */
  sendProgress(update: ProgressUpdate) {
    const connections = this.connections.get(update.jobId);
    
    if (!connections || connections.size === 0) {
      return; // No subscribers
    }

    logger.debug({ jobId: update.jobId, progress: update.progress, stage: update.stage }, 'Broadcasting progress');

    const message = {
      type: 'progress',
      ...update,
    };

    connections.forEach((ws) => {
      this.sendToSocket(ws, message);
    });
  }

  /**
   * Send job completed event
   */
  sendCompleted(event: JobCompletedEvent) {
    const connections = this.connections.get(event.jobId);
    
    if (!connections || connections.size === 0) {
      return;
    }

    logger.info({ jobId: event.jobId, success: event.success }, 'Broadcasting job completion');

    const message = {
      type: event.success ? 'completed' : 'failed',
      ...event,
    };

    connections.forEach((ws) => {
      this.sendToSocket(ws, message);
    });

    // Clean up connections after completion
    setTimeout(() => {
      this.closeJobConnections(event.jobId);
    }, 5000); // Give clients 5 seconds to receive final message
  }

  /**
   * Send error to job subscribers
   */
  sendError(jobId: string, error: string) {
    const connections = this.connections.get(jobId);
    
    if (!connections || connections.size === 0) {
      return;
    }

    logger.error({ jobId, error }, 'Broadcasting error');

    const message = {
      type: 'error',
      jobId,
      error,
      timestamp: Date.now(),
    };

    connections.forEach((ws) => {
      this.sendToSocket(ws, message);
    });
  }

  /**
   * Send message to specific socket
   */
  private sendToSocket(ws: WebSocket, message: any) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        logger.error({ error }, 'Failed to send message to socket');
      }
    }
  }

  /**
   * Close all connections for a job
   */
  private closeJobConnections(jobId: string) {
    const connections = this.connections.get(jobId);
    
    if (!connections) {
      return;
    }

    logger.debug({ jobId, count: connections.size }, 'Closing job connections');

    connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1000, 'Job completed');
      }
    });

    this.connections.delete(jobId);
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      activeConnections: this.activeConnections,
      subscribedJobs: this.connections.size,
      jobSubscriptions: Array.from(this.connections.entries()).map(([jobId, conns]) => ({
        jobId,
        connections: conns.size,
      })),
    };
  }

  /**
   * Shutdown all connections
   */
  async shutdown() {
    logger.info('Shutting down progress streamer');

    for (const [jobId, connections] of this.connections) {
      connections.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close(1001, 'Server shutting down');
        }
      });
    }

    this.connections.clear();
    this.activeConnections = 0;

    logger.info('Progress streamer shutdown complete');
  }
}

// Singleton instance
export const progressStreamer = new ProgressStreamer();

export default progressStreamer;
