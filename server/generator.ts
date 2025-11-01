import { FFMode, detectMode, runCli } from './ffmpeg';
import { buildEvents } from './events';
import { datedAssetPrefix, saveBufferPreferBlob } from './storage';
import { touchJob } from './db';
import { generatePlan } from './plan';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeFile, readFile } from 'node:fs/promises';

export type GenerateInput = {
  musicPrompt: string,
  genres: string[],
  durationSec: number,
  artistInspiration?: string[],
  lyrics?: string,
  vocalLanguages?: string[],
  generateVideo?: boolean,
  videoStyles?: ("Lyric Video"|"Official Music Video"|"Abstract Visualizer")[]
};

export async function runGeneration(jobId: string, body: GenerateInput): Promise<{
  bpm: number; key: string; scale: 'minor'|'major';
  assets: { previewUrl: string; mixUrl: string; videoUrl?: string };
  debug: { mode: FFMode; duration: number; errors?: string[] }
}> {
  const started = Date.now();
  const plan = await generatePlan(body);
  const mode = await detectMode();

  const prefix = datedAssetPrefix();
  const workDir = join(tmpdir(), 'musewave', jobId);
  await touchJob(jobId, { status: 'planning', progress: 5, eta_seconds: 40, plan });

  // Prebuild one-shot segments (60ms kick, 110ms snare, etc.)
  await touchJob(jobId, { status: 'synth:segments', progress: 10, eta_seconds: 35 });
  async function makeSegment(name: string, ffArgs: string[]) {
    const args = ffArgs;
    await runCli(args);
    // read from temp file sink at the end of command (see args crafted below)
  }
  // We pipe outputs to files in tmp
  const paths = {
    kick: join(workDir, 'kick_seg.wav'),
    snare: join(workDir, 'snare_seg.wav'),
    hat: join(workDir, 'hat_seg.wav'),
    bass: join(workDir, 'bass_seg.wav'),
    lead: join(workDir, 'lead_seg.wav'),
  };

  // Prepare dir
  await writeFile(join(workDir, '.keep'), '');

  // Kick 60ms
  await runCli(['-f','lavfi','-i','sine=f=56:d=0.06','-af','afade=t=out:st=0.03:d=0.03,alimiter=limit=0.95','-y', paths.kick]);
  // Snare 110ms
  await runCli(['-f','lavfi','-i','anoisesrc=color=white:amplitude=0.3:d=0.11','-af','bandpass=f=1800:w=2,aecho=0.3:0.4:60:0.3,afade=t=out:st=0.07:d=0.04','-y', paths.snare]);
  // Hat 40ms
  await runCli(['-f','lavfi','-i','anoisesrc=color=white:amplitude=0.15:d=0.04','-af','highpass=f=6000,afade=t=out:st=0.02:d=0.02','-y', paths.hat]);
  // Bass 250ms
  await runCli(['-f','lavfi','-i','sine=f=110:d=0.25','-af','acompressor=threshold=-18dB:ratio=2,afade=t=out:st=0.20:d=0.05','-y', paths.bass]);
  // Lead 250ms
  await runCli(['-f','lavfi','-i','sine=f=440:d=0.25','-af','vibrato=f=5:d=0.4,aphaser=type=t:speed=0.5,afade=t=out:st=0.22:d=0.03','-y', paths.lead]);

  // Build rhythmic event lists
  await touchJob(jobId, { status: 'sequencing', progress: 25, eta_seconds: 25 });
  const events = buildEvents(plan.bpm, plan.durationSec);
  const sampleRate = 44100;

  function txtListFor(type: 'kick'|'snare'|'hat'|'bass'|'lead') {
    const listPath = join(workDir, `${type}_list.txt`);
    const src = paths[type];
    const lines: string[] = [];
    for (const e of events.filter(e => e.type === type)) {
      // make padded segment placed at tSec via atrim+adelay by concat trick:
      // we assemble many small segments back-to-back with silence between them
      // concat demuxer requires files; we synthesize silence then segment.
      lines.push(`file '${src.replace(/'/g,"'\\''")}'`);
      lines.push('inpoint 0');
      lines.push('outpoint 0'); // placeholder, demuxer ignores; files are already exact length
    }
    // Actually emit one file per event: copy the single-shot segment to segOut prefixed by adelay.
    return { listPath, src };
  }

  // Materialize event files and concat lists
  for (const type of ['kick','snare','hat','bass','lead'] as const) {
    const evs = events.filter(e => e.type === type);
    const seg = paths[type];
    const segList: string[] = [];
    let lastMs = 0;
    for (const e of evs) {
      const ms = Math.round(e.tSec * 1000);
      const segOut = join(workDir, `${type}_${ms}.wav`);
      const delay = Math.max(0, ms - lastMs);
      // use adelay to place segment in time
      const filter = `adelay=${delay}|${delay}`;
      await runCli(['-i', seg, '-af', filter, '-y', segOut]);
      segList.push(`file '${segOut.replace(/'/g, "'\\''")}'`);
      lastMs = ms;
    }
    const listPath = join(workDir, `${type}_list.txt`);
    await writeFile(listPath, segList.join('\n'));
    const stemOut = join(workDir, `${type}.wav`);
    await runCli(['-f','concat','-safe','0','-i', listPath, '-ar','44100','-ac','1','-y', stemOut]);
    await touchJob(jobId, { status: `render:${type}`, progress: 25 + Math.round(['kick','snare','hat','bass','lead'].indexOf(type)*8), eta_seconds: 20 });
  }

  // Mix preview and final
  await touchJob(jobId, { status: 'mixing', progress: 70, eta_seconds: 12 });
  const stemKick = join(workDir, 'kick.wav');
  const stemSnare = join(workDir, 'snare.wav');
  const stemHat = join(workDir, 'hat.wav');
  const stemBass = join(workDir, 'bass.wav');
  const stemLead = join(workDir, 'lead.wav');
  const preview = join(workDir, 'preview.wav');
  await runCli(['-i', stemKick,'-i',stemSnare,'-i',stemHat,'-i',stemBass,'-i',stemLead,'-filter_complex',
    '[0:a][1:a][2:a][3:a][4:a]amix=inputs=5:normalize=0,dynaudnorm[out]','-map','[out]','-y', preview]);

  const mixFile = join(workDir, 'mix.wav');
  await runCli(['-i', stemKick,'-i',stemSnare,'-i',stemHat,'-i',stemBass,'-i',stemLead,'-filter_complex',
    '[0:a]volume=0.9[k];[1:a]volume=0.9[s];[2:a]volume=0.7[h];[3:a]volume=0.7[b];[4:a]volume=0.7[l];[k][s][h][b][l]amix=inputs=5:normalize=0,alimiter=limit=0.95,dynaudnorm,loudnorm=I=-14:TP=-1.0:LRA=11[out]',
    '-map','[out]','-ar','44100','-ac','2','-y', mixFile]);

  // Vocals + captions (optional)
  let captionsPath: string | undefined;
  if (body.lyrics) {
    await touchJob(jobId, { status: 'vocals', progress: 80, eta_seconds: 8 });
    const dur = String(plan.durationSec);
    const vocals = join(workDir, 'vocals.wav');
    await runCli(['-f','lavfi','-i',`sine=f=440:d=${dur}`,'-af','anequalizer=f=700:width_type=h:width=150:g=6,anequalizer=f=1200:width_type=h:width=180:g=4,anequalizer=f=2600:width_type=h:width=250:g=3,afade=t=out:st='+(plan.durationSec-0.04)+':d=0.04','-y', vocals]);
    // Mix vocals into final
    const mixV = join(workDir, 'mix_v.wav');
    await runCli(['-i', mixFile, '-i', vocals, '-filter_complex',
    '[0:a]volume=0.9[m];[1:a]volume=0.6[v];[m][v]amix=inputs=2:normalize=0,alimiter=limit=0.95[out]','-map','[out]','-ar','44100','-ac','2','-y', mixV]);
    await writeFile(mixFile, await readFile(mixV));
    // captions
    const words = body.lyrics.trim().split(/\s+/g);
    const wpm = 190; const secPerWord = 60 / wpm;
    let t = 0; let idx = 1;
    const srtLines: string[] = [];
    for (let i = 0; i < words.length; i+=6) {
      const chunk = words.slice(i, i+6).join(' ');
      const start = t; const end = Math.min(plan.durationSec, t + 6*secPerWord);
      srtLines.push(String(idx++));
      srtLines.push(fmtSrtTime(start) + ' --> ' + fmtSrtTime(end));
      srtLines.push(chunk); srtLines.push('');
      t = end;
      if (t >= plan.durationSec) break;
    }
    captionsPath = join(workDir, 'captions.srt');
    await writeFile(captionsPath, srtLines.join('\n'), 'utf8');
  }

  // Video (optional)
  let videoUrl: string | undefined;
  if (body.generateVideo) {
    await touchJob(jobId, { status: 'video', progress: 88, eta_seconds: 6 });
    const style = body.videoStyles?.[0] || 'Official Music Video';
    const videoFile = join(workDir, 'final.mp4');
    if (style === 'Lyric Video' && captionsPath) {
      await runCli(['-i', mixFile, '-vf', `subtitles=${captionsPath},format=yuv420p,scale=1280:720`, '-r','30', '-shortest', '-y', videoFile]);
    } else if (style === 'Abstract Visualizer') {
      await runCli(['-i', mixFile, '-filter_complex', `[0:a]showwaves=s=1280x720:mode=cline,eq=contrast=1.2:brightness=0.02,format=yuv420p[v]`, '-map','[v]','-map','0:a','-r','30','-shortest','-y', videoFile]);
    } else {
      await runCli(['-i', mixFile, '-filter_complex', `[0:a]showspectrum=s=1280x720:mode=combined:color=rainbow,tmix=frames=3,eq=contrast=1.12[v]`, '-map','[v]','-map','0:a','-r','30','-shortest','-pix_fmt','yuv420p','-y', videoFile]);
    }
    const vidBuf = await readFile(videoFile);
    const saved = await saveBufferPreferBlob(vidBuf, `${prefix}/final.mp4`);
    videoUrl = saved.url;
  }

  // Upload assets
  await touchJob(jobId, { status: 'upload', progress: 94, eta_seconds: 3 });
  const previewBuf = await readFile(preview);
  const mixBuf = await readFile(mixFile);
  const previewSaved = await saveBufferPreferBlob(previewBuf, `${prefix}/preview.wav`);
  const mixSaved = await saveBufferPreferBlob(mixBuf, `${prefix}/mix.wav`);

  const duration = (Date.now() - started) / 1000;
  const assets = { previewUrl: previewSaved.url, mixUrl: mixSaved.url, ...(videoUrl ? { videoUrl } : {}) };
  await touchJob(jobId, { status: 'done', progress: 100, eta_seconds: 0, assets });

  return {
    bpm: plan.bpm,
    key: plan.key,
    scale: plan.scale,
    assets,
    debug: { mode, duration }
  };
}

function fmtSrtTime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec - Math.floor(sec)) * 1000);
  const pad = (n: number, w=2) => String(n).padStart(w,'0');
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms,3)}`;
}