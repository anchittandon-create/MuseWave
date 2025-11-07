# MuseWave Backend - Cloud AI Edition

**Production-ready music generation backend using cost-optimized cloud AI services**

## 🎯 Cost Optimization Strategy

This implementation uses the **cheapest possible cloud AI services** while maintaining high quality:

### API Costs (Per 60-second Song with Vocals)

| Service | Purpose | Cost | Provider |
|---------|---------|------|----------|
| **Google Gemini Flash 8B** | Lyrics generation, prompt enhancement, metadata analysis | **FREE** (15 RPM) | Google AI |
| **Replicate Riffusion** | Music generation (instrumental) | **~$0.02** per 60s | Replicate |
| **OpenAI TTS-1** | Vocal synthesis | **~$0.01-0.02** per song | OpenAI |
| **FFmpeg** | Audio mixing, video creation | **FREE** (local) | Open source |

**Total cost per generation: $0.03-0.04** (vocals optional)

### Why These Services?

1. **Google Gemini Flash 8B** (FREE tier)
   - 15 requests per minute free
   - Fast and capable for text generation
   - Perfect for lyrics, prompt enhancement

2. **Replicate Riffusion** (Pay-per-use)
   - No subscription required
   - Only pay for what you use
   - ~$0.0003 per second of audio
   - Better audio quality than local models

3. **OpenAI TTS-1** (Affordable TTS)
   - $15 per 1M characters
   - ~$0.01 per typical song
   - Natural-sounding vocals
   - Cheaper than tts-1-hd

## 🚀 Quick Start

### 1. Get API Keys (5 minutes)

```bash
# Google AI Studio (FREE tier - no credit card required)
https://makersuite.google.com/app/apikey

# Replicate (Pay-as-you-go - credit card required)
https://replicate.com/account/api-tokens

# OpenAI (Pay-as-you-go - credit card required)
https://platform.openai.com/api-keys
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env and add your API keys:
# GOOGLE_API_KEY=your_key_here
# REPLICATE_API_TOKEN=your_token_here
# OPENAI_API_KEY=your_key_here
```

### 4. Run Development Server

```bash
npm run dev
```

Server runs on `http://localhost:3000`

## 📡 API Usage

### POST /api/generate

Generate complete music with instrumentals, vocals, and video:

```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "musicPrompt": "upbeat electronic dance music with energetic synths",
    "genres": ["edm", "house"],
    "durationSec": 60,
    "artistInspiration": ["Daft Punk"],
    "generateLyrics": true,
    "generateVideo": true,
    "videoStyles": ["Official Music Video"]
  }'
```

### Request Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `musicPrompt` | string | Yes | Description of desired music (5-500 chars) |
| `genres` | string[] | Yes | 1-5 genre tags |
| `durationSec` | number | Yes | Duration in seconds (30-120) |
| `artistInspiration` | string[] | No | Up to 5 artist names for style inspiration |
| `lyrics` | string | No | Custom lyrics (max 2000 chars) |
| `generateLyrics` | boolean | No | Auto-generate lyrics with AI (default: false) |
| `vocalLanguages` | string[] | No | Language codes (default: ["en"]) |
| `generateVideo` | boolean | No | Create video visualization (default: false) |
| `videoStyles` | string[] | No | "Lyric Video", "Official Music Video", "Abstract Visualizer" |

### Response Example

```json
{
  "success": true,
  "generationId": "a1b2c3d4-...",
  "bpm": 128,
  "key": "C major",
  "scale": "major",
  "assets": {
    "instrumentalUrl": "https://your-domain.com/assets/2025/11/uuid/instrumental.wav",
    "vocalsUrl": "https://your-domain.com/assets/2025/11/uuid/vocals.mp3",
    "mixUrl": "https://your-domain.com/assets/2025/11/uuid/mix.wav",
    "videoUrl": "https://your-domain.com/assets/2025/11/uuid/video.mp4",
    "lyrics": "Generated lyrics here..."
  },
  "engines": {
    "music": "replicate-riffusion",
    "lyrics": "gemini-flash-8b",
    "vocals": "openai-tts-1",
    "video": "ffmpeg",
    "enhancement": "gemini-flash-8b"
  },
  "costs": {
    "music": 0.02,
    "vocals": 0.015,
    "lyrics": 0,
    "enhancement": 0,
    "total": 0.035
  },
  "debug": [
    "✓ Input validated (60s edm, house)",
    "✓ Enhanced prompt with Gemini",
    "✓ Analyzed: 128 BPM, C major",
    "✓ Music generated",
    "✓ Generated lyrics with Gemini",
    "✓ Vocals generated",
    "✓ Mixed instrumental + vocals",
    "✓ Video created: Official Music Video",
    "💰 Estimated cost: $0.0350",
    "⏱ Total time: 45.2s"
  ],
  "timestamp": "2025-11-08T10:30:45.123Z"
}
```

## 🏗️ Architecture

### Service Flow

```
Client Request
    ↓
1. Input Validation (Zod)
    ↓
2. Prompt Enhancement (Gemini - FREE)
    ↓
3. Metadata Analysis (Gemini - FREE)
    ↓
4. Music Generation (Replicate Riffusion - ~$0.02)
    ↓
5. Lyrics Generation (Gemini - FREE, optional)
    ↓
6. Vocal Synthesis (OpenAI TTS - ~$0.01, optional)
    ↓
7. Audio Mixing (FFmpeg - FREE)
    ↓
8. Video Creation (FFmpeg - FREE, optional)
    ↓
Response with URLs
```

### Directory Structure

```
backend/
├── src/
│   ├── index.ts              # Main server entry
│   ├── api/
│   │   └── generateCloud.ts  # Generation handler
│   ├── services/
│   │   └── cloudAI.ts        # AI service integrations
│   └── utils/
│       ├── media.ts          # Audio/video processing
│       └── files.ts          # File utilities
├── public/assets/            # Generated files (served statically)
├── .env.example
├── package.json
└── README.md
```

## 💰 Cost Management

### Free Tier Limits

- **Gemini Flash 8B**: 15 RPM (requests per minute)
- **FFmpeg**: Unlimited (local processing)

### Paid Service Costs

- **Replicate**: ~$0.0003/second of audio
  - 30s song: ~$0.01
  - 60s song: ~$0.02
  - 120s song: ~$0.04

- **OpenAI TTS**: $15/1M characters
  - Average song lyrics (~500 chars): ~$0.0075
  - Long song lyrics (~1500 chars): ~$0.0225

### Cost Optimization Tips

1. **Skip vocals for instrumentals**: Save ~$0.01 per generation
2. **Use shorter durations**: 30-45s songs are cheaper
3. **Disable video**: Saves processing time (video is free but slow)
4. **Batch generations**: Optimize API calls
5. **Cache enhanced prompts**: Reuse for similar requests

## 🚀 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

**Important**: Add environment variables in Vercel dashboard:
- `GOOGLE_API_KEY`
- `REPLICATE_API_TOKEN`
- `OPENAI_API_KEY`
- `ASSETS_BASE_URL` (your Vercel domain)

### Railway / Render

1. Connect GitHub repository
2. Add environment variables
3. Set build command: `npm run build`
4. Set start command: `npm start`

### AWS / DigitalOcean

```bash
# Build
npm run build

# Start with PM2
npm install -g pm2
pm2 start dist/index.js --name musewave-backend

# Or use Docker
docker build -t musewave-backend .
docker run -p 3000:3000 musewave-backend
```

## 🔧 Configuration

### Environment Variables

```env
# Required API Keys
GOOGLE_API_KEY=AIza...
REPLICATE_API_TOKEN=r8_...
OPENAI_API_KEY=sk-...

# Server
PORT=3000
NODE_ENV=production
ASSETS_BASE_URL=https://your-domain.com

# Optional
DATABASE_URL=file:./data/app.db
```

## 🧪 Testing

### Health Check

```bash
curl http://localhost:3000/health
```

### Simple Generation (No Vocals)

```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "musicPrompt": "calm lo-fi beats",
    "genres": ["lofi", "hip hop"],
    "durationSec": 30
  }'
```

### Full Generation (With Vocals & Video)

```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "musicPrompt": "epic cinematic orchestral",
    "genres": ["orchestral", "cinematic"],
    "durationSec": 60,
    "generateLyrics": true,
    "generateVideo": true,
    "videoStyles": ["Official Music Video"]
  }'
```

## 📊 Performance

### Typical Generation Times

- **Instrumental only**: 20-30 seconds
- **With vocals**: 35-50 seconds
- **With video**: 50-70 seconds

### Bottlenecks

1. **Music generation** (Replicate): 15-25s for 60s audio
2. **Vocal synthesis** (OpenAI): 5-10s
3. **Video creation** (FFmpeg): 15-30s

## 🐛 Troubleshooting

### "Invalid API key" errors

- Verify keys in `.env` file
- Check API key validity on provider dashboards
- Ensure no extra spaces or quotes

### "Rate limit exceeded" (Gemini)

- Free tier: 15 requests/minute
- Wait 60 seconds or upgrade to paid tier

### "Insufficient credits" (Replicate/OpenAI)

- Add payment method to provider accounts
- Check billing dashboards for current balance

### FFmpeg errors

- Ensure `@ffmpeg-installer/ffmpeg` is installed
- Check Node.js version (requires 20+)

## 📈 Scaling

### For High Volume

1. **Implement caching**: Cache enhanced prompts and metadata
2. **Queue system**: Use Bull/BullMQ for job processing
3. **CDN for assets**: Use Cloudflare or AWS CloudFront
4. **Database**: Switch from SQLite to PostgreSQL
5. **Load balancing**: Run multiple instances behind Nginx

### Cost at Scale

| Generations/Month | Estimated Cost |
|-------------------|----------------|
| 100 | $3-4 |
| 1,000 | $30-40 |
| 10,000 | $300-400 |
| 100,000 | $3,000-4,000 |

## 📄 License

MIT License - Free for commercial use

### Third-Party Service Terms

- Google Gemini: [Terms of Service](https://ai.google.dev/terms)
- Replicate: [Terms of Service](https://replicate.com/terms)
- OpenAI: [Terms of Use](https://openai.com/policies/terms-of-use)

## 🤝 Contributing

Pull requests welcome! Please ensure:
- TypeScript types are correct
- Code follows existing style
- API costs remain minimal

## 📞 Support

- Issues: GitHub Issues
- Discussions: GitHub Discussions

---

**Built for minimum cost, maximum quality** 🎵
