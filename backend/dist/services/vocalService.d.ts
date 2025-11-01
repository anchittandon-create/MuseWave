export declare class VocalService {
    generateVocals(lyrics: string, duration: number, bpm: number, outputPath: string, languages?: string[]): Promise<void>;
    generateSRT(lyrics: string, duration: number, bpm: number): Promise<string>;
    private formatSRTTime;
    generateVocalsOld(plan: any, duration: number, outputPath: string): Promise<void>;
    private generateMelody;
    private synthesizeMelody;
    private generateTone;
    private concatenateAudio;
}
export declare const vocalService: VocalService;
