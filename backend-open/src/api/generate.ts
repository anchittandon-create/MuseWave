import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { z } from 'zod';
import { planFromInput } from '../music/planner.js';
import { buildInstrumental, mixStems, renderVideo, synthesizeVocals } from '../engines/dsp.js';
import { runCoqui, runMagenta, runRiffusion } from '../engines/python.js';
import { mkAssetDir } from '../utils/files.js';
import { copyFile } from 'fs/promises';
import { getDb } from '../db.js';

const BodySchema = z.object({
  musicPrompt: z.string(),
  genres: z.array(z.string()).default([]),
  durationSec: z.number().int().min(30).max(120),
  artistInspiration: z.array(z.string()).optional(),
  lyrics: z.string().optional(),
  vocalLanguages: z.array(z.string()).optional(),
  generateVideo: z.boolean().optional(),
  videoStyles: z.array(z.enum(['Lyric Video', 'Official Music Video', 'Abstract Visualizer'])).optional()
});

export function registerGenerateRoute(app: FastifyInstance) {
  app.post('/api/generate', async (req, reply) => {
    const parsed = BodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', detail: parsed.error.flatten() });
    }
    const body = parsed.data;
    const plan = planFromInput({
      musicPrompt: body.musicPrompt,
      genres: body.genres,
      durationSec: body.durationSec
    });

    const { dir, prefix } = await mkAssetDir();
    const debug: string[] = [];
    const stems: string[] = [];
    const engine = {
      music: 'dsp',
      melody: 'none',
      vocals: 'none',
      video: body.generateVideo ? 'ffmpeg' : 'none'
    } as const;

    let instrumental = await runRiffusion(body.musicPrompt, body.durationSec);
    let musicEngine: 'riffusion' | 'dsp' = 'dsp';
    if (instrumental) {
      musicEngine = 'riffusion';
      debug.push('riffusion texture added');
    } else {
      instrumental = await buildInstrumental(body.durationSec);
      debug.push('riffusion missing; DSP instrumental synthesized');
    }
    stems.push(instrumental);

    const magenta = await runMagenta(body.durationSec);
    if (magenta) {
      stems.push(magenta);
      debug.push('magenta melody layered');
      engine.melody = 'magenta';
    }

    let vocalPath: string | null = null;
    let captions: string | null = null;
    if (body.lyrics) {
      const coqui = await runCoqui(body.lyrics, body.vocalLanguages?.[0]);
      if (coqui) {
        stems.push(coqui);
        vocalPath = coqui;
        engine.vocals = 'coqui';
        debug.push('coqui vocals synthesized');
      } else {
        const fallback = await synthesizeVocals(body.lyrics, body.durationSec);
        stems.push(fallback.wav);
        vocalPath = fallback.wav;
        captions = fallback.captions;
        engine.vocals = 'dsp';
        debug.push('coqui unavailable; DSP vocals rendered');
      }
    }

    if (stems.length === 1) {
      stems.push(await buildInstrumental(body.durationSec));
    }

    const instrumentalDst = join(dir, 'instrumental.wav');
    await copyFile(instrumental, instrumentalDst);
    const mixDst = join(dir, 'mix.wav');
    await mixStems(stems, mixDst);

    let vocalsUrl: string | undefined;
    if (vocalPath) {
      const vocalsDst = join(dir, 'vocals.wav');
      await copyFile(vocalPath, vocalsDst);
      vocalsUrl = prefix + '/vocals.wav';
    }

    let videoUrl: string | undefined;
    if (body.generateVideo) {
      const style = body.videoStyles?.[0] || 'Official Music Video';
      const videoDst = join(dir, 'final.mp4');
      await renderVideo(style, mixDst, captions, videoDst);
      videoUrl = prefix + '/final.mp4';
    }

    const response = {
      id: randomUUID(),
      bpm: plan.bpm,
      key: plan.key,
      scale: plan.scale,
      assets: {
        instrumentalUrl: prefix + '/instrumental.wav',
        mixUrl: prefix + '/mix.wav',
        videoUrl,
        vocalsUrl
      },
      engine: {
        music: musicEngine,
        melody: engine.melody,
        vocals: engine.vocals,
        video: engine.video
      },
      debug
    };

    getDb()
      .prepare(
        `INSERT INTO generations (id, payload, bpm, song_key, mix_url, instrumental_url, vocals_url, video_url, engines)
         VALUES (@id, @payload, @bpm, @song_key, @mix_url, @instrumental_url, @vocals_url, @video_url, @engines)`
      )
      .run({
        id: response.id,
        payload: JSON.stringify(body),
        bpm: response.bpm,
        song_key: response.key,
        mix_url: response.assets.mixUrl,
        instrumental_url: response.assets.instrumentalUrl,
        vocals_url: vocalsUrl || null,
        video_url: videoUrl || null,
        engines: JSON.stringify(response.engine)
      });

    return reply.send(response);
  });
}
