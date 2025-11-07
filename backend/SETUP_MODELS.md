# MuseForge Pro - Setup Guide
## Free & Open-Source Music Generation Backend

This guide walks you through setting up the complete MuseForge Pro backend using **100% free and open-source models**.

---

## 📋 Prerequisites

- **Node.js** 20+ and **npm**
- **Python** 3.10 or higher
- **FFmpeg** (for audio/video processing)
- **FluidSynth** (for MIDI rendering)
- **8GB RAM minimum** (16GB recommended for faster generation)
- **10GB free disk space** (for models and assets)

---

## 🚀 Quick Start (5 minutes)

###  Step 1: Install System Dependencies

#### macOS (Homebrew)
```bash
brew install ffmpeg fluidsynth python@3.11
```

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install ffmpeg fluidsynth python3-pip python3-venv
```

#### Windows (Chocolatey)
```bash
choco install ffmpeg fluidsynth python
```

### Step 2: Download SoundFont

```bash
cd backend
mkdir -p assets
wget https://schristiancollins.com/GeneralUser_GS_1.471.sf2 -O assets/GeneralUser.sf2
```

Or download manually from: https://schristiancollins.com/generaluser.php

### Step 3: Setup Python Environment

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install --upgrade pip
pip install riffusion magenta TTS torch torchvision
```

### Step 4: Install Node Dependencies

```bash
cd backend
npm install
```

### Step 5: Configure Environment

```bash
cp .env.example .env

# Edit .env and set paths:
# PYTHON_BIN=venv/bin/python3
# SOUND_FONT_PATH=./assets/GeneralUser.sf2
# ASSETS_DIR=./public/assets
# AUTH_SECRET=your-secret-key-here-min-8-chars
```

### Step 6: Run the Server

```bash
npm run dev
```

Server will start on `http://localhost:4000`

---

## 🧪 Verify Installation

### Test Python Dependencies

```bash
# Activate virtual environment first
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Test Riffusion
python -c "import riffusion; print('✅ Riffusion OK')"

# Test Magenta
python -c "import magenta; print('✅ Magenta OK')"

# Test Coqui TTS
tts --list_models
```

### Test FFmpeg & FluidSynth

```bash
ffmpeg -version
fluidsynth --version
```

### Test Generation Pipeline

```bash
# Test Riffusion
python -m riffusion.cli --prompt "lofi beats" --output /tmp/test-riff.wav --duration 10

# Test Magenta MIDI generation
python -m magenta.scripts.melody_rnn_generate \
  --num_outputs=1 \
  --num_steps=128 \
  --output_dir=/tmp/midi

# Test FluidSynth (requires MIDI file from above)
fluidsynth -ni assets/GeneralUser.sf2 /tmp/midi/*.mid -F /tmp/test-midi.wav -r 44100

# Test Coqui TTS
tts --text "testing vocals" --out_path /tmp/test-vocals.wav
```

### Test API Endpoint

```bash
curl -X POST http://localhost:4000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "musicPrompt": "lofi beats for studying",
    "genres": ["Lofi", "Chill"],
    "durationSec": 30
  }'
```

---

## 📦 Python Dependencies Explained

### Riffusion (MIT License)
- **Purpose**: Text-to-audio diffusion model
- **Size**: ~2GB
- **Install**: `pip install riffusion`
- **Usage**: Generates audio textures from text prompts

### Magenta (Apache 2.0)
- **Purpose**: MIDI melody generation using RNNs
- **Size**: ~500MB
- **Install**: `pip install magenta`
- **Usage**: Creates musical melodies and harmonies

### Coqui TTS (MPL 2.0)
- **Purpose**: Multilingual text-to-speech
- **Size**: ~1GB per voice model
- **Install**: `pip install TTS`
- **Usage**: Generates singing vocals from lyrics

### PyTorch (BSD License)
- **Purpose**: Deep learning framework (required by above)
- **Size**: ~2GB
- **Install**: Automatically installed with above packages

---

## 🔧 Configuration Options

### Environment Variables

```bash
# Server
PORT=4000
NODE_ENV=development
AUTH_SECRET=your-secret-key-min-8-chars

# Python
PYTHON_BIN=python3
RIFFUSION_PATH=/path/to/riffusion  # Optional
MAGENTA_PATH=/path/to/magenta      # Optional
COQUI_TTS_PATH=/path/to/TTS        # Optional

# Paths
FFMPEG_PATH=ffmpeg
FFPROBE_PATH=ffprobe
FLUIDSYNTH_PATH=fluidsynth
SOUND_FONT_PATH=./assets/GeneralUser.sf2

# Assets
ASSETS_DIR=./public/assets
PUBLIC_URL=http://localhost:4000

# Generation
DEFAULT_DURATION_SEC=90
MAX_DURATION_SEC=300
DEFAULT_SAMPLE_RATE=44100
GENERATION_TIMEOUT_MS=600000
MAX_CONCURRENT_GENERATIONS=3

# Database
DATABASE_URL=file:./dev.db

# S3 (Optional)
USE_S3=false
S3_BUCKET=
S3_REGION=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
```

---

## 🐳 Docker Setup (Alternative)

```dockerfile
FROM node:20-bullseye

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    ffmpeg \
    fluidsynth \
    wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Setup Python environment
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --upgrade pip && \
    pip install riffusion magenta TTS torch torchvision

# Download SoundFont
RUN mkdir -p assets && \
    wget https://schristiancollins.com/GeneralUser_GS_1.471.sf2 \
    -O assets/GeneralUser.sf2

# Copy application
COPY package*.json ./
RUN npm install
COPY . .

# Build TypeScript
RUN npm run build

EXPOSE 4000
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t museforge-pro .
docker run -p 4000:4000 -v $(pwd)/public:/app/public museforge-pro
```

---

## 🚀 Deployment

### Vercel (Recommended)

1. Install Vercel CLI: `npm i -g vercel`
2. Link project: `vercel link`
3. Deploy: `vercel --prod`

**Note**: Vercel has limitations:
- Max 50MB output
- 10-second execution limit on free tier
- Python binaries need to be in `api/` folder or use custom Python layer

### Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and init
railway login
railway init

# Deploy
railway up
```

### AWS EC2 / DigitalOcean

```bash
# Setup PM2 for process management
npm install -g pm2

# Start with PM2
pm2 start npm --name "museforge" -- start
pm2 save
pm2 startup
```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeout for long generations
        proxy_read_timeout 600s;
    }

    location /assets {
        alias /path/to/backend/public/assets;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## 🔍 Troubleshooting

### Issue: "riffusion not found"
```bash
# Ensure virtual environment is activated
source venv/bin/activate

# Reinstall riffusion
pip uninstall riffusion
pip install riffusion --no-cache-dir
```

### Issue: "SoundFont file not found"
```bash
# Re-download SoundFont
wget https://schristiancollins.com/GeneralUser_GS_1.471.sf2 -O assets/GeneralUser.sf2

# Update .env with correct path
SOUND_FONT_PATH=./assets/GeneralUser.sf2
```

### Issue: "FFmpeg not found"
```bash
# macOS
brew install ffmpeg

# Ubuntu
sudo apt install ffmpeg

# Windows
choco install ffmpeg

# Verify installation
ffmpeg -version
```

### Issue: "Generation timeout"
```bash
# Increase timeout in .env
GENERATION_TIMEOUT_MS=900000  # 15 minutes

# Or reduce generation duration
durationSec=30  # in API request
```

### Issue: "Out of memory"
```bash
# Reduce concurrent generations
MAX_CONCURRENT_GENERATIONS=1

# Or increase system swap
sudo fallocate -l 8G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

---

## 📊 Performance Optimization

### CPU Optimization
- Use fewer inference steps: `numInferenceSteps=20` (default: 50)
- Reduce sample rate: `DEFAULT_SAMPLE_RATE=22050` (default: 44100)
- Limit concurrent jobs: `MAX_CONCURRENT_GENERATIONS=1`

### GPU Acceleration (Optional)
```bash
# Install CUDA-enabled PyTorch (NVIDIA GPUs only)
pip uninstall torch torchvision
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
```

### Disk Space Management
```bash
# Auto-cleanup old assets (add to cron)
node -e "import('./dist/utils/files.js').then(m => m.cleanupOldAssets(7))"
```

---

## 📚 API Documentation

### POST /api/generate

**Request Body:**
```json
{
  "musicPrompt": "Epic cinematic score with powerful drums",
  "genres": ["Cinematic", "Orchestral"],
  "durationSec": 60,
  "artistInspiration": ["Hans Zimmer"],
  "lyrics": "Rising above the storm",
  "vocalLanguages": ["English"],
  "generateVideo": true,
  "videoStyles": ["Abstract Visualizer"]
}
```

**Response:**
```json
{
  "bpm": 110,
  "key": "D minor",
  "scale": "minor",
  "assets": {
    "instrumentalUrl": "/assets/2025/11/abc123/instrumental.wav",
    "vocalsUrl": "/assets/2025/11/abc123/vocals.wav",
    "mixUrl": "/assets/2025/11/abc123/mix.wav",
    "videoUrl": "/assets/2025/11/abc123/final.mp4"
  },
  "aiSuggestions": {
    "genres": ["Cinematic", "Orchestral"],
    "artistInspiration": ["Hans Zimmer", "Two Steps From Hell"],
    "lyrics": "Rising above the storm, we find our strength within",
    "vocalLanguages": ["English"],
    "videoStyles": ["Abstract Visualizer"]
  },
  "engines": {
    "music": "riffusion",
    "melody": "magenta",
    "vocals": "coqui",
    "video": "ffmpeg"
  },
  "status": "success"
}
```

---

## 🎓 Next Steps

1. **Customize AI Suggestions**: Edit `src/utils/aiSuggest.ts`
2. **Add More Genres**: Extend `GENRE_BPM_MAP` in `src/music/planner.ts`
3. **Improve Video Styles**: Add custom FFmpeg filters in `src/engines/ffmpeg.ts`
4. **Optimize Performance**: Tune Python model parameters
5. **Add Database**: Enable SQLite/PostgreSQL for job tracking
6. **Implement Queue**: Use BullMQ for background processing

---

## 📝 License

MuseForge Pro Backend: **MIT License**

Dependencies:
- Riffusion: MIT
- Magenta: Apache 2.0
- Coqui TTS: MPL 2.0
- FFmpeg: GPL (use `--enable-gpl` build)

---

## 🆘 Support

- **Issues**: https://github.com/your-repo/issues
- **Discussions**: https://github.com/your-repo/discussions
- **Discord**: https://discord.gg/your-server

---

**Ready to create amazing music? Start the server and generate! 🎵**
