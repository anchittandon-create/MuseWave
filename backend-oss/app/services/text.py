from __future__ import annotations

import random
from datetime import datetime
from typing import List

from ..schemas import PromptRequest, PromptResponse, SuggestRequest, SuggestResponse

DEMOS = [
    "Echoes of stardust over neon skies, keeping the heartbeat in halftime.",
    "Whispers of vinyl crackle with lo-fi rays, drifting through midnight coffee haze.",
    "Waves crash soft on analogue shores, synth arpeggios bloom like auroras.",
]

GENRES = [
    "Lo-Fi",
    "Synthwave",
    "Indie Pop",
    "RnB",
    "Ambient",
    "Afrobeat",
]

ARTISTS = ["Tom Misch", "FKJ", "Odesza", "Billie Eilish", "Hans Zimmer", "Daft Punk"]
LANGUAGES = ["English", "Spanish", "Hindi", "French", "Japanese", "Korean"]
MOODS = ["Dreamy", "Melancholic", "Energetic", "Cinematic", "Minimal", "Dark"]


async def generate_prompt(req: PromptRequest) -> PromptResponse:
    """Stub implementation: real integration will call Cohere/HF/Ollama."""
    seed = abs(hash(req.prompt)) % len(DEMOS)
    lyrics = DEMOS[seed]
    genre = req.genres[0] if req.genres else GENRES[seed % len(GENRES)]
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
    haystack: List[str]
    if req.field == 'genres':
        haystack = GENRES
    elif req.field == 'languages':
        haystack = LANGUAGES
    elif req.field == 'artists':
        haystack = ARTISTS
    else:
        haystack = MOODS

    query = (req.input or '').lower()
    results = [item for item in haystack if query in item.lower()]
    if not results:
        results = haystack[:3]
    return SuggestResponse(suggestions=results[:5])
