from __future__ import annotations

import shutil
from datetime import datetime
from pathlib import Path
from uuid import uuid4

from ..config import PUBLIC_DIR
from ..schemas import VocalRequest, VocalResponse

PLACEHOLDER_VOCALS = PUBLIC_DIR / 'test-30s.wav'


async def generate_vocals(req: VocalRequest, asset_dir: Path) -> VocalResponse:
    asset_dir.mkdir(parents=True, exist_ok=True)
    target = asset_dir / 'vocals.wav'
    shutil.copyfile(PLACEHOLDER_VOCALS, target)

    return VocalResponse(
        id=f"vocals_{uuid4()}",
        vocals_url=_asset_url(asset_dir, 'vocals.wav'),
        created_at=datetime.utcnow(),
    )


def _asset_url(asset_dir: Path, filename: str) -> str:
    slug = asset_dir.name
    return f"/assets/{slug}/{filename}"
