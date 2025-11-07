# Open-Source Music Generation - Quick Start Examples

## Basic Generation

### 1. Lofi Hip-Hop (30 seconds)

```bash
curl -X POST http://localhost:3000/api/generate-opensource \
  -H "Content-Type: application/json" \
  -d '{
    "musicPrompt": "relaxing lofi hip-hop beats for studying",
    "genres": ["lofi"],
    "durationSec": 30
  }'
```

### 2. Synthwave with Video (60 seconds)

```bash
curl -X POST http://localhost:3000/api/generate-opensource \
  -H "Content-Type: application/json" \
  -d '{
    "musicPrompt": "dreamy synthwave with retro vibes and nostalgic pads",
    "genres": ["synthwave", "electronic"],
    "durationSec": 60,
    "artistInspiration": ["Kavinsky", "Tycho"],
    "generateVideo": true,
    "videoStyles": ["Abstract Visualizer"]
  }'
```

### 3. Techno with Vocals (45 seconds)

```bash
curl -X POST http://localhost:3000/api/generate-opensource \
  -H "Content-Type: application/json" \
  -d '{
    "musicPrompt": "driving techno with industrial sounds",
    "genres": ["techno"],
    "durationSec": 45,
    "lyrics": "Feel the rhythm, lose control, let the music take your soul",
    "vocalLanguages": ["English"],
    "generateVideo": true
  }'
```

### 4. Ambient Meditation (90 seconds)

```bash
curl -X POST http://localhost:3000/api/generate-opensource \
  -H "Content-Type: application/json" \
  -d '{
    "musicPrompt": "peaceful ambient soundscape for meditation",
    "genres": ["ambient"],
    "durationSec": 90,
    "generateVideo": true,
    "videoStyles": ["Spectrum Visualizer"]
  }'
```

### 5. House Music (60 seconds)

```bash
curl -X POST http://localhost:3000/api/generate-opensource \
  -H "Content-Type: application/json" \
  -d '{
    "musicPrompt": "uplifting deep house with soulful chords",
    "genres": ["house", "deep house"],
    "durationSec": 60,
    "artistInspiration": ["Disclosure", "Duke Dumont"]
  }'
```

## Testing Individual Components

### Check Available Models

```bash
curl http://localhost:3000/api/capabilities
```

### Test Python Bridge Directly

#### Riffusion (Text-to-Audio)
```bash
python3 python/riffusion_bridge.py \
  --prompt "lofi hip-hop beats" \
  --duration 30 \
  --output /tmp/riffusion_test.wav

# Play output
afplay /tmp/riffusion_test.wav  # macOS
aplay /tmp/riffusion_test.wav   # Linux
```

#### Magenta (MIDI Generation)
```bash
python3 python/magenta_bridge.py \
  --duration 30 \
  --bpm 120 \
  --key "A minor" \
  --output /tmp/melody_test.mid

# Convert MIDI to audio
fluidsynth -ni assets/GeneralUser.sf2 /tmp/melody_test.mid \
  -F /tmp/melody_test.wav -r 44100

# Play output
afplay /tmp/melody_test.wav
```

#### Coqui TTS (Vocals)
```bash
python3 python/coqui_bridge.py \
  --text "This is a test of text to speech synthesis for music vocals" \
  --language en \
  --output /tmp/vocals_test.wav

# Play output
afplay /tmp/vocals_test.wav
```

### Test FFmpeg Mixing

```bash
# Generate test files first
python3 python/riffusion_bridge.py --prompt "techno" --duration 15 --output /tmp/layer1.wav
python3 python/magenta_bridge.py --duration 15 --bpm 128 --output /tmp/melody.mid
fluidsynth -ni assets/GeneralUser.sf2 /tmp/melody.mid -F /tmp/layer2.wav -r 44100

# Mix them
ffmpeg -i /tmp/layer1.wav -i /tmp/layer2.wav \
  -filter_complex "[0:a][1:a]amix=inputs=2:normalize=0,alimiter=limit=0.95,dynaudnorm,loudnorm=I=-14:TP=-1.0[out]" \
  -map "[out]" -ar 44100 -ac 2 /tmp/mix.wav

# Play result
afplay /tmp/mix.wav
```

### Test Video Generation

```bash
# Generate video from audio
ffmpeg -i /tmp/mix.wav \
  -filter_complex "showwaves=s=1280x720:mode=cline:colors=white|cyan|blue" \
  -r 30 -pix_fmt yuv420p -c:v libx264 -preset fast \
  -c:a aac -b:a 192k -shortest \
  /tmp/video.mp4

# Play video (macOS)
open /tmp/video.mp4
```

## Production Testing

### Load Test (Multiple Requests)

```bash
# Generate 5 tracks in parallel
for i in {1..5}; do
  (
    echo "Starting generation $i..."
    curl -X POST http://localhost:3000/api/generate-opensource \
      -H "Content-Type: application/json" \
      -d "{
        \"musicPrompt\": \"test track $i\",
        \"genres\": [\"electronic\"],
        \"durationSec\": 15
      }" \
      > /tmp/result_$i.json
    echo "Generation $i complete"
  ) &
done

# Wait for all to finish
wait
echo "All generations complete!"

# Check results
for i in {1..5}; do
  echo "Result $i:"
  cat /tmp/result_$i.json | python3 -m json.tool
  echo ""
done
```

### Benchmark Generation Time

```bash
#!/bin/bash
echo "Benchmarking generation times..."

for duration in 15 30 60; do
  echo ""
  echo "Testing ${duration}s generation..."
  
  start_time=$(date +%s)
  
  curl -s -X POST http://localhost:3000/api/generate-opensource \
    -H "Content-Type: application/json" \
    -d "{
      \"musicPrompt\": \"test track\",
      \"genres\": [\"electronic\"],
      \"durationSec\": $duration
    }" > /tmp/bench_result.json
  
  end_time=$(date +%s)
  elapsed=$((end_time - start_time))
  
  success=$(cat /tmp/bench_result.json | python3 -c "import sys,json; print(json.load(sys.stdin).get('success', False))")
  
  echo "  Duration: ${duration}s"
  echo "  Time taken: ${elapsed}s"
  echo "  Success: $success"
done
```

## Debugging

### Enable Verbose Logging

```bash
# Set environment variable
export LOG_LEVEL=debug

# Or start server with debug logging
LOG_LEVEL=debug npm run dev
```

### Check Python Environment

```bash
# List installed packages
pip3 list | grep -E "(magenta|TTS|diffusers|torch)"

# Test imports
python3 -c "import magenta; print('Magenta OK')"
python3 -c "import TTS; print('CoquiTTS OK')"
python3 -c "import diffusers; print('Diffusers OK')"
```

### Check System Tools

```bash
# FFmpeg version
ffmpeg -version

# FluidSynth version
fluidsynth --version

# Check SoundFont
ls -lh assets/GeneralUser.sf2
```

### Monitor Resource Usage

```bash
# Watch CPU/Memory during generation
watch -n 1 "ps aux | grep -E '(python|node|ffmpeg|fluidsynth)' | grep -v grep"

# Or use htop
htop -p $(pgrep -d',' -f 'node|python|ffmpeg')
```

## Common Issues

### "Model not found" Error

```bash
# Check which models are available
curl http://localhost:3000/api/capabilities | python3 -m json.tool

# Install missing models
cd python
pip3 install -r requirements.txt
```

### "SoundFont not found" Error

```bash
# Re-download SoundFont
./scripts/setup-opensource.sh
```

### Audio File Not Playing

```bash
# Check file format
ffprobe public/assets/2025/11/*/mix.wav

# Convert if needed
ffmpeg -i input.wav -ar 44100 -ac 2 output.wav
```

### Generation Timeout

```bash
# Test with shorter duration
curl -X POST http://localhost:3000/api/generate-opensource \
  -H "Content-Type: application/json" \
  -d '{"musicPrompt":"test","genres":["electronic"],"durationSec":10}'
```

## Advanced Examples

### Multi-Language Vocals

```bash
# Spanish
curl -X POST http://localhost:3000/api/generate-opensource \
  -H "Content-Type: application/json" \
  -d '{
    "musicPrompt": "flamenco-inspired electronic",
    "genres": ["electronic", "world"],
    "durationSec": 45,
    "lyrics": "Bailamos bajo las estrellas",
    "vocalLanguages": ["es"]
  }'

# French
curl -X POST http://localhost:3000/api/generate-opensource \
  -H "Content-Type: application/json" \
  -d '{
    "musicPrompt": "romantic house music",
    "genres": ["house"],
    "durationSec": 45,
    "lyrics": "La musique est ma passion",
    "vocalLanguages": ["fr"]
  }'
```

### Genre Blending

```bash
curl -X POST http://localhost:3000/api/generate-opensource \
  -H "Content-Type: application/json" \
  -d '{
    "musicPrompt": "jazz-influenced drum and bass with ambient textures",
    "genres": ["dnb", "jazz", "ambient"],
    "durationSec": 60,
    "artistInspiration": ["LTJ Bukem", "Herbie Hancock"]
  }'
```

---

**Need help?** Check README_OPENSOURCE.md or open an issue.
