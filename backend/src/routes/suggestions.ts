import { FastifyPluginAsync } from 'fastify';
import {
  enhancePrompt,
  suggestGenres,
  suggestArtists,
  suggestLanguages,
  suggestInstruments,
  enhanceLyrics,
  generateMusicPlan,
  auditMusicPlan,
  generateCreativeAssets,
} from '../services/geminiService';

export const suggestionRoute: FastifyPluginAsync = async (app) => {
  app.post('/enhance-prompt', async (request, reply) => {
    try {
      const payload = (request.body as any)?.context ?? request.body;
      const result = await enhancePrompt(payload);
      reply.send(result);
    } catch (error) {
      reply.code(500).send({ error: (error as Error).message });
    }
  });

  app.post('/suggest-genres', async (request, reply) => {
    try {
      const payload = (request.body as any)?.context ?? request.body;
      const result = await suggestGenres(payload);
      reply.send(result);
    } catch (error) {
      reply.code(500).send({ error: (error as Error).message });
    }
  });

  app.post('/suggest-artists', async (request, reply) => {
    try {
      const payload = (request.body as any)?.context ?? request.body;
      const result = await suggestArtists(payload);
      reply.send(result);
    } catch (error) {
      reply.code(500).send({ error: (error as Error).message });
    }
  });

  app.post('/suggest-languages', async (request, reply) => {
    try {
      const payload = (request.body as any)?.context ?? request.body;
      const result = await suggestLanguages(payload);
      reply.send(result);
    } catch (error) {
      reply.code(500).send({ error: (error as Error).message });
    }
  });

  app.post('/suggest-instruments', async (request, reply) => {
    try {
      const payload = (request.body as any)?.context ?? request.body;
      const result = await suggestInstruments(payload);
      reply.send(result);
    } catch (error) {
      reply.code(500).send({ error: (error as Error).message });
    }
  });

  app.post('/enhance-lyrics', async (request, reply) => {
    try {
      const payload = (request.body as any)?.context ?? request.body;
      const result = await enhanceLyrics(payload);
      reply.send(result);
    } catch (error) {
      reply.code(500).send({ error: (error as Error).message });
    }
  });

  app.post('/generate-music-plan', async (request, reply) => {
    try {
      const body = request.body as any;
      const payload = body?.context ?? body;
      const seed =
        typeof body?.creativitySeed === 'number' ? body.creativitySeed : Date.now() % 1_000_000;
      const plan = await generateMusicPlan(payload, seed);
      reply.send({ plan });
    } catch (error) {
      reply.code(500).send({ error: (error as Error).message });
    }
  });

  app.post('/audit-music-plan', async (request, reply) => {
    try {
      const body = request.body as any;
      if (!body?.plan) {
        return reply.code(400).send({ error: 'plan is required' });
      }
      const originalRequest = body?.originalRequest ?? {};
      const result = await auditMusicPlan(body.plan, originalRequest);
      reply.send(result);
    } catch (error) {
      reply.code(500).send({ error: (error as Error).message });
    }
  });

  app.post('/generate-creative-assets', async (request, reply) => {
    try {
      const body = request.body as any;
      if (!body?.musicPlan) {
        return reply.code(400).send({ error: 'musicPlan is required' });
      }
      const videoStyles = Array.isArray(body?.videoStyles) ? body.videoStyles : [];
      const lyrics = typeof body?.lyrics === 'string' ? body.lyrics : '';
      const result = await generateCreativeAssets(body.musicPlan, videoStyles, lyrics);
      reply.send(result);
    } catch (error) {
      reply.code(500).send({ error: (error as Error).message });
    }
  });
};
