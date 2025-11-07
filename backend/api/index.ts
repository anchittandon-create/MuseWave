/**
 * Vercel Serverless Handler Export
 * Allows deployment to Vercel with serverless functions
 */

import { createApp } from '../src/server-opensource.js';

let app: any = null;

/**
 * Export handler for Vercel serverless
 */
export default async function handler(req: any, res: any) {
  if (!app) {
    app = await createApp();
    await app.ready();
  }
  
  // Convert Vercel request to Fastify request
  app.server.emit('request', req, res);
}
