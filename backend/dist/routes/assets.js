import { createReadStream, existsSync } from 'node:fs';
import path from 'node:path';
import { storageService } from '../services/storageService.js';
const guessMime = (filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.wav')
        return 'audio/wav';
    if (ext === '.mp3')
        return 'audio/mpeg';
    if (ext === '.mp4')
        return 'video/mp4';
    if (ext === '.json')
        return 'application/json';
    return 'application/octet-stream';
};
export const assetsRoute = async (app) => {
    app.get('/api/assets/:id', async (request, reply) => {
        const { id } = request.params;
        const asset = await app.prisma.asset.findUnique({
            where: { id },
        });
        if (!asset) {
            return reply.code(404).send({ error: 'Asset not found' });
        }
        const pathFromRecord = asset.path ||
            (asset.url?.startsWith('/assets/')
                ? storageService.getFullPath(asset.url)
                : null);
        if (pathFromRecord && existsSync(pathFromRecord)) {
            const stream = createReadStream(pathFromRecord);
            reply.header('Content-Disposition', `attachment; filename="${path.basename(pathFromRecord)}"`);
            return reply.type(guessMime(pathFromRecord)).send(stream);
        }
        if (asset.url?.startsWith('file://')) {
            const filePath = asset.url.substring(7);
            if (existsSync(filePath)) {
                const stream = createReadStream(filePath);
                reply.header('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
                return reply.type(guessMime(filePath)).send(stream);
            }
        }
        if (asset.url) {
            return reply.redirect(asset.url);
        }
        return reply.code(404).send({ error: 'Asset location unavailable' });
    });
};
