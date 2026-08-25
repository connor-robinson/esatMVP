"""Source image caching plus crops that may extend past the page edge."""

from __future__ import annotations

import hashlib
import io
import math
import uuid
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from PIL import Image

from past_paper_converter.config import CACHE_DIR
from past_paper_converter.diagram import upload_diagram
from past_paper_converter.export_questions import download_image

SOURCE_CACHE = CACHE_DIR / "studio_sources"
SOURCE_CACHE.mkdir(parents=True, exist_ok=True)

# A manual crop may deliberately reach outside the screenshot. Cap the result so
# a mis-drag cannot produce a multi-hundred-megapixel upload.
MAX_CROP_PIXELS = 40_000_000
MIN_CROP_SIDE = 8

_MEMORY: Dict[str, bytes] = {}
_MEMORY_SIZE: Dict[str, Tuple[int, int]] = {}


def _cache_path(url: str) -> Path:
    return SOURCE_CACHE / f"{hashlib.sha256(url.encode('utf-8')).hexdigest()}.bin"


def _remember(url: str, data: bytes) -> None:
    _MEMORY[url] = data
    if url not in _MEMORY_SIZE:
        with Image.open(io.BytesIO(data)) as img:
            _MEMORY_SIZE[url] = img.size


def source_bytes(url: str, *, refresh: bool = False) -> bytes:
    """Return the screenshot bytes the stored bboxes were measured against."""
    if not url:
        raise ValueError("question has no source image url")
    if not refresh and url in _MEMORY:
        return _MEMORY[url]

    path = _cache_path(url)
    if path.is_file() and not refresh:
        data = path.read_bytes()
    else:
        data = download_image(url)
        path.write_bytes(data)

    _remember(url, data)
    return data


def source_size(url: str) -> Tuple[int, int]:
    cached = _MEMORY_SIZE.get(url)
    if cached is not None:
        return cached
    source_bytes(url)
    return _MEMORY_SIZE[url]


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def normalize_bbox(bbox: List[float]) -> List[float]:
    if not isinstance(bbox, (list, tuple)) or len(bbox) != 4:
        raise ValueError("bbox must be [x, y, w, h] in normalized units")
    values = []
    for raw in bbox:
        value = float(raw)
        if not math.isfinite(value):
            raise ValueError("bbox contains a non-finite value")
        values.append(value)
    x, y, w, h = values
    if w <= 0 or h <= 0:
        raise ValueError("bbox width and height must be positive")
    return [x, y, w, h]


def crop_norm(image_bytes: bytes, bbox: List[float]) -> Tuple[bytes, Dict[str, object]]:
    """Crop by normalized bbox, padding with white where it leaves the page.

    Coordinates are relative to the source screenshot and may be negative or
    greater than 1 so a diagram can be extended past the original edge.
    """
    x, y, w, h = normalize_bbox(bbox)
    with Image.open(io.BytesIO(image_bytes)) as opened:
        image = opened.convert("RGB")
        width, height = image.size

        left = int(round(x * width))
        top = int(round(y * height))
        right = int(round((x + w) * width))
        bottom = int(round((y + h) * height))

        out_w = max(MIN_CROP_SIDE, right - left)
        out_h = max(MIN_CROP_SIDE, bottom - top)
        if out_w * out_h > MAX_CROP_PIXELS:
            raise ValueError("crop region is too large; drag the handles inwards")

        canvas = Image.new("RGB", (out_w, out_h), (255, 255, 255))
        sx0, sy0 = max(0, left), max(0, top)
        sx1, sy1 = min(width, left + out_w), min(height, top + out_h)
        if sx1 > sx0 and sy1 > sy0:
            canvas.paste(image.crop((sx0, sy0, sx1, sy1)), (sx0 - left, sy0 - top))

        buffer = io.BytesIO()
        canvas.save(buffer, format="PNG", optimize=True)

    diagnostics: Dict[str, object] = {
        "manual_crop": True,
        "bbox_norm_final": [x, y, w, h],
        "source_size": [width, height],
        "crop_size": [out_w, out_h],
        "crop_box_pixels": [left, top, left + out_w, top + out_h],
        "extends_beyond_source": bool(
            left < 0 or top < 0 or left + out_w > width or top + out_h > height
        ),
        "padding_fill": "white",
    }
    return buffer.getvalue(), diagnostics


def upload_crop(
    question_id: int,
    crop_bytes: bytes,
    *,
    index: int,
    version: Optional[str] = None,
) -> str:
    """Upload under a fresh version so no browser ever shows a stale crop."""
    url = upload_diagram(
        question_id,
        crop_bytes,
        index=index,
        version=version or uuid.uuid4().hex[:12],
    )
    if not url:
        raise RuntimeError("diagram upload failed (supabase storage unavailable)")
    return url
