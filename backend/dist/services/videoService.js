import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { writeFile } from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../logger.js';
import { vocalService } from './vocalService.js';
const execAsync = promisify(exec);
export class VideoService {
    async generateVideo(audioPath, plan, outputPath, videoStyles, lyrics) {
        const tempDir = path.dirname(outputPath);
        await fs.mkdir(tempDir, { recursive: true });
        // Get duration from plan or default
        const duration = plan?.structure?.reduce((sum, s) => sum + s.duration, 0) || 30;
        const style = videoStyles?.[0] || 'Abstract Visualizer';
        if (style === 'Lyric Video' && lyrics) {
            await this.generateLyricVideo(audioPath, lyrics, duration, plan.bpm, outputPath);
        }
        else if (style === 'Official Music Video') {
            await this.generateOfficialVideo(audioPath, duration, outputPath);
        }
        else {
            await this.generateAbstractVisualizer(audioPath, duration, outputPath);
        }
        logger.info({ outputPath, style }, 'Video generation complete');
    }
    escapeFilterPath(filePath) {
        return filePath
            .replace(/\\/g, '\\\\')
            .replace(/:/g, '\\:')
            .replace(/'/g, "\\\\'")
            .replace(/ /g, '\\ ');
    }
    async generateLyricVideo(audioPath, lyrics, duration, bpm, outputPath) {
        const tempDir = path.dirname(outputPath);
        const srtPath = path.join(tempDir, 'captions.srt');
        // Generate SRT captions
        const srtContent = await vocalService.generateSRT(lyrics, duration, bpm);
        await writeFile(srtPath, srtContent);
        const escapedSrt = this.escapeFilterPath(srtPath);
        // Generate video with subtitles
        const cmd = `ffmpeg -i "${audioPath}" -f lavfi -i color=c=black:s=1280x720:d=${duration} -vf "subtitles='${escapedSrt}':force_style='FontName=Arial,FontSize=24,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,Alignment=2',format=yuv420p,scale=1280:720" -r 30 -shortest -pix_fmt yuv420p -y "${outputPath}"`;
        await execAsync(cmd);
        // Clean up
        try {
            await fs.unlink(srtPath);
        }
        catch (error) {
            logger.warn({ error }, 'Failed to clean up SRT file');
        }
    }
    async generateOfficialVideo(audioPath, duration, outputPath) {
        // Generate spectrum visualizer with rainbow colors
        const cmd = `ffmpeg -i "${audioPath}" -filter_complex "[0:a]showspectrum=s=1280x720:mode=combined:color=rainbow,tmix=frames=3,eq=contrast=1.12,format=yuv420p[v]" -map "[v]" -map 0:a -r 30 -shortest -pix_fmt yuv420p -y "${outputPath}"`;
        await execAsync(cmd);
    }
    async generateAbstractVisualizer(audioPath, duration, outputPath) {
        // Generate waveform visualizer
        const cmd = `ffmpeg -i "${audioPath}" -filter_complex "[0:a]showwaves=s=1280x720:mode=cline,eq=contrast=1.2:brightness=0.02,format=yuv420p[v]" -map "[v]" -map 0:a -r 30 -shortest -pix_fmt yuv420p -y "${outputPath}"`;
        await execAsync(cmd);
    }
    generateVisuals(plan, duration, outputPath) {
        return new Promise((resolve, reject) => {
            // Generate color gradients that change over time
            const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
            const filter = colors.map((color, i) => {
                const start = (i / colors.length) * duration;
                const end = ((i + 1) / colors.length) * duration;
                return `color=c=${color}:s=1920x1080:d=${end - start}[c${i}]`;
            }).join(';') + ';' +
                colors.map((_, i) => `[c${i}]`).join('') +
                `concat=n=${colors.length}:v=1:a=0[vout]`;
            const ffmpeg = spawn('ffmpeg', [
                '-f', 'lavfi',
                '-i', `color=c=black:s=1920x1080:d=${duration}`,
                '-filter_complex', filter,
                '-map', '[vout]',
                '-c:v', 'libx264',
                '-t', duration.toString(),
                '-y',
                outputPath
            ]);
            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    resolve();
                }
                else {
                    reject(new Error(`ffmpeg visuals exited with code ${code}`));
                }
            });
            ffmpeg.on('error', reject);
        });
    }
    combineAudioVideo(audioPath, videoPath, outputPath) {
        return new Promise((resolve, reject) => {
            const ffmpeg = spawn('ffmpeg', [
                '-i', videoPath,
                '-i', audioPath,
                '-c:v', 'copy',
                '-c:a', 'aac',
                '-b:a', '192k',
                '-shortest',
                '-y',
                outputPath
            ]);
            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    resolve();
                }
                else {
                    reject(new Error(`ffmpeg combine exited with code ${code}`));
                }
            });
            ffmpeg.on('error', reject);
        });
    }
}
export const videoService = new VideoService();
