from __future__ import annotations

import shutil
from datetime import datetime
from pathlib import Path
from uuid import uuid4, UUID

from ..config import PUBLIC_DIR
from ..schemas import FinalRequest, FinalResponse

PLACEHOLDER_MIX = PUBLIC_DIR / 'test-lyric-video.mp4'
PLACEHOLDER_AUDIO = PUBLIC_DIR / 'test-create-45s.wav'


async def render_final(req: FinalRequest, asset_dir: Path, metadata: dict) -> FinalResponse:
    asset_dir.mkdir(parents=True, exist_ok=True)
    mix_mp3 = asset_dir / 'mix.mp3'
    video_mp4 = asset_dir / 'video.mp4'

    shutil.copyfile(PLACEHOLDER_AUDIO, mix_mp3)
    shutil.copyfile(PLACEHOLDER_MIX, video_mp4)

    slug = asset_dir.name
    return FinalResponse(
        id=f"final_{uuid4()}",
        prompt=metadata.get('prompt', 'MuseWave OSS Prompt'),
        lyrics=metadata.get('lyrics', ''),
        genre=metadata.get('genre', 'Lo-Fi'),
        language=metadata.get('language', 'English'),
        artist_inspiration=metadata.get('artist_inspiration'),
        mood=metadata.get('mood'),
        instrumental_url=f"/assets/{slug}/instrumental.wav",
        vocals_url=f"/assets/{slug}/vocals.wav",
        mix_url=f"/assets/{slug}/mix.mp3",
        video_url=f"/assets/{slug}/video.mp4",
        created_at=datetime.utcnow(),
    )
