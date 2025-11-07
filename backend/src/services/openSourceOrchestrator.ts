/**
 * Open-Source Music Orchestrator
 * Coordinates Riffusion, Magenta, Coqui TTS, FluidSynth, and FFmpeg
 * to generate complete music tracks with vocals and video
 */
import path from 'path';
import { promises as fs } from 'fs';
import { ulid } from 'ulid';
import { openSourceBridge, GenerationResult } from './openSourceBridge';
import { logger } from '../logger.js';

export interface OpenSourceRequest {
  musicPrompt: string;
  genres: string[];
  durationSec: number;
  artistInspiration?: string[];
  lyrics?: string;
  vocalLanguages?: string[];
  generateVideo?: boolean;
  videoStyles?: string[];
}

export interface OpenSourceResponse {
  success: boolean;
  jobId: string;
  bpm: number;
  key: string;
  scale: string;
  assets: {
    mixUrl?: string;
    videoUrl?: string;
    riffusionUrl?: string;
    melodyUrl?: string;
    vocalsUrl?: string;
  };
  engines: {
    music: string;
    melody: string;
    vocals?: string;
    video?: string;
  };
  metadata: Record<string, any>;
  error?: string;
}

export class OpenSourceOrchestrator {
  private assetsDir: string;
  private tempDir: string;

  constructor() {
    this.assetsDir = path.join(process.cwd(), 'public', 'assets');
    this.tempDir = path.join(process.cwd(), 'tmp');
  }

  /**
   * Main generation pipeline
   */
  async generate(request: OpenSourceRequest): Promise<OpenSourceResponse> {
    const jobId = ulid();
    const startTime = Date.now();

    logger.info({ jobId, request }, 'Starting open-source music generation');

    try {
      // Detect available models
      const capabilities = await openSourceBridge.detectCapabilities();
      logger.info({ capabilities }, 'Model capabilities');

      // Derive musical parameters
      const musicalParams = this.deriveMusicalParameters(request);
      logger.info({ musicalParams }, 'Musical parameters');

      // Create working directories
      const workDir = await this.createWorkDir(jobId);
      const outputDir = await this.createOutputDir(jobId);

      const results: Record<string, GenerationResult> = {};
      const filePaths: Record<string, string> = {};

      // Step 1: Generate MIDI melody with Magenta
      if (capabilities.magenta || true) {  // Always try, has fallback
        const midiPath = path.join(workDir, 'melody.mid');
        results.melody = await openSourceBridge.generateMagenta(
          request.durationSec,
          midiPath,
          musicalParams.bpm,
          musicalParams.key
        );

        if (results.melody.success && capabilities.fluidSynth) {
          // Convert MIDI to WAV
          const melodyWavPath = path.join(workDir, 'melody.wav');
          results.melodyWav = await openSourceBridge.midiToWav(midiPath, melodyWavPath);
          
          if (results.melodyWav.success) {
            filePaths.melody = melodyWavPath;
          }
        }
      }

      // Step 2: Generate texture with Riffusion
      if (capabilities.riffusion || true) {  // Always try, has fallback
        const riffusionPath = path.join(workDir, 'riffusion.wav');
        results.riffusion = await openSourceBridge.generateRiffusion(
          this.buildRiffusionPrompt(request, musicalParams),
          request.durationSec,
          riffusionPath
        );

        if (results.riffusion.success) {
          filePaths.riffusion = riffusionPath;
        }
      }

      // Step 3: Generate vocals with Coqui TTS
      if (request.lyrics && (capabilities.coquiTTS || true)) {  // Always try, has fallback
        const vocalsPath = path.join(workDir, 'vocals.wav');
        const language = request.vocalLanguages?.[0] || 'en';
        
        results.vocals = await openSourceBridge.generateCoquiTTS(
          request.lyrics,
          vocalsPath,
          language
        );

        if (results.vocals.success) {
          filePaths.vocals = vocalsPath;
        }
      }

      // Step 4: Mix all audio layers
      const inputsForMix = Object.values(filePaths).filter(p => p);
      
      if (inputsForMix.length === 0) {
        throw new Error('No audio layers were generated successfully');
      }

      const mixPath = path.join(outputDir, 'mix.wav');
      results.mix = await openSourceBridge.mixAudio(inputsForMix, mixPath, {
        normalize: true,
        limiter: true,
        loudness: true
      });

      if (!results.mix.success) {
        throw new Error('Audio mixing failed');
      }

      // Step 5: Generate video if requested
      let videoPath: string | undefined;
      
      if (request.generateVideo && capabilities.ffmpeg) {
        const visualizerType = this.getVisualizerType(request.videoStyles);
        videoPath = path.join(outputDir, 'video.mp4');
        
        results.video = await openSourceBridge.generateVideo(
          mixPath,
          videoPath,
          visualizerType
        );
      }

      // Step 6: Build response
      const response: OpenSourceResponse = {
        success: true,
        jobId,
        bpm: musicalParams.bpm,
        key: musicalParams.key,
        scale: musicalParams.scale,
        assets: {
          mixUrl: this.getPublicUrl(jobId, 'mix.wav'),
          videoUrl: videoPath ? this.getPublicUrl(jobId, 'video.mp4') : undefined,
          riffusionUrl: filePaths.riffusion ? this.getPublicUrl(jobId, 'riffusion.wav') : undefined,
          melodyUrl: filePaths.melody ? this.getPublicUrl(jobId, 'melody.wav') : undefined,
          vocalsUrl: filePaths.vocals ? this.getPublicUrl(jobId, 'vocals.wav') : undefined
        },
        engines: {
          music: results.riffusion?.engine || 'Unknown',
          melody: results.melody?.engine || 'Unknown',
          vocals: results.vocals?.engine,
          video: results.video?.engine
        },
        metadata: {
          durationMs: Date.now() - startTime,
          capabilities,
          results: Object.entries(results).reduce((acc, [key, val]) => {
            acc[key] = { success: val.success, engine: val.engine };
            return acc;
          }, {} as Record<string, any>)
        }
      };

      logger.info({ jobId, response }, 'Generation complete');
      return response;

    } catch (error) {
      logger.error({ jobId, error }, 'Generation failed');
      
      return {
        success: false,
        jobId,
        bpm: 120,
        key: 'C',
        scale: 'major',
        assets: {},
        engines: {
          music: 'Error',
          melody: 'Error'
        },
        metadata: {
          durationMs: Date.now() - startTime
        },
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Derive BPM, key, scale from genres and prompt
   */
  private deriveMusicalParameters(request: OpenSourceRequest) {
    const genre = request.genres[0]?.toLowerCase() || 'electronic';

    // Genre to BPM mapping
    const bpmMap: Record<string, number> = {
      'lofi': 82,
      'lo-fi': 82,
      'chillhop': 82,
      'hip-hop': 95,
      'hiphop': 95,
      'rap': 95,
      'trap': 140,
      'techno': 128,
      'house': 124,
      'deep house': 122,
      'tech house': 126,
      'trance': 138,
      'drum and bass': 174,
      'dnb': 174,
      'dubstep': 140,
      'ambient': 85,
      'downtempo': 90,
      'electronic': 120,
      'edm': 128,
      'pop': 116,
      'rock': 120,
      'indie': 115,
      'jazz': 120,
      'classical': 100,
      'synthwave': 110,
      'vaporwave': 80
    };

    const bpm = bpmMap[genre] || 120;

    // Key selection based on mood (from prompt)
    const promptLower = request.musicPrompt.toLowerCase();
    let key = 'C';
    let scale = 'major';

    if (promptLower.includes('dark') || promptLower.includes('sad') || promptLower.includes('melancholic')) {
      key = ['A', 'D', 'E', 'B'][Math.floor(Math.random() * 4)];
      scale = 'minor';
    } else if (promptLower.includes('happy') || promptLower.includes('uplifting') || promptLower.includes('bright')) {
      key = ['C', 'G', 'D', 'F'][Math.floor(Math.random() * 4)];
      scale = 'major';
    } else {
      // Default minor for most electronic genres
      key = 'A';
      scale = 'minor';
    }

    return { bpm, key, scale };
  }

  /**
   * Build enhanced prompt for Riffusion
   */
  private buildRiffusionPrompt(request: OpenSourceRequest, musicalParams: { bpm: number; key: string; scale: string }) {
    const parts: string[] = [];

    // Add genre context
    if (request.genres.length > 0) {
      parts.push(request.genres.join(', '));
    }

    // Add original prompt
    parts.push(request.musicPrompt);

    // Add musical parameters
    parts.push(`${musicalParams.bpm} BPM`);
    parts.push(`${musicalParams.key} ${musicalParams.scale}`);

    // Add artist inspiration
    if (request.artistInspiration && request.artistInspiration.length > 0) {
      parts.push(`inspired by ${request.artistInspiration.join(', ')}`);
    }

    return parts.join(', ');
  }

  /**
   * Determine visualizer type from video styles
   */
  private getVisualizerType(videoStyles?: string[]): 'showwaves' | 'showspectrum' {
    if (!videoStyles || videoStyles.length === 0) {
      return 'showwaves';
    }

    const style = videoStyles[0].toLowerCase();

    if (style.includes('spectrum') || style.includes('frequency')) {
      return 'showspectrum';
    }

    return 'showwaves';
  }

  /**
   * Create working directory for temp files
   */
  private async createWorkDir(jobId: string): Promise<string> {
    const dir = path.join(this.tempDir, jobId);
    await fs.mkdir(dir, { recursive: true });
    return dir;
  }

  /**
   * Create output directory for final files
   */
  private async createOutputDir(jobId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    
    const dir = path.join(this.assetsDir, year.toString(), month, jobId);
    await fs.mkdir(dir, { recursive: true });
    
    return dir;
  }

  /**
   * Get public URL for asset
   */
  private getPublicUrl(jobId: string, filename: string): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    
    return `/assets/${year}/${month}/${jobId}/${filename}`;
  }
}

// Singleton instance
export const openSourceOrchestrator = new OpenSourceOrchestrator();
