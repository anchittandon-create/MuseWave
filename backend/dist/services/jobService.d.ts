import { PrismaClient } from '@prisma/client';
export declare class JobService {
    private prisma;
    constructor(prisma: PrismaClient);
    updateJobStatus(jobId: string, status: string, error?: string): Promise<void>;
    createAsset(jobId: string, type: 'audio' | 'video' | 'plan', tempPath: string, size?: number): Promise<string>;
    getJobWithAssets(jobId: string): Promise<({
        assets: {
            path: string | null;
            type: string;
            id: string;
            createdAt: Date;
            url: string;
            jobId: string;
            meta: string | null;
            size: number | null;
        }[];
    } & {
        status: string;
        error: string | null;
        result: string | null;
        id: string;
        userId: string | null;
        createdAt: Date;
        maxAttempts: number;
        apiKeyId: string | null;
        genres: string[];
        artistInspiration: string[];
        lyrics: string | null;
        vocalLanguages: string[];
        videoStyles: string[];
        prompt: string;
        duration: number;
        includeVideo: boolean;
        plan: string | null;
        attempts: number;
        parentId: string | null;
        assetId: string | null;
        dedupeKey: string | null;
        lastSuccessAt: Date | null;
        availableAt: Date;
        startedAt: Date | null;
        completedAt: Date | null;
        backoffMs: number;
        updatedAt: Date;
    }) | null>;
}
export declare const jobService: (prisma: PrismaClient) => JobService;
