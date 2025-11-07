# 🚀 QUICKSTART - Open-Source Music Generation

## ⚡ 5-Minute Setup

### Step 1: Install System Dependencies

**macOS:**
```bash
brew install ffmpeg fluidsynth python@3.10
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update && sudo apt install -y ffmpeg fluidsynth python3.10 python3-pip
```

### Step 2: Run Automated Setup

```bash
cd backend
./scripts/setup-opensource.sh
```

This will:
- ✅ Check Node.js & Python
- ✅ Install FFmpeg & FluidSynth
- ✅ Download GeneralUser SoundFont (30MB)
- ✅ Install Python packages
- ✅ Install Node packages
- ✅ Create directories & .env file

### Step 3: Start Server

```bash
npm run dev
```

Server runs at **http://localhost:3000**

### Step 4: Generate Music

```bash
curl -X POST http://localhost:3000/api/generate-opensource \
  -H "Content-Type: application/json" \
  -d '{
    "musicPrompt": "relaxing lofi hip-hop beats",
    "genres": ["lofi"],
    "durationSec": 30
  }'
```

**Output:**
```json
{
  "success": true,
  "jobId": "01JCXYZ123ABC",
  "assets": {
    "mixUrl": "/assets/2025/11/01JCXYZ123ABC/mix.wav"
  }
}
```

Audio file: `./public/assets/2025/11/01JCXYZ123ABC/mix.wav`

---

## 🎵 Example Requests

### Lofi (30s)
```bash
curl -X POST http://localhost:3000/api/generate-opensource \
  -H "Content-Type: application/json" \
  -d '{"musicPrompt":"study beats","genres":["lofi"],"durationSec":30}'
```

### Techno + Video (60s)
```bash
curl -X POST http://localhost:3000/api/generate-opensource \
  -H "Content-Type: application/json" \
  -d '{
    "musicPrompt":"dark techno",
    "genres":["techno"],
    "durationSec":60,
    "generateVideo":true
  }'
```

### Ambient + Vocals (45s)
```bash
curl -X POST http://localhost:3000/api/generate-opensource \
  -H "Content-Type: application/json" \
  -d '{
    "musicPrompt":"peaceful meditation",
    "genres":["ambient"],
    "durationSec":45,
    "lyrics":"Breathe in, breathe out, find your peace",
    "generateVideo":true
  }'
```

---

## 🧪 Test Everything

```bash
./scripts/test-generation.sh
```

This runs:
1. Health check
2. Capabilities check
3. 15-second generation
4. Playback test (macOS)

---

## 📊 Check Capabilities

```bash
curl http://localhost:3000/api/capabilities | python3 -m json.tool
```

Shows which models are available:
- ✅ Riffusion (text-to-music)
- ✅ Magenta (MIDI composition)
- ✅ Coqui TTS (vocals)
- ✅ FluidSynth (MIDI synthesis)
- ✅ FFmpeg (mixing/video)

---

## 🐛 Troubleshooting

### "Python module not found"
```bash
cd python
pip3 install -r requirements.txt
```

### "fluidsynth: command not found"
```bash
brew install fluidsynth  # macOS
sudo apt install fluidsynth  # Linux
```

### "SoundFont not found"
```bash
./scripts/setup-opensource.sh  # Re-run setup
```

### Generation is slow
- Riffusion uses CPU by default (~2-3 min per track)
- Install GPU support for 10x speed:
  ```bash
  pip3 install torch diffusers transformers
  ```

### Vercel deployment timeout
- Use shorter durations (<60s)
- Or deploy to Railway/Render (unlimited timeout)

---

## 📚 Full Documentation

- **README_OPENSOURCE.md** - Complete guide
- **EXAMPLES_OPENSOURCE.md** - More examples
- **IMPLEMENTATION_SUMMARY_OPENSOURCE.md** - Technical details

---

## 🎯 What You Get

✅ **Real, playable music** (.wav files)  
✅ **Optional vocals** (15+ languages)  
✅ **Optional video** (visualizers)  
✅ **Genre-aware** (20+ genres)  
✅ **Graceful fallbacks** (works without heavy models)  
✅ **100% offline** (no API keys needed)  
✅ **Open-source** (MIT, Apache, MPL licenses)

---

**🎵 Start creating music in 5 minutes!**
