/**
 * FFmpeg Engine
 * Audio mixing, mastering, and video generation
 */

import { execa } from 'execa';
import path from 'path';
import fs from 'fs-extra';
import { env } from '../env.js';

export interface FFmpegResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  duration?: number;
}

/**
 * Mix multiple audio files into one (instrumental + vocals)
 */
export async function mixAudioFiles(
  inputs: string[],
  outputPath: string,
  options: {
    normalize?: boolean;
    loudness?: number;
  } = {}
): Promise<FFmpegResult> {
  const startTime = Date.now();
  
  try {
    console.log(`🎚️  FFmpeg: Mixing ${inputs.length} audio files`);
    
    // Ensure output directory exists
    await fs.ensureDir(path.dirname(outputPath));
    
    // Build FFmpeg filter complex for mixing
    const inputArgs: string[] = [];
    inputs.forEach(input => {
      inputArgs.push('-i', input);
    });
    
    // Create mix filter with normalization and limiting
    const filterComplex = `${inputs.map((_, i) => `[${i}:a]`).join('')}amix=inputs=${inputs.length}:normalize=0,alimiter=limit=0.95,dynaudnorm,loudnorm=I=${options.loudness || -14}:TP=-1.0:LRA=11[out]`;
    
    const args = [
      ...inputArgs,
      '-filter_complex', filterComplex,
      '-map', '[out]',
      '-ar', String(env.DEFAULT_SAMPLE_RATE),
      '-ac', '2',
      '-y', // Overwrite
      outputPath,
    ];
    
    const result = await execa(env.FFMPEG_PATH, args, {
      timeout: env.GENERATION_TIMEOUT_MS,
    });
    
    // Verify output
    const exists = await fs.pathExists(outputPath);
    if (!exists) {
      throw new Error('Mixed audio file was not created');
    }
    
    const duration = Date.now() - startTime;
    console.log(`✅ Audio mixing completed in ${(duration / 1000).toFixed(2)}s`);
    
    return {
      success: true,
      outputPath,
      duration,
    };
  } catch (error: any) {
    console.error('❌ FFmpeg mixing error:', error.message);
    return {
      success: false,
      error: error.message,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Create video with audio visualization (spectrum analyzer)
 */
export async function createSpectrumVideo(
  audioPath: string,
  outputPath: string,
  options: {
    width?: number;
    height?: number;
    fps?: number;
    color?: string;
  } = {}
): Promise<FFmpegResult> {
  const startTime = Date.now();
  
  try {
    console.log(`🎬 FFmpeg: Creating spectrum visualizer video`);
    
    await fs.ensureDir(path.dirname(outputPath));
    
    const width = options.width || 1280;
    const height = options.height || 720;
    const fps = options.fps || 30;
    const color = options.color || 'rainbow';
    
    const args = [
      '-i', audioPath,
      '-filter_complex', `showspectrum=s=${width}x${height}:color=${color}:scale=log`,
      '-r', String(fps),
      '-pix_fmt', 'yuv420p',
      '-shortest',
      '-y',
      outputPath,
    ];
    
    const result = await execa(env.FFMPEG_PATH, args, {
      timeout: env.GENERATION_TIMEOUT_MS,
    });
    
    const exists = await fs.pathExists(outputPath);
    if (!exists) {
      throw new Error('Spectrum video was not created');
    }
    
    const duration = Date.now() - startTime;
    console.log(`✅ Spectrum video completed in ${(duration / 1000).toFixed(2)}s`);
    
    return {
      success: true,
      outputPath,
      duration,
    };
  } catch (error: any) {
    console.error('❌ FFmpeg spectrum video error:', error.message);
    return {
      success: false,
      error: error.message,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Create waveform visualization video
 */
export async function createWaveformVideo(
  audioPath: string,
  outputPath: string,
  options: {
    width?: number;
    height?: number;
    fps?: number;
    color?: string;
  } = {}
): Promise<FFmpegResult> {
  const startTime = Date.now();
  
  try {
    console.log(`🎬 FFmpeg: Creating waveform video`);
    
    await fs.ensureDir(path.dirname(outputPath));
    
    const width = options.width || 1280;
    const height = options.height || 720;
    const fps = options.fps || 30;
    const color = options.color || 'white';
    
    const args = [
      '-i', audioPath,
      '-filter_complex', `showwaves=s=${width}x${height}:mode=cline:colors=${color}`,
      '-r', String(fps),
      '-pix_fmt', 'yuv420p',
      '-shortest',
      '-y',
      outputPath,
    ];
    
    const result = await execa(env.FFMPEG_PATH, args, {
      timeout: env.GENERATION_TIMEOUT_MS,
    });
    
    const exists = await fs.pathExists(outputPath);
    if (!exists) {
      throw new Error('Waveform video was not created');
    }
    
    const duration = Date.now() - startTime;
    console.log(`✅ Waveform video completed in ${(duration / 1000).toFixed(2)}s`);
    
    return {
      success: true,
      outputPath,
      duration,
    };
  } catch (error: any) {
    console.error('❌ FFmpeg waveform video error:', error.message);
    return {
      success: false,
      error: error.message,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Create lyric video with subtitles overlay
 */
export async function createLyricVideo(
  audioPath: string,
  subtitlesPath: string,
  outputPath: string,
  options: {
    width?: number;
    height?: number;
    fps?: number;
    backgroundColor?: string;
  } = {}
): Promise<FFmpegResult> {
  const startTime = Date.now();
  
  try {
    console.log(`🎬 FFmpeg: Creating lyric video`);
    
    await fs.ensureDir(path.dirname(outputPath));
    
    const width = options.width || 1280;
    const height = options.height || 720;
    const fps = options.fps || 30;
    const bgColor = options.backgroundColor || '#1a1a2e';
    
    // Escape subtitles path for Windows compatibility
    const escapedSubPath = subtitlesPath.replace(/\\/g, '/').replace(/:/g, '\\:');
    
    const args = [
      '-f', 'lavfi',
      '-i', `color=c=${bgColor}:s=${width}x${height}:d=300`, // 5 min max background
      '-i', audioPath,
      '-vf', `subtitles=${escapedSubPath}:force_style='Alignment=2,FontSize=24,PrimaryColour=&HFFFFFF&'`,
      '-r', String(fps),
      '-pix_fmt', 'yuv420p',
      '-shortest',
      '-y',
      outputPath,
    ];
    
    const result = await execa(env.FFMPEG_PATH, args, {
      timeout: env.GENERATION_TIMEOUT_MS,
    });
    
    const exists = await fs.pathExists(outputPath);
    if (!exists) {
      throw new Error('Lyric video was not created');
    }
    
    const duration = Date.now() - startTime;
    console.log(`✅ Lyric video completed in ${(duration / 1000).toFixed(2)}s`);
    
    return {
      success: true,
      outputPath,
      duration,
    };
  } catch (error: any) {
    console.error('❌ FFmpeg lyric video error:', error.message);
    return {
      success: false,
      error: error.message,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Get audio duration in seconds
 */
export async function getAudioDuration(audioPath: string): Promise<number> {
  try {
    const result = await execa(env.FFPROBE_PATH, [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      audioPath,
    ]);
    
    return parseFloat(result.stdout);
  } catch (error: any) {
    console.error('❌ FFprobe duration error:', error.message);
    return 0;
  }
}

/**
 * Convert audio format
 */
export async function convertAudioFormat(
  inputPath: string,
  outputPath: string,
  format: 'wav' | 'mp3' | 'flac'
): Promise<FFmpegResult> {
  const startTime = Date.now();
  
  try {
    console.log(`🔄 FFmpeg: Converting audio to ${format}`);
    
    await fs.ensureDir(path.dirname(outputPath));
    
    const args = [
      '-i', inputPath,
      '-ar', String(env.DEFAULT_SAMPLE_RATE),
      '-ac', '2',
      '-y',
      outputPath,
    ];
    
    const result = await execa(env.FFMPEG_PATH, args, {
      timeout: env.GENERATION_TIMEOUT_MS,
    });
    
    const exists = await fs.pathExists(outputPath);
    if (!exists) {
      throw new Error('Converted audio file was not created');
    }
    
    const duration = Date.now() - startTime;
    console.log(`✅ Audio conversion completed in ${(duration / 1000).toFixed(2)}s`);
    
    return {
      success: true,
      outputPath,
      duration,
    };
  } catch (error: any) {
    console.error('❌ FFmpeg conversion error:', error.message);
    return {
      success: false,
      error: error.message,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Verify FFmpeg installation
 */
export async function verifyFFmpeg(): Promise<{
  ffmpeg: boolean;
  ffprobe: boolean;
}> {
  const results = {
    ffmpeg: false,
    ffprobe: false,
  };
  
  try {
    await execa(env.FFMPEG_PATH, ['-version'], { timeout: 5000 });
    results.ffmpeg = true;
  } catch {}
  
  try {
    await execa(env.FFPROBE_PATH, ['-version'], { timeout: 5000 });
    results.ffprobe = true;
  } catch {}
  
  return results;
}
