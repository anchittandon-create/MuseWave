# MuseWave OSS Backend

FastAPI-based backend that powers the **Free Open Source Version** of MuseWave.  
This backend wires together open/free models (Cohere free tier, Hugging Face Inference, Ollama, MusicGen, AudioLDM, Riffusion, Coqui TTS, FFmpeg) to provide a full pipeline:

1. `/generate/prompt` & `/suggest/*` – prompt/lyrics/autosuggest via Cohere → Hugging Face → Ollama fallback.
2. `/generate/audio` – base instrumental using MusicGen / AudioLDM / Riffusion.
3. `/generate/vocals` – vocal synthesis using Coqui TTS (local REST server) with optional Whisper post-processing.
4. `/generate/final` – FFmpeg alignment, mastering, and spectrum video rendering.
5. `/assets/{id}/{file}` – serves generated artifacts from `public/assets/`.

> **Status:** This commit scaffolds the FastAPI project with placeholder logic so the frontend can already call the endpoints. Subsequent steps will plug in the real model integrations.

## Getting Started

```bash
cd backend-oss
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 3002
```

## Environment Variables

| Variable | Description | Default |
| --- | --- | --- |
| `ASSETS_ROOT` | Directory where generated files are stored/served | `../public/assets` |
| `COHERE_API_KEY` | Cohere API key (optional until text integration step) | – |
| `HUGGINGFACE_API_KEY` | Hugging Face Inference token (optional) | – |
| `OLLAMA_HOST` | URL to local Ollama server `http://localhost:11434` | – |
| `MUSICGEN_MODEL_ID` | Hugging Face model id for MusicGen | `facebook/musicgen-small` |
| `COQUI_TTS_URL` | HTTP endpoint for Coqui TTS server | `http://localhost:5002/api/tts` |

## Next Steps

1. Implement real text generation logic (`app/services/text.py`).
2. Wire MusicGen / AudioLDM / Riffusion inference (`app/services/audio.py`).
3. Add Coqui TTS + FFmpeg mixing pipeline (`app/services/vocals.py`, `app/services/final.py`).
4. Connect frontend OSS mode to these endpoints.

