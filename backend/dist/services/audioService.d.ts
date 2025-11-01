import { MusicPlan } from './planService.js';
export declare class AudioService {
    generateAudio(plan: MusicPlan, duration: number, outputPath: string, lyrics?: string, vocalLanguages?: string[]): Promise<void>;
    private mixAudioFiles;
    private getFrequencyForSection;
    private generateTone;
    private concatenateAudio;
}
export declare const audioService: AudioService;
