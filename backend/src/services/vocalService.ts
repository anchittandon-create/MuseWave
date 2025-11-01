import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { writeFile } from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../logger.js';

const execAsync = promisify(exec);

export class VocalService {
  async generateVocals(lyrics: string, duration: number, bpm: number, outputPath: string, languages?: string[]): Promise<void> {
    const tempDir = path.dirname(outputPath);
    await fs.mkdir(tempDir, { recursive: true });

    // Split lyrics into words and generate timing
    const words = lyrics.trim().split(/\s+/);
    const wordsPerMinute = 190; // Standard speaking rate
    const wordsPerSecond = wordsPerMinute / 60;
    const totalWords = words.length;
    const estimatedDuration = totalWords / wordsPerSecond;
    const scaleFactor = Math.min(duration / estimatedDuration, 1.2); // Don't speed up too much

    // Generate robotic vocal segments
    const vocalSegments: string[] = [];
    let currentTime = 0;

    for (let i = 0; i < words.length; i++) {
      const wordDuration = (1 / wordsPerSecond) * scaleFactor;
      const segmentPath = path.join(tempDir, `vocal_seg_${i}.wav`);
      
      // Generate tone-based vocal (simple robotic voice)
      const freq = 440; // Base frequency
      await execAsync(`ffmpeg -f lavfi -i "sine=f=${freq}:d=${wordDuration}" -af "anequalizer=f=700:width_type=h:width=150:g=6,anequalizer=f=1200:width_type=h:width=180:g=4,anequalizer=f=2600:width_type=h:width=250:g=3,afade=t=out:st=${wordDuration - 0.04}:d=0.04" -y "${segmentPath}"`);
      
      vocalSegments.push(segmentPath);
      currentTime += wordDuration;
    }

    // Concatenate all segments
    const concatList = vocalSegments.map(p => `file ${p}`).join('\n');
    const concatListPath = path.join(tempDir, 'vocals_concat.txt');
    await writeFile(concatListPath, concatList);
    
    await execAsync(`ffmpeg -f concat -safe 0 -i "${concatListPath}" -ar 44100 -ac 1 -y "${outputPath}"`);

    // Clean up temp files
    for (const seg of vocalSegments) {
      try {
        await fs.unlink(seg);
      } catch (error) {
        logger.warn({ error }, 'Failed to clean up vocal segment');
      }
    }

    logger.info({ outputPath }, 'Vocals generated');
  }

  async generateSRT(lyrics: string, duration: number, bpm: number): Promise<string> {
    const words = lyrics.trim().split(/\s+/);
    const wordsPerMinute = 190;
    const wordsPerSecond = wordsPerMinute / 60;
    
    let srt = '';
    let index = 1;
    let currentTime = 0;

    // Group words into phrases (about 5 words per subtitle)
    const wordsPerSubtitle = 5;
    for (let i = 0; i < words.length; i += wordsPerSubtitle) {
      const phrase = words.slice(i, i + wordsPerSubtitle).join(' ');
      const phraseDuration = Math.min(wordsPerSubtitle / wordsPerSecond, duration - currentTime);
      
      const startTime = this.formatSRTTime(currentTime);
      const endTime = this.formatSRTTime(currentTime + phraseDuration);
      
      srt += `${index}\n${startTime} --> ${endTime}\n${phrase}\n\n`;
      
      currentTime += phraseDuration;
      index++;
    }

    return srt;
  }

  private formatSRTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 1000);
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
  }

  async generateVocalsOld(plan: any, duration: number, outputPath: string): Promise<void> {
    // Simplified vocal generation - in reality, this would use TTS or vocal synthesis
    // For now, generate some vocal-like tones

    const tempDir = path.dirname(outputPath);
    await fs.mkdir(tempDir, { recursive: true });

    // Generate a simple vocal melody
    const melody = this.generateMelody(duration);

    await this.synthesizeMelody(melody, outputPath);
  }

  private generateMelody(duration: number): Array<{ freq: number; duration: number }> {
    // Simple melody generation
    const notes = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88]; // C major scale
    const melody = [];

    let time = 0;
    while (time < duration) {
      const noteDuration = Math.random() * 2 + 0.5; // 0.5-2.5 seconds
      const freq = notes[Math.floor(Math.random() * notes.length)];
      melody.push({ freq, duration: Math.min(noteDuration, duration - time) });
      time += noteDuration;
    }

    return melody;
  }

  private synthesizeMelody(melody: Array<{ freq: number; duration: number }>, outputPath: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const tempDir = path.dirname(outputPath);
      const partFiles: string[] = [];

      // Generate each note
      for (let i = 0; i < melody.length; i++) {
        const partPath = path.join(tempDir, `vocal_${i}.wav`);
        partFiles.push(partPath);

        await this.generateTone(melody[i].freq, melody[i].duration, partPath);
      }

      // Concatenate
      if (partFiles.length === 1) {
        await fs.copyFile(partFiles[0], outputPath);
      } else {
        await this.concatenateAudio(partFiles, outputPath);
      }

      // Clean up
      for (const part of partFiles) {
        try {
          await fs.unlink(part);
        } catch (error) {
          logger.warn({ error }, `Failed to clean up ${part}`);
        }
      }

      resolve();
    });
  }

  private generateTone(frequency: number, duration: number, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-f', 'lavfi',
        '-i', `sine=frequency=${frequency}:duration=${duration}`,
        '-c:a', 'pcm_s16le',
        '-ar', '44100',
        '-ac', '1', // Mono for vocals
        '-y',
        outputPath
      ]);

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`ffmpeg exited with code ${code}`));
        }
      });

      ffmpeg.on('error', reject);
    });
  }

  private concatenateAudio(inputs: string[], output: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-i', `concat:${inputs.join('|')}`,
        '-c', 'copy',
        '-y',
        output
      ]);

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`ffmpeg concat exited with code ${code}`));
        }
      });

      ffmpeg.on('error', reject);
    });
  }
}

export const vocalService = new VocalService();