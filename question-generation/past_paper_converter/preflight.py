"""Local preflight checks: blur, hash cache skip."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Optional

import numpy as np
from PIL import Image
import io

from .config import BLUR_THRESHOLD
from .export_questions import QuestionJob


@dataclass
class PreflightResult:
    ok: bool
    blur_score: float
    blurry: bool
    image_fetch_failed: bool
    skip_cached: bool = False
    cached_conversion: Optional[Dict[str, Any]] = None


def compute_blur_score(image_bytes: bytes) -> float:
    """Laplacian variance — higher = sharper."""
    img = Image.open(io.BytesIO(image_bytes)).convert("L")
    arr = np.array(img, dtype=np.float64)
    # Discrete Laplacian
    lap = (
        -4 * arr[1:-1, 1:-1]
        + arr[:-2, 1:-1]
        + arr[2:, 1:-1]
        + arr[1:-1, :-2]
        + arr[1:-1, 2:]
    )
    return float(lap.var())


def run_preflight(
    job: QuestionJob,
    *,
    existing_conversion: Optional[Dict[str, Any]] = None,
) -> PreflightResult:
    if not job.image_bytes:
        return PreflightResult(
            ok=False,
            blur_score=0.0,
            blurry=False,
            image_fetch_failed=True,
        )

    blur_score = compute_blur_score(job.image_bytes)
    blurry = blur_score < BLUR_THRESHOLD

    if existing_conversion and existing_conversion.get("status") == "auto_approved":
        return PreflightResult(
            ok=True,
            blur_score=blur_score,
            blurry=blurry,
            image_fetch_failed=False,
            skip_cached=True,
            cached_conversion=existing_conversion,
        )

    return PreflightResult(
        ok=True,
        blur_score=blur_score,
        blurry=blurry,
        image_fetch_failed=False,
    )
