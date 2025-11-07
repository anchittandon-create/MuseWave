# 🎵 MuseForge Pro - API Test Examples

## Quick Tests

### 1. Health Check
```bash
curl http://localhost:4000/health | jq
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-11-08T...",
  "dependencies": {
    "python": {
      "riffusion": true,
      "magenta": true,
      "coqui": true,
      "fluidsynth": true
    },
    "ffmpeg": true,
    "ffprobe": true
  }
}
```

---

## Generation Tests

### 2. Minimal Generation (Instrumental Only - Fastest)
```bash
curl -X POST http://localhost:4000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "musicPrompt": "calm lofi beats",
    "genres": ["Lofi"],
    "durationSec": 30
  }' | jq
```

**Time**: ~2-3 minutes  
**Output**: Instrumental WAV only

---

### 3. Full Generation (Music + Vocals + Video)
```bash
curl -X POST http://localhost:4000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "musicPrompt": "Epic cinematic score with powerful drums",
    "genres": ["Cinematic", "Orchestral"],
    "durationSec": 60,
    "artistInspiration": ["Hans Zimmer"],
    "lyrics": "Rising above the storm, we find our strength within",
    "vocalLanguages": ["English"],
    "generateVideo": true,
    "videoStyles": ["Official Music Video"]
  }' | jq
```

**Time**: ~5-7 minutes  
**Output**: Instrumental + vocals + spectrum video

---

### 4. AI Auto-Suggestions (Empty Fields)
```bash
curl -X POST http://localhost:4000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "musicPrompt": "dark electronic techno for underground rave",
    "durationSec": 45
  }' | jq
```

**AI Will Generate**:
- Genres: ["Techno", "Electronic", "Dark-Ambient"]
- Artists: ["Carl Cox", "Richie Hawtin", "Jeff Mills"]
- Lyrics: Theme-based lyrics for techno
- Video Style: "Abstract Visualizer"

---

### 5. Lyric Video Generation
```bash
curl -X POST http://localhost:4000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "musicPrompt": "emotional indie pop ballad",
    "genres": ["Indie-Pop", "Emotional"],
    "durationSec": 60,
    "lyrics": "Stars align above the city lights.\nHeartbeats echo through the night.\nWe rise together, hand in hand.\nFinding hope across the land.",
    "vocalLanguages": ["English"],
    "generateVideo": true,
    "videoStyles": ["Lyric Video"]
  }' | jq
```

**Output**: Creates lyric video with subtitle overlay

---

### 6. Waveform Visualizer
```bash
curl -X POST http://localhost:4000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "musicPrompt": "chill ambient soundscape for meditation",
    "genres": ["Ambient", "New-Age"],
    "durationSec": 90,
    "generateVideo": true,
    "videoStyles": ["Waveform"]
  }' | jq
```

**Output**: Waveform video with white waves

---

### 7. Multi-Genre Fusion
```bash
curl -X POST http://localhost:4000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "musicPrompt": "fusion of jazz and electronic with upbeat tempo",
    "genres": ["Jazz", "Electronic", "Funk"],
    "durationSec": 75,
    "artistInspiration": ["Daft Punk", "Jamiroquai"],
    "generateVideo": true
  }' | jq
```

**BPM**: Calculated from genre medians (Jazz: 100, Electronic: 120, Funk: 108) → ~109 BPM

---

### 8. Spanish Vocals
```bash
curl -X POST http://localhost:4000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "musicPrompt": "romantic latin pop ballad",
    "genres": ["Latin", "Pop"],
    "durationSec": 60,
    "lyrics": "Bajo la luna llena, bailo contigo. En este momento, todo es perfecto.",
    "vocalLanguages": ["Spanish"],
    "generateVideo": true
  }' | jq
```

**Output**: Spanish TTS vocals

---

### 9. Fast Generation (Short Duration)
```bash
curl -X POST http://localhost:4000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "musicPrompt": "quick upbeat electronic loop",
    "genres": ["House"],
    "durationSec": 15,
    "generateVideo": false
  }' | jq
```

**Time**: ~1-2 minutes (fastest possible)  
**No video**: Saves time

---

### 10. Maximum Duration
```bash
curl -X POST http://localhost:4000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "musicPrompt": "epic orchestral journey through space and time",
    "genres": ["Cinematic", "Orchestral", "Ambient"],
    "durationSec": 300,
    "artistInspiration": ["Hans Zimmer", "Two Steps From Hell"],
    "generateVideo": true
  }' | jq
```

**Time**: ~15-20 minutes  
**Max allowed**: 300 seconds (5 minutes)

---

## Response Structure

### Success Response
```json
{
  "bpm": 120,
  "key": "A minor",
  "scale": "minor",
  "assets": {
    "instrumentalUrl": "/assets/2025/11/abc123xyz/instrumental.wav",
    "vocalsUrl": "/assets/2025/11/abc123xyz/vocals.wav",
    "mixUrl": "/assets/2025/11/abc123xyz/mix.wav",
    "videoUrl": "/assets/2025/11/abc123xyz/final.mp4"
  },
  "aiSuggestions": {
    "genres": ["Cinematic", "Orchestral"],
    "artistInspiration": ["Hans Zimmer", "Two Steps From Hell"],
    "lyrics": "Rising lights above the skyline",
    "vocalLanguages": ["English"],
    "videoStyles": ["Abstract Visualizer"],
    "musicPrompt": "Epic cinematic score..."
  },
  "engines": {
    "music": "riffusion",
    "melody": "magenta",
    "vocals": "coqui",
    "video": "ffmpeg"
  },
  "status": "success",
  "debug": [
    "Validating input...",
    "Generating AI suggestions...",
    "Planning music structure...",
    "✅ Riffusion audio generated",
    "✅ Final mix complete"
  ]
}
```

### Error Response
```json
{
  "bpm": 120,
  "key": "A minor",
  "scale": "minor",
  "assets": {},
  "aiSuggestions": {
    "genres": [],
    "artistInspiration": [],
    "lyrics": "",
    "vocalLanguages": ["English"],
    "videoStyles": []
  },
  "engines": {
    "music": "riffusion",
    "melody": "magenta",
    "vocals": "coqui",
    "video": "ffmpeg"
  },
  "status": "error",
  "error": "Riffusion failed: ...",
  "debug": [
    "Validating input...",
    "❌ Riffusion error: Command timeout"
  ]
}
```

---

## Downloading Generated Assets

### Using wget
```bash
# Get URLs from response
INSTRUMENTAL_URL="http://localhost:4000/assets/2025/11/abc123/instrumental.wav"
VOCALS_URL="http://localhost:4000/assets/2025/11/abc123/vocals.wav"
MIX_URL="http://localhost:4000/assets/2025/11/abc123/mix.wav"
VIDEO_URL="http://localhost:4000/assets/2025/11/abc123/final.mp4"

# Download
wget $MIX_URL -O my-song.wav
wget $VIDEO_URL -O my-video.mp4
```

### Using curl
```bash
curl -O http://localhost:4000/assets/2025/11/abc123/mix.wav
```

---

## Parallel Requests (Testing Concurrency)

```bash
# Generate 3 songs simultaneously
for i in {1..3}; do
  curl -X POST http://localhost:4000/api/generate \
    -H "Content-Type: application/json" \
    -d "{
      \"musicPrompt\": \"test song $i\",
      \"genres\": [\"Lofi\"],
      \"durationSec\": 30
    }" > "response-$i.json" &
done

wait
echo "All 3 generations complete!"
```

**Note**: Limited by `MAX_CONCURRENT_GENERATIONS` in .env

---

## Troubleshooting

### Timeout Errors
```bash
# Increase timeout in .env
GENERATION_TIMEOUT_MS=900000  # 15 minutes

# Or reduce duration
"durationSec": 30
```

### Out of Memory
```bash
# Reduce concurrent jobs
MAX_CONCURRENT_GENERATIONS=1

# Or close other applications
```

### Python Import Errors
```bash
# Ensure venv is activated
source venv/bin/activate

# Verify packages
python -c "import riffusion; import magenta; import TTS"
```

---

## Performance Tips

1. **Fastest Generation**:
   - `durationSec: 15-30`
   - `generateVideo: false`
   - No vocals (empty `lyrics`)

2. **Best Quality**:
   - `durationSec: 60-90`
   - Include vocals + video
   - Multiple genres for richer sound

3. **GPU Acceleration**:
   ```bash
   pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
   ```

---

## Monitoring Generation Progress

### Watch Server Logs
```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Watch logs
tail -f logs/app.log
```

### Debug Mode
```bash
LOG_LEVEL=debug npm run dev
```

---

**Tip**: Save successful curl commands in a `test-cases.sh` script for easy re-testing! 🎵
