"""Normalize on-screen diagram width without recropping.

Manual crops vary in padding: some include a full row of whitespace, others
are tight. We derive a display width from the source-page bbox width and the
ink fill ratio inside the crop so similarly sized originals render similarly.
"""

from __future__ import annotations

import io
from typing import Any, Dict, Optional

import numpy as np
from PIL import Image

MIN_DISPLAY_WIDTH_PCT = float(
    __import__("os").environ.get("PAST_PAPER_DIAGRAM_MIN_WIDTH_PCT", "32")
)
MAX_DISPLAY_WIDTH_PCT = float(
    __import__("os").environ.get("PAST_PAPER_DIAGRAM_MAX_WIDTH_PCT", "90")
)
DEFAULT_PAGE_WIDTH_FRAC = 0.62


def _bbox_page_width(asset: Dict[str, Any]) -> float:
    for key in ("bbox_norm", "bbox_norm_final", "bbox_norm_padded"):
        bbox = asset.get(key)
        if isinstance(bbox, list) and len(bbox) == 4:
            width = float(bbox[2])
            if width > 0:
                return min(1.0, width)
    return DEFAULT_PAGE_WIDTH_FRAC


def ink_content_ratio(image_bytes: bytes) -> float:
    """Horizontal fraction of the crop occupied by non-background ink."""
    with Image.open(io.BytesIO(image_bytes)) as img:
        arr = np.asarray(img.convert("L"), dtype=np.uint8)
    if arr.size == 0:
        return 1.0

    width = int(arr.shape[1])
    if width <= 0:
        return 1.0

    background = float(np.percentile(arr, 90))
    ink = arr < min(220.0, background - 22.0)
    cols = ink.any(axis=0)
    if not cols.any():
        return 1.0

    active = np.flatnonzero(cols)
    ink_width = int(active[-1] - active[0] + 1)
    return max(0.05, min(1.0, ink_width / float(width)))


def compute_display_width_pct(
    asset: Dict[str, Any],
    crop_bytes: bytes,
    *,
    min_pct: float = MIN_DISPLAY_WIDTH_PCT,
    max_pct: float = MAX_DISPLAY_WIDTH_PCT,
) -> float:
    """Return a clamped CSS width percentage for one stem diagram asset."""
    page_frac = _bbox_page_width(asset)
    fill = ink_content_ratio(crop_bytes)
    pct = page_frac * fill * 100.0
    return round(max(min_pct, min(max_pct, pct)), 1)


def attach_display_widths(
    assets: list[Dict[str, Any]],
    *,
    crop_bytes_by_id: Optional[Dict[str, bytes]] = None,
) -> list[Dict[str, Any]]:
    """Copy assets and set display_width_pct when crop bytes are available."""
    out: list[Dict[str, Any]] = []
    crop_bytes_by_id = crop_bytes_by_id or {}
    for asset in assets:
        row = dict(asset)
        asset_id = str(row.get("id") or "")
        crop_bytes = crop_bytes_by_id.get(asset_id)
        if crop_bytes:
            row["display_width_pct"] = compute_display_width_pct(row, crop_bytes)
        out.append(row)
    return out
