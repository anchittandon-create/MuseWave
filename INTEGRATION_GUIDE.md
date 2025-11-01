# 🎵 MuseWave - Full Stack Integration Guide

## Overview

This guide explains how to connect the **MuseWave frontend** (React + Vite) with the **complete backend** (Node.js + Fastify + ffmpeg).

## Architecture

```
Frontend (React)          Backend (Node.js)         Services
─────────────────         ─────────────────         ────────
HomePage.tsx     ──→      POST /generate     ──→    Gemini AI
  │                          │                      ffmpeg CLI
  │                          ↓                      Neon DB
  ├─ Form Input          Queue System               Storage
  ├─ Job Status          Job Processing             
  └─ Audio/Video         Asset Generation           
     Player              Database Storage            
```

## Backend Endpoints

### 1. Generate Music/Video
**Endpoint**: `POST /generate`  
**Auth**: `Authorization: Bearer <API_KEY>`

**Request**:
```json
{
  "musicPrompt": "Energetic lofi beat with dreamy vibes",
  "genres": ["lofi", "hip-hop"],
  "durationSec": 60,
  "artistInspiration": ["Nujabes"],
  "lyrics": "Walking through the city lights",
  "vocalLanguages": ["en"],
  "generateVideo": true,
  "videoStyles": ["Lyric Video"]
}
```

**Response**:
```json
{
  "jobId": "ck123abc456"
}
```

### 2. Check Job Status
**Endpoint**: `GET /jobs/:jobId`  
**Auth**: `Authorization: Bearer <API_KEY>`

**Response**:
```json
{
  "id": "ck123abc456",
  "status": "completed",
  "result": {
    "bpm": 82,
    "key": "A minor",
    "scale": "minor",
    "assets": {
      "previewUrl": "/assets/2025/11/01K8X7G9H2J3K4L5.wav",
      "mixUrl": "/assets/2025/11/01K8X7G9H2J3K4L5.wav",
      "videoUrl": "/assets/2025/11/01K8X7H1J2K3L4M5.mp4"
    }
  }
}
```

## Frontend Integration

### Update `services/orchestratorClient.ts`

Replace mock implementation with real API calls:

```typescript
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const API_KEY = import.meta.env.VITE_API_KEY;

export async function startGeneration(payload: any) {
  const response = await axios.post(`${API_BASE_URL}/generate`, payload, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  
  return {
    jobId: response.data.jobId,
    status: 'pending',
  };
}

export function subscribeToJob(
  jobId: string,
  onEvent: (event: any) => void,
  onError?: (error: any) => void
) {
  const pollInterval = setInterval(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/jobs/${jobId}`, {
        headers: { 'Authorization': `Bearer ${API_KEY}` },
      });
      
      const job = response.data;
      
      onEvent({
        type: 'status',
        status: job.status,
        progress: job.status === 'completed' ? 100 : 50,
      });
      
      if (job.status === 'completed') {
        clearInterval(pollInterval);
        onEvent({
          type: 'complete',
          result: job.result,
        });
      } else if (job.status === 'failed') {
        clearInterval(pollInterval);
        onError?.(new Error(job.error || 'Job failed'));
      }
    } catch (error) {
      clearInterval(pollInterval);
      onError?.(error);
    }
  }, 2000); // Poll every 2 seconds
  
  return {
    close: () => clearInterval(pollInterval),
  };
}

export async function fetchJobResult(jobId: string) {
  const response = await axios.get(`${API_BASE_URL}/jobs/${jobId}`, {
    headers: { 'Authorization': `Bearer ${API_KEY}` },
  });
  return response.data.result;
}
```

### Update `.env` file

Create `.env` in the root directory:

```bash
VITE_API_URL=http://localhost:3000
VITE_API_KEY=test-api-key-123
```

For production (Vercel):

```bash
VITE_API_URL=https://your-backend.vercel.app
VITE_API_KEY=prod-api-key-xyz
```

### Update `HomePage.tsx`

The form is already set up correctly. Just ensure the payload matches:

```typescript
const payload = {
  musicPrompt: formData.prompt,
  genres: formData.genres,
  durationSec: formData.duration,
  artistInspiration: formData.artistInspiration,
  lyrics: formData.lyrics,
  vocalLanguages: formData.vocalLanguages,
  generateVideo: formData.includeVideo,
  videoStyles: formData.videoStyle ? [formData.videoStyle] : [],
};

const result = await startGeneration(payload);
```

## Audio/Video Playback

The backend returns public URLs. Update the audio player to use these:

```typescript
// After job completes
const result = await fetchJobResult(jobId);

// Play audio
const audioUrl = `${API_BASE_URL}${result.assets.mixUrl}`;
audioElement.src = audioUrl;

// Play video (if generated)
if (result.assets.videoUrl) {
  const videoUrl = `${API_BASE_URL}${result.assets.videoUrl}`;
  videoElement.src = videoUrl;
}
```

## Deployment

### Backend Deployment (Vercel)

1. **Create Vercel project**:
   ```bash
   cd backend
   vercel
   ```

2. **Set environment variables** in Vercel dashboard:
   - `DATABASE_URL` (from Neon)
   - `GEMINI_API_KEY` (optional)

3. **Deploy**:
   ```bash
   vercel deploy --prod
   ```

4. **Note the URL**: `https://your-backend.vercel.app`

### Frontend Deployment (Vercel)

1. **Update `.env.production`**:
   ```bash
   VITE_API_URL=https://your-backend.vercel.app
   VITE_API_KEY=<your-prod-key>
   ```

2. **Build and deploy**:
   ```bash
   npm run build
   vercel deploy --prod
   ```

## API Key Generation

### Create a new API key in the database:

```sql
INSERT INTO "ApiKey" (id, key, name, "userId", "rateLimitPerMin", "createdAt")
VALUES (
  'ck' || gen_random_uuid(),
  'muse-' || encode(gen_random_bytes(32), 'hex'),
  'Production Key',
  'admin',
  60,
  NOW()
);
```

Or use Prisma:

```typescript
await prisma.apiKey.create({
  data: {
    key: `muse-${crypto.randomBytes(32).toString('hex')}`,
    name: 'Production Key',
    userId: 'admin',
    rateLimitPerMin: 60,
  },
});
```

## Testing the Integration

### 1. Start Backend
```bash
cd backend
npm run dev
```

### 2. Start Frontend
```bash
npm run dev
```

### 3. Test Flow
1. Open `http://localhost:5173`
2. Fill out the form:
   - Prompt: "Uplifting lofi beat"
   - Genres: lofi, hip-hop
   - Duration: 30 seconds
   - Include Video: Yes
   - Video Style: Lyric Video
3. Click "Generate"
4. Watch progress bar
5. Play audio/video when complete

## Troubleshooting

### CORS Errors
Add CORS headers to backend (`server.ts`):

```typescript
import cors from '@fastify/cors';

await app.register(cors, {
  origin: ['http://localhost:5173', 'https://your-frontend.vercel.app'],
  credentials: true,
});
```

### Asset Loading Issues
Ensure assets are served from the backend:

In `server.ts`:
```typescript
import fastifyStatic from '@fastify/static';

await app.register(fastifyStatic, {
  root: path.join(process.cwd(), '..', 'public'),
  prefix: '/',
});
```

### API Key Not Working
Check that the key exists in the database:

```bash
npx prisma studio
# Navigate to ApiKey table
# Verify your key is there
```

## Performance Optimization

### 1. Caching
Cache completed job results for 24 hours:

```typescript
const cache = new Map<string, any>();

async function getCachedJob(jobId: string) {
  if (cache.has(jobId)) return cache.get(jobId);
  
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (job.status === 'completed') {
    cache.set(jobId, job);
    setTimeout(() => cache.delete(jobId), 24 * 60 * 60 * 1000);
  }
  return job;
}
```

### 2. Streaming Audio
For faster playback start, use HTTP range requests:

```typescript
app.get('/assets/:year/:month/:filename', async (request, reply) => {
  const { year, month, filename } = request.params;
  const filePath = path.join(assetsDir, year, month, filename);
  
  const stat = await fs.stat(filePath);
  const range = request.headers.range;
  
  if (range) {
    const [start, end] = range.replace(/bytes=/, '').split('-').map(Number);
    const chunk = fs.createReadStream(filePath, { start, end });
    
    reply.code(206);
    reply.header('Content-Range', `bytes ${start}-${end}/${stat.size}`);
    reply.header('Content-Length', end - start + 1);
    return reply.send(chunk);
  }
  
  return reply.sendFile(filename, path.join(assetsDir, year, month));
});
```

### 3. WebSocket Progress
For real-time progress updates:

```typescript
import ws from '@fastify/websocket';

await app.register(ws);

app.get('/ws/jobs/:jobId', { websocket: true }, (connection, req) => {
  const { jobId } = req.params;
  
  const interval = setInterval(async () => {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    connection.socket.send(JSON.stringify({
      status: job.status,
      progress: calculateProgress(job),
    }));
    
    if (job.status === 'completed' || job.status === 'failed') {
      clearInterval(interval);
    }
  }, 500);
});
```

## Security Best Practices

1. **Never expose API keys in frontend code**
   - Use environment variables only
   - Validate on backend

2. **Implement request signing** (optional):
   ```typescript
   import crypto from 'crypto';
   
   function signRequest(payload: any, secret: string) {
     const hmac = crypto.createHmac('sha256', secret);
     hmac.update(JSON.stringify(payload));
     return hmac.digest('hex');
   }
   ```

3. **Add rate limiting per user**:
   ```typescript
   const userRateLimits = new Map<string, number>();
   
   app.addHook('preHandler', (request, reply, done) => {
     const userId = request.apiKey.userId;
     const count = userRateLimits.get(userId) || 0;
     
     if (count > 100) {
       return reply.code(429).send({ error: 'Rate limit exceeded' });
     }
     
     userRateLimits.set(userId, count + 1);
     setTimeout(() => userRateLimits.delete(userId), 60000);
     done();
   });
   ```

## Monitoring

### Add logging in frontend:

```typescript
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [new Sentry.BrowserTracing()],
});

// Log generation events
Sentry.addBreadcrumb({
  category: 'generation',
  message: 'Started music generation',
  level: 'info',
  data: { jobId },
});
```

### Backend metrics:

```typescript
import { register, Counter, Histogram } from 'prom-client';

const generationCounter = new Counter({
  name: 'generations_total',
  help: 'Total generations requested',
  labelNames: ['status', 'video_enabled'],
});

const generationDuration = new Histogram({
  name: 'generation_duration_seconds',
  help: 'Time taken to generate music',
});

app.get('/metrics', async (request, reply) => {
  reply.type('text/plain');
  return register.metrics();
});
```

## Summary

With this integration:
- ✅ Frontend sends requests to real backend
- ✅ Backend generates actual audio/video with ffmpeg
- ✅ Assets stored in organized structure
- ✅ URLs returned for playback
- ✅ Full authentication and rate limiting
- ✅ Production-ready deployment on Vercel

**Result**: A complete, working AI music generation application! 🎉

---

**Need Help?**
- Check backend logs: `tail -f logs/backend.log`
- Test endpoint: `curl http://localhost:3000/health`
- Verify database: `npx prisma studio`
