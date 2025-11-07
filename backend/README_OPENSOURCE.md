# Open-Source Music Generation Backend

Complete TypeScript + Python backend for **real, playable music generation** using only **free, open-source models and tools**. No paid APIs, no cloud inference—everything runs offline.

## 🎵 Features

- **Riffusion** (MIT) – Text-to-music audio diffusion
- **Magenta** (Apache 2.0) – MIDI melody/chord composition
- **Coqui TTS** (MPL 2.0) – Multilingual vocal synthesis
- **FluidSynth** (LGPL) – MIDI to audio conversion
- **FFmpeg** (GPL) – Audio mixing, mastering, video visualization
- **Graceful Fallbacks** – Works even if some models are missing
- **Vercel Deployment** – Serverless functions for production

## 🚀 Quick Start

### Prerequisites

- **Node.js 20+**
- **Python 3.10+**
- **FFmpeg** (audio/video processing)
- **FluidSynth** (MIDI synthesis)

### 1. Install System Dependencies

**macOS:**
```bash
brew install ffmpeg fluidsynth python@3.10
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install -y ffmpeg fluidsynth python3.10 python3-pip
```

**Windows:**
```bash
# Install via Chocolatey
choco install ffmpeg fluidsynth python310
```

### 2. Download SoundFont

```bash
cd backend
mkdir -p assets
wget https://schristiancollins.com/soundfonts/GeneralUser_GS_1.471/GeneralUser_GS_1.471.zip
unzip GeneralUser_GS_1.471.zip -d assets/
mv assets/GeneralUser\ GS\ 1.471/GeneralUser\ GS\ v1.471.sf2 assets/GeneralUser.sf2
rm -rf assets/GeneralUser\ GS\ 1.471 GeneralUser_GS_1.471.zip
```

### 3. Install Python Models

```bash
cd backend/python
pip install -r requirements.txt

# Install optional heavy models (GPU recommended)
# pip install torch diffusers transformers  # For Riffusion (1.5GB+)

# Download Magenta model (if using full Magenta)
# mkdir -p ~/.magenta/models/melody_rnn
# wget https://storage.googleapis.com/magentadata/models/melody_rnn/basic_rnn.mag -O ~/.magenta/models/melody_rnn/basic_rnn.mag
```

### 4. Install Node Dependencies

```bash
cd backend
npm install
```

### 5. Run Development Server

```bash
npm run dev
```

Server starts at `http://localhost:3000`

## 📡 API Usage

### Generate Music

**POST** `/api/generate-opensource`

```json
{
  "musicPrompt": "dreamy synthwave with ambient pads and retro vibes",
  "genres": ["synthwave", "ambient"],
  "durationSec": 90,
  "artistInspiration": ["Kavinsky", "Tycho"],
  "lyrics": "Riding through the neon rain tonight",
  "vocalLanguages": ["English"],
  "generateVideo": true,
  "videoStyles": ["Abstract Visualizer"]
}
```

**Response:**
```json
{
  "success": true,
  "jobId": "01JCXYZ123ABC",
  "bpm": 110,
  "key": "A",
  "scale": "minor",
  "assets": {
    "mixUrl": "/assets/2025/11/01JCXYZ123ABC/mix.wav",
    "videoUrl": "/assets/2025/11/01JCXYZ123ABC/video.mp4",
    "riffusionUrl": "/assets/2025/11/01JCXYZ123ABC/riffusion.wav",
    "melodyUrl": "/assets/2025/11/01JCXYZ123ABC/melody.wav",
    "vocalsUrl": "/assets/2025/11/01JCXYZ123ABC/vocals.wav"
  },
  "engines": {
    "music": "Riffusion",
    "melody": "Magenta (melody_rnn)",
    "vocals": "CoquiTTS",
    "video": "FFmpeg (Video)"
  },
  "metadata": {
    "durationMs": 45230,
    "capabilities": {
      "riffusion": true,
      "magenta": true,
      "coquiTTS": true,
      "fluidSynth": true,
      "ffmpeg": true
    }
  }
}
```

### Check Model Capabilities

**GET** `/api/capabilities`

```json
{
  "success": true,
  "capabilities": {
    "riffusion": true,
    "magenta": true,
    "coquiTTS": true,
    "fluidSynth": true,
    "ffmpeg": true
  },
  "models": {
    "riffusion": {
      "available": true,
      "description": "Text-to-music diffusion model",
      "license": "MIT",
      "fallback": "Procedural audio generation"
    },
    ...
  }
}
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    API Request (JSON)                        │
│   { musicPrompt, genres, duration, lyrics, ... }            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              OpenSourceOrchestrator (Node.js)                │
│  • Derives BPM, key, scale from genres                      │
│  • Coordinates pipeline steps                                │
│  • Manages temp files and output directory                   │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┬──────────────┐
         │               │               │              │
         ▼               ▼               ▼              ▼
┌─────────────┐  ┌─────────────┐  ┌──────────┐  ┌──────────┐
│  Magenta    │  │  Riffusion  │  │ CoquiTTS │  │ FluidSyn │
│  (Python)   │  │  (Python)   │  │ (Python) │  │  (CLI)   │
│             │  │             │  │          │  │          │
│ MIDI melody │  │ Audio       │  │ Vocals   │  │ MIDI→WAV │
│  (30s)      │  │ texture     │  │ synthesis│  │ convert  │
└─────────────┘  └─────────────┘  └──────────┘  └──────────┘
         │               │               │              │
         └───────────────┴───────────────┴──────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    FFmpeg (Audio Mix)                        │
│  • amix (combine all layers)                                │
│  • dynaudnorm (normalize dynamics)                          │
│  • alimiter (prevent clipping)                              │
│  • loudnorm (LUFS -14)                                      │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ▼                               ▼
┌─────────────────┐           ┌──────────────────┐
│  Audio Output   │           │  Video Output    │
│  mix.wav        │           │  (FFmpeg)        │
│  44.1kHz stereo │           │  • showwaves     │
│                 │           │  • showspectrum  │
│                 │           │  1280x720 30fps  │
└─────────────────┘           └──────────────────┘
         │                               │
         └───────────────┬───────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│           /public/assets/YYYY/MM/UUID/*                     │
│  • mix.wav (final audio)                                    │
│  • video.mp4 (visualizer)                                   │
│  • riffusion.wav (texture layer)                            │
│  • melody.wav (MIDI converted)                              │
│  • vocals.wav (TTS output)                                  │
└─────────────────────────────────────────────────────────────┘
```

## 🐍 Python Bridge Scripts

### riffusion_bridge.py
- **Purpose**: Text-to-music generation
- **Model**: Riffusion (Stable Diffusion for audio spectrograms)
- **Fallback**: Procedural audio with genre-based synthesis
- **Output**: WAV file (44.1kHz stereo)

### magenta_bridge.py
- **Purpose**: MIDI melody composition
- **Model**: Magenta melody_rnn (RNN-based composition)
- **Fallback**: Chord progression generator with MIDIUtil
- **Output**: MIDI file + WAV (via FluidSynth)

### coqui_bridge.py
- **Purpose**: Vocal synthesis
- **Model**: Coqui TTS (15+ languages)
- **Fallback**: Robotic voice with formant synthesis
- **Output**: WAV file (22.05kHz mono → converted to stereo)

## 🎛️ Genre → BPM Mapping

| Genre          | BPM Range | Key Preferences       |
|----------------|-----------|-----------------------|
| Lofi           | 70-90     | A minor, D minor      |
| Hip-hop        | 85-115    | A minor, C minor      |
| Trap           | 130-150   | A minor, G minor      |
| Techno         | 125-135   | A minor, D minor      |
| House          | 120-130   | A minor, F major      |
| Trance         | 136-142   | C major, A minor      |
| Drum & Bass    | 160-180   | A minor, D minor      |
| Ambient        | 60-90     | C major, D major      |
| Synthwave      | 100-120   | A minor, E minor      |
| Pop            | 100-130   | C major, G major      |

## 🌐 Vercel Deployment

### 1. Configure Vercel

**vercel.json:**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/**/*.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    }
  ]
}
```

### 2. Install Build Dependencies

Add to `package.json`:
```json
{
  "dependencies": {
    "@vercel/node": "^3.0.0",
    "ulid": "^2.3.0",
    "zod": "^3.22.0"
  }
}
```

### 3. Add Build Pack for Python

Create `.vercel/project.json`:
```json
{
  "devCommand": "npm run dev",
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}
```

### 4. Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel deploy --prod
```

**Note**: Vercel serverless functions have a 300s timeout (Hobby plan: 10s). For long generations, consider:
- Using Vercel Pro (300s timeout)
- Implementing async job queue with polling
- Deploying to Railway, Render, or VPS for unlimited execution time

## 🔧 Configuration

### Environment Variables

Create `.env`:
```bash
# Node.js
PORT=3000
NODE_ENV=development

# Python
PYTHON_PATH=python3

# Paths
ASSETS_DIR=./public/assets
TEMP_DIR=./tmp
SOUNDFONT_PATH=./assets/GeneralUser.sf2

# Optional: Model paths
RIFFUSION_MODEL_PATH=riffusion/riffusion-model-v1
MAGENTA_MODEL_PATH=~/.magenta/models/melody_rnn/basic_rnn.mag
```

## 📦 Package Structure

```
backend/
├── api/                           # Vercel serverless functions
│   ├── generate-opensource.ts
│   ├── capabilities.ts
│   └── health.ts
├── src/
│   ├── services/
│   │   ├── openSourceBridge.ts    # Python process spawner
│   │   └── openSourceOrchestrator.ts  # Pipeline coordinator
│   ├── routes/
│   │   └── openSourceRoutes.ts    # Fastify routes
│   ├── logger.ts
│   └── server.ts
├── python/
│   ├── riffusion_bridge.py        # Riffusion wrapper
│   ├── magenta_bridge.py          # Magenta wrapper
│   ├── coqui_bridge.py            # Coqui TTS wrapper
│   └── requirements.txt           # Python deps
├── assets/
│   └── GeneralUser.sf2            # FluidSynth soundfont
├── public/
│   └── assets/                    # Generated outputs
│       └── YYYY/MM/UUID/
├── tmp/                           # Working directory
├── package.json
├── tsconfig.json
└── vercel.json
```

## 🧪 Testing

### Test Local Generation

```bash
curl -X POST http://localhost:3000/api/generate-opensource \
  -H "Content-Type: application/json" \
  -d '{
    "musicPrompt": "uplifting trance with euphoric pads",
    "genres": ["trance"],
    "durationSec": 45,
    "generateVideo": true
  }'
```

### Test Model Capabilities

```bash
curl http://localhost:3000/api/capabilities
```

### Test Individual Python Scripts

```bash
# Test Riffusion
python3 python/riffusion_bridge.py \
  --prompt "lofi hip-hop beats" \
  --duration 30 \
  --output /tmp/test_riffusion.wav

# Test Magenta
python3 python/magenta_bridge.py \
  --duration 30 \
  --bpm 120 \
  --key "A minor" \
  --output /tmp/test_melody.mid

# Test Coqui TTS
python3 python/coqui_bridge.py \
  --text "This is a test of vocal synthesis" \
  --language en \
  --output /tmp/test_vocals.wav

# Test FluidSynth
fluidsynth -ni assets/GeneralUser.sf2 /tmp/test_melody.mid \
  -F /tmp/test_audio.wav -r 44100
```

## 🐛 Troubleshooting

### "Python module not found"

Install missing packages:
```bash
cd python
pip install -r requirements.txt
```

### "fluidsynth: command not found"

Install FluidSynth:
```bash
brew install fluidsynth  # macOS
sudo apt install fluidsynth  # Linux
```

### "SoundFont not found"

Download GeneralUser soundfont (see Setup step 2)

### "FFmpeg not found"

Install FFmpeg:
```bash
brew install ffmpeg  # macOS
sudo apt install ffmpeg  # Linux
```

### Slow Generation

- **Riffusion** requires GPU for fast generation (50 inference steps)
  - CPU: ~2-3 minutes per track
  - GPU: ~15-30 seconds per track
- Consider using fallback mode (instant) for development
- Or skip Riffusion and use Magenta + synthesis only

### Vercel Timeout

If generation exceeds 10s (Hobby) or 300s (Pro):
- Reduce `durationSec` (shorter tracks)
- Disable video generation
- Skip Riffusion (use fallback)
- Or deploy to VPS with no timeout limits

## 📚 Model Licenses

| Tool/Model     | License     | Commercial Use | Attribution |
|----------------|-------------|----------------|-------------|
| Riffusion      | MIT         | ✅ Yes         | Optional    |
| Magenta        | Apache 2.0  | ✅ Yes         | Optional    |
| Coqui TTS      | MPL 2.0     | ✅ Yes         | Required    |
| FluidSynth     | LGPL        | ✅ Yes         | Required    |
| FFmpeg         | GPL/LGPL    | ✅ Yes*        | Required    |
| GeneralUser SF | Custom      | ✅ Yes         | Required    |

*FFmpeg GPL builds require source distribution if modified

## 🎯 Roadmap

- [ ] Background job queue for async generation
- [ ] WebSocket progress streaming
- [ ] More visualizer styles (lyric video, particles)
- [ ] Stem export (separate instrument tracks)
- [ ] Audio effects (reverb, delay, EQ)
- [ ] Custom model training scripts
- [ ] Docker container for easy deployment
- [ ] Batch generation API

## 🤝 Contributing

Contributions welcome! Areas of interest:
- Additional open-source models (MusicGen, AudioCraft, etc.)
- Performance optimizations
- Better fallback audio quality
- More video visualizer styles
- Multi-language vocal improvements

## 📄 License

MIT License - see LICENSE file

---

**Built with ❤️ using only free, open-source models**

No API keys required. No cloud dependencies. 100% offline.
