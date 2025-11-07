export interface MusicPlan {
    title: string;
    genre: string;
    bpm: number;
    key: string;
    structure: Array<{
        section: string;
        duration: number;
        description: string;
    }>;
    instruments: string[];
    mood: string;
}
export declare class PlanService {
    private genAI?;
    constructor();
    private getGenreGuidance;
    generatePlan(prompt: string, duration: number, genres?: string[], artistInspiration?: string[]): Promise<MusicPlan>;
    private generateMockPlan;
}
export declare const planService: PlanService;
