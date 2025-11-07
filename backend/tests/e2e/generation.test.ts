/**
 * End-to-end test for full generation pipeline
 */

import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server';

describe('Full Generation Pipeline E2E', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should handle full generation flow', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/generate',
      payload: {
        musicPrompt: 'Upbeat electronic dance music',
        genres: ['electronic', 'dance'],
        durationSec: 30,
        videoStyle: 'spectrum',
      },
    });

    expect(response.statusCode).toBe(200);
    
    const body = JSON.parse(response.body);
    expect(body.jobId).toBeDefined();
    expect(body.status).toBe('QUEUED');
  }, 30000);

  it('should reject invalid requests', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/generate',
      payload: {
        // Missing required fields
        genres: ['rock'],
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should return job status', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/generate',
      payload: {
        musicPrompt: 'Calm ambient music',
        genres: ['ambient'],
        durationSec: 20,
      },
    });

    const { jobId } = JSON.parse(createResponse.body);

    const statusResponse = await app.inject({
      method: 'GET',
      url: `/api/jobs/${jobId}`,
    });

    expect(statusResponse.statusCode).toBe(200);
    
    const status = JSON.parse(statusResponse.body);
    expect(status.jobId).toBe(jobId);
    expect(status.state).toBeDefined();
  });

  it('should handle health checks', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    
    const health = JSON.parse(response.body);
    expect(health.status).toBeDefined();
    expect(health.services).toBeDefined();
  });

  it('should return metrics', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/metrics',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/plain');
    expect(response.body).toContain('musewave_');
  });
});
