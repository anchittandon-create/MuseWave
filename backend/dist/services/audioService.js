import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../logger.js';
import { audioSynthService } from './audioSynthService.js';
import { vocalService } from './vocalService.js';
export class AudioService {
    async generateAudio(plan, duration, outputPath, lyrics, vocalLanguages) {
        const tempDir = path.dirname(outputPath);
        await fs.mkdir(tempDir, { recursive: true });
        // Generate instrumental using real synthesis
        const instrumentalPath = path.join(tempDir, `instrumental_${Date.now()}.wav`);
        await audioSynthService.synthesize(plan, duration, instrumentalPath);
        // If lyrics exist, generate vocals and mix them
        if (lyrics && lyrics.trim().length > 0) {
            const vocalsPath = path.join(tempDir, `vocals_${Date.now()}.wav`);
            await vocalService.generateVocals(lyrics, duration, plan.bpm, vocalsPath, vocalLanguages);
            // Mix instrumental and vocals
            await this.mixAudioFiles([instrumentalPath, vocalsPath], [0.8, 0.9], outputPath);
            // Clean up temp files
            try {
                await fs.unlink(instrumentalPath);
                await fs.unlink(vocalsPath);
            }
            catch (error) {
                logger.warn({ error }, 'Failed to clean up temp audio files');
            }
        }
        else {
            // No vocals, just copy instrumental
            await fs.copyFile(instrumentalPath, outputPath);
            try {
                await fs.unlink(instrumentalPath);
            }
            catch (error) {
                logger.warn({ error }, 'Failed to clean up instrumental');
            }
        }
        logger.info({ outputPath }, 'Audio generation complete');
    }
    async mixAudioFiles(inputs, volumes, outputPath) {
        const inputArgs = inputs.map(p => `-i "${p}"`).join(' ');
        const filterComplex = inputs.map((_, i) => `[${i}:a]volume=${volumes[i]}[a${i}]`).join(';');
        const mixInputs = inputs.map((_, i) => `[a${i}]`).join('');
        return new Promise((resolve, reject) => {
            const ffmpeg = spawn('ffmpeg', [
                ...inputs.flatMap(p => ['-i', p]),
                '-filter_complex',
                `${filterComplex};${mixInputs}amix=inputs=${inputs.length}:normalize=0[out]`,
                '-map', '[out]',
                '-y',
                outputPath
            ]);
            ffmpeg.on('close', (code) => {
                if (code === 0)
                    resolve();
                else
                    reject(new Error(`ffmpeg mix exited with code ${code}`));
            });
            ffmpeg.on('error', reject);
        });
    }
    getFrequencyForSection(section, bpm) {
        // Map sections to frequencies (simplified)
        const baseFreq = 440; // A4
        switch (section.toLowerCase()) {
            case 'intro': return baseFreq * 0.5;
            case 'verse': return baseFreq * 0.75;
            case 'chorus': return baseFreq;
            case 'bridge': return baseFreq * 1.25;
            case 'outro': return baseFreq * 0.25;
            default: return baseFreq;
        }
    }
    generateTone(frequency, duration, outputPath) {
        return new Promise((resolve, reject) => {
            const ffmpeg = spawn('ffmpeg', [
                '-f', 'lavfi',
                '-i', `sine=frequency=${frequency}:duration=${duration}`,
                '-c:a', 'pcm_s16le',
                '-ar', '44100',
                '-ac', '2',
                '-y',
                outputPath
            ]);
            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    resolve();
                }
                else {
                    reject(new Error(`ffmpeg exited with code ${code}`));
                }
            });
            ffmpeg.on('error', reject);
        });
    }
    concatenateAudio(inputs, output) {
        return new Promise((resolve, reject) => {
            const args = [
                '-i', `concat:${inputs.join('|')}`,
                '-c', 'copy',
                '-y',
                output
            ];
            const ffmpeg = spawn('ffmpeg', args);
            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    resolve();
                }
                else {
                    reject(new Error(`ffmpeg concat exited with code ${code}`));
                }
            });
            ffmpeg.on('error', reject);
        });
    }
}
export const audioService = new AudioService();
