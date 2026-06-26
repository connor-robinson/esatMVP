"""Diagram crop and Supabase upload."""

from __future__ import annotations

import io
from typing import Any, Dict, List, Optional, Tuple

from PIL import Image

from .config import STORAGE_BUCKET, STORAGE_PREFIX, DIAGRAM_BBOX_PAD_X, DIAGRAM_BBOX_PAD_Y, supabase_service_key, supabase_url

try:
    from supabase import create_client
except ImportError:
    create_client = None  # type: ignore


def expand_bbox_norm(bbox_norm: List[float]) -> List[float]:
    """Add margin so diagram labels/lines are not clipped at crop edges."""
    if len(bbox_norm) != 4:
        return bbox_norm
    x, y, w, h = bbox_norm
    x = max(0.0, x - DIAGRAM_BBOX_PAD_X)
    y = max(0.0, y - DIAGRAM_BBOX_PAD_Y)
    w = min(1.0 - x, w + 2 * DIAGRAM_BBOX_PAD_X)
    h = min(1.0 - y, h + 2 * DIAGRAM_BBOX_PAD_Y)
    return [x, y, w, h]


def crop_diagram(
    image_bytes: bytes,
    bbox_norm: List[float],
) -> Optional[bytes]:
    if not bbox_norm or len(bbox_norm) != 4:
        return None
    x, y, w, h = expand_bbox_norm(bbox_norm)
    img = Image.open(io.BytesIO(image_bytes))
    width, height = img.size
    left = max(0, int(x * width))
    top = max(0, int(y * height))
    right = min(width, int((x + w) * width))
    bottom = min(height, int((y + h) * height))
    if right <= left or bottom <= top:
        return None
    cropped = img.crop((left, top, right, bottom))
    buf = io.BytesIO()
    cropped.save(buf, format="PNG")
    return buf.getvalue()


def upload_diagram(question_id: int, diagram_bytes: bytes, index: int = 1) -> Optional[str]:
    if create_client is None:
        return None
    client = create_client(supabase_url(), supabase_service_key())
    key = f"{STORAGE_PREFIX}/{question_id}/diagram_{index}.png"
    bucket = client.storage.from_(STORAGE_BUCKET)
    bucket.upload(
        key,
        diagram_bytes,
        file_options={"content-type": "image/png", "upsert": "true"},
    )
    base = supabase_url().rstrip("/")
    return f"{base}/storage/v1/object/public/{STORAGE_BUCKET}/{key}"


def build_diagram_stem_embed(url: str, alt: str = "diagram not to scale") -> str:
    return (
        f'<figure class="qg-diagram">'
        f'<img src="{url}" alt="{alt}" />'
        f"</figure>"
    )


def process_diagrams(
    question_id: int,
    image_bytes: bytes,
    parsed: Dict[str, Any],
) -> Tuple[str, List[Dict[str, Any]], bool]:
    """Returns (stem_with_embed, diagram_assets, crop_failed)."""
    stem = str(parsed.get("stem") or "")
    if not parsed.get("has_diagram"):
        return stem, [], False

    bbox = parsed.get("diagram_bbox_norm") or []
    expanded = expand_bbox_norm(bbox) if bbox else bbox
    cropped = crop_diagram(image_bytes, bbox)
    if not cropped:
        return stem, [], True

    url = upload_diagram(question_id, cropped)
    if not url:
        return stem, [], True

    caption = str(parsed.get("diagram_caption") or "diagram not to scale")
    embed = build_diagram_stem_embed(url, caption)
    stem = f"{stem}\n\n{embed}" if stem else embed
    assets = [
        {
            "id": "d1",
            "url": url,
            "alt": caption,
            "position": "before_options",
            "bbox_norm": expanded if isinstance(expanded, list) and len(expanded) == 4 else None,
            "bbox_norm_raw": bbox if isinstance(bbox, list) and len(bbox) == 4 else None,
        }
    ]
    return stem, assets, False
