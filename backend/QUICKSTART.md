# MuseWave Backend - Quick Start Guide

## 🚀 Installation

```bash
cd backend
npm install
```

## 🔧 Environment Setup

Create `.env` file:

```bash
# Required
DATABASE_URL="postgresql://user:pass@ep-xxx.aws.neon.tech/neondb"

# Optional (enables AI features)
GEMINI_API_KEY="your-key-here"

# Server config
PORT=3000
LOG_LEVEL="info"
```

## 📊 Database Migration

```bash
npx prisma db push
npx prisma generate
```

## 🎵 Start Server

```bash
# Development
npm run dev

# Production build
npm run build
npm start
```

## 🔑 Create API Key

```bash
# Using psql or Neon dashboard
INSERT INTO "ApiKey" (id, key, name, "userId", "rateLimitPerMin", "createdAt")
VALUES ('ck123', 'test-api-key-123', 'Test Key', 'user1', 60, NOW());
```

## 🧪 Test Generation

```bash
curl -X POST http://localhost:3000/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-api-key-123" \
  -d '{
    "musicPrompt": "Energetic lofi hip hop beat",
    "genres": ["lofi", "hip-hop"],
    "durationSec": 30
  }'
```

Expected response:
```json
{
  "bpm": 82,
  "key": "A minor",
  "scale": "minor",
  "assets": {
    "previewUrl": "/assets/2025/11/01K8X7G9H2J3K4L5M6N7P8Q9.wav",
    "mixUrl": "/assets/2025/11/01K8X7G9H2J3K4L5M6N7P8Q9.wav"
  },
  "debug": {
    "mode": "cli",
    "duration": 30
  }
}
```

## 🎥 Test with Video

```bash
curl -X POST http://localhost:3000/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-api-key-123" \
  -d '{
    "musicPrompt": "Uplifting pop anthem",
    "genres": ["pop"],
    "durationSec": 45,
    "lyrics": "We will rise above, shining like the stars",
    "generateVideo": true,
    "videoStyles": ["Lyric Video"]
  }'
```

## 🌐 Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
cd backend
vercel deploy --prod
```

### Set Environment Variables in Vercel

```bash
vercel env add DATABASE_URL
vercel env add GEMINI_API_KEY
```

## 🔍 Check Job Status

```bash
curl -X GET http://localhost:3000/jobs/{jobId} \
  -H "Authorization: Bearer test-api-key-123"
```

## 📝 Common Issues

### 1. ffmpeg not found
**Solution**: Install ffmpeg
```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get install ffmpeg

# Windows
choco install ffmpeg
```

### 2. Database connection error
**Solution**: Verify DATABASE_URL is correct and Neon project is active

### 3. Audio file is silent
**Solution**: Check ffmpeg version (should be 4.0+):
```bash
ffmpeg -version
```

### 4. Port already in use
**Solution**: Change PORT in .env or kill existing process:
```bash
lsof -ti:3000 | xargs kill
```

## 📊 Monitoring

### Health Check
```bash
curl http://localhost:3000/health
```

### Metrics
```bash
curl http://localhost:3000/metrics
```

## 🎯 Architecture Overview

```
User Request
    ↓
API Endpoint (/generate)
    ↓
Job Queue (Prisma + Neon)
    ↓
Plan Service (Gemini or fallback)
    ↓
Audio Synthesis (ffmpeg CLI)
    ├── Kick, Snare, Hat stems
    ├── Bass, Lead stems
    └── Mixing & mastering
    ↓
Vocals (optional, lyrics → robotic voice + SRT)
    ↓
Video (optional, 3 styles: Lyric/Official/Abstract)
    ↓
Storage Service (/public/assets/YYYY/MM/UUID.*)
    ↓
Database Assets (URL tracking)
    ↓
Response (JSON with asset URLs)
```

## 🔐 Security Best Practices

1. **Never commit .env files** (already in .gitignore)
2. **Rotate API keys regularly**
3. **Enable rate limiting** (default: 60 req/min per key)
4. **Use HTTPS in production** (Vercel auto-enables)
5. **Validate all inputs** (Zod schemas in place)

## 📚 Next Steps

1. ✅ Test basic generation
2. ✅ Test with lyrics + video
3. ✅ Deploy to Vercel
4. 🔜 Add custom instruments
5. 🔜 Integrate real TTS (ElevenLabs)
6. 🔜 Add MIDI export

## 💡 Pro Tips

- **Faster generation**: Reduce `durationSec` (30-60s recommended)
- **Better quality**: Set `GEMINI_API_KEY` for AI-generated plans
- **Debug audio**: Check `/tmp` folder for intermediate stems
- **Optimize costs**: Use Vercel's free tier + Neon's free tier

## 🆘 Support

**Logs**:
```bash
tail -f logs/backend.log
```

**Database queries**:
```bash
npx prisma studio
```

**Force clean rebuild**:
```bash
npm run clean
rm -rf node_modules dist
npm install
npm run build
```

---

**Built with ❤️ by Grok** | Powered by ffmpeg + Neon + Fastify
