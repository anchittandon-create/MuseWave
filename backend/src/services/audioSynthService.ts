import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, mkdir, rm } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { logger } from '../logger.js';
import { MusicPlan } from './planService.js';

const execAsync = promisify(exec);

export interface SynthEvent {
  instrument: string;
  time: number; // seconds
  duration: number; // seconds
  frequency?: number;
  velocity?: number;
}

export class AudioSynthService {
  private workDir: string;

  constructor() {
    this.workDir = '/tmp/musewave-synthesis';
  }

  private async ensureWorkDir() {
    if (!existsSync(this.workDir)) {
      await mkdir(this.workDir, { recursive: true });
    }
  }

  private async checkFfmpeg(): Promise<{ cli: boolean; wasm: boolean }> {
    try {
      await execAsync('ffmpeg -version');
      return { cli: true, wasm: false };
    } catch {
      logger.warn('ffmpeg CLI not available, will use ffmpeg.wasm if needed');
      return { cli: false, wasm: true };
    }
  }

  /**
   * Generate a kick drum sample (60ms)
   */
  private async generateKick(outputPath: string): Promise<void> {
    const cmd = `ffmpeg -f lavfi -i "sine=f=56:d=0.06" -af "afade=t=out:st=0.03:d=0.03,alimiter=limit=0.95" -y "${outputPath}"`;
    await execAsync(cmd);
    logger.debug({ outputPath }, 'Generated kick sample');
  }

  /**
   * Generate a snare drum sample (110ms)
   */
  private async generateSnare(outputPath: string): Promise<void> {
    const cmd = `ffmpeg -f lavfi -i "anoisesrc=color=white:amplitude=0.3:d=0.11" -af "bandpass=f=1800:w=2,aecho=0.3:0.4:60:0.3,afade=t=out:st=0.07:d=0.04" -y "${outputPath}"`;
    await execAsync(cmd);
    logger.debug({ outputPath }, 'Generated snare sample');
  }

  /**
   * Generate a hi-hat sample (40ms)
   */
  private async generateHat(outputPath: string): Promise<void> {
    const cmd = `ffmpeg -f lavfi -i "anoisesrc=color=white:amplitude=0.15:d=0.04" -af "highpass=f=6000,afade=t=out:st=0.02:d=0.02" -y "${outputPath}"`;
    await execAsync(cmd);
    logger.debug({ outputPath }, 'Generated hat sample');
  }

  /**
   * Generate a bass sample (250ms)
   */
  private async generateBass(frequency: number, outputPath: string): Promise<void> {
    const cmd = `ffmpeg -f lavfi -i "sine=f=${frequency}:d=0.25" -af "acompressor=threshold=-18dB:ratio=2,afade=t=out:st=0.20:d=0.05" -y "${outputPath}"`;
    await execAsync(cmd);
    logger.debug({ outputPath, frequency }, 'Generated bass sample');
  }

  /**
   * Generate a lead synth sample (250ms)
   */
  private async generateLead(frequency: number, outputPath: string): Promise<void> {
    const cmd = `ffmpeg -f lavfi -i "sine=f=${frequency}:d=0.25" -af "vibrato=f=5:d=0.4,aphaser=type=t:speed=0.5,afade=t=out:st=0.22:d=0.03" -y "${outputPath}"`;
    await execAsync(cmd);
    logger.debug({ outputPath, frequency }, 'Generated lead sample');
  }

  /**
   * Build events from plan
   */
  private buildEvents(plan: MusicPlan, durationSec: number): SynthEvent[] {
    const events: SynthEvent[] = [];
    const bpm = plan.bpm;
    const beatDuration = 60 / bpm; // seconds per beat
    const eighthNoteDuration = beatDuration / 2;

    // Key parsing
    const keyMatch = plan.key.match(/([A-G]#?)\s*(major|minor)/i);
    const rootNote = keyMatch ? keyMatch[1] : 'C';
    const scale = keyMatch ? keyMatch[2].toLowerCase() : 'minor';

    // Frequency map (simple octave 2 for bass, octave 4 for lead)
    const noteFreq: Record<string, number> = {
      'C': 130.81, 'C#': 138.59, 'D': 146.83, 'D#': 155.56,
      'E': 164.81, 'F': 174.61, 'F#': 185.00, 'G': 196.00,
      'G#': 207.65, 'A': 220.00, 'A#': 233.08, 'B': 246.94,
    };

    const bassFreq = noteFreq[rootNote] || 110;
    const leadFreq = bassFreq * 2; // One octave up

    const numBeats = Math.floor(durationSec / beatDuration);

    // Generate rhythmic grid
    for (let beat = 0; beat < numBeats; beat++) {
      const time = beat * beatDuration;

      // Kick on every beat
      events.push({
        instrument: 'kick',
        time,
        duration: 0.06,
      });

      // Snare on beats 2 & 4 (if 4/4)
      if (beat % 4 === 1 || beat % 4 === 3) {
        events.push({
          instrument: 'snare',
          time,
          duration: 0.11,
        });
      }

      // Hi-hat on every eighth note
      for (let eighth = 0; eighth < 2; eighth++) {
        const hatTime = time + eighth * eighthNoteDuration;
        if (hatTime < durationSec) {
          events.push({
            instrument: 'hat',
            time: hatTime,
            duration: 0.04,
          });
        }
      }

      // Bass on beats 1 & 3
      if (beat % 4 === 0 || beat % 4 === 2) {
        events.push({
          instrument: 'bass',
          time,
          duration: 0.25,
          frequency: bassFreq,
        });
      }

      // Lead arpeggio pattern
      const arpNotes = [0, 0.25, 0.5, 0.75]; // quarter notes
      arpNotes.forEach(offset => {
        const leadTime = time + offset * beatDuration;
        if (leadTime < durationSec) {
          events.push({
            instrument: 'lead',
            time: leadTime,
            duration: 0.25,
            frequency: leadFreq,
          });
        }
      });
    }

    return events;
  }

  /**
   * Generate stems for each instrument
   */
  private async generateStems(events: SynthEvent[], tempDir: string, durationSec: number): Promise<Record<string, string>> {
    const instrumentEvents: Record<string, SynthEvent[]> = {
      kick: [],
      snare: [],
      hat: [],
      bass: [],
      lead: [],
    };

    // Group events by instrument
    events.forEach(event => {
      if (instrumentEvents[event.instrument]) {
        instrumentEvents[event.instrument].push(event);
      }
    });

    const stemPaths: Record<string, string> = {};

    // Generate samples
    const kickSample = path.join(tempDir, 'kick_sample.wav');
    const snareSample = path.join(tempDir, 'snare_sample.wav');
    const hatSample = path.join(tempDir, 'hat_sample.wav');

    await this.generateKick(kickSample);
    await this.generateSnare(snareSample);
    await this.generateHat(hatSample);

    // For each instrument, create a concat list
    for (const [instrument, instrEvents] of Object.entries(instrumentEvents)) {
      if (instrEvents.length === 0) continue;

      const concatListPath = path.join(tempDir, `${instrument}_concat.txt`);
      const stemPath = path.join(tempDir, `${instrument}.wav`);

      if (instrument === 'bass' || instrument === 'lead') {
        // Generate individual samples for pitched instruments
        const samplePaths: string[] = [];
        for (let i = 0; i < instrEvents.length; i++) {
          const event = instrEvents[i];
          const samplePath = path.join(tempDir, `${instrument}_${i}.wav`);
          if (instrument === 'bass') {
            await this.generateBass(event.frequency || 110, samplePath);
          } else {
            await this.generateLead(event.frequency || 440, samplePath);
          }
          samplePaths.push(samplePath);
        }

        // Build concat list with silence between samples
        const concatList: string[] = [];
        let currentTime = 0;

        for (let i = 0; i < instrEvents.length; i++) {
          const event = instrEvents[i];
          const samplePath = samplePaths[i];

          // Add silence if needed
          if (event.time > currentTime) {
            const silenceDuration = event.time - currentTime;
            concatList.push(`file ${path.join(tempDir, 'silence.wav')}`);
            // Create a tiny silence file
            await execAsync(`ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t ${silenceDuration} -y "${path.join(tempDir, 'silence.wav')}"`);
          }

          concatList.push(`file ${samplePath}`);
          currentTime = event.time + event.duration;
        }

        await writeFile(concatListPath, concatList.join('\n'));
        await execAsync(`ffmpeg -f concat -safe 0 -i "${concatListPath}" -ar 44100 -ac 1 -y "${stemPath}"`);
      } else {
        // For percussion, use the same sample multiple times
        const sampleMap: Record<string, string> = {
          kick: kickSample,
          snare: snareSample,
          hat: hatSample,
        };

        const samplePath = sampleMap[instrument];
        const concatList: string[] = [];
        let currentTime = 0;

        for (const event of instrEvents) {
          // Add silence if needed
          if (event.time > currentTime) {
            const silenceDuration = event.time - currentTime;
            const silencePath = path.join(tempDir, `silence_${instrument}_${currentTime}.wav`);
            await execAsync(`ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t ${silenceDuration} -y "${silencePath}"`);
            concatList.push(`file ${silencePath}`);
          }

          concatList.push(`file ${samplePath}`);
          currentTime = event.time + event.duration;
        }

        await writeFile(concatListPath, concatList.join('\n'));
        await execAsync(`ffmpeg -f concat -safe 0 -i "${concatListPath}" -ar 44100 -ac 1 -y "${stemPath}"`);
      }

      stemPaths[instrument] = stemPath;
    }

    return stemPaths;
  }

  /**
   * Mix stems into final audio
   */
  private async mixStems(stemPaths: Record<string, string>, outputPath: string): Promise<void> {
    const inputs = Object.values(stemPaths).map(p => `-i "${p}"`).join(' ');
    const inputLabels = Object.keys(stemPaths).map((_, i) => `[${i}:a]`).join('');
    const numInputs = Object.keys(stemPaths).length;

    const cmd = `ffmpeg ${inputs} -filter_complex "${inputLabels}amix=inputs=${numInputs}:normalize=0,alimiter=limit=0.95,dynaudnorm,loudnorm=I=-14:TP=-1.0:LRA=11[out]" -map "[out]" -ar 44100 -ac 2 -y "${outputPath}"`;
    
    await execAsync(cmd);
    logger.info({ outputPath }, 'Mixed audio stems');
  }

  /**
   * Main synthesis function
   */
  async synthesize(plan: MusicPlan, durationSec: number, outputPath: string): Promise<void> {
    await this.ensureWorkDir();

    const tempDir = path.join(this.workDir, `job_${Date.now()}`);
    await mkdir(tempDir, { recursive: true });

    try {
      logger.info({ plan, durationSec }, 'Starting audio synthesis');

      // Build events
      const events = this.buildEvents(plan, durationSec);
      logger.debug({ eventCount: events.length }, 'Built events');

      // Generate stems
      const stemPaths = await this.generateStems(events, tempDir, durationSec);
      logger.debug({ stems: Object.keys(stemPaths) }, 'Generated stems');

      // Mix stems
      await this.mixStems(stemPaths, outputPath);
      logger.info({ outputPath }, 'Audio synthesis complete');
    } finally {
      // Clean up temp directory
      await rm(tempDir, { recursive: true, force: true });
    }
  }
}

export const audioSynthService = new AudioSynthService();
