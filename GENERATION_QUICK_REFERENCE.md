# 🎵 MuseWave Generation - Quick Reference

## ⚡ Quick Start (3 Commands)

```bash
# 1. Install dependencies
cd backend-complete/scripts
bash setup_dependencies.sh

# 2. Test generation
python3 generate_media.py "dreamy synthwave"

# 3. Verify output
ls -lh public/assets/*/
ffprobe public/assets/*/mix.wav
```

---

## 📝 Common Commands

### Generate with Lyrics
```bash
python3 generate_media.py "epic orchestral" "Riding through the stars" "English"
```

### Generate with Options
```bash
python3 generate_media.py \
  --prompt "chill lofi beats" \
  --lyrics "Study vibes all night long" \
  --language "Spanish" \
  --video-style waveform
```

### From Node.js/TypeScript
```typescript
import { getMediaGenerationService } from './services/mediaGenerationService';

const service = getMediaGenerationService();
const result = await service.generate({
  prompt: 'dreamy synthwave',
  lyrics: 'Neon lights',
  language: 'English',
});
```

---

## 🔍 Validation Commands

### Check Audio Format
```bash
ffprobe -v error -show_streams -of json public/assets/*/mix.wav | jq .streams[0]
```

**Expected:**
- `codec_name`: "pcm_s16le"
- `sample_rate`: "44100"
- `channels`: 2

### Check Video Format
```bash
ffprobe -v error -show_streams -of json public/assets/*/final.mp4 | jq .streams[0]
```

**Expected:**
- `codec_name`: "h264"
- `width`: 1280
- `height`: 720
- `pix_fmt`: "yuv420p"

### Play Files
```bash
ffplay public/assets/*/mix.wav
ffplay public/assets/*/final.mp4
```

---

## 🐛 Troubleshooting

### Empty Audio File

**Problem:** `mix.wav` is 0 bytes

**Check:**
```bash
ls -lh public/assets/*/melody.wav public/assets/*/texture.wav
ffprobe public/assets/*/melody.wav
```

**Fix:**
```bash
# Re-install FluidSynth
brew reinstall fluidsynth

# Verify soundfont
ls /usr/local/share/soundfonts/GeneralUser.sf2

# Test manually
fluidsynth -ni /usr/local/share/soundfonts/GeneralUser.sf2 melody.mid -F test.wav -r 44100
```

### Silent Audio

**Problem:** File exists but no sound

**Check:**
```bash
ffprobe -v error -select_streams a:0 -show_entries stream=codec_name,sample_rate,channels public/assets/*/mix.wav
```

**Fix:**
```bash
# Ensure correct codec
ffmpeg -i old.wav -acodec pcm_s16le -ar 44100 -ac 2 new.wav

# Check volume
ffmpeg -i mix.wav -af "volumedetect" -f null -
```

### Video Won't Play

**Problem:** Browser can't play video

**Check:**
```bash
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,pix_fmt public/assets/*/final.mp4
```

**Fix:**
```bash
# Re-encode with correct format
ffmpeg -i old.mp4 -c:v libx264 -pix_fmt yuv420p -preset medium -crf 23 new.mp4
```

### Missing Dependencies

**Problem:** "command not found"

**Fix:**
```bash
# macOS
brew install ffmpeg fluidsynth python@3.11

# Linux
sudo apt-get install ffmpeg fluidsynth python3 python3-pip

# Python packages
pip3 install MIDIUtil magenta riffusion TTS
```

---

## 📊 Expected Output Structure

```
public/assets/{job_id}/
├── melody.mid       # MIDI melody (~5-50KB)
├── melody.wav       # MIDI audio (>100KB)
├── texture.wav      # Background (>100KB)
├── vocals.wav       # TTS vocals (>50KB, optional)
├── mix.wav          # ✅ Final audio (>200KB)
├── final.mp4        # ✅ Video (>1MB)
└── metadata.json    # Job info (~1KB)
```

All files should be:
- **Non-empty** (>10KB minimum)
- **Playable** in standard players
- **Correct format** (verified with ffprobe)

---

## ⚙️ Configuration

### Environment Variables
```bash
export SOUNDFONT_PATH="/custom/path/soundfont.sf2"
export MAGENTA_MODELS="/custom/path/models"
export VIDEO_CRF=20                    # Quality (18-28)
export VIDEO_PRESET=fast               # Speed preset
```

### Python Script Args
```bash
python3 generate_media.py [prompt] [lyrics] [language] \
  --job-id {id} \
  --output-dir {dir} \
  --video-style {spectrum|waveform|volumeter}
```

---

## 🎯 Integration Examples

### Express.js Route
```javascript
const { getMediaGenerationService } = require('./services/mediaGenerationService');

app.post('/api/generate', async (req, res) => {
  const service = getMediaGenerationService();
  const result = await service.generate(req.body);
  
  if (result.success) {
    res.json({ audioUrl: result.audioUrl, videoUrl: result.videoUrl });
  } else {
    res.status(500).json({ error: result.error });
  }
});
```

### Fastify Route
```typescript
import { getMediaGenerationService } from './services/mediaGenerationService';

fastify.post('/api/generate', async (request, reply) => {
  const service = getMediaGenerationService();
  const result = await service.generate(request.body as any);
  
  return result.success 
    ? { audioUrl: result.audioUrl, videoUrl: result.videoUrl }
    : reply.code(500).send({ error: result.error });
});
```

### Background Job
```typescript
import { Queue } from 'bull';
import { getMediaGenerationService } from './services/mediaGenerationService';

const queue = new Queue('music-generation');

queue.process(async (job) => {
  const service = getMediaGenerationService();
  const result = await service.generate(job.data);
  
  if (!result.success) {
    throw new Error(result.error);
  }
  
  return result;
});
```

---

## 📦 Deployment

### Docker
```dockerfile
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    fluidsynth \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages
RUN pip install MIDIUtil magenta riffusion TTS

# Copy scripts
COPY backend-complete/scripts /app/scripts
WORKDIR /app

# Run generator
CMD ["python3", "scripts/generate_media.py"]
```

### Kubernetes
```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: music-generation
spec:
  template:
    spec:
      containers:
      - name: generator
        image: musewave/generator:latest
        command: ["python3", "generate_media.py"]
        args: ["dreamy synthwave"]
        volumeMounts:
        - name: output
          mountPath: /app/public/assets
```

---

## 📈 Performance

Typical times (M1 Mac):
- **Setup**: 5-10 min (one-time)
- **Melody**: 5-10s (Magenta) or <1s (fallback)
- **Texture**: 10-30s (Riffusion) or 1-2s (fallback)
- **Vocals**: 3-8s (TTS) or 0s (skip)
- **Mixing**: 1-2s
- **Video**: 5-15s
- **Total**: ~30-60s per generation

---

## 📚 Resources

- **Full Documentation**: `backend-complete/scripts/README.md`
- **Source Code**: `backend-complete/scripts/generate_media.py`
- **Setup Script**: `backend-complete/scripts/setup_dependencies.sh`
- **Node Service**: `backend-complete/src/services/mediaGenerationService.ts`

---

## 🆘 Support

If you encounter issues:

1. ✅ Run setup script: `bash setup_dependencies.sh`
2. 🔍 Check logs: Script outputs detailed progress
3. 📋 Validate files: Use ffprobe commands
4. 🧪 Test manually: Run FFmpeg commands separately
5. 🐛 Report issue: Include error logs + ffprobe output

---

**Quick Links:**
- [Setup Guide](#quick-start-3-commands)
- [Validation](#validation-commands)
- [Troubleshooting](#troubleshooting)
- [Integration](#integration-examples)
