/**
 * Music Generation API Handler
 * Complete pipeline from request to final music + video output
 */

import { z } from 'zod';
import path from 'path';
import fs from 'fs-extra';
import { generateMusicPlan } from '../music/planner.js';
import { generateAISuggestions } from '../utils/aiSuggest.js';
import { createAssetDirectory, getPublicUrl } from '../utils/files.js';
import {
  generateRiffusion,
  generateMagentaMelody,
  renderMidiWithFluidSynth,
  generateCoquiVocals,
} from '../engines/python.js';
import {
  mixAudioFiles,
  createSpectrumVideo,
  createWaveformVideo,
  createLyricVideo,
  getAudioDuration,
} from '../engines/ffmpeg.js';
import { generateSRT } from '../video/captions.js';

// Input validation schema
const generateRequestSchema = z.object({
  musicPrompt: z.string().optional(),
  genres: z.array(z.string()).optional().default([]),
  durationSec: z.number().int().positive().max(300).optional().default(90),
  artistInspiration: z.array(z.string()).optional().default([]),
  lyrics: z.string().optional(),
  vocalLanguages: z.array(z.string()).optional().default(['English']),
  generateVideo: z.boolean().optional().default(true),
  videoStyles: z.array(z.string()).optional().default([]),
});

export type GenerateRequest = z.infer<typeof generateRequestSchema>;

export interface GenerateResponse {
  bpm: number;
  key: string;
  scale: string;
  assets: {
    instrumentalUrl?: string;
    vocalsUrl?: string;
    mixUrl?: string;
    videoUrl?: string;
  };
  aiSuggestions: {
    genres: string[];
    artistInspiration: string[];
    lyrics: string;
    vocalLanguages: string[];
    videoStyles: string[];
    musicPrompt?: string;
  };
  engines: {
    music: string;
    melody: string;
    vocals: string;
    video: string;
  };
  status: 'success' | 'error';
  error?: string;
  debug?: string[];
}

/**
 * Main generation handler
 */
export async function handleGeneration(input: unknown): Promise<GenerateResponse> {
  const debugLogs: string[] = [];
  
  try {
    // 1️⃣ VALIDATE INPUT
    debugLogs.push('Validating input...');
    const validatedInput = generateRequestSchema.parse(input);
    
    // 2️⃣ GENERATE AI SUGGESTIONS FOR EMPTY FIELDS
    debugLogs.push('Generating AI suggestions...');
    const suggestions = generateAISuggestions({
      musicPrompt: validatedInput.musicPrompt,
      genres: validatedInput.genres.length > 0 ? validatedInput.genres : undefined,
      artistInspiration: validatedInput.artistInspiration.length > 0 ? validatedInput.artistInspiration : undefined,
      lyrics: validatedInput.lyrics,
      vocalLanguages: validatedInput.vocalLanguages,
      videoStyles: validatedInput.videoStyles.length > 0 ? validatedInput.videoStyles : undefined,
      durationSec: validatedInput.durationSec,
    });
    
    // Merge suggestions with input
    const genres = validatedInput.genres.length > 0 ? validatedInput.genres : suggestions.genres;
    const artistInspiration = validatedInput.artistInspiration.length > 0 ? validatedInput.artistInspiration : suggestions.artistInspiration;
    const musicPrompt = validatedInput.musicPrompt || suggestions.musicPrompt || 'Ambient electronic soundscape';
    const lyrics = validatedInput.lyrics || suggestions.lyrics;
    const vocalLanguages = validatedInput.vocalLanguages;
    const videoStyles = validatedInput.videoStyles.length > 0 ? validatedInput.videoStyles : suggestions.videoStyles;
    
    debugLogs.push(`Genres: ${genres.join(', ')}`);
    debugLogs.push(`Artists: ${artistInspiration.join(', ')}`);
    debugLogs.push(`Prompt: ${musicPrompt}`);
    
    // 3️⃣ PLAN MUSIC (BPM, KEY, SCALE)
    debugLogs.push('Planning music structure...');
    const musicPlan = generateMusicPlan({
      genres,
      artistInspiration,
      musicPrompt,
    });
    
    debugLogs.push(`BPM: ${musicPlan.bpm}, Key: ${musicPlan.key}, Scale: ${musicPlan.scale}`);
    
    // 4️⃣ CREATE ASSET DIRECTORY
    debugLogs.push('Creating asset directory...');
    const { dirPath, relativePath, id } = await createAssetDirectory();
    debugLogs.push(`Asset dir: ${dirPath}`);
    
    // Define output paths
    const riffusionPath = path.join(dirPath, 'riffusion.wav');
    const midiDir = path.join(dirPath, 'midi');
    const midiPath = path.join(midiDir, 'out.mid');
    const midiWavPath = path.join(dirPath, 'midi.wav');
    const vocalsPath = path.join(dirPath, 'vocals.wav');
    const instrumentalPath = path.join(dirPath, 'instrumental.wav');
    const mixPath = path.join(dirPath, 'mix.wav');
    const videoPath = path.join(dirPath, 'final.mp4');
    const srtPath = path.join(dirPath, 'captions.srt');
    
    // 5️⃣ GENERATE MELODY (MAGENTA)
    debugLogs.push('Generating MIDI melody with Magenta...');
    const magentaResult = await generateMagentaMelody(midiDir, {
      duration: validatedInput.durationSec,
      numOutputs: 1,
    });
    
    if (!magentaResult.success) {
      debugLogs.push(`⚠️  Magenta failed: ${magentaResult.error}`);
    } else {
      debugLogs.push('✅ Magenta melody generated');
      
      // 6️⃣ RENDER MIDI TO WAV (FLUIDSYNTH)
      debugLogs.push('Rendering MIDI to WAV with FluidSynth...');
      const fluidResult = await renderMidiWithFluidSynth(
        magentaResult.outputPath || midiPath,
        midiWavPath
      );
      
      if (!fluidResult.success) {
        debugLogs.push(`⚠️  FluidSynth failed: ${fluidResult.error}`);
      } else {
        debugLogs.push('✅ MIDI rendered to WAV');
      }
    }
    
    // 7️⃣ GENERATE TEXTURE (RIFFUSION)
    debugLogs.push('Generating audio texture with Riffusion...');
    const riffusionResult = await generateRiffusion(musicPrompt, riffusionPath, {
      duration: validatedInput.durationSec,
    });
    
    if (!riffusionResult.success) {
      throw new Error(`Riffusion failed: ${riffusionResult.error}`);
    }
    debugLogs.push('✅ Riffusion audio generated');
    
    // 8️⃣ MIX INSTRUMENTAL LAYERS
    debugLogs.push('Mixing instrumental layers...');
    const instrumentalInputs: string[] = [riffusionPath];
    
    if (await fs.pathExists(midiWavPath)) {
      instrumentalInputs.push(midiWavPath);
    }
    
    const instrumentalResult = await mixAudioFiles(
      instrumentalInputs,
      instrumentalPath,
      { normalize: true, loudness: -14 }
    );
    
    if (!instrumentalResult.success) {
      throw new Error(`Instrumental mixing failed: ${instrumentalResult.error}`);
    }
    debugLogs.push('✅ Instrumental mix complete');
    
    // 9️⃣ GENERATE VOCALS (COQUI TTS) - Optional
    let hasVocals = false;
    if (lyrics && lyrics.trim().length > 0) {
      debugLogs.push('Generating vocals with Coqui TTS...');
      const vocalsResult = await generateCoquiVocals(lyrics, vocalsPath, {
        language: vocalLanguages[0],
      });
      
      if (!vocalsResult.success) {
        debugLogs.push(`⚠️  Vocals failed: ${vocalsResult.error}`);
      } else {
        debugLogs.push('✅ Vocals generated');
        hasVocals = true;
      }
    }
    
    // 🔟 FINAL MIXDOWN
    debugLogs.push('Creating final mix...');
    const mixInputs: string[] = [instrumentalPath];
    
    if (hasVocals && await fs.pathExists(vocalsPath)) {
      mixInputs.push(vocalsPath);
    }
    
    const mixResult = await mixAudioFiles(
      mixInputs,
      mixPath,
      { normalize: true, loudness: -14 }
    );
    
    if (!mixResult.success) {
      throw new Error(`Final mix failed: ${mixResult.error}`);
    }
    debugLogs.push('✅ Final mix complete');
    
    // 1️⃣1️⃣ GENERATE VIDEO (OPTIONAL)
    let hasVideo = false;
    if (validatedInput.generateVideo) {
      debugLogs.push('Generating video...');
      
      const videoStyle = videoStyles[0] || 'Abstract Visualizer';
      
      // Determine video type
      if (videoStyle.toLowerCase().includes('lyric') && lyrics) {
        // Lyric video
        debugLogs.push('Creating lyric video...');
        const audioDuration = await getAudioDuration(mixPath);
        const srtContent = generateSRT(lyrics, audioDuration, {
          wordsPerLine: 8,
          minDuration: 2,
        });
        await fs.writeFile(srtPath, srtContent);
        
        const videoResult = await createLyricVideo(mixPath, srtPath, videoPath);
        hasVideo = videoResult.success;
      } else if (videoStyle.toLowerCase().includes('waveform')) {
        // Waveform video
        debugLogs.push('Creating waveform video...');
        const videoResult = await createWaveformVideo(mixPath, videoPath);
        hasVideo = videoResult.success;
      } else {
        // Default: Spectrum video
        debugLogs.push('Creating spectrum video...');
        const videoResult = await createSpectrumVideo(mixPath, videoPath);
        hasVideo = videoResult.success;
      }
      
      if (hasVideo) {
        debugLogs.push('✅ Video generated');
      } else {
        debugLogs.push('⚠️  Video generation failed');
      }
    }
    
    // 1️⃣2️⃣ BUILD RESPONSE
    const response: GenerateResponse = {
      bpm: musicPlan.bpm,
      key: musicPlan.key,
      scale: musicPlan.scale,
      assets: {
        instrumentalUrl: getPublicUrl(path.join(relativePath, 'instrumental.wav')),
        vocalsUrl: hasVocals ? getPublicUrl(path.join(relativePath, 'vocals.wav')) : undefined,
        mixUrl: getPublicUrl(path.join(relativePath, 'mix.wav')),
        videoUrl: hasVideo ? getPublicUrl(path.join(relativePath, 'final.mp4')) : undefined,
      },
      aiSuggestions: {
        genres: suggestions.genres,
        artistInspiration: suggestions.artistInspiration,
        lyrics: suggestions.lyrics,
        vocalLanguages: suggestions.vocalLanguages,
        videoStyles: suggestions.videoStyles,
        musicPrompt: suggestions.musicPrompt,
      },
      engines: {
        music: 'riffusion',
        melody: 'magenta',
        vocals: 'coqui',
        video: 'ffmpeg',
      },
      status: 'success',
      debug: debugLogs,
    };
    
    return response;
  } catch (error: any) {
    console.error('Generation error:', error);
    
    return {
      bpm: 120,
      key: 'A minor',
      scale: 'minor',
      assets: {},
      aiSuggestions: {
        genres: [],
        artistInspiration: [],
        lyrics: '',
        vocalLanguages: ['English'],
        videoStyles: [],
      },
      engines: {
        music: 'riffusion',
        melody: 'magenta',
        vocals: 'coqui',
        video: 'ffmpeg',
      },
      status: 'error',
      error: error.message,
      debug: debugLogs,
    };
  }
}
