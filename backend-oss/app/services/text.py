from __future__ import annotations

import json
import random
from datetime import datetime
from typing import Iterable, List, Optional, Callable, Awaitable

import httpx

from ..config import COHERE_API_KEY, HUGGINGFACE_API_KEY, OLLAMA_HOST
from ..schemas import PromptRequest, PromptResponse, SuggestRequest, SuggestResponse

GENRES = [
    "Lo-Fi",
    "Synthwave",
    "Indie Pop",
    "RnB",
    "Ambient",
    "Afrobeat",
    "House",
    "Trap",
]

ARTISTS = ["Tom Misch", "FKJ", "Odesza", "Billie Eilish", "Hans Zimmer", "Daft Punk", "Bonobo", "Nujabes"]
LANGUAGES = ["English", "Spanish", "Hindi", "French", "Japanese", "Korean", "German"]
MOODS = ["Dreamy", "Melancholic", "Energetic", "Cinematic", "Minimal", "Dark"]


async def generate_prompt(req: PromptRequest) -> PromptResponse:
    prompt = _build_prompt(req)
    lyrics = await _first_success(
        [
            lambda: _call_cohere(prompt),
            lambda: _call_huggingface(prompt),
            lambda: _call_ollama(prompt),
        ],
        fallback=_fallback_text(req.prompt),
    )

    genre = req.genres[0] if req.genres else random.choice(GENRES)
    mood = req.mood or random.choice(MOODS)
    language = req.language or random.choice(LANGUAGES)
    artist = random.choice(ARTISTS)

    return PromptResponse(
        id=f"prompt_{datetime.utcnow().timestamp()}",
        title=f"{genre} {mood} Flow",
        lyrics=lyrics,
        genre=genre,
        mood=mood,
        language=language,
        artist_inspiration=artist,
        created_at=datetime.utcnow(),
    )


async def suggest(req: SuggestRequest) -> SuggestResponse:
    query = (req.input or '').strip()
    if query:
        suggestion_prompt = _build_suggestion_prompt(req.field, query, req.context)
        raw = await _first_success(
            [
                lambda: _call_cohere(suggestion_prompt, max_tokens=80),
                lambda: _call_huggingface(suggestion_prompt),
                lambda: _call_ollama(suggestion_prompt),
            ],
            fallback=None,
        )
        if raw:
            parsed = _parse_suggestions(raw)
            if parsed:
                return SuggestResponse(suggestions=parsed[:5])

    haystack = {
        'genres': GENRES,
        'languages': LANGUAGES,
        'artists': ARTISTS,
        'moods': MOODS,
    }[req.field]
    matches = [item for item in haystack if query.lower() in item.lower()] if query else haystack
    return SuggestResponse(suggestions=(matches or haystack)[:5])


def _build_prompt(req: PromptRequest) -> str:
    context = []
    if req.genres:
        context.append(f"genres: {', '.join(req.genres)}")
    if req.mood:
        context.append(f"mood: {req.mood}")
    if req.language:
        context.append(f"language: {req.language}")
    ctx = "; ".join(context) if context else "free-form"
    return (
        "You are MuseWave, an advanced music writer. "
        f"Given prompt: \"{req.prompt}\" ({ctx}), craft a short lyric excerpt (2-4 lines) "
        "and hint at instrumentation and rhythm."
    )


def _build_suggestion_prompt(field: str, query: str, context: dict) -> str:
    base = f"List up to five {field} that match '{query}'. Respond as comma-separated values."
    if context:
        base += f" Context: {json.dumps(context)}"
    return base


def _fallback_text(prompt: str) -> str:
    return (
        f"This is an open-source MuseWave response inspired by \"{prompt}\".\n"
        "Let the bass breathe while lo-fi drums shuffle, neon chords shimmer, and vocals float over midnight city lights."
    )


def _parse_suggestions(raw: str) -> List[str]:
    cleaned = raw.replace('\n', ',').replace(';', ',')
    parts = [part.strip(" -•\t") for part in cleaned.split(',')]
    return [p for p in parts if p]


async def _first_success(callables: Iterable[Callable[[], Awaitable[Optional[str]]]], fallback: Optional[str]) -> str:
    for fn in callables:
        try:
            result = await fn()
            if result:
                return result
        except Exception as exc:  # pragma: no cover
            print(f"[text] provider failed: {exc}")
    if fallback is not None:
        return fallback
    raise RuntimeError("All text providers failed")


async def _call_cohere(prompt: str, max_tokens: int = 160) -> Optional[str]:
    if not COHERE_API_KEY:
        return None
    url = "https://api.cohere.com/v1/generate"
    headers = {"Authorization": f"Bearer {COHERE_API_KEY}", "Content-Type": "application/json"}
    payload = {
        "model": "command",
        "prompt": prompt,
        "max_tokens": max_tokens,
        "temperature": 0.9,
        "k": 0,
        "stop_sequences": ["--"],
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(url, json=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        text = data.get('generations', [{}])[0].get('text')
        return text.strip() if text else None


async def _call_huggingface(prompt: str) -> Optional[str]:
    if not HUGGINGFACE_API_KEY:
        return None
    model_id = "mistralai/Mixtral-8x7B-Instruct-v0.1"
    url = f"https://api-inference.huggingface.co/models/{model_id}"
    headers = {"Authorization": f"Bearer {HUGGINGFACE_API_KEY}", "Content-Type": "application/json"}
    payload = {"inputs": prompt, "parameters": {"max_new_tokens": 160, "temperature": 0.85}}
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(url, headers=headers, json=payload)
        if resp.status_code == 503:
            return None
        resp.raise_for_status()
        data = resp.json()
        if isinstance(data, list) and data and 'generated_text' in data[0]:
            return data[0]['generated_text'].strip()
        if isinstance(data, dict):
            return data.get('generated_text') or data.get('text')
        return None


async def _call_ollama(prompt: str) -> Optional[str]:
    url = f"{OLLAMA_HOST.rstrip('/')}/api/generate"
    payload = {"model": "llama3", "prompt": prompt, "stream": False}
    async with httpx.AsyncClient(timeout=60) as client:
        try:
            resp = await client.post(url, json=payload)
        except httpx.HTTPError:
            return None
        if resp.status_code != 200:
            return None
        data = resp.json()
        return data.get('response')
