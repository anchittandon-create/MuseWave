# 🎵 MuseForge Pro - Complete Backend

**Production-ready AI music generation backend using open-source models**

## 🌟 Features

- ✅ **Real Audio Generation**: Riffusion (text-to-music diffusion) + Magenta (MelodyRNN) + DSP fallbacks
- ✅ **Vocal Synthesis**: Coqui TTS (multi-speaker VITS) + formant-based DSP fallback
- ✅ **Video Generation**: 8 visual styles via FFmpeg (spectrum, waveform, lyric overlay, etc.)
- ✅ **AI-Powered Autosuggestion**: Context-aware real-time suggestions using ML (sentence-transformers)
- ✅ **Adaptive AI Suggestions**: Context-aware, non-repetitive suggestions for all input fields
- ✅ **Dashboard**: Analytics + playback + download for all generations
- ✅ **Multi-Format Support**: `.wav`, `.mp3`, `.mp4`, `.webm`, `.ogg`, `.flac`, `.mov`
- ✅ **Range Request Support**: Streaming playback with seek capability
- ✅ **SQLite Logging**: Full generation history with analytics
- ✅ **Fully Offline**: Zero external API calls after model installation
- ✅ **Production Ready**: Graceful fallbacks, error handling, logging

---

## 🏗️ Architecture

```
backend-complete/
├── src/
│   ├── config/
│   │   ├── env.ts                  # Environment validation (Zod)
│   │   └── ai-ontology.ts          # Genre/artist/theme ontology (200+ entries)
│   ├── types/
│   │   └── schemas.ts              # API request/response schemas
│   ├── services/
│   │   ├── ai-suggestions.ts       # Adaptive AI suggestion engine (320 lines)
│   │   ├── music-planner.ts        # BPM/key/scale/structure generation
│   │   ├── python-bridge.ts        # Python model integration (execa)
│   │   ├── ffmpeg-processor.ts     # Audio mixing + video generation
│   │   ├── dsp-fallback.ts         # Pure JS audio synthesis
│   │   └── storage.ts              # Asset management (/YYYY/MM/UUID/)
│   ├── database/
│   │   └── db.ts                   # SQLite with sql.js
│   ├── routes/
│   │   ├── generate.ts             # Main generation pipeline
│   │   ├── suggestions.ts          # AI suggestion API
│   │   ├── autosuggest.ts          # ML-powered autosuggestion API (NEW)
│   │   ├── dashboard.ts            # Analytics API
│   │   └── assets.ts               # Static file serving
│   ├── python/
│   │   ├── suggestion_engine.py    # ML autosuggestion (sentence-transformers) (NEW)
│   │   ├── riffusion_generate.py   # Riffusion CLI wrapper
│   │   ├── magenta_melody.py       # Magenta MelodyRNN wrapper
│   │   └── coqui_tts.py            # Coqui TTS wrapper
│   └── server.ts                   # Fastify app initialization
├── scripts/
│   ├── setup-models.sh             # Automated model installation
│   └── test-generation.js          # Integration test script
├── public/
│   └── assets/                     # Generated audio/video files
├── package.json
├── tsconfig.json
└── .env.example
```

---

## 🚀 Quick Start

### 1. Install System Dependencies

```bash
# macOS
brew install ffmpeg fluidsynth python@3.10

# Ubuntu/Debian
sudo apt-get install ffmpeg fluidsynth python3.10 python3-pip fluid-soundfont-gm
```

### 2. Setup Models

```bash
cd backend-complete
chmod +x scripts/setup-models.sh
./scripts/setup-models.sh
```

This will:
- Create Python virtual environment
- Install Riffusion, Magenta, Coqui TTS
- Download SoundFont for FluidSynth
- Verify all dependencies

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your paths if needed (defaults work for most setups)
```

### 4. Install Node Dependencies

```bash
npm install
```

### 5. Start Server

```bash
npm run dev
```

Server will start on `http://localhost:4000`

### 6. Test Generation

```bash
npm run test
```

---

## 📡 API Endpoints

### `POST /api/generate`

Generate music with all features.

**Request:**
```json
{
  "musicPrompt": "An epic cinematic score with powerful drums",
  "genres": ["Cinematic", "Techno"],
  "durationSec": 60,
  "artistInspiration": ["Hans Zimmer"],
  "lyrics": "Through storms we rise\nEchoes ignite the sky",
  "vocalLanguages": ["English"],
  "generateVideo": true,
  "videoStyles": ["Official Music Video", "Lyric Video"],
  "seed": 42
}
```

**Response:**
```json
{
  "id": "uuid-here",
  "bpm": 118,
  "key": "A minor",
  "scale": "minor",
  "assets": {
    "instrumentalUrl": "/assets/2024/01/uuid/instrumental.wav",
    "vocalsUrl": "/assets/2024/01/uuid/vocals.wav",
    "mixUrl": "/assets/2024/01/uuid/mix.wav",
    "videoUrl": "/assets/2024/01/uuid/official-music-video.mp4",
    "videoUrls": {
      "official-music-video": "/assets/...",
      "lyric-video": "/assets/..."
    }
  },
  "aiSuggestions": {
    "musicPrompt": "A dreamy electronic piece...",
    "genres": ["Synthwave", "Ambient"],
    "artistInspiration": ["Tycho", "Bonobo"],
    "lyrics": "Through cosmos we soar...",
    "vocalLanguages": ["English", "Japanese"],
    "videoStyles": ["Abstract Visualizer"]
  },
  "engines": {
    "music": "riffusion",
    "melody": "magenta",
    "vocals": "coqui",
    "video": "ffmpeg"
  },
  "status": "success",
  "processingTimeMs": 45000
}
```

### `POST /api/suggestions/all`

Get all AI suggestions at once.

**Request:**
```json
{
  "context": {
    "musicPrompt": "dark cinematic",
    "genres": ["Cinematic"],
    "durationSec": 90
  }
}
```

**Response:**
```json
{
  "suggestions": {
    "musicPrompt": "A cinematic score blending orchestral grandeur...",
    "genres": ["Dark Ambient", "Industrial"],
    "artistInspiration": ["Trent Reznor", "Hans Zimmer"],
    "lyrics": "Shadows fall, echoes call...",
    "vocalLanguages": ["English"],
    "videoStyles": ["Cinematic Montage"]
  }
}
```

### `POST /api/suggestions/field`

Get suggestion for specific field.

**Request:**
```json
{
  "field": "genres",
  "context": {
    "musicPrompt": "upbeat electronic dance"
  }
}
```

**Response:**
```json
{
  "field": "genres",
  "suggestion": ["EDM", "House", "Techno"]
}
```

### `GET /api/dashboard/stats`

Get dashboard statistics.

**Response:**
```json
{
  "totalGenerations": 42,
  "totalDurationSec": 2520,
  "averageBpm": 125,
  "popularGenres": [
    { "genre": "Electronic", "count": 15 },
    { "genre": "Cinematic", "count": 12 }
  ],
  "recentGenerations": [...]
}
```

### `GET /api/dashboard/generations`

List all generations with pagination.

**Query Params:**
- `limit` (default: 20)
- `offset` (default: 0)

**Response:**
```json
{
  "generations": [...],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 42
  }
}
```

### `GET /assets/:year/:month/:uuid/:filename`

Serve audio/video files with range request support for streaming.

**Headers:**
- Supports `Range: bytes=0-1023`
- Returns 206 Partial Content for range requests
- Automatic content-type detection

---

## 🎨 Video Styles

1. **Official Music Video** - Rainbow spectrum visualization
2. **Abstract Visualizer** - Waveform with color gradients
3. **Spectrum Analyzer** - Frequency spectrum with fire colors
4. **Waveform Animation** - Clean waveform display
5. **Geometric Patterns** - Intensity-based spectrum
6. **Particle Effects** - Vector scope visualization
7. **Cinematic Montage** - Magma-colored spectrum
8. **Lyric Video** - Timed subtitles over black background

---

## 🧠 AI Suggestion System

### Features
- **Context-Aware**: Uses prompt/genres/duration to generate relevant suggestions
- **Non-Repetitive**: LRU cache + similarity checking (threshold: 0.7)
- **Weighted Randomness**: Genre-based artist selection with popularity weighting
- **Genre Crossover**: 15% probability of cross-genre fusion
- **Theme Detection**: Keyword-based lyric theme identification
- **Regional Languages**: 15% probability of adding non-English languages

### Ontology
- **40+ Genres** with BPM ranges and subgenres
- **70+ Artists** mapped to genres with influence scores
- **6 Lyric Themes** (space, urban, nature, emotion, time, technology)
- **15 Languages** with regional variants
- **8 Video Styles** with context-based selection

---

## 🔧 Configuration

### Environment Variables (`.env`)

```bash
# Server
NODE_ENV=development
PORT=4000
HOST=0.0.0.0
LOG_LEVEL=info
LOG_PRETTY=true

# Paths
ASSETS_DIR=./public/assets
DB_PATH=./generations.db

# Python
PYTHON_VENV=./venv
PYTHON_TIMEOUT=300000

# Models
RIFFUSION_MODEL=riffusion/riffusion-model-v1
MAGENTA_MODEL=basic_rnn
COQUI_MODEL=tts_models/en/vctk/vits
FLUIDSYNTH_PATH=/usr/bin/fluidsynth
SOUNDFONT_PATH=/usr/share/sounds/sf2/GeneralUser_GS.sf2

# Audio Processing
AUDIO_LOUDNESS_TARGET=-14
AUDIO_TRUE_PEAK=-1.0
AUDIO_LRA=11

# Video Processing
VIDEO_WIDTH=1920
VIDEO_HEIGHT=1080
VIDEO_FPS=30
VIDEO_BITRATE=5000k
VIDEO_PRESET=medium

# AI Suggestions
AI_CACHE_SIZE=5
AI_GENRE_CROSSOVER_PROB=0.15
AI_UNIQUENESS_THRESHOLD=0.7
```

---

## 🧪 Testing

### Manual Test
```bash
npm run test
```

### cURL Test
```bash
curl -X POST http://localhost:4000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "musicPrompt": "Upbeat electronic dance track",
    "genres": ["EDM", "House"],
    "durationSec": 30,
    "generateVideo": true,
    "videoStyles": ["Spectrum Analyzer"]
  }'
```

### Check Health
```bash
curl http://localhost:4000/health
```

---

## 📦 Production Deployment

### Build
```bash
npm run build
```

### Start Production Server
```bash
npm start
```

### Vercel (Serverless)
```bash
vercel deploy --prod
```

**Note**: For Vercel, models must be pre-installed in Docker image or use DSP fallbacks.

---

## 🛠️ Technology Stack

### Backend
- **Node.js** 20+ (ES2022 modules)
- **TypeScript** (strict mode)
- **Fastify** (API server)
- **Zod** (schema validation)
- **sql.js** (SQLite)

### AI Models
- **Riffusion** (MIT) - Stable Diffusion for audio
- **Magenta** (Apache 2.0) - MelodyRNN for MIDI
- **Coqui TTS** (MPL 2.0) - VITS multi-speaker TTS
- **FluidSynth** (LGPL) - MIDI synthesizer

### Audio/Video
- **FFmpeg** (GPL) - Mixing, normalization, video generation
- **DSP (Pure JS)** - Additive synthesis + formant vocals

---

## 🐛 Troubleshooting

### Python models not found
```bash
source venv/bin/activate
pip list | grep -E "riffusion|magenta|TTS"
```

### FFmpeg errors
```bash
ffmpeg -version
ffprobe -version
```

### FluidSynth not found
```bash
which fluidsynth
ls -la /usr/share/sounds/sf2/  # Check SoundFont
```

### Port already in use
```bash
lsof -ti:4000 | xargs kill -9  # Kill process on port 4000
```

### Memory issues with Riffusion
Riffusion requires ~4GB RAM. If OOM, use DSP fallback:
```bash
# In .env
RIFFUSION_ENABLED=false
```

---

## � AI-Powered Autosuggestion (NEW)

**Real-time ML-powered suggestions** for genres, languages, and artists. See **[AUTOSUGGESTION.md](./AUTOSUGGESTION.md)** for full documentation.

### Quick Start

```bash
# Already installed if you ran install.sh
pip install sentence-transformers

# Test autosuggestion
node scripts/test-autosuggestion.js
```

### Features
- ✨ **Zero Hardcoded Lists** - All AI-generated using sentence-transformers
- 🎯 **Context-Aware** - Considers prompt, genres, artists, languages
- ⚡ **Real-Time** - 300ms debounce, <600ms response
- 🎹 **Keyboard Navigation** - Arrow keys, Enter, Escape
- 🌍 **Regional Intelligence** - Disables artists for Hindi/regional languages

### API
```bash
curl -X POST http://localhost:4001/api/suggest \
  -H "Content-Type: application/json" \
  -d '{
    "field": "genres",
    "input": "electronic",
    "context": {
      "musicPrompt": "upbeat dance music",
      "genres": [],
      "artistInspiration": [],
      "vocalLanguages": []
    }
  }'
```

**Note**: First run downloads ML model (~80MB, 2-5 minutes). Fallback to prefix matching until ready.

---

## �📊 Performance

### Typical Generation Times (M1 Mac)
- **Audio (30s)**: 15-30 seconds (Riffusion) / 1s (DSP)
- **Vocals (30s)**: 10-20 seconds (Coqui) / 1s (DSP)
- **Video (30s)**: 5-10 seconds (FFmpeg)
- **Total**: 30-60 seconds (AI models) / 10s (DSP fallbacks)

### Optimization Tips
1. Use DSP fallbacks for instant generation
2. Cache generations in database
3. Pre-generate common durations
4. Use video streaming (range requests)
5. Enable aggressive caching (1 year)

---

## 📄 License

**MIT License** (backend code)

**Model Licenses:**
- Riffusion: MIT
- Magenta: Apache 2.0
- Coqui TTS: MPL 2.0
- FluidSynth: LGPL
- FFmpeg: GPL (dynamic linking OK)

---

## 🤝 Contributing

Contributions welcome! Areas for improvement:
- Additional AI models (MusicGen, AudioCraft)
- More video styles
- Lyric-to-audio timing (forced alignment)
- Real-time streaming generation
- GPU acceleration
- Docker containerization

---

## 📞 Support

For issues or questions:
1. Check `/health` endpoint for dependency status
2. Review logs with `LOG_LEVEL=debug`
3. Test with `npm run test`
4. Check model installation with `./scripts/setup-models.sh`

---

**Built with ❤️ for MuseWave / MuseForge Pro**
