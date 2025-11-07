import fastify from 'fastify';
import cors from '@fastify/cors';
import { registerGenerateRoute } from './api/generate.js';
import { env } from './env.js';

const app = fastify({ logger: true });

await app.register(cors, { origin: true });
app.get('/health', async () => ({ ok: true }));
registerGenerateRoute(app);

if (!process.env.VERCEL) {
  app.listen({ port: env.PORT, host: '0.0.0.0' }, err => {
    if (err) {
      app.log.error(err);
      process.exit(1);
    }
  });
}

export default async function handler(req: any, res: any) {
  await app.ready();
  app.server.emit('request', req, res);
}
