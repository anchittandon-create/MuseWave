import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { writeFile } from 'fs/promises';
import { runFfmpeg } from '../utils/ffmpeg.js';

function makeTmpDir(prefix: string) {
  return mkdtempSync(join(tmpdir(), `${prefix}-`));
}

export async function buildInstrumental(durationSec: number): Promise<string> {
  const dir = makeTmpDir('inst');
  const out = join(dir, 'instrumental.wav');
  await runFfmpeg([
    '-y',
    '-f',
    'lavfi',
    '-i',
    `sine=f=110:d=${durationSec}`,
    '-f',
    'lavfi',
    '-i',
    `sine=f=440:d=${durationSec}`,
    '-f',
    'lavfi',
    '-i',
    `anoisesrc=color=pink:amplitude=0.035:d=${durationSec}`,
    '-filter_complex',
    '[0:a]volume=0.7,lowpass=f=900[a0];' +
      '[1:a]volume=0.3,chorus=0.7:0.9:55:0.4:0.25:2,treble=5[a1];' +
      '[2:a]highpass=f=6000,volume=0.18[a2];' +
      '[a0][a1][a2]amix=inputs=3:normalize=0,' +
      'alimiter=limit=0.95,dynaudnorm[aout]',
    '-map',
    '[aout]',
    '-ar',
    '44100',
    '-ac',
    '2',
    out
  ]);
  return out;
}

export async function synthesizeVocals(text: string, durationSec: number): Promise<{ wav: string; captions: string }> {
  const dir = makeTmpDir('voc');
  const wav = join(dir, 'vocals.wav');
  await runFfmpeg([
    '-y',
    '-f',
    'lavfi',
    '-i',
    `sine=f=440:d=${durationSec}`,
    '-af',
    'anequalizer=f=700:width_type=h:width=120:g=6,' +
      'anequalizer=f=1200:width_type=h:width=160:g=3,' +
      'anequalizer=f=2600:width_type=h:width=200:g=2,' +
      'asetrate=44100*1.02,atempo=0.98,apulsator=mode=sine:f=2:width=0.35,volume=0.65',
    wav
  ]);

  const captions = join(dir, 'captions.srt');
  await writeCaptions(text, durationSec, captions);
  return { wav, captions };
}

async function writeCaptions(text: string, durationSec: number, path: string) {
  const words = text.split(/\s+/).filter(Boolean);
  const wps = 190 / 60;
  let cursor = 0;
  let idx = 1;
  const lines: string[] = [];
  for (const word of words) {
    if (cursor >= durationSec) break;
    const start = cursor;
    const end = Math.min(durationSec, cursor + 1 / wps);
    lines.push(String(idx++));
    lines.push(`${fmt(start)} --> ${fmt(end)}`);
    lines.push(word);
    lines.push('');
    cursor = end;
  }
  await writeFile(path, lines.join('\n'), 'utf8');
}

function fmt(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec - Math.floor(sec)) * 1000);
  const pad = (n: number, width = 2) => String(n).padStart(width, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
}

export async function mixStems(stems: string[], outPath: string): Promise<void> {
  if (stems.length === 0) throw new Error('No stems provided');
  const args = ['-y'];
  stems.forEach(path => args.push('-i', path));
  const inputs = stems.map((_, idx) => `[${idx}:a]`).join('');
  args.push(
    '-filter_complex',
    `${inputs}amix=inputs=${stems.length}:normalize=0,` +
      'alimiter=limit=0.95,dynaudnorm,loudnorm=I=-14:TP=-1.0:LRA=11[out]',
    '-map',
    '[out]',
    '-ar',
    '44100',
    '-ac',
    '2',
    outPath
  );
  await runFfmpeg(args);
}

export async function renderVideo(style: string, mixPath: string, captions: string | null, outPath: string) {
  const args = ['-y', '-i', mixPath];
  if (style === 'Lyric Video' && captions) {
    args.push('-vf', `subtitles=${captions},format=yuv420p,scale=1280:720`);
    args.push('-r', '30', '-shortest', outPath);
  } else {
    const filter =
      style === 'Abstract Visualizer'
        ? '[0:a]showwaves=s=1280x720:mode=cline:colors=#00c3ff|#ff36d1,format=yuv420p[v]'
        : '[0:a]showspectrum=s=1280x720:mode=combined:color=rainbow,tmix=frames=3,eq=contrast=1.12[v]';
    args.push('-filter_complex', `${filter}`, '-map', '[v]', '-map', '0:a', '-r', '30', '-shortest', outPath);
  }
  await runFfmpeg(args);
}
