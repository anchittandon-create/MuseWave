from __future__ import annotations

import uuid
from pathlib import Path
from typing import Dict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import ASSETS_ROOT, ensure_asset_root
from .schemas import (
    AudioRequest,
    AudioResponse,
    FinalRequest,
    FinalResponse,
    PromptRequest,
    PromptResponse,
    SuggestRequest,
    SuggestResponse,
    VocalRequest,
    VocalResponse,
)
from .services import audio, finalizer, text, vocals

app = FastAPI(
    title="MuseWave OSS Backend",
    version="0.1.0",
    description="Free/open-source pipeline for MuseWave's OSS mode.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

ensure_asset_root()
app.mount("/assets", StaticFiles(directory=ASSETS_ROOT), name="assets")

# in-memory store for metadata so /generate/final can reference earlier steps
PROJECTS: Dict[str, Dict] = {}


@app.post("/generate/prompt", response_model=PromptResponse)
async def generate_prompt(req: PromptRequest):
    result = await text.generate_prompt(req)
    PROJECTS[result.id] = result.model_dump()
    return result


@app.post("/generate/audio", response_model=AudioResponse)
async def generate_audio(req: AudioRequest):
    project = PROJECTS.get(req.prompt_id)
    slug = project.get('asset_id') if project else None
    asset_dir = _asset_dir(slug)
    response = await audio.generate_audio(req, asset_dir)
    if project is not None:
        project['asset_id'] = asset_dir.name
        project['instrumental_url'] = response.instrumental_url
    return response


@app.post("/generate/vocals", response_model=VocalResponse)
async def generate_vocals_endpoint(req: VocalRequest):
    project = PROJECTS.get(req.audio_id) or PROJECTS.get(req.vocal_id)
    asset_dir = _asset_dir(project.get('asset_id') if project else None)
    response = await vocals.generate_vocals(req, asset_dir)
    if project is not None:
        project['vocals_url'] = response.vocals_url
    return response


@app.post("/generate/final", response_model=FinalResponse)
async def generate_final(req: FinalRequest):
    project = PROJECTS.get(req.audio_id) or PROJECTS.get(req.project_id or '')
    if not project:
        raise HTTPException(status_code=400, detail="Unknown project. Run prompt/audio first.")
    asset_dir = _asset_dir(project.get('asset_id'))
    response = await finalizer.render_final(req, asset_dir, project)
    PROJECTS[response.id] = response.model_dump()
    return response


@app.post("/suggest", response_model=SuggestResponse)
async def suggest(req: SuggestRequest):
    return await text.suggest(req)


def _asset_dir(existing_slug: str | None = None) -> Path:
    slug = existing_slug or uuid.uuid4().hex
    directory = ASSETS_ROOT / slug
    directory.mkdir(parents=True, exist_ok=True)
    return directory
