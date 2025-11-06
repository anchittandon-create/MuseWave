export declare class VideoService {
    generateVideo(audioPath: string, plan: any, outputPath: string, videoStyles?: string[], lyrics?: string): Promise<void>;
    private escapeFilterPath;
    private generateLyricVideo;
    private generateOfficialVideo;
    private generateAbstractVisualizer;
    private generateVisuals;
    private combineAudioVideo;
}
export declare const videoService: VideoService;
