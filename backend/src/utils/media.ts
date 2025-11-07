/**
 * Media utilities for downloading, mixing audio, and creating videos
 */

import { writeFile } from 'fs/promises';
import { createWriteStream } from 'fs';
import { execa } from 'execa';
import ffmpeg from '@ffmpeg-installer/ffmpeg';

/**
 * Download file from URL to local path
 */
export async function downloadFile(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.statusText}`);
  }
  
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(outputPath, buffer);
}

/**
 * Mix multiple audio files into one using FFmpeg
 */
export async function mixAudioFiles(inputPaths: string[], outputPath: string): Promise<void> {
  const inputs = inputPaths.flatMap(p => ['-i', p]);
  
  // Create filter for mixing with normalization
  const filterComplex = inputPaths.length > 1
    ? `${inputPaths.map((_, i) => `[${i}:a]`).join('')}amix=inputs=${inputPaths.length}:duration=longest:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11`
    : 'anull'; // No mixing needed for single input

  const args = [
    ...inputs,
    '-filter_complex', filterComplex,
    '-ar', '44100',
    '-ac', '2',
    '-y', // Overwrite output
    outputPath,
  ];

  await execa(ffmpeg.path, args, { timeout: 120000 });
}

/**
 * Create video visualization from audio
 */
export async function createVideoVisualization(params: {
  audioPath: string;
  outputPath: string;
  style: string;
  lyrics?: string;
  duration: number;
}): Promise<void> {
  const { audioPath, outputPath, style } = params;

  let filterComplex: string;

  switch (style) {
    case 'Official Music Video':
      // Spectrum analyzer
      filterComplex = 'showspectrum=s=1280x720:mode=combined:color=rainbow:scale=log,format=yuv420p';
      break;
      
    case 'Abstract Visualizer':
      // Waveform
      filterComplex = 'showwaves=s=1280x720:mode=cline:colors=white@0.8:scale=lin,format=yuv420p';
      break;
      
    case 'Lyric Video':
      if (params.lyrics) {
        // Create simple scrolling text (basic implementation)
        const escapedLyrics = params.lyrics.replace(/'/g, "\\'").replace(/\n/g, '\\n');
        filterComplex = `drawtext=text='${escapedLyrics}':fontsize=24:fontcolor=white:x=(w-text_w)/2:y=h-100*t/${params.duration}:borderw=2:bordercolor=black,format=yuv420p`;
      } else {
        // Fallback to waveform
        filterComplex = 'showwaves=s=1280x720:mode=cline:colors=cyan@0.8,format=yuv420p';
      }
      break;
      
    default:
      filterComplex = 'showwaves=s=1280x720:mode=cline:colors=white@0.8,format=yuv420p';
  }

  const args = [
    '-i', audioPath,
    '-filter_complex', `${filterComplex}[v]`,
    '-map', '[v]',
    '-map', '0:a',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-shortest',
    '-y',
    outputPath,
  ];

  await execa(ffmpeg.path, args, { timeout: 180000 });
}

/**
 * Get audio duration using FFprobe
 */
export async function getAudioDuration(filePath: string): Promise<number> {
  const ffprobePath = ffmpeg.path.replace('ffmpeg', 'ffprobe');
  
  const { stdout } = await execa(ffprobePath, [
    '-v', 'quiet',
    '-print_format', 'json',
    '-show_format',
    filePath,
  ]);

  const data = JSON.parse(stdout);
  return parseFloat(data.format.duration || '0');
}
