/**
 * Main API handler for music generation using cloud AI services
 * Optimized for minimum cost while maintaining quality
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { join } from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { 
  generateMusic, 
  generateLyrics, 
  generateVocals,
  enhancePrompt,
  analyzeMusicMetadata 
} from '../services/cloudAI.js';
import { downloadFile, mixAudioFiles, createVideoVisualization } from '../utils/media.js';
import { getAssetUrl } from '../utils/files.js';

// Request validation schema
const GenerateRequestSchema = z.object({
  musicPrompt: z.string().min(5).max(500),
  genres: z.array(z.string()).min(1).max(5),
  durationSec: z.number().min(30).max(120),
  artistInspiration: z.array(z.string()).max(5).optional(),
  lyrics: z.string().max(2000).optional(),
  generateLyrics: z.boolean().optional().default(false),
  vocalLanguages: z.array(z.string()).max(3).optional().default(['en']),
  generateVideo: z.boolean().optional().default(false),
  videoStyles: z.array(z.enum(['Lyric Video', 'Official Music Video', 'Abstract Visualizer'])).optional(),
});

type GenerateRequest = z.infer<typeof GenerateRequestSchema>;

export async function generateHandler(req: FastifyRequest, reply: FastifyReply) {
  const debug: string[] = [];
  const startTime = Date.now();

  try {
    // 1. Validate input
    const input = GenerateRequestSchema.parse(req.body);
    debug.push(`✓ Input validated (${input.durationSec}s ${input.genres.join(', ')})`);

    // 2. Create asset directory
    const generationId = uuidv4();
    const timestamp = new Date();
    const year = timestamp.getFullYear();
    const month = String(timestamp.getMonth() + 1).padStart(2, '0');
    
    const assetDir = join(process.cwd(), 'public', 'assets', String(year), month, generationId);
    await mkdir(assetDir, { recursive: true });
    debug.push(`✓ Created asset directory: ${generationId}`);

    // 3. Enhance prompt with AI (FREE - Gemini)
    let enhancedPrompt = input.musicPrompt;
    try {
      enhancedPrompt = await enhancePrompt(input.musicPrompt, input.genres);
      debug.push(`✓ Enhanced prompt with Gemini`);
    } catch (error: any) {
      debug.push(`⚠ Prompt enhancement failed: ${error.message}`);
    }

    // 4. Analyze metadata (FREE - Gemini)
    const metadata = await analyzeMusicMetadata({
      prompt: enhancedPrompt,
      genres: input.genres,
    });
    debug.push(`✓ Analyzed: ${metadata.bpm} BPM, ${metadata.key}`);

    // 5. Generate instrumental music (PAID - ~$0.02 for 60s)
    debug.push(`⏳ Generating music with Replicate...`);
    const musicResult = await generateMusic({
      prompt: enhancedPrompt,
      duration: input.durationSec,
      genres: input.genres,
      artistInspiration: input.artistInspiration,
    });
    debug.push(`✓ Music generated: ${musicResult.audioUrl}`);

    // 6. Download instrumental
    const instrumentalPath = join(assetDir, 'instrumental.wav');
    await downloadFile(musicResult.audioUrl, instrumentalPath);
    const instrumentalUrl = getAssetUrl(instrumentalPath);
    debug.push(`✓ Downloaded instrumental`);

    let vocalsPath: string | undefined;
    let vocalsUrl: string | undefined;
    let lyricsText = input.lyrics;

    // 7. Generate lyrics if requested (FREE - Gemini)
    if (input.generateLyrics && !lyricsText) {
      try {
        lyricsText = await generateLyrics({
          theme: input.musicPrompt,
          genre: input.genres[0],
          duration: input.durationSec,
          languages: input.vocalLanguages || ['English'],
        });
        debug.push(`✓ Generated lyrics with Gemini in ${input.vocalLanguages?.[0] || 'English'}`);
      } catch (error: any) {
        debug.push(`⚠ Lyrics generation failed: ${error.message}`);
      }
    }

    // 8. Generate vocals (PAID - ~$0.01-0.02 per song)
    if (lyricsText) {
      try {
        debug.push(`⏳ Generating vocals with OpenAI TTS...`);
        const vocalsBuffer = await generateVocals({
          text: lyricsText,
          language: input.vocalLanguages[0] || 'en',
          style: 'singing',
        });
        
        vocalsPath = join(assetDir, 'vocals.mp3');
        await writeFile(vocalsPath, vocalsBuffer);
        vocalsUrl = getAssetUrl(vocalsPath);
        debug.push(`✓ Vocals generated`);
      } catch (error: any) {
        debug.push(`⚠ Vocals generation failed: ${error.message}`);
      }
    }

    // 9. Mix audio (instrumental + vocals if present)
    const mixPath = join(assetDir, 'mix.wav');
    if (vocalsPath) {
      await mixAudioFiles([instrumentalPath, vocalsPath], mixPath);
      debug.push(`✓ Mixed instrumental + vocals`);
    } else {
      // Just copy instrumental as mix
      await writeFile(mixPath, await readFile(instrumentalPath));
      debug.push(`✓ Mix created (instrumental only)`);
    }
    const mixUrl = getAssetUrl(mixPath);

    // 10. Generate video visualization (optional, FREE - FFmpeg)
    let videoUrl: string | undefined;
    if (input.generateVideo) {
      try {
        const videoStyle = input.videoStyles?.[0] || 'Abstract Visualizer';
        const videoPath = join(assetDir, 'video.mp4');
        
        await createVideoVisualization({
          audioPath: mixPath,
          outputPath: videoPath,
          style: videoStyle,
          lyrics: lyricsText,
          duration: input.durationSec,
        });
        
        videoUrl = getAssetUrl(videoPath);
        debug.push(`✓ Video created: ${videoStyle}`);
      } catch (error: any) {
        debug.push(`⚠ Video generation failed: ${error.message}`);
      }
    }

    // 11. Calculate costs (approximate)
    const costs = {
      music: input.durationSec * 0.0003, // ~$0.02 per 60s
      vocals: lyricsText ? (lyricsText.length * 0.000015) : 0, // $15/1M chars
      lyrics: 0, // FREE (Gemini)
      enhancement: 0, // FREE (Gemini)
      total: 0,
    };
    costs.total = costs.music + costs.vocals;
    debug.push(`💰 Estimated cost: $${costs.total.toFixed(4)}`);

    const elapsed = Date.now() - startTime;
    debug.push(`⏱ Total time: ${(elapsed / 1000).toFixed(1)}s`);

    // 12. Return response
    return reply.send({
      success: true,
      generationId,
      bpm: metadata.bpm,
      key: metadata.key,
      scale: metadata.scale,
      assets: {
        instrumentalUrl,
        vocalsUrl,
        mixUrl,
        videoUrl,
        lyrics: lyricsText,
      },
      engines: {
        music: 'replicate-riffusion',
        lyrics: input.generateLyrics ? 'gemini-flash-8b' : 'user-provided',
        vocals: vocalsUrl ? 'openai-tts-1' : 'none',
        video: videoUrl ? 'ffmpeg' : 'none',
        enhancement: 'gemini-flash-8b',
      },
      costs,
      debug,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    debug.push(`❌ Fatal error: ${error.message}`);
    
    return reply.code(500).send({
      success: false,
      error: error.message,
      debug,
    });
  }
}

import { readFile } from 'fs/promises';
