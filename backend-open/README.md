## Open Music Backend

This backend guarantees playable audio/video outputs using deterministic DSP fallbacks, and can optionally leverage open-source models (Riffusion, Magenta, Coqui TTS, FluidSynth) when available.

### Quick Start
```bash
npm install
npm run backend:dev
```

### Environment Variables
```
API_KEY=dev-key
ASSETS_BASE_URL=http://localhost:4000
PYTHON_BIN=python3
SOUND_FONT_PATH=/usr/share/sounds/sf2/GeneralUser_GS.sf2
```

### Request Example
```bash
curl -X POST http://localhost:4000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "musicPrompt": "dreamy progressive house",
    "genres": ["trance"],
    "durationSec": 60,
    "lyrics": "We rise beyond the night",
    "generateVideo": true,
    "videoStyles": ["Official Music Video"]
  }'
```

### Response
```json
{
  "bpm": 132,
  "key": "A minor",
  "assets": {
    "instrumentalUrl": "/assets/2025/11/uuid/instrumental.wav",
    "mixUrl": "/assets/2025/11/uuid/mix.wav",
    "videoUrl": "/assets/2025/11/uuid/final.mp4"
  },
  "engine": {
    "music": "dsp",
    "melody": "none",
    "vocals": "dsp",
    "video": "ffmpeg"
  }
}
```

### Optional Model Setup
See `scripts/ENABLE_MODELS_LOCALLY.md` for instructions to install Python models and soundfonts so the backend can invoke Riffusion, Magenta, Coqui TTS, and FluidSynth automatically.
