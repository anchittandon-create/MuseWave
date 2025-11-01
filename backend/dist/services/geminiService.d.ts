type VideoStyle = 'lyric' | 'official' | 'abstract';
interface DrumPattern {
    kick: Array<number | null>;
    snare: Array<number | null>;
    hihat: Array<number | null>;
}
interface SynthLine {
    pattern: 'pads' | 'arpeggio-up' | 'arpeggio-down';
    timbre: 'warm' | 'bright' | 'dark' | 'glassy';
}
interface LeadMelodyNote {
    note: string;
    duration: number;
    ornamentation: 'none' | 'light' | 'heavy';
}
interface Effects {
    reverb: number;
    compressionThreshold: number;
    stereoWidth: number;
}
interface Section {
    name: string;
    sectionType: 'intro' | 'verse' | 'chorus' | 'bridge' | 'breakdown' | 'drop' | 'outro';
    durationBars: number;
    chordProgression: string[];
    drumPattern: DrumPattern;
    synthLine: SynthLine;
    leadMelody: LeadMelodyNote[];
    effects: Effects;
    lyrics?: string | null;
}
interface Stems {
    vocals: boolean;
    drums: boolean;
    bass: boolean;
    instruments: boolean;
}
interface CuePoints {
    introEnd: number;
    dropStart: number;
    outroStart: number;
}
export interface MusicPlan {
    title: string;
    genre: string;
    bpm: number;
    key: string;
    overallStructure: string;
    vocalStyle: string;
    lyrics: string;
    randomSeed: number;
    sections: Section[];
    stems: Stems;
    cuePoints: CuePoints;
}
export declare function enhancePrompt(context: any): Promise<{
    prompt: string;
}>;
export declare function suggestGenres(context: any): Promise<{
    genres: string[];
}>;
export declare function suggestArtists(context: any): Promise<{
    artists: string[];
}>;
export declare function suggestLanguages(context: any): Promise<{
    languages: string[];
}>;
export declare function suggestInstruments(context: any): Promise<{
    instruments: string[];
}>;
export declare function enhanceLyrics(context: any): Promise<{
    lyrics: string;
}>;
export declare function generateMusicPlan(fullPrompt: any, creativitySeed: number): Promise<MusicPlan>;
export declare function auditMusicPlan(plan: MusicPlan, originalRequest: any): Promise<{
    lyricsSung: boolean;
    isUnique: boolean;
    styleFaithful: boolean;
    djStructure: boolean;
    masteringApplied: boolean;
    passed: boolean;
    feedback: string;
}>;
export declare function generateCreativeAssets(musicPlan: MusicPlan, videoStyles: VideoStyle[], lyrics: string): Promise<{
    lyricsAlignment: Array<{
        time: string;
        line: string;
    }>;
    videoStoryboard: Partial<Record<VideoStyle, string>>;
}>;
export {};
