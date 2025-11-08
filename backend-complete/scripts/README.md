# 🎵 MuseWave Audio & Video Generation System

## Overview

This document describes the complete audio and video generation pipeline for MuseWave, designed to produce **playable, non-empty media files** with proper validation at every step.

## 🧩 Core Problem Solved

**Previous Issue:** Generated audio/video files were often silent, empty, or unplayable due to:
- Missing intermediate files (zero-byte outputs)
- Incorrect audio codecs
- Failed MIDI rendering
- Broken FFmpeg filter chains
- No validation of output files

**Solution:** Comprehensive generation pipeline with:
- ✅ Step-by-step validation
- ✅ Fallback mechanisms for each component
- ✅ Proper error handling
- ✅ Format verification using ffprobe
- ✅ Minimum file size checks

---

## 📁 File Structure

```
backend-complete/
├── scripts/
│   ├── generate_media.py          # Main Python generator
│   ├── setup_dependencies.sh      # Dependency installer
│   └── README.md                  # This file
└── src/
    └── services/
        └── mediaGenerationService.ts  # Node.js wrapper
```

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend-complete/scripts
bash setup_dependencies.sh
```

This installs:
- **FFmpeg** - Audio/video processing
- **FluidSynth** - MIDI to audio conversion
- **SoundFont** - GeneralUser.sf2 for realistic instruments
- **Python packages** - MIDIUtil, Magenta (optional), Riffusion (optional), TTS (optional)

### 2. Test Generation

```bash
# Simple test
python3 generate_media.py "dreamy synthwave"

# With lyrics and language
python3 generate_media.py "epic orchestral" "Riding through the stars" "English"

# Full options
python3 generate_media.py \
  --prompt "chill lofi beats" \
  --lyrics "Study vibes all night long" \
  --language "English" \
  --video-style spectrum
```

### 3. Expected Output

```
public/assets/{job_id}/
├── melody.mid       # Generated MIDI
├── melody.wav       # MIDI converted to audio
├── texture.wav      # Background texture/pad
├── vocals.wav       # TTS vocals (if lyrics provided)
├── mix.wav          # ✅ PLAYABLE: Final stereo audio
├── final.mp4        # ✅ PLAYABLE: Video visualizer
└── metadata.json    # Generation metadata
```

---

## 🎚️ Generation Pipeline

### Phase 1: Melody Generation

**Primary:** Magenta (ML-based melody generator)
```bash
python3 -m magenta.models.melody_rnn.melody_rnn_generate \
  --config=attention_rnn \
  --bundle_file=/usr/local/share/magenta_models/attention_rnn.mag \
  --num_steps=128
```

**Fallback:** MIDIUtil (algorithmic MIDI generation)
```python
from midiutil import MIDIFile
midi = MIDIFile(1)
midi.addTempo(0, 0, 120)
# Generate C major scale pattern
```

**Output:** `melody.mid` (validated: >10KB)

### Phase 2: MIDI to Audio Conversion

```bash
fluidsynth -ni GeneralUser.sf2 melody.mid -F melody.wav -r 44100
```

**Validation:**
- File exists
- Size > 10KB
- Format: PCM 16-bit, 44100Hz, stereo

### Phase 3: Texture Generation

**Primary:** Riffusion (AI texture generator)
```bash
python3 -m riffusion.cli --prompt "dreamy synthwave" --output texture.wav
```

**Fallback:** FFmpeg sine wave synthesis
```bash
ffmpeg -f lavfi -i "sine=f=220:d=30" \
       -f lavfi -i "sine=f=329.63:d=30" \
       -f lavfi -i "sine=f=440:d=30" \
       -filter_complex "[0][1][2]amix=inputs=3:normalize=0" \
       texture.wav
```

**Output:** `texture.wav` (44100Hz, stereo)

### Phase 4: Vocals (Optional)

**Coqui TTS:**
```bash
tts --text "lyrics here" \
    --out_path vocals.wav \
    --speaker_idx p231 \
    --language_idx English
```

**Fallback:** Skip vocals if no lyrics or TTS unavailable

**Output:** `vocals.wav` (if generated)

### Phase 5: Audio Mixing

**Critical:** Handles variable number of stems (2-3 inputs)

```bash
ffmpeg -i texture.wav -i melody.wav [-i vocals.wav] \
  -filter_complex "amix=inputs=N:normalize=0,alimiter,aresample=44100,volume=1.2" \
  -ar 44100 -ac 2 mix.wav
```

Where `N` = number of input files (2 or 3)

**Validation:**
- File exists and size > 10KB
- ffprobe shows: `Audio: pcm_s16le, 44100 Hz, stereo`
- Can be played in audio players

### Phase 6: Video Visualization

```bash
ffmpeg -i mix.wav \
  -filter_complex "showspectrum=s=1280x720:color=rainbow:legend=disabled" \
  -r 30 -pix_fmt yuv420p -c:v libx264 -preset medium -crf 23 \
  -shortest final.mp4
```

**Styles available:**
- `spectrum` - Frequency spectrum analyzer (default)
- `waveform` - Waveform display
- `volumeter` - Vector scope

**Validation:**
- File exists and size > 10KB
- ffprobe shows: `Video: h264, yuv420p, 1280x720, 30 fps`
- Can be played in video players

---

## 🔍 Validation System

### File Validation (`validate_file()`)

```python
def validate_file(filepath, description):
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"{description} not created")
    
    size = os.path.getsize(filepath)
    if size < MIN_FILE_SIZE:  # 10KB
        raise ValueError(f"{description} too small: {size} bytes")
    
    return True
```

### Audio Format Validation

```python
def verify_audio_format(filepath):
    cmd = ["ffprobe", "-v", "error", "-show_streams", "-of", "json", filepath]
    data = json.loads(subprocess.check_output(cmd))
    
    stream = data['streams'][0]
    assert stream['sample_rate'] == '44100'
    assert stream['channels'] == 2
    assert stream['codec_name'] in ['pcm_s16le', 'pcm_s16be']
```

### Video Format Validation

```python
def verify_video_format(filepath):
    cmd = ["ffprobe", "-v", "error", "-show_streams", "-of", "json", filepath]
    data = json.loads(subprocess.check_output(cmd))
    
    video = next(s for s in data['streams'] if s['codec_type'] == 'video')
    assert video['codec_name'] == 'h264'
    assert video['pix_fmt'] == 'yuv420p'
```

---

## 🛠️ Troubleshooting

### Empty or Silent Audio Files

**Symptom:** `mix.wav` is 0 bytes or plays silently

**Diagnosis:**
```bash
# Check intermediate files
ls -lh public/assets/*/
ffprobe -hide_banner public/assets/*/melody.wav
ffprobe -hide_banner public/assets/*/texture.wav
```

**Common Causes:**
1. **MIDI file empty** - Magenta failed, fallback not triggered
2. **FluidSynth failed** - SoundFont missing
3. **Wrong FFmpeg filter** - `amix` input count mismatch
4. **Codec issue** - PCM vs other formats

**Fix:**
```bash
# Ensure SoundFont exists
ls /usr/local/share/soundfonts/GeneralUser.sf2

# Test FluidSynth manually
fluidsynth -ni /usr/local/share/soundfonts/GeneralUser.sf2 \
           melody.mid -F test.wav -r 44100

# Test FFmpeg mixing
ffmpeg -i texture.wav -i melody.wav \
       -filter_complex "amix=inputs=2:normalize=0" \
       test_mix.wav
```

### Video File Unplayable

**Symptom:** `final.mp4` won't play or has no video track

**Diagnosis:**
```bash
ffprobe -hide_banner public/assets/*/final.mp4
```

**Expected output:**
```
Stream #0:0: Video: h264 (Main), yuv420p, 1280x720, 30 fps
Stream #0:1: Audio: aac, 44100 Hz, stereo
```

**Common Causes:**
1. **Missing audio input** - `mix.wav` doesn't exist
2. **Wrong pixel format** - Not yuv420p (incompatible with browsers)
3. **Codec not found** - libx264 not in FFmpeg build

**Fix:**
```bash
# Check FFmpeg codecs
ffmpeg -codecs | grep h264

# Regenerate video with correct format
ffmpeg -i mix.wav \
       -filter_complex "showspectrum=s=1280x720" \
       -r 30 -pix_fmt yuv420p -c:v libx264 \
       final.mp4
```

### Missing Dependencies

**Symptom:** "command not found" errors

**Fix:**
```bash
# macOS
brew install ffmpeg fluidsynth
brew install python@3.11

# Ubuntu/Debian
sudo apt-get update
sudo apt-get install ffmpeg fluidsynth python3 python3-pip

# Python packages
pip3 install MIDIUtil magenta riffusion TTS
```

### Python Import Errors

**Symptom:** `ImportError: No module named 'midiutil'`

**Fix:**
```bash
# Verify Python version (need 3.8+)
python3 --version

# Install packages
pip3 install --upgrade pip
pip3 install MIDIUtil

# Verify installation
python3 -c "import midiutil; print('OK')"
```

---

## 🔧 Configuration

### Environment Variables

```bash
# Optional: Custom paths
export SOUNDFONT_PATH="/path/to/soundfont.sf2"
export MAGENTA_MODELS="/path/to/magenta/models"
export OUTPUT_DIR="/path/to/output"

# Optional: Quality settings
export VIDEO_CRF=23          # Lower = better quality (18-28)
export AUDIO_BITRATE=320k    # For MP3 encoding
export VIDEO_PRESET=medium   # ultrafast, fast, medium, slow
```

### Python Script Options

```bash
python3 generate_media.py --help

# Arguments:
#   prompt              Music prompt (required)
#   lyrics              Lyrics text (optional)
#   language            Vocal language (default: English)
#   --job-id            Custom job identifier
#   --output-dir        Custom output directory
#   --video-style       spectrum | waveform | volumeter
```

---

## 🎯 Integration with Backend

### Node.js/TypeScript Usage

```typescript
import { getMediaGenerationService } from './services/mediaGenerationService';

const service = getMediaGenerationService();

// Generate music
const result = await service.generate({
  prompt: 'dreamy synthwave',
  lyrics: 'Neon lights and digital nights',
  language: 'English',
  videoStyle: 'spectrum',
});

if (result.success) {
  console.log('Audio URL:', result.audioUrl);
  console.log('Video URL:', result.videoUrl);
} else {
  console.error('Generation failed:', result.error);
}
```

### Express/Fastify Route

```typescript
app.post('/api/generate-media', async (req, res) => {
  const { prompt, lyrics, language } = req.body;
  
  const service = getMediaGenerationService();
  const result = await service.generate({ prompt, lyrics, language });
  
  if (result.success) {
    res.json({
      audioUrl: result.audioUrl,
      videoUrl: result.videoUrl,
    });
  } else {
    res.status(500).json({ error: result.error });
  }
});
```

---

## 📊 Performance Metrics

Typical generation times (M1 Mac):
- **Melody generation**: 5-10s (Magenta) or <1s (fallback)
- **MIDI to WAV**: 2-5s
- **Texture generation**: 10-30s (Riffusion) or 1-2s (fallback)
- **Vocals (TTS)**: 3-8s
- **Mixing**: 1-2s
- **Video encoding**: 5-15s

**Total**: ~30-60 seconds for complete generation

---

## ✅ Verification Commands

After generation, run these to verify output:

```bash
# Check file sizes
ls -lh public/assets/*/

# Expected: All files > 10KB

# Check audio format
ffprobe -hide_banner public/assets/*/mix.wav | grep "Duration"
# Expected: Duration: 00:00:30+, Stream: Audio: pcm_s16le, 44100 Hz, stereo

# Check video format
ffprobe -hide_banner public/assets/*/final.mp4 | grep "Stream"
# Expected: Video: h264, yuv420p, 1280x720, 30 fps

# Play files
ffplay public/assets/*/mix.wav
ffplay public/assets/*/final.mp4
```

---

## 🔄 CI/CD Integration

For automated testing in CI/CD:

```yaml
# .github/workflows/test-generation.yml
name: Test Media Generation

on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup dependencies
        run: bash backend-complete/scripts/setup_dependencies.sh
      
      - name: Test generation
        run: |
          python3 backend-complete/scripts/generate_media.py "test prompt"
          
      - name: Verify output
        run: |
          test -f public/assets/*/mix.wav
          test -f public/assets/*/final.mp4
          ffprobe public/assets/*/mix.wav
```

---

## 📝 License

This generation system uses:
- **FFmpeg** - LGPL/GPL
- **FluidSynth** - LGPL
- **Magenta** (optional) - Apache 2.0
- **Coqui TTS** (optional) - MPL 2.0

---

## 🆘 Support

If you encounter issues:

1. **Check dependencies**: `bash setup_dependencies.sh`
2. **Review logs**: Python script outputs detailed progress
3. **Validate files**: Use ffprobe commands above
4. **Test manually**: Run each FFmpeg command separately
5. **Open issue**: Include error logs and ffprobe output

---

**Last Updated:** November 2025
**Version:** 1.0.0
