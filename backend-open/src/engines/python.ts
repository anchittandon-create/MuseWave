import { spawn } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { env } from '../env.js';

const moduleCache = new Map<string, boolean>();

async function hasModule(mod: string): Promise<boolean> {
  if (moduleCache.has(mod)) return moduleCache.get(mod)!;
  try {
    await runPython(['-c', `import ${mod}`]);
    moduleCache.set(mod, true);
    return true;
  } catch {
    moduleCache.set(mod, false);
    return false;
  }
}

function runPython(args: string[], inherit = false): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(env.PYTHON_BIN, args, { stdio: inherit ? 'inherit' : 'ignore' });
    proc.on('exit', code => (code === 0 ? resolve() : reject(new Error(`${env.PYTHON_BIN} exited ${code}`))));
    proc.on('error', reject);
  });
}

export async function runRiffusion(prompt: string, durationSec: number): Promise<string | null> {
  if (!(await hasModule('riffusion'))) return null;
  const out = join(tmpdir(), `riff-${randomUUID()}.wav`);
  return new Promise(resolve => {
    const proc = spawn(env.PYTHON_BIN, ['-m', 'riffusion.cli', '--prompt', prompt, '--output', out, '--duration', durationSec.toString()], {
      stdio: 'inherit'
    });
    proc.on('exit', code => resolve(code === 0 ? out : null));
    proc.on('error', () => resolve(null));
  });
}

export async function runMagenta(durationSec: number): Promise<string | null> {
  if (!(await hasModule('magenta'))) return null;
  const dir = join(tmpdir(), `magenta-${randomUUID()}`);
  const midiPath = join(dir, 'melody.mid');
  const wavPath = join(dir, 'melody.wav');
  return new Promise(resolve => {
    const proc = spawn(env.PYTHON_BIN, ['-m', 'magenta.scripts.melody_generator', '--num_outputs=1', `--duration=${durationSec}`, `--output_dir=${dir}`], {
      stdio: 'inherit'
    });
    proc.on('exit', code => {
      if (code !== 0) return resolve(null);
      if (!env.SOUND_FONT_PATH) return resolve(null);
      const fsynth = spawn('fluidsynth', ['-ni', env.SOUND_FONT_PATH, midiPath, '-F', wavPath, '-r', '44100'], { stdio: 'inherit' });
      fsynth.on('exit', c => resolve(c === 0 ? wavPath : null));
      fsynth.on('error', () => resolve(null));
    });
    proc.on('error', () => resolve(null));
  });
}

export async function runCoqui(text: string, lang?: string): Promise<string | null> {
  if (!(await hasModule('TTS'))) return null;
  const out = join(tmpdir(), `tts-${randomUUID()}.wav`);
  return new Promise(resolve => {
    const args = ['-m', 'TTS.__main__', '--text', text, '--out_path', out];
    if (lang) args.push('--language', lang);
    const proc = spawn(env.PYTHON_BIN, args, { stdio: 'inherit' });
    proc.on('exit', code => resolve(code === 0 ? out : null));
    proc.on('error', () => resolve(null));
  });
}
