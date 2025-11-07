# 🚀 QUICK START - Cloud AI Backend

## What You Need (5 minutes setup)

### 1. Get FREE API Key - Google Gemini
1. Visit: https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key (starts with "AIza...")
4. **No credit card required!**

### 2. Get Paid API Keys (Optional but Recommended)

#### Replicate (Music Generation - ~$0.02/song)
1. Visit: https://replicate.com/account/api-tokens
2. Sign up with GitHub
3. Add payment method (min $5)
4. Create API token (starts with "r8_...")

#### OpenAI (Vocals - ~$0.01/song)
1. Visit: https://platform.openai.com/api-keys
2. Create account
3. Add $10 credit
4. Create API key (starts with "sk-...")

## Installation

```bash
# Already done:
cd backend
npm install openai replicate execa

# Configure
cp .env.example .env

# Edit .env and add your keys:
# GOOGLE_API_KEY=AIza...
# REPLICATE_API_TOKEN=r8_...
# OPENAI_API_KEY=sk-...

# Run
npm run dev
```

## Test It

```bash
# Simple test (instrumental only - FREE except Replicate ~$0.01)
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "musicPrompt": "calm lofi beats for studying",
    "genres": ["lofi", "chill"],
    "durationSec": 30
  }'

# Full test (with vocals and video - ~$0.03)
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "musicPrompt": "energetic EDM for workout",
    "genres": ["edm", "house"],
    "durationSec": 60,
    "generateLyrics": true,
    "generateVideo": true
  }'
```

## What Each API Does

| API | What It Does | Cost | Required? |
|-----|--------------|------|-----------|
| **Gemini** | Lyrics, prompt enhancement | FREE | ✅ Yes |
| **Replicate** | Music generation | $0.02/song | ✅ Recommended |
| **OpenAI** | Singing vocals | $0.01/song | ⚠️ Optional |

## Budget Guide

### Free Tier Testing
- Use only Gemini (lyrics, metadata)
- Skip Replicate (no instrumental)
- Skip OpenAI (no vocals)
- **Cost: $0**

### Minimal Cost (~$0.02/song)
- Gemini (FREE)
- Replicate (instrumental)
- Skip OpenAI (no vocals)
- **Cost: ~$0.02/song**

### Full Features (~$0.03/song)
- Gemini (FREE)
- Replicate (instrumental)
- OpenAI (vocals)
- **Cost: ~$0.03/song**

## Response Example

You'll get back:

```json
{
  "success": true,
  "assets": {
    "instrumentalUrl": "https://.../instrumental.wav",
    "vocalsUrl": "https://.../vocals.mp3",
    "mixUrl": "https://.../mix.wav",
    "videoUrl": "https://.../video.mp4"
  },
  "costs": {
    "music": 0.02,
    "vocals": 0.01,
    "total": 0.03
  },
  "debug": [
    "✓ Enhanced prompt with Gemini",
    "✓ Music generated",
    "✓ Vocals generated",
    "💰 Estimated cost: $0.0300"
  ]
}
```

## Troubleshooting

### "GOOGLE_API_KEY not found"
- Check `.env` file exists
- Verify key starts with "AIza..."
- No quotes around the key

### "Invalid API key"
- Regenerate key from provider
- Check for extra spaces
- Restart server after changing .env

### "Insufficient credits"
- Add funds to Replicate/OpenAI
- Check billing dashboard
- Start with small test ($5-10)

## Next Steps

1. ✅ Add API keys to `.env`
2. ✅ Run `npm run dev`
3. ✅ Test with curl
4. ✅ Integrate with frontend
5. 🚀 Deploy to Vercel/Railway

## Cost Monitoring

Check your usage:
- Gemini: https://makersuite.google.com/usage
- Replicate: https://replicate.com/account/billing
- OpenAI: https://platform.openai.com/usage

---

**Need help?** Read `CLOUD_IMPLEMENTATION.md` for detailed docs!
