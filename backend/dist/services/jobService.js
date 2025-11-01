import { stat } from 'fs/promises';
import { logger } from '../logger.js';
import { jobCount } from '../metrics.js';
import { storageService } from './storageService.js';
export class JobService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async updateJobStatus(jobId, status, error) {
        try {
            await this.prisma.job.update({
                where: { id: jobId },
                data: {
                    status,
                    ...(error && { error }),
                    updatedAt: new Date(),
                },
            });
            jobCount.inc({ status });
            logger.info({ jobId, status }, 'Job status updated');
        }
        catch (error) {
            logger.error({ error, jobId, status }, 'Failed to update job status');
            throw error;
        }
    }
    async createAsset(jobId, type, tempPath, size) {
        try {
            // Determine file extension
            const extension = type === 'video' ? 'mp4' : 'wav';
            // Store the file and get public URL
            const publicUrl = await storageService.storeFile(tempPath, extension);
            // Get file size if not provided
            let fileSize = size;
            if (!fileSize) {
                try {
                    const stats = await stat(tempPath);
                    fileSize = stats.size;
                }
                catch (error) {
                    logger.warn({ error, tempPath }, 'Could not get file size');
                    fileSize = 0;
                }
            }
            const asset = await this.prisma.asset.create({
                data: {
                    jobId,
                    type,
                    url: publicUrl,
                    path: tempPath,
                    size: fileSize,
                },
            });
            logger.info({ jobId, assetId: asset.id, type, publicUrl }, 'Asset created');
            return asset.id;
        }
        catch (error) {
            logger.error({ error, jobId, type }, 'Failed to create asset');
            throw error;
        }
    }
    async getJobWithAssets(jobId) {
        return this.prisma.job.findUnique({
            where: { id: jobId },
            include: {
                assets: true,
            },
        });
    }
}
export const jobService = (prisma) => new JobService(prisma);
