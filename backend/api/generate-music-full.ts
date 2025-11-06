import { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { planService } from '../src/services/planService';
import { audioService } from '../src/services/audioService';
import { videoService } from '../src/services/videoService';
import { storageService } from '../src/services/storageService';
import { stat, unlink } from 'fs/promises';

const prisma = new PrismaClient();

const generateSchema = z.object({
  musicPrompt: z.string().min(1),
  genres: z.array(z.string()).min(1),
  durationSec: z.number().int().min(30).max(120),
  artistInspiration: z.array(z.string()).optional(),
  lyrics: z.string().optional(),
  vocalLanguages: z.array(z.string()).optional(),
  generateVideo: z.boolean().default(false),
  videoStyles: z.array(z.enum(["Lyric Video", "Official Music Video", "Abstract Visualizer"])).optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate input
    const body = generateSchema.parse(req.body);

    // Generate plan
    const plan = await planService.generatePlan(
      body.musicPrompt,
      body.durationSec,
      body.genres,
      body.artistInspiration
    );

    // Generate audio
    const tempAudioPath = `/tmp/audio_${Date.now()}.wav`;
    await audioService.generateAudio(
      plan,
      body.durationSec,
      tempAudioPath,
      body.lyrics,
      body.vocalLanguages
    );

    // Store audio
    const audioUpload = await storageService.storeFile(tempAudioPath, 'wav');
    const audioStats = await stat(audioUpload.filePath);
    await unlink(tempAudioPath).catch(() => {});

    // Create job record
    const job = await prisma.job.create({
      data: {
        status: 'completed',
        prompt: body.musicPrompt,
        duration: body.durationSec,
        includeVideo: body.generateVideo,
        genres: body.genres,
        artistInspiration: body.artistInspiration || [],
        lyrics: body.lyrics,
        vocalLanguages: body.vocalLanguages || [],
        videoStyles: body.videoStyles || [],
        plan: JSON.stringify(plan),
      },
    });

    // Create audio asset
    const audioAsset = await prisma.asset.create({
      data: {
        jobId: job.id,
        type: 'audio',
        url: audioUpload.url,
        path: audioUpload.filePath,
        size: audioStats.size,
      },
    });
    const audioUrl = `/api/assets/${audioAsset.id}`;

    const result: any = {
      bpm: plan.bpm,
      key: plan.key,
      scale: plan.key.toLowerCase().includes('minor') ? 'minor' : 'major',
      assets: {
        previewUrl: audioUrl,
        mixUrl: audioUrl,
      },
      debug: { mode: 'cli', duration: body.durationSec },
    };

    // Generate video if requested
    if (body.generateVideo) {
      const tempVideoPath = `/tmp/video_${Date.now()}.mp4`;
      await videoService.generateVideo(
        tempAudioPath,
        plan,
        tempVideoPath,
        body.videoStyles,
        body.lyrics
      );

      const videoUpload = await storageService.storeFile(tempVideoPath, 'mp4');
      const videoStats = await stat(videoUpload.filePath);
      await unlink(tempVideoPath).catch(() => {});

      const videoAsset = await prisma.asset.create({
        data: {
          jobId: job.id,
          type: 'video',
          url: videoUpload.url,
          path: videoUpload.filePath,
          size: videoStats.size,
        },
      });

      result.assets.videoUrl = `/api/assets/${videoAsset.id}`;
    }

    // Update job result
    await prisma.job.update({
      where: { id: job.id },
      data: { result: JSON.stringify(result) },
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Generation error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }

    return res.status(500).json({ 
      error: 'Generation failed', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
