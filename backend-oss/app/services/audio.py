from __future__ import annotations

import shutil
from datetime import datetime
from pathlib import Path
from uuid import uuid4

from ..config import PUBLIC_DIR
from ..schemas import AudioRequest, AudioResponse

PLACEHOLDER_AUDIO = PUBLIC_DIR / 'test-create-45s.wav'


async def generate_audio(req: AudioRequest, asset_dir: Path) -> AudioResponse:
    asset_dir.mkdir(parents=True, exist_ok=True)
    target = asset_dir / 'instrumental.wav'
    shutil.copyfile(PLACEHOLDER_AUDIO, target)

    return AudioResponse(
        id=f"audio_{uuid4()}",
        instrumental_url=_asset_url(asset_dir, 'instrumental.wav'),
        created_at=datetime.utcnow(),
    )


def _asset_url(asset_dir: Path, filename: str) -> str:
    slug = asset_dir.name
    return f"/assets/{slug}/{filename}"
