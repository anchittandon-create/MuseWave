import { execa } from 'execa';
import { env } from '../config/env.js';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Python Bridge for AI Model Integration
 * Spawns Python processes to run Riffusion, Magenta, Coqui TTS, FluidSynth
 */

interface PythonResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  stderr?: string;
}

const PYTHON_CMD = env.PYTHON_VENV 
  ? join(env.PYTHON_VENV, 'bin', 'python')
  : env.PYTHON_BIN;

/**
 * Check if a Python module is available
 */
async function checkPythonModule(moduleName: string): Promise<boolean> {
  try {
    const { exitCode } = await execa(PYTHON_CMD, ['-c', `import ${moduleName}`], {
      reject: false,
      timeout: 5000,
    });
    return exitCode === 0;
  } catch {
    return false;
  }
}

/**
 * Riffusion: Text-to-Audio Diffusion Model
 * Generates audio texture from text prompt
 */
export async function generateRiffusion(
  prompt: string,
  durationSec: number,
  outputPath: string,
  options: {
    seed?: number;
    inferenceSteps?: number;
    guidance?: number;
  } = {}
): Promise<PythonResult> {
  if (!env.ENABLE_RIFFUSION) {
    return { success: false, error: 'Riffusion disabled' };
  }

  try {
    const hasRiffusion = await checkPythonModule('riffusion');
    if (!hasRiffusion) {
      return { success: false, error: 'Riffusion not installed' };
    }

    const args = [
      join(__dirname, '../python/riffusion_generate.py'),
      '--prompt', prompt,
      '--duration', durationSec.toString(),
      '--output', outputPath,
    ];

    if (options.seed !== undefined) {
      args.push('--seed', options.seed.toString());
    }
    if (options.inferenceSteps) {
      args.push('--steps', options.inferenceSteps.toString());
    }
    if (options.guidance) {
      args.push('--guidance', options.guidance.toString());
    }

    const { stdout, stderr, exitCode } = await execa(PYTHON_CMD, args, {
      reject: false,
      timeout: durationSec * 2000 + 30000, // 2x duration + 30s overhead
    });

    if (exitCode === 0 && existsSync(outputPath)) {
      return { success: true, outputPath };
    }

    return { success: false, error: stdout || stderr, stderr };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Riffusion generation failed',
    };
  }
}

/**
 * Magenta: Melody Generation via MIDI
 * Uses MelodyRNN to generate MIDI sequences
 */
export async function generateMagentaMelody(
  durationSec: number,
  outputMidiPath: string,
  options: {
    temperature?: number;
    stepsPerQuarter?: number;
    seed?: number;
  } = {}
): Promise<PythonResult> {
  if (!env.ENABLE_MAGENTA) {
    return { success: false, error: 'Magenta disabled' };
  }

  try {
    const hasMagenta = await checkPythonModule('magenta');
    if (!hasMagenta) {
      return { success: false, error: 'Magenta not installed' };
    }

    const args = [
      join(__dirname, '../python/magenta_melody.py'),
      '--duration', durationSec.toString(),
      '--output', outputMidiPath,
    ];

    if (options.temperature) {
      args.push('--temperature', options.temperature.toString());
    }
    if (options.stepsPerQuarter) {
      args.push('--steps-per-quarter', options.stepsPerQuarter.toString());
    }
    if (options.seed !== undefined) {
      args.push('--seed', options.seed.toString());
    }

    const { stdout, stderr, exitCode } = await execa(PYTHON_CMD, args, {
      reject: false,
      timeout: 60000, // MIDI generation should be fast
    });

    if (exitCode === 0 && existsSync(outputMidiPath)) {
      return { success: true, outputPath: outputMidiPath };
    }

    return { success: false, error: stdout || stderr, stderr };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Magenta generation failed',
    };
  }
}

/**
 * FluidSynth: Render MIDI to WAV
 * Converts MIDI file to audio using SoundFont
 */
export async function renderMidiWithFluidSynth(
  midiPath: string,
  outputWavPath: string,
  options: {
    soundfont?: string;
    sampleRate?: number;
    gain?: number;
  } = {}
): Promise<PythonResult> {
  try {
    const soundfont = options.soundfont || env.SOUND_FONT_PATH;
    
    if (!existsSync(soundfont)) {
      return { success: false, error: `SoundFont not found: ${soundfont}` };
    }

    if (!existsSync(midiPath)) {
      return { success: false, error: `MIDI file not found: ${midiPath}` };
    }

    const args = [
      '-ni', // Non-interactive
      soundfont,
      midiPath,
      '-F', outputWavPath,
      '-r', (options.sampleRate || env.DEFAULT_SAMPLE_RATE).toString(),
    ];

    if (options.gain) {
      args.push('-g', options.gain.toString());
    }

    const { stderr, exitCode } = await execa('fluidsynth', args, {
      reject: false,
      timeout: 120000,
    });

    if (exitCode === 0 && existsSync(outputWavPath)) {
      return { success: true, outputPath: outputWavPath };
    }

    return { success: false, error: 'FluidSynth rendering failed', stderr };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'FluidSynth failed',
    };
  }
}

/**
 * Coqui TTS: Text-to-Speech Synthesis
 * Generates vocals from lyrics
 */
export async function generateCoquiVocals(
  text: string,
  outputPath: string,
  options: {
    language?: string;
    speaker?: string;
    emotion?: string;
  } = {}
): Promise<PythonResult> {
  if (!env.ENABLE_COQUI) {
    return { success: false, error: 'Coqui TTS disabled' };
  }

  try {
    const hasCoqui = await checkPythonModule('TTS');
    if (!hasCoqui) {
      return { success: false, error: 'Coqui TTS not installed' };
    }

    const args = [
      join(__dirname, '../python/coqui_tts.py'),
      '--text', text,
      '--output', outputPath,
    ];

    if (options.language) {
      args.push('--language', options.language);
    }
    if (options.speaker) {
      args.push('--speaker', options.speaker);
    }
    if (options.emotion) {
      args.push('--emotion', options.emotion);
    }

    const { stdout, stderr, exitCode } = await execa(PYTHON_CMD, args, {
      reject: false,
      timeout: 120000,
    });

    if (exitCode === 0 && existsSync(outputPath)) {
      return { success: true, outputPath };
    }

    return { success: false, error: stdout || stderr, stderr };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Coqui TTS failed',
    };
  }
}

/**
 * Verify all Python dependencies
 */
export async function verifyPythonDependencies(): Promise<{
  riffusion: boolean;
  magenta: boolean;
  coqui: boolean;
  fluidsynth: boolean;
}> {
  const [riffusion, magenta, coqui] = await Promise.all([
    checkPythonModule('riffusion'),
    checkPythonModule('magenta'),
    checkPythonModule('TTS'),
  ]);

  // Check FluidSynth binary
  let fluidsynth = false;
  try {
    const { exitCode } = await execa('fluidsynth', ['--version'], { reject: false, timeout: 5000 });
    fluidsynth = exitCode === 0;
  } catch {
    fluidsynth = false;
  }

  return { riffusion, magenta, coqui, fluidsynth };
}
