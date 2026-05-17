"""Gemini image generation wrapper for the V4 pipeline.

This module wraps ``genai.Client.models.generate_images`` for Vertex AI Imagen
(``imagen-*``) and the Gemini image preview models. It is intentionally small
and safe-to-fail: the orchestrator will gracefully skip image attachment if
this raises.

Environment variables consulted (with fallbacks):

- ``MODEL_IMAGE_HIGH_QUALITY``: e.g. ``imagen-4.0-generate-001`` (default)
- ``MODEL_IMAGE_FAST``: e.g. ``imagen-4.0-fast-generate-001``
- ``ESAT_IMAGE_ASPECT_RATIO``: default ``1:1``
- ``GOOGLE_CLOUD_PROJECT`` / ``GOOGLE_CLOUD_LOCATION``: used by genai SDK
"""

from __future__ import annotations

import base64
import os
import re
import time
from pathlib import Path
from typing import Dict, Optional, Tuple

try:
    from google import genai as _genai  # type: ignore
    from google.genai import types as _genai_types  # type: ignore
    _GENAI_AVAILABLE = True
except Exception:  # pragma: no cover - optional dep
    _genai = None  # type: ignore
    _genai_types = None  # type: ignore
    _GENAI_AVAILABLE = False


def _resolve_default_model(quality: str) -> str:
    if quality == "fast":
        return (
            os.environ.get("MODEL_IMAGE_FAST")
            or "imagen-4.0-fast-generate-001"
        )
    return (
        os.environ.get("MODEL_IMAGE_HIGH_QUALITY")
        or "imagen-4.0-generate-001"
    )


def _build_client():
    if not _GENAI_AVAILABLE:
        raise RuntimeError(
            "google-genai SDK is not available; install `google-genai` to enable image generation."
        )
    project = (
        os.environ.get("GOOGLE_CLOUD_PROJECT")
        or os.environ.get("VERTEX_PROJECT")
        or ""
    ).strip()
    location = (
        os.environ.get("GOOGLE_CLOUD_LOCATION")
        or os.environ.get("VERTEX_GENAI_LOCATION")
        or "us-central1"
    ).strip()
    if (location or "").lower() == "global":
        location = "us-central1"
    if not project:
        raise RuntimeError(
            "GOOGLE_CLOUD_PROJECT not set; cannot initialise Vertex GenAI client for image generation."
        )
    return _genai.Client(vertexai=True, project=project, location=location)


def _strip_prompt(prompt: str, *, max_chars: int = 1800) -> str:
    """Trim and normalise the Concept_Image_Prompt JSON-derived prompt string."""
    text = (prompt or "").strip()
    # Collapse extreme whitespace runs
    text = re.sub(r"\s+", " ", text)
    if len(text) > max_chars:
        text = text[:max_chars]
    return text


def generate_concept_image(
    prompt: str,
    *,
    out_path: Path,
    model: Optional[str] = None,
    aspect_ratio: Optional[str] = None,
    negative_prompt: Optional[str] = None,
    quality: str = "high",
    seed: Optional[int] = None,
    timeout_s: float = 60.0,
) -> Dict[str, object]:
    """Generate a single concept image and write it to ``out_path``.

    Returns a metadata dict ``{"path": str, "bytes": int, "model": str,
    "aspect_ratio": str, "seed": int|None, "duration_s": float}``.

    Raises ``RuntimeError`` for unrecoverable errors. The caller is expected
    to wrap this with a try/except and degrade gracefully.
    """
    if not _GENAI_AVAILABLE:
        raise RuntimeError("google-genai SDK unavailable")

    model_id = (model or _resolve_default_model(quality)).strip()
    aspect = (
        aspect_ratio
        or os.environ.get("ESAT_IMAGE_ASPECT_RATIO")
        or "1:1"
    ).strip()
    cleaned_prompt = _strip_prompt(prompt)
    if not cleaned_prompt:
        raise RuntimeError("Empty concept image prompt; cannot call image model.")

    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    client = _build_client()
    cfg_kwargs: Dict[str, object] = {
        "number_of_images": 1,
        "aspect_ratio": aspect,
    }
    if negative_prompt:
        cfg_kwargs["negative_prompt"] = negative_prompt
    if seed is not None:
        cfg_kwargs["seed"] = int(seed)
    cfg = _genai_types.GenerateImagesConfig(**cfg_kwargs)

    start = time.time()
    response = client.models.generate_images(
        model=model_id,
        prompt=cleaned_prompt,
        config=cfg,
    )
    duration = time.time() - start
    if duration > timeout_s:
        # Don't fail just because it took a long time; just warn via metadata.
        pass

    generated = getattr(response, "generated_images", None) or []
    if not generated:
        # Some preview models surface images on ``response.images``.
        generated = getattr(response, "images", None) or []
    if not generated:
        raise RuntimeError(
            f"Image model {model_id!r} returned no images (response={response!r})."
        )

    first = generated[0]
    image_obj = getattr(first, "image", None) or first
    img_bytes = getattr(image_obj, "image_bytes", None)
    if img_bytes is None:
        # Fall back to ``data`` (b64) when SDK returns a Blob wrapper.
        raw_b64 = getattr(image_obj, "data", None)
        if raw_b64:
            try:
                img_bytes = base64.b64decode(raw_b64)
            except Exception:
                img_bytes = None
    if not img_bytes:
        raise RuntimeError(
            f"Image model {model_id!r} returned an image with no bytes payload."
        )

    out_path.write_bytes(img_bytes)
    return {
        "path": str(out_path),
        "bytes": len(img_bytes),
        "model": model_id,
        "aspect_ratio": aspect,
        "seed": seed,
        "duration_s": round(duration, 3),
    }


def encode_image_for_inline(image_path: Path) -> Tuple[str, str]:
    """Return ``(mime_type, b64_data)`` for inline LLM verifier consumption."""
    image_path = Path(image_path)
    data = image_path.read_bytes()
    suffix = image_path.suffix.lower()
    mime = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
    }.get(suffix, "image/png")
    return mime, base64.b64encode(data).decode("ascii")
