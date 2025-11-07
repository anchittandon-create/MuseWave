/**
 * Open-Source Model Bridge Service
 * Spawns Python processes for Riffusion, Magenta, Coqui TTS
 * Handles model detection, availability checking, and graceful fallbacks
 */
import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../logger.js';

export interface ModelCapabilities {
  riffusion: boolean;
  magenta: boolean;
  coquiTTS: boolean;
  fluidSynth: boolean;
  ffmpeg: boolean;
}

export interface GenerationResult {
  success: boolean;
  outputPath?: string;
  duration?: number;
  engine: string;
  error?: string;
  metadata?: Record<string, any>;
}

export class OpenSourceBridge {
  private pythonPath: string = 'python3';
  private scriptsDir: string;
  private capabilities: ModelCapabilities | null = null;

  constructor() {
    this.scriptsDir = path.join(__dirname, '../../python');
  }

  /**
   * Detect available models and tools
   */
  async detectCapabilities(): Promise<ModelCapabilities> {
    if (this.capabilities) {
      return this.capabilities;
    }

    logger.info('Detecting open-source model capabilities...');

    const capabilities: ModelCapabilities = {
      riffusion: await this.checkPythonModule('diffusers'),
      magenta: await this.checkPythonModule('magenta'),
      coquiTTS: await this.checkPythonModule('TTS'),
      fluidSynth: await this.checkCommand('fluidsynth'),
      ffmpeg: await this.checkCommand('ffmpeg')
    };

    this.capabilities = capabilities;
    logger.info({ capabilities }, 'Model capabilities detected');

    return capabilities;
  }

  /**
   * Check if Python module is available
   */
  private async checkPythonModule(moduleName: string): Promise<boolean> {
    try {
      const result = await this.runPython(['-c', `import ${moduleName}; print('OK')`]);
      return result.trim() === 'OK';
    } catch (error) {
      logger.debug({ moduleName, error }, 'Python module not available');
      return false;
    }
  }

  /**
   * Check if system command is available
   */
  private async checkCommand(command: string): Promise<boolean> {
    try {
      await this.runCommand('which', [command]);
      return true;
    } catch (error) {
      logger.debug({ command, error }, 'System command not available');
      return false;
    }
  }

  /**
   * Generate music using Riffusion
   */
  async generateRiffusion(
    prompt: string,
    durationSec: number,
    outputPath: string,
    seed: number = 42
  ): Promise<GenerationResult> {
    logger.info({ prompt, durationSec }, 'Generating with Riffusion');

    try {
      const scriptPath = path.join(this.scriptsDir, 'riffusion_bridge.py');
      
      const args = [
        scriptPath,
        '--prompt', prompt,
        '--duration', durationSec.toString(),
        '--output', outputPath,
        '--seed', seed.toString()
      ];

      const output = await this.runPython(args, 300000); // 5 min timeout
      const result = JSON.parse(output) as GenerationResult;

      logger.info({ result }, 'Riffusion generation complete');
      return result;
    } catch (error) {
      logger.error({ error }, 'Riffusion generation failed');
      return {
        success: false,
        engine: 'Riffusion',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Generate MIDI using Magenta
   */
  async generateMagenta(
    durationSec: number,
    outputPath: string,
    bpm: number = 120,
    key: string = 'C'
  ): Promise<GenerationResult> {
    logger.info({ durationSec, bpm, key }, 'Generating with Magenta');

    try {
      const scriptPath = path.join(this.scriptsDir, 'magenta_bridge.py');
      
      const args = [
        scriptPath,
        '--duration', durationSec.toString(),
        '--output', outputPath,
        '--bpm', bpm.toString(),
        '--key', key
      ];

      const output = await this.runPython(args, 180000); // 3 min timeout
      const result = JSON.parse(output) as GenerationResult;

      logger.info({ result }, 'Magenta generation complete');
      return result;
    } catch (error) {
      logger.error({ error }, 'Magenta generation failed');
      return {
        success: false,
        engine: 'Magenta',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Generate vocals using Coqui TTS
   */
  async generateCoquiTTS(
    text: string,
    outputPath: string,
    language: string = 'en'
  ): Promise<GenerationResult> {
    logger.info({ text: text.substring(0, 50), language }, 'Generating with Coqui TTS');

    try {
      const scriptPath = path.join(this.scriptsDir, 'coqui_bridge.py');
      
      const args = [
        scriptPath,
        '--text', text,
        '--output', outputPath,
        '--language', language
      ];

      const output = await this.runPython(args, 120000); // 2 min timeout
      const result = JSON.parse(output) as GenerationResult;

      logger.info({ result }, 'Coqui TTS generation complete');
      return result;
    } catch (error) {
      logger.error({ error }, 'Coqui TTS generation failed');
      return {
        success: false,
        engine: 'CoquiTTS',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Convert MIDI to WAV using FluidSynth
   */
  async midiToWav(
    midiPath: string,
    outputPath: string,
    soundfontPath?: string
  ): Promise<GenerationResult> {
    logger.info({ midiPath, outputPath }, 'Converting MIDI to WAV with FluidSynth');

    try {
      // Default soundfont path
      const sf2Path = soundfontPath || path.join(this.scriptsDir, '../assets/GeneralUser.sf2');

      const args = [
        '-ni',
        sf2Path,
        midiPath,
        '-F', outputPath,
        '-r', '44100'
      ];

      await this.runCommand('fluidsynth', args, 120000);

      // Check if file was created
      const stats = await fs.stat(outputPath);

      return {
        success: true,
        outputPath,
        engine: 'FluidSynth',
        metadata: {
          fileSizeBytes: stats.size
        }
      };
    } catch (error) {
      logger.error({ error }, 'FluidSynth conversion failed');
      return {
        success: false,
        engine: 'FluidSynth',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Mix multiple audio files using FFmpeg
   */
  async mixAudio(
    inputPaths: string[],
    outputPath: string,
    options?: {
      normalize?: boolean;
      limiter?: boolean;
      loudness?: boolean;
    }
  ): Promise<GenerationResult> {
    logger.info({ inputPaths, outputPath, options }, 'Mixing audio with FFmpeg');

    try {
      const validPaths: string[] = [];
      
      // Verify all input files exist
      for (const inputPath of inputPaths) {
        try {
          await fs.access(inputPath);
          validPaths.push(inputPath);
        } catch {
          logger.warn({ inputPath }, 'Input file not found, skipping');
        }
      }

      if (validPaths.length === 0) {
        throw new Error('No valid input files found');
      }

      // If only one file, just copy it
      if (validPaths.length === 1) {
        await fs.copyFile(validPaths[0], outputPath);
        const stats = await fs.stat(outputPath);
        return {
          success: true,
          outputPath,
          engine: 'FFmpeg (copy)',
          metadata: { fileSizeBytes: stats.size }
        };
      }

      // Build FFmpeg command
      const inputs = validPaths.flatMap(p => ['-i', p]);
      
      // Build filter complex for mixing
      const inputLabels = validPaths.map((_, i) => `[${i}:a]`).join('');
      let filterChain = `${inputLabels}amix=inputs=${validPaths.length}:duration=longest`;

      if (options?.normalize !== false) {
        filterChain += ',dynaudnorm';
      }

      if (options?.limiter !== false) {
        filterChain += ',alimiter=limit=0.95';
      }

      if (options?.loudness !== false) {
        filterChain += ',loudnorm=I=-14:TP=-1.0:LRA=11';
      }

      filterChain += '[out]';

      const args = [
        ...inputs,
        '-filter_complex', filterChain,
        '-map', '[out]',
        '-ar', '44100',
        '-ac', '2',
        '-y',
        outputPath
      ];

      await this.runCommand('ffmpeg', args, 180000);

      const stats = await fs.stat(outputPath);

      return {
        success: true,
        outputPath,
        engine: 'FFmpeg',
        metadata: {
          inputCount: validPaths.length,
          fileSizeBytes: stats.size
        }
      };
    } catch (error) {
      logger.error({ error }, 'FFmpeg mixing failed');
      return {
        success: false,
        engine: 'FFmpeg',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Generate video with audio visualization
   */
  async generateVideo(
    audioPath: string,
    outputPath: string,
    visualizerType: 'showwaves' | 'showspectrum' = 'showwaves'
  ): Promise<GenerationResult> {
    logger.info({ audioPath, outputPath, visualizerType }, 'Generating video with FFmpeg');

    try {
      let filterComplex: string;

      if (visualizerType === 'showwaves') {
        filterComplex = 'showwaves=s=1280x720:mode=cline:colors=white|cyan|blue';
      } else {
        filterComplex = 'showspectrum=s=1280x720:mode=combined:color=rainbow:scale=log';
      }

      const args = [
        '-i', audioPath,
        '-filter_complex', filterComplex,
        '-r', '30',
        '-pix_fmt', 'yuv420p',
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-shortest',
        '-y',
        outputPath
      ];

      await this.runCommand('ffmpeg', args, 300000);

      const stats = await fs.stat(outputPath);

      return {
        success: true,
        outputPath,
        engine: 'FFmpeg (Video)',
        metadata: {
          visualizer: visualizerType,
          fileSizeBytes: stats.size
        }
      };
    } catch (error) {
      logger.error({ error }, 'FFmpeg video generation failed');
      return {
        success: false,
        engine: 'FFmpeg (Video)',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Run Python script and capture output
   */
  private runPython(args: string[], timeout: number = 60000): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn(this.pythonPath, args);
      let stdout = '';
      let stderr = '';

      const timer = setTimeout(() => {
        proc.kill();
        reject(new Error(`Python process timed out after ${timeout}ms`));
      }, timeout);

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        clearTimeout(timer);
        
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Python process exited with code ${code}: ${stderr}`));
        }
      });

      proc.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  /**
   * Run system command
   */
  private runCommand(command: string, args: string[], timeout: number = 60000): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args);
      let stdout = '';
      let stderr = '';

      const timer = setTimeout(() => {
        proc.kill();
        reject(new Error(`Command timed out after ${timeout}ms`));
      }, timeout);

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        clearTimeout(timer);
        
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Command exited with code ${code}: ${stderr}`));
        }
      });

      proc.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }
}

// Singleton instance
export const openSourceBridge = new OpenSourceBridge();
