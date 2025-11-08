import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { createJob, updateJob } from '../utils/jobs.js';
import { planFromInput } from '../music/planner.js';
import { buildInstrumental, mixStems, renderVideo, synthesizeVocals } from '../engines/dsp.js';
import { runCoqui, runMagenta, runRiffusion } from '../engines/python.js';
import { mkAssetDir } from '../utils/files.js';
import { copyFile } from 'fs/promises';
import { join } from 'path';
import { recordGeneration } from '../db.js';

const BodySchema = z.object({
  musicPrompt: z.string(),
  genres: z.array(z.string()).default([]),
  duration: z.number().int().min(30).max(180).optional(),
  artistInspiration: z.array(z.string()).optional(),
  lyrics: z.string().optional(),
  languages: z.array(z.string()).optional(),
  generateVideo: z.boolean().optional(),
  videoStyles: z.array(z.enum(['Lyric Video', 'Official Music Video', 'Abstract Visualizer'])).optional(),
  seed: z.number().optional(),
});

export function registerPipelineRoute(app: FastifyInstance) {
  // Start generation job
  app.post('/api/generate/pipeline', async (req, reply) => {
    const parsed = BodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', detail: parsed.error.flatten() });
    }
    const body = parsed.data;
    
    const jobId = randomUUID();
    const plan = planFromInput({
      musicPrompt: body.musicPrompt,
      genres: body.genres,
      durationSec: body.duration || 90
    });
    
    // Create job immediately
    createJob(jobId);
    
    // Start async generation
    generateMusic(jobId, body, plan).catch(err => {
      console.error(`[Job ${jobId}] Generation failed:`, err);
      updateJob(jobId, {
        status: 'failed',
        progress: 0,
        error: err.message || 'Generation failed',
        message: 'Generation failed'
      });
    });
    
    // Return job ID immediately
    return reply.send({ jobId, plan });
  });
}

async function generateMusic(jobId: string, body: z.infer<typeof BodySchema>, plan: any) {
  const durationSec = body.duration || 90;
  
  try {
    // Update to processing
    updateJob(jobId, {
      status: 'processing',
      progress: 5,
      currentStage: 'planning',
      message: 'Planning your track...'
    });
    
    const { dir, prefix } = await mkAssetDir();
    const stems: string[] = [];
    
    // Generate instrumental (20-40%)
    updateJob(jobId, {
      progress: 20,
      currentStage: 'generating-instruments',
      message: 'Generating instrumental...'
    });
    
    let instrumental = await runRiffusion(body.musicPrompt, durationSec);
    if (!instrumental) {
      instrumental = await buildInstrumental(durationSec);
    }
    stems.push(instrumental);
    
    // Generate melody (40-60%)
    updateJob(jobId, {
      progress: 40,
      currentStage: 'generating-instruments',
      message: 'Adding melodic layers...'
    });
    
    const magenta = await runMagenta(durationSec);
    if (magenta) {
      stems.push(magenta);
    }
    
    // Generate vocals (60-75%)
    let vocalPath: string | null = null;
    let captions: string | null = null;
    if (body.lyrics) {
      updateJob(jobId, {
        progress: 60,
        currentStage: 'synthesizing-vocals',
        message: 'Synthesizing vocals...'
      });
      
      const coqui = await runCoqui(body.lyrics, body.languages?.[0]);
      if (coqui) {
        stems.push(coqui);
        vocalPath = coqui;
      } else {
        const fallback = await synthesizeVocals(body.lyrics, durationSec);
        stems.push(fallback.wav);
        vocalPath = fallback.wav;
        captions = fallback.captions;
      }
    }
    
    // Mixing (75-85%)
    updateJob(jobId, {
      progress: 75,
      currentStage: 'mixing-mastering',
      message: 'Mixing and mastering...'
    });
    
    if (stems.length === 1) {
      stems.push(await buildInstrumental(durationSec));
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
    
    // Video generation (85-100%)
    let videoUrl: string | undefined;
    const videoUrls: Record<string, string> = {};
    
    if (body.generateVideo && body.videoStyles && body.videoStyles.length > 0) {
      const totalStyles = body.videoStyles.length;
      
      for (let i = 0; i < totalStyles; i++) {
        const style: string = body.videoStyles[i];
        const progressStart = 85 + (i / totalStyles) * 10;
        const progressEnd = 85 + ((i + 1) / totalStyles) * 10;
        
        updateJob(jobId, {
          progress: Math.floor(progressStart),
          currentStage: 'rendering-video',
          message: `Rendering video (${i + 1}/${totalStyles}): ${style}...`
        });
        
        const styleSafe = style.toLowerCase().replace(/\s+/g, '-');
        const videoDst = join(dir, `${styleSafe}.mp4`);
        await renderVideo(style, mixDst, captions, videoDst);
        videoUrls[styleSafe] = `${prefix}/${styleSafe}.mp4`;
        
        if (i === 0) {
          videoUrl = videoUrls[styleSafe];
        }
      }
    }
    
    // Finalizing (95-100%)
    updateJob(jobId, {
      progress: 95,
      currentStage: 'finalizing',
      message: 'Finalizing output...'
    });
    
    // Record to database
    const genId = randomUUID();
    recordGeneration({
      id: genId,
      payload: body as any,
      bpm: plan.bpm,
      song_key: plan.key,
      mix_url: prefix + '/mix.wav',
      instrumental_url: prefix + '/instrumental.wav',
      vocals_url: vocalsUrl || null,
      video_url: videoUrl || null,
      engines: {
        music: 'dsp',
        melody: magenta ? 'magenta' : 'none',
        vocals: body.lyrics ? 'dsp' : 'none',
        video: body.generateVideo ? 'ffmpeg' : 'none'
      },
      created_at: new Date().toISOString()
    });
    
    // Mark as complete
    updateJob(jobId, {
      status: 'succeeded',
      progress: 100,
      currentStage: 'complete',
      message: 'Complete! 🎉',
      result: {
        audio: prefix + '/mix.wav',
        videos: Object.keys(videoUrls).length > 0 ? videoUrls : undefined,
        plan: {
          ...plan,
          id: genId
        }
      }
    });
    
  } catch (error) {
    console.error(`[Job ${jobId}] Error:`, error);
    updateJob(jobId, {
      status: 'failed',
      progress: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Generation failed'
    });
  }
}
