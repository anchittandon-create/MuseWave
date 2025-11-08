import ffmpeg from 'fluent-ffmpeg';
import { promisify } from 'util';
import { exec as execCallback } from 'child_process';
import { writeFile } from 'fs/promises';
import { env } from '../config/env.js';

const exec = promisify(execCallback);

/**
 * Mix multiple audio files into one
 */
export async function mixAudioFiles(options: {
  inputs: string[];
  output: string;
  normalize?: boolean;
}): Promise<void> {
  const { inputs, output, normalize = true } = options;

  if (inputs.length === 0) {
    throw new Error('No input files provided');
  }

  if (inputs.length === 1) {
    // Single input, just copy or normalize
    const command = ffmpeg(inputs[0]);

    if (normalize) {
      command
        .audioFilters([
          `alimiter=level_in=1:level_out=1:limit=${env.AUDIO_TRUE_PEAK}:attack=5:release=50`,
          'dynaudnorm=f=150:g=15',
          `loudnorm=I=${env.AUDIO_LOUDNESS_TARGET}:TP=${env.AUDIO_TRUE_PEAK}:LRA=${env.AUDIO_LRA}`,
        ])
        .audioCodec('pcm_s16le')
        .audioFrequency(44100)
        .audioChannels(2);
    }

    return new Promise((resolve, reject) => {
      command
        .output(output)
        .on('end', () => resolve())
        .on('error', reject)
        .run();
    });
  }

  // Multiple inputs - build complex filter
  const filterComplex: string[] = [];
  const inputArgs: string[] = [];

  for (let i = 0; i < inputs.length; i++) {
    inputArgs.push('-i', inputs[i]);
  }

  // Build amix filter
  const amixInputs = inputs.map((_, i) => `[${i}:a]`).join('');
  filterComplex.push(
    `${amixInputs}amix=inputs=${inputs.length}:duration=longest:dropout_transition=2[mixed]`
  );

  // Add normalization if requested
  if (normalize) {
    filterComplex.push(
      `[mixed]alimiter=level_in=1:level_out=1:limit=${env.AUDIO_TRUE_PEAK}:attack=5:release=50[limited]`,
      '[limited]dynaudnorm=f=150:g=15[dynamic]',
      `[dynamic]loudnorm=I=${env.AUDIO_LOUDNESS_TARGET}:TP=${env.AUDIO_TRUE_PEAK}:LRA=${env.AUDIO_LRA}[out]`
    );
  }

  const args = [
    ...inputArgs,
    '-filter_complex',
    filterComplex.join(';'),
    '-map',
    normalize ? '[out]' : '[mixed]',
    '-ac',
    '2',
    '-ar',
    '44100',
    '-acodec',
    'pcm_s16le',
    output,
    '-y',
  ];

  const { stderr } = await exec(`ffmpeg ${args.join(' ')}`);

  if (stderr && stderr.includes('Error')) {
    throw new Error(`FFmpeg mixing failed: ${stderr}`);
  }
}

/**
 * Generate video from audio with visual style
 */
export async function generateVideo(options: {
  audioPath: string;
  outputPath: string;
  style: string;
  subtitlesPath?: string;
}): Promise<void> {
  const { audioPath, outputPath, style, subtitlesPath } = options;

  // Get audio duration
  const duration = await getAudioDuration(audioPath);

  // Build video filter based on style
  let videoFilter: string;

  switch (style) {
    case 'Official Music Video':
      videoFilter =
        'showspectrum=s=1920x1080:mode=combined:color=rainbow:scale=log,format=yuv420p';
      break;

    case 'Abstract Visualizer':
      videoFilter =
        'showwaves=s=1920x1080:mode=p2p:rate=30:colors=white|blue|purple,format=yuv420p';
      break;

    case 'Spectrum Analyzer':
      videoFilter =
        'showspectrum=s=1920x1080:mode=separate:color=fire:scale=cbrt,format=yuv420p';
      break;

    case 'Waveform Animation':
      videoFilter = 'showwaves=s=1920x1080:mode=cline:rate=30:colors=cyan,format=yuv420p';
      break;

    case 'Geometric Patterns':
      videoFilter =
        'showspectrum=s=1920x1080:mode=combined:color=intensity:scale=lin,format=yuv420p';
      break;

    case 'Particle Effects':
      videoFilter = 'avectorscope=s=1920x1080:zoom=1.5:draw=line,format=yuv420p';
      break;

    case 'Cinematic Montage':
      videoFilter =
        'showspectrum=s=1920x1080:mode=combined:color=magma:scale=log,format=yuv420p';
      break;

    case 'Lyric Video':
      // Black background with subtitles
      videoFilter = `color=c=black:s=${env.VIDEO_WIDTH}x${env.VIDEO_HEIGHT}:d=${duration},format=yuv420p`;
      break;

    default:
      // Default to spectrum
      videoFilter =
        'showspectrum=s=1920x1080:mode=combined:color=rainbow:scale=log,format=yuv420p';
  }

  const command = ffmpeg();

  // Input audio
  command.input(audioPath);

  // Build video from filter
  if (style === 'Lyric Video' && subtitlesPath) {
    command
      .complexFilter([
        {
          filter: 'color',
          options: {
            c: 'black',
            s: `${env.VIDEO_WIDTH}x${env.VIDEO_HEIGHT}`,
            d: duration,
          },
          outputs: 'bg',
        },
        {
          filter: 'subtitles',
          options: {
            filename: subtitlesPath.replace(/:/g, '\\:'), // Escape colons
            force_style: 'FontSize=24,FontName=Arial,PrimaryColour=&Hffffff,Alignment=2',
          },
          inputs: 'bg',
          outputs: 'video',
        },
      ])
      .map('[video]')
      .map('0:a');
  } else {
    command.complexFilter(videoFilter);
  }

  command
    .videoCodec('libx264')
    .videoBitrate(env.VIDEO_BITRATE)
    .fps(env.VIDEO_FPS)
    .size(`${env.VIDEO_WIDTH}x${env.VIDEO_HEIGHT}`)
    .outputOptions(['-preset', env.VIDEO_PRESET, '-pix_fmt', 'yuv420p'])
    .audioCodec('aac')
    .audioBitrate('192k')
    .output(outputPath);

  return new Promise((resolve, reject) => {
    command.on('end', () => resolve()).on('error', reject).run();
  });
}

/**
 * Get audio file duration in seconds
 */
export async function getAudioDuration(audioPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(audioPath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration || 0);
    });
  });
}

/**
 * Generate SRT subtitle file from lyrics
 */
export function generateSRTFromLyrics(lyrics: string, durationSec: number): string {
  const lines = lyrics.split('\n').filter((l) => l.trim().length > 0);

  if (lines.length === 0) return '';

  const timePerLine = durationSec / lines.length;
  const srtLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const startTime = i * timePerLine;
    const endTime = (i + 1) * timePerLine;

    srtLines.push(
      `${i + 1}`,
      `${formatSRTTime(startTime)} --> ${formatSRTTime(endTime)}`,
      lines[i],
      ''
    );
  }

  return srtLines.join('\n');
}

/**
 * Format time in seconds to SRT timestamp (HH:MM:SS,mmm)
 */
function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);

  return (
    String(hours).padStart(2, '0') +
    ':' +
    String(minutes).padStart(2, '0') +
    ':' +
    String(secs).padStart(2, '0') +
    ',' +
    String(millis).padStart(3, '0')
  );
}
