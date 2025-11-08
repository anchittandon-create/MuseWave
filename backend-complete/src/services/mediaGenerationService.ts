/**
 * MuseWave - Media Generation Service
 * Node.js wrapper for Python-based audio/video generation
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, statSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

export interface GenerationOptions {
  prompt: string;
  lyrics?: string;
  language?: string;
  jobId?: string;
  outputDir?: string;
  videoStyle?: 'spectrum' | 'waveform' | 'volumeter';
}

export interface GenerationResult {
  success: boolean;
  jobId: string;
  audioUrl: string;
  videoUrl: string;
  outputDir: string;
  error?: string;
}

export class MediaGenerationService {
  private pythonScript: string;
  private publicDir: string;

  constructor(pythonScriptPath?: string, publicDir?: string) {
    this.pythonScript = pythonScriptPath || join(__dirname, '../../backend-complete/scripts/generate_media.py');
    this.publicDir = publicDir || join(__dirname, '../../public');
    
    // Verify script exists
    if (!existsSync(this.pythonScript)) {
      throw new Error(`Python generator script not found: ${this.pythonScript}`);
    }
  }

  /**
   * Check if all dependencies are installed
   */
  async checkDependencies(): Promise<{ ok: boolean; missing: string[] }> {
    const tools = ['ffmpeg', 'ffprobe', 'fluidsynth', 'python3'];
    const missing: string[] = [];

    for (const tool of tools) {
      try {
        await execAsync(`which ${tool}`);
      } catch (error) {
        missing.push(tool);
      }
    }

    // Check Python packages
    const pythonPackages = ['midiutil'];
    for (const pkg of pythonPackages) {
      try {
        await execAsync(`python3 -c "import ${pkg}"`);
      } catch (error) {
        missing.push(`python-${pkg}`);
      }
    }

    return {
      ok: missing.length === 0,
      missing,
    };
  }

  /**
   * Validate generated audio file
   */
  private async validateAudioFile(filepath: string): Promise<boolean> {
    try {
      // Check file exists and has size
      if (!existsSync(filepath)) {
        throw new Error(`Audio file not found: ${filepath}`);
      }

      const stats = statSync(filepath);
      if (stats.size < 10000) {
        throw new Error(`Audio file too small: ${stats.size} bytes`);
      }

      // Use ffprobe to validate format
      const { stdout } = await execAsync(
        `ffprobe -v error -show_streams -of json "${filepath}"`
      );
      
      const data = JSON.parse(stdout);
      if (!data.streams || data.streams.length === 0) {
        throw new Error('No audio streams found in file');
      }

      const audioStream = data.streams[0];
      console.log(`✓ Audio validated: ${audioStream.codec_name}, ` +
                  `${audioStream.sample_rate}Hz, ${audioStream.channels}ch`);
      
      return true;
    } catch (error) {
      console.error('Audio validation failed:', error);
      throw error;
    }
  }

  /**
   * Validate generated video file
   */
  private async validateVideoFile(filepath: string): Promise<boolean> {
    try {
      // Check file exists and has size
      if (!existsSync(filepath)) {
        throw new Error(`Video file not found: ${filepath}`);
      }

      const stats = statSync(filepath);
      if (stats.size < 10000) {
        throw new Error(`Video file too small: ${stats.size} bytes`);
      }

      // Use ffprobe to validate format
      const { stdout } = await execAsync(
        `ffprobe -v error -show_streams -of json "${filepath}"`
      );
      
      const data = JSON.parse(stdout);
      if (!data.streams || data.streams.length === 0) {
        throw new Error('No streams found in video file');
      }

      const videoStream = data.streams.find((s: any) => s.codec_type === 'video');
      if (!videoStream) {
        throw new Error('No video stream found');
      }

      console.log(`✓ Video validated: ${videoStream.codec_name}, ` +
                  `${videoStream.width}x${videoStream.height}`);
      
      return true;
    } catch (error) {
      console.error('Video validation failed:', error);
      throw error;
    }
  }

  /**
   * Generate audio and video files
   */
  async generate(options: GenerationOptions): Promise<GenerationResult> {
    const {
      prompt,
      lyrics = '',
      language = 'English',
      jobId,
      outputDir,
      videoStyle = 'spectrum',
    } = options;

    console.log('\n' + '='.repeat(60));
    console.log('🎵 Starting Media Generation');
    console.log('='.repeat(60));
    console.log(`Prompt: ${prompt}`);
    console.log(`Lyrics: ${lyrics ? lyrics.substring(0, 50) + '...' : '(none)'}`);
    console.log(`Language: ${language}`);
    console.log('='.repeat(60) + '\n');

    try {
      // Check dependencies first
      const depsCheck = await this.checkDependencies();
      if (!depsCheck.ok) {
        throw new Error(
          `Missing dependencies: ${depsCheck.missing.join(', ')}\n` +
          `Run: bash backend-complete/scripts/setup_dependencies.sh`
        );
      }

      // Build command
      const args = [
        `"${prompt}"`,
        lyrics ? `"${lyrics.replace(/"/g, '\\"')}"` : '""',
        `"${language}"`,
      ];

      if (jobId) {
        args.push(`--job-id "${jobId}"`);
      }
      if (outputDir) {
        args.push(`--output-dir "${outputDir}"`);
      }
      args.push(`--video-style "${videoStyle}"`);

      const command = `python3 "${this.pythonScript}" ${args.join(' ')}`;
      
      console.log('📝 Executing:', command);
      console.log('');

      // Execute generation (with timeout of 5 minutes)
      const { stdout, stderr } = await execAsync(command, {
        timeout: 300000,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      if (stderr && !stderr.includes('warning')) {
        console.warn('⚠️  stderr output:', stderr);
      }

      console.log('📄 Python output:', stdout);

      // Parse output directory from stdout
      const outputDirMatch = stdout.match(/Output directory: (.+)/);
      const actualOutputDir = outputDirMatch ? outputDirMatch[1].trim() : null;

      if (!actualOutputDir) {
        throw new Error('Could not determine output directory from generator');
      }

      // Construct file paths
      const audioPath = join(actualOutputDir, 'mix.wav');
      const videoPath = join(actualOutputDir, 'final.mp4');

      // Validate generated files
      console.log('\n🔍 Validating generated files...');
      await this.validateAudioFile(audioPath);
      await this.validateVideoFile(videoPath);

      // Convert absolute paths to URLs
      const relativeDir = actualOutputDir.replace(this.publicDir, '');
      const audioUrl = relativeDir + '/mix.wav';
      const videoUrl = relativeDir + '/final.mp4';

      const result: GenerationResult = {
        success: true,
        jobId: jobId || actualOutputDir.split('/').pop() || 'unknown',
        audioUrl,
        videoUrl,
        outputDir: actualOutputDir,
      };

      console.log('\n' + '='.repeat(60));
      console.log('✅ Generation Successful');
      console.log('='.repeat(60));
      console.log(`Audio: ${audioUrl}`);
      console.log(`Video: ${videoUrl}`);
      console.log('='.repeat(60) + '\n');

      return result;

    } catch (error: any) {
      console.error('\n' + '='.repeat(60));
      console.error('❌ Generation Failed');
      console.error('='.repeat(60));
      console.error('Error:', error.message);
      if (error.stderr) {
        console.error('stderr:', error.stderr);
      }
      console.error('='.repeat(60) + '\n');

      return {
        success: false,
        jobId: jobId || 'unknown',
        audioUrl: '',
        videoUrl: '',
        outputDir: outputDir || '',
        error: error.message,
      };
    }
  }

  /**
   * Generate only audio (skip video)
   */
  async generateAudioOnly(options: Omit<GenerationOptions, 'videoStyle'>): Promise<GenerationResult> {
    // For audio-only, we still generate video but it's optional
    return this.generate({ ...options, videoStyle: 'spectrum' });
  }
}

// Singleton instance
let instance: MediaGenerationService | null = null;

export function getMediaGenerationService(): MediaGenerationService {
  if (!instance) {
    instance = new MediaGenerationService();
  }
  return instance;
}

// Example usage
export async function testGeneration() {
  const service = getMediaGenerationService();
  
  const result = await service.generate({
    prompt: 'dreamy synthwave with neon vibes',
    lyrics: 'Riding through the neon rain, electric dreams sustain',
    language: 'English',
    videoStyle: 'spectrum',
  });

  if (result.success) {
    console.log('✅ Test generation succeeded!');
    console.log('   Audio:', result.audioUrl);
    console.log('   Video:', result.videoUrl);
  } else {
    console.error('❌ Test generation failed:', result.error);
  }

  return result;
}
