import { z } from 'zod';
import { safetyService } from '../services/safetyService.js';
const generateSchema = z.object({
    musicPrompt: z.string().min(1),
    genres: z.array(z.string()).min(1),
    durationSec: z.number().int().min(30).max(120),
    artistInspiration: z.array(z.string()).optional(),
    lyrics: z.string().optional(),
    vocalLanguages: z.array(z.string()).optional(),
    generateVideo: z.boolean().default(false),
    videoStyles: z.array(z.enum(["Lyric Video", "Official Music Video", "Abstract Visualizer"])).optional(),
});
export const generateRoute = async (app) => {
    app.post('/generate', {
        schema: {
            body: generateSchema,
        },
    }, async (request, reply) => {
        const body = request.body;
        // Safety check
        const safety = await safetyService.checkContent(body.musicPrompt);
        if (!safety.safe) {
            return reply.code(400).send({ error: safety.reason });
        }
        // Enqueue job
        const jobId = await app.queue.enqueue('music_generation', body, {
            apiKeyId: request.apiKey?.id,
        });
        return reply.send({
            jobId,
            status: 'pending',
        });
    });
};
