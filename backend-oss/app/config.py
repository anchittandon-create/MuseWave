from __future__ import annotations

import os
from pathlib import Path
from typing import Final

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
PUBLIC_DIR = BASE_DIR.parent / 'public'
ASSETS_ROOT: Final[Path] = Path(os.getenv('ASSETS_ROOT', PUBLIC_DIR / 'assets')).resolve()

COHERE_API_KEY = os.getenv('COHERE_API_KEY')
HUGGINGFACE_API_KEY = os.getenv('HUGGINGFACE_API_KEY')
OLLAMA_HOST = os.getenv('OLLAMA_HOST', 'http://localhost:11434')
MUSICGEN_MODEL_ID = os.getenv('MUSICGEN_MODEL_ID', 'facebook/musicgen-small')
COQUI_TTS_URL = os.getenv('COQUI_TTS_URL', 'http://localhost:5002/api/tts')

def ensure_asset_root() -> Path:
  ASSETS_ROOT.mkdir(parents=True, exist_ok=True)
  return ASSETS_ROOT
