# MuseForge Pro Backend - Complete Implementation Guide

## 🎵 Overview

This is the **complete backend implementation** for MuseForge Pro, an AI music generation system using only free, open-source models. The backend generates playable `.wav` and `.mp4` files with adaptive AI suggestions.

## 📁 Complete File Structure

```
backend-complete/
├── package.json ✅
├── tsconfig.json ✅
├── .env.example ✅
├── src/
│   ├── server.ts (BELOW)
│   ├── config/
│   │   ├── env.ts ✅
│   │   └── ai-ontology.ts ✅
│   ├── types/
│   │   └── schemas.ts ✅
│   ├── services/
│   │   ├── ai-suggestions.ts ✅
│   │   ├── music-planner.ts ✅
│   │   ├── python-bridge.ts ✅
│   │   ├── ffmpeg-processor.ts (BELOW)
│   │   ├── dsp-fallback.ts (BELOW)
│   │   └── storage.ts (BELOW)
│   ├── database/
│   │   └── db.ts (BELOW)
│   ├── routes/
│   │   ├── generate.ts (BELOW)
│   │   ├── suggestions.ts (BELOW)
│   │   ├── dashboard.ts (BELOW)
│   │   └── assets.ts (BELOW)
│   └── python/
│       ├── riffusion_generate.py ✅
│       ├── magenta_melody.py ✅
│       └── coqui_tts.py ✅
├── scripts/
│   ├── setup-models.sh (BELOW)
│   └── test-generation.js (BELOW)
└── public/
    └── assets/ (generated)
```

## 🔧 Remaining Implementation Files

### 1. FFmpeg Audio/Video Processor

**File: `src/services/ffmpeg-processor.ts`**

```typescript
import ffmpeg from 'fluent-ffmpeg';
import { env } from '../config/env.js';
import { existsSync } from 'fs';
import { promisify } from 'util';
import { exec } from 'child_process';

const execPromise = promisify(exec);

export interface MixOptions {
  inputs: string[];
  output: string;
  normalize?: boolean;
  loudnessTarget?: number;
  truePeakLimit?: number;
}

export interface VideoOptions {
  audioPath: string;
  outputPath: string;
  style: string;
  subtitlesPath?: string;
  width?: number;
  height?: number;
  fps?: number;
}

/**
 * Mix multiple audio files into one
 */
export async function mixAudioFiles(options: MixOptions): Promise<void> {
  const { inputs, output, normalize = true } = options;

  // Validate inputs
  for (const input of inputs) {
    if (!existsSync(input)) {
      throw new Error(`Input file not found: ${input}`);
    }
  }

  return new Promise((resolve, reject) => {
    let command = ffmpeg();

    // Add all inputs
    inputs.forEach(input => command = command.input(input));

    // Build filter complex for mixing
    const inputLabels = inputs.map((_, i) => `[${i}:a]`).join('');
    let filterComplex = `${inputLabels}amix=inputs=${inputs.length}:duration=longest:dropout_transition=2`;

    if (normalize) {
      filterComplex += `,alimiter=limit=0.95,dynaudnorm,loudnorm=I=${env.LOUDNESS_TARGET}:TP=${env.TRUE_PEAK_LIMIT}:LRA=${env.LRA_TARGET}`;
    }

    command
      .complexFilter([filterComplex + '[out]'])
      .outputOptions(['-map', '[out]'])
      .audioFrequency(env.DEFAULT_SAMPLE_RATE)
      .audioChannels(env.DEFAULT_CHANNELS)
      .audioCodec('pcm_s16le')
      .output(output)
      .on('end', () => resolve())
      .on('error', (err) => reject(new Error(`FFmpeg mix error: ${err.message}`)))
      .run();
  });
}

/**
 * Generate video from audio with visualizations
 */
export async function generateVideo(options: VideoOptions): Promise<void> {
  const { audioPath, outputPath, style, subtitlesPath } = options;
  const width = options.width || env.DEFAULT_VIDEO_WIDTH;
  const height = options.height || env.DEFAULT_VIDEO_HEIGHT;
  const fps = options.fps || env.DEFAULT_VIDEO_FPS;

  if (!existsSync(audioPath)) {
    throw new Error(`Audio file not found: ${audioPath}`);
  }

  return new Promise((resolve, reject) => {
    let command = ffmpeg(audioPath);

    // Style-specific filters
    const filters: Record<string, string> = {
      'Official Music Video': `showspectrum=s=${width}x${height}:mode=combined:color=rainbow:scale=log`,
      'Abstract Visualizer': `showwaves=s=${width}x${height}:mode=p2p:colors=white|blue|purple:scale=sqrt`,
      'Spectrum Analyzer': `showspectrum=s=${width}x${height}:mode=separate:color=fire:scale=cbrt`,
      'Waveform Animation': `showwaves=s=${width}x${height}:mode=cline:colors=cyan:rate=${fps}`,
      'Geometric Patterns': `showspectrum=s=${width}x${height}:mode=combined:color=intensity:scale=lin`,
      'Particle Effects': `avectorscope=s=${width}x${height}:r=${fps}:zoom=1.5:draw=line`,
      'Cinematic Montage': `showspectrum=s=${width}x${height}:mode=combined:color=magma:scale=log`,
      'Lyric Video': subtitlesPath && existsSync(subtitlesPath)
        ? `color=c=black:s=${width}x${height}:r=${fps},subtitles=${subtitlesPath}:force_style='FontSize=24,PrimaryColour=&HFFFFFF&,Alignment=2'`
        : `showwaves=s=${width}x${height}:mode=cline:colors=white`,
    };

    const filter = filters[style] || filters['Abstract Visualizer'];

    command
      .complexFilter([filter])
      .outputOptions([
        '-pix_fmt', 'yuv420p',
        '-c:v', 'libx264',
        '-preset', env.VIDEO_PRESET,
        '-b:v', env.DEFAULT_VIDEO_BITRATE,
        '-c:a', 'aac',
        '-b:a', '192k',
        '-shortest',
      ])
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(new Error(`FFmpeg video error: ${err.message}`)))
      .run();
  });
}

/**
 * Get audio duration in seconds
 */
export async function getAudioDuration(filePath: string): Promise<number> {
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration || 0);
    });
  });
}

/**
 * Generate SRT subtitles from lyrics
 */
export function generateSRTFromLyrics(lyrics: string, durationSec: number): string {
  const lines = lyrics.split('\n').filter(l => l.trim());
  const timePerLine = durationSec / lines.length;

  let srt = '';
  lines.forEach((line, i) => {
    const startSec = i * timePerLine;
    const endSec = (i + 1) * timePerLine;

    srt += `${i + 1}\n`;
    srt += `${formatSRTTime(startSec)} --> ${formatSRTTime(endSec)}\n`;
    srt += `${line}\n\n`;
  });

  return srt;
}

function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}
```

---

### 2. DSP Fallback Generator

**File: `src/services/dsp-fallback.ts`**

```typescript
import { writeFileSync } from 'fs';
import { env } from '../config/env.js';

/**
 * DSP-based audio generation fallback when AI models unavailable
 * Generates simple sine/saw/square wave compositions
 */

interface Note {
  frequency: number;
  startTime: number;
  duration: number;
  amplitude: number;
}

/**
 * Generate simple instrumental using additive synthesis
 */
export function generateDSPInstrumental(
  durationSec: number,
  bpm: number,
  key: string
): Buffer {
  const sampleRate = env.DEFAULT_SAMPLE_RATE;
  const totalSamples = Math.floor(durationSec * sampleRate);
  const samples = new Float32Array(totalSamples * 2); // Stereo

  // Parse key to get root note
  const rootFreq = getFrequencyFromKey(key);

  // Generate chord progression
  const beatsPerSec = bpm / 60;
  const samplesPerBeat = sampleRate / beatsPerSec;

  // Simple I-V-vi-IV progression
  const progression = [0, 7, 9, 5]; // Semitones from root
  const chordDuration = samplesPerBeat * 4; // 4 beats per chord

  for (let i = 0; i < totalSamples; i++) {
    const time = i / sampleRate;
    const beatPosition = Math.floor((i / chordDuration) % progression.length);
    const semitones = progression[beatPosition];
    const freq = rootFreq * Math.pow(2, semitones / 12);

    // Generate harmonics
    let sample = 0;
    sample += 0.4 * Math.sin(2 * Math.PI * freq * time); // Fundamental
    sample += 0.2 * Math.sin(2 * Math.PI * freq * 2 * time); // Octave
    sample += 0.1 * Math.sin(2 * Math.PI * freq * 3 * time); // Fifth
    sample += 0.05 * Math.sin(2 * Math.PI * freq * 4 * time); // Harmonic

    // Add bass
    sample += 0.3 * Math.sin(2 * Math.PI * (freq / 2) * time);

    // Simple envelope
    const envelope = Math.min(1, time * 10) * Math.min(1, (durationSec - time) * 5);
    sample *= envelope;

    // Stereo
    samples[i * 2] = sample;
    samples[i * 2 + 1] = sample;
  }

  return float32ToWav(samples, sampleRate, 2);
}

/**
 * Generate DSP vocals (robotic speech synthesis)
 */
export function generateDSPVocals(
  lyrics: string,
  durationSec: number
): { audioBuffer: Buffer; srtPath: string | null } {
  const sampleRate = env.DEFAULT_SAMPLE_RATE;
  const totalSamples = Math.floor(durationSec * sampleRate);
  const samples = new Float32Array(totalSamples * 2);

  // Simple vowel formants (very basic speech synthesis)
  const vowelFreqs: Record<string, number[]> = {
    a: [730, 1090, 2440],
    e: [530, 1840, 2480],
    i: [270, 2290, 3010],
    o: [570, 840, 2410],
    u: [440, 1020, 2240],
  };

  const lyricsClean = lyrics.toLowerCase().replace(/[^a-z\s]/g, '');
  const timePerChar = durationSec / lyricsClean.length;

  for (let i = 0; i < totalSamples; i++) {
    const time = i / sampleRate;
    const charIndex = Math.floor(time / timePerChar);
    const char = lyricsClean[charIndex] || 'a';

    const freqs = vowelFreqs[char] || vowelFreqs['a'];
    let sample = 0;

    freqs.forEach((freq, idx) => {
      const amplitude = 0.1 / (idx + 1);
      sample += amplitude * Math.sin(2 * Math.PI * freq * time);
    });

    // Add vibrato
    const vibrato = 1 + 0.05 * Math.sin(2 * Math.PI * 5 * time);
    sample *= vibrato;

    samples[i * 2] = sample;
    samples[i * 2 + 1] = sample;
  }

  return {
    audioBuffer: float32ToWav(samples, sampleRate, 2),
    srtPath: null,
  };
}

/**
 * Convert Float32Array to WAV buffer
 */
function float32ToWav(samples: Float32Array, sampleRate: number, channels: number): Buffer {
  const bytesPerSample = 2; // 16-bit
  const blockAlign = channels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  // WAV header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size
  buffer.writeUInt16LE(1, 20); // AudioFormat (PCM)
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // BitsPerSample
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Convert float to int16
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    const int16 = Math.floor(sample * 0x7fff);
    buffer.writeInt16LE(int16, 44 + i * 2);
  }

  return buffer;
}

function getFrequencyFromKey(key: string): number {
  const noteMap: Record<string, number> = {
    'C': 261.63, 'C#': 277.18, 'Db': 277.18,
    'D': 293.66, 'D#': 311.13, 'Eb': 311.13,
    'E': 329.63,
    'F': 349.23, 'F#': 369.99, 'Gb': 369.99,
    'G': 392.00, 'G#': 415.30, 'Ab': 415.30,
    'A': 440.00, 'A#': 466.16, 'Bb': 466.16,
    'B': 493.88,
  };

  const noteName = key.split(' ')[0];
  return noteMap[noteName] || 440;
}
```

---

### 3. Storage Service

**File: `src/services/storage.ts`**

```typescript
import { mkdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import { env } from '../config/env.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * File storage service for generated assets
 */

export interface AssetPaths {
  uuid: string;
  directory: string;
  baseUrl: string;
  instrumental: string;
  vocals: string;
  mix: string;
  video: Record<string, string>;
  subtitles: string;
}

/**
 * Create asset directory structure: /YYYY/MM/UUID/
 */
export async function createAssetDirectory(): Promise<AssetPaths> {
  const uuid = uuidv4();
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  const relativePath = join(year.toString(), month, uuid);
  const absolutePath = join(env.ASSETS_DIR, relativePath);

  // Create directory
  await mkdir(absolutePath, { recursive: true });

  const baseUrl = `${env.ASSETS_BASE_URL}/${relativePath}`;

  return {
    uuid,
    directory: absolutePath,
    baseUrl,
    instrumental: join(absolutePath, 'instrumental.wav'),
    vocals: join(absolutePath, 'vocals.wav'),
    mix: join(absolutePath, 'mix.wav'),
    video: {},
    subtitles: join(absolutePath, 'subtitles.srt'),
  };
}

/**
 * Save buffer to file
 */
export async function saveBuffer(buffer: Buffer, filePath: string): Promise<void> {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(filePath, buffer);
}

/**
 * Get public URL for asset
 */
export function getAssetUrl(assetPath: string): string {
  const relativePath = assetPath.replace(env.ASSETS_DIR, '').replace(/^\//, '');
  return `${env.ASSETS_BASE_URL}/${relativePath}`;
}
```

---

### 4. Database Service

**File: `src/database/db.ts`**

```typescript
import initSqlJs, { Database } from 'sql.js';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname } from 'path';
import { env } from '../config/env.js';

let db: Database | null = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS generations (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  music_prompt TEXT NOT NULL,
  genres TEXT NOT NULL,
  duration_sec INTEGER NOT NULL,
  bpm INTEGER NOT NULL,
  song_key TEXT NOT NULL,
  scale TEXT NOT NULL,
  artist_inspiration TEXT,
  lyrics TEXT,
  vocal_languages TEXT,
  video_styles TEXT,
  instrumental_url TEXT,
  vocals_url TEXT,
  mix_url TEXT NOT NULL,
  video_url TEXT,
  engines TEXT NOT NULL,
  processing_time_ms INTEGER,
  status TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_created_at ON generations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_status ON generations(status);
`;

export async function initDatabase(): Promise<void> {
  const SQL = await initSqlJs();

  // Load existing database or create new
  if (existsSync(env.DATABASE_PATH)) {
    const buffer = await readFile(env.DATABASE_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
    db.run(SCHEMA);
    await saveDatabase();
  }
}

export async function saveDatabase(): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  const data = db.export();
  const buffer = Buffer.from(data);

  const dir = dirname(env.DATABASE_PATH);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  await writeFile(env.DATABASE_PATH, buffer);
}

export interface GenerationRecord {
  id: string;
  createdAt: string;
  musicPrompt: string;
  genres: string[];
  durationSec: number;
  bpm: number;
  key: string;
  scale: string;
  artistInspiration?: string[];
  lyrics?: string;
  vocalLanguages?: string[];
  videoStyles?: string[];
  instrumentalUrl?: string;
  vocalsUrl?: string;
  mixUrl: string;
  videoUrl?: string;
  engines: Record<string, string>;
  processingTimeMs?: number;
  status: string;
}

export async function saveGeneration(record: GenerationRecord): Promise<void> {
  if (!db) await initDatabase();

  db!.run(
    `INSERT INTO generations VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.id,
      record.createdAt,
      record.musicPrompt,
      JSON.stringify(record.genres),
      record.durationSec,
      record.bpm,
      record.key,
      record.scale,
      record.artistInspiration ? JSON.stringify(record.artistInspiration) : null,
      record.lyrics || null,
      record.vocalLanguages ? JSON.stringify(record.vocalLanguages) : null,
      record.videoStyles ? JSON.stringify(record.videoStyles) : null,
      record.instrumentalUrl || null,
      record.vocalsUrl || null,
      record.mixUrl,
      record.videoUrl || null,
      JSON.stringify(record.engines),
      record.processingTimeMs || null,
      record.status,
    ]
  );

  await saveDatabase();
}

export async function getGenerations(limit: number = 20, offset: number = 0): Promise<GenerationRecord[]> {
  if (!db) await initDatabase();

  const result = db!.exec(
    `SELECT * FROM generations ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [limit, offset]
  );

  if (result.length === 0) return [];

  return result[0].values.map((row: any) => ({
    id: row[0],
    createdAt: row[1],
    musicPrompt: row[2],
    genres: JSON.parse(row[3]),
    durationSec: row[4],
    bpm: row[5],
    key: row[6],
    scale: row[7],
    artistInspiration: row[8] ? JSON.parse(row[8]) : undefined,
    lyrics: row[9] || undefined,
    vocalLanguages: row[10] ? JSON.parse(row[10]) : undefined,
    videoStyles: row[11] ? JSON.parse(row[11]) : undefined,
    instrumentalUrl: row[12] || undefined,
    vocalsUrl: row[13] || undefined,
    mixUrl: row[14],
    videoUrl: row[15] || undefined,
    engines: JSON.parse(row[16]),
    processingTimeMs: row[17] || undefined,
    status: row[18],
  }));
}

export async function getStats(): Promise<{
  totalGenerations: number;
  totalDurationSec: number;
  averageBpm: number;
  popularGenres: Array<{ genre: string; count: number }>;
}> {
  if (!db) await initDatabase();

  const stats = db!.exec(`
    SELECT 
      COUNT(*) as total,
      SUM(duration_sec) as total_duration,
      AVG(bpm) as avg_bpm
    FROM generations
  `);

  return {
    totalGenerations: stats[0]?.values[0][0] as number || 0,
    totalDurationSec: stats[0]?.values[0][1] as number || 0,
    averageBpm: Math.round(stats[0]?.values[0][2] as number) || 0,
    popularGenres: [],
  };
}
```

---

## ⚠️ **CONTINUATION IN NEXT MESSAGE**

The complete implementation requires **6 more critical files**:
1. Main server (`src/server.ts`)
2. Generate route (`src/routes/generate.ts`)
3. Suggestions route (`src/routes/suggestions.ts`)  
4. Dashboard route (`src/routes/dashboard.ts`)
5. Setup script (`scripts/setup-models.sh`)
6. Test script (`scripts/test-generation.js`)

**Should I continue with these files?** The total implementation is ~3000 lines of production code.
