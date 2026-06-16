"""Shared defaults for the quality gate (CLI, Streamlit, batch API)."""

from __future__ import annotations

import os
from typing import List

# --- Sync scoring (default: Vertex Gemini 2.5 Flash) -------------------------
# ``QUALITY_GATE_LLM=anthropic`` uses Claude via ``ANTHROPIC_API_KEY``.
DEFAULT_QUALITY_GATE_LLM = "vertex"

DEFAULT_QUALITY_GATE_MODEL_ANTHROPIC = "claude-3-5-haiku-20241022"
DEFAULT_QUALITY_GATE_MODEL_VERTEX = "gemini-2.5-flash"

# Gemini Developer Batch API only (separate from sync Vertex/Claude choice).
DEFAULT_QUALITY_GATE_BATCH_MODEL = "gemini-2.5-flash"

# SVG diagram generation (Vertex Gemini only — uses ``LLMClient``; separate from sync Claude scorer).
DEFAULT_QUALITY_GATE_DIAGRAM_MODEL = "gemini-2.5-pro"

# Image diagram backfill (Imagen + Gemini brief/verify/integrate).
DEFAULT_QUALITY_GATE_IMAGE_MODEL = "imagen-4.0-ultra-generate-001"
DEFAULT_QUALITY_GATE_IMAGE_FALLBACK = "imagen-4.0-generate-001"
DEFAULT_QUALITY_GATE_IMAGE_FAST = "imagen-4.0-fast-generate-001"
DEFAULT_QUALITY_GATE_IMAGE_BRIEF_MODEL = "gemini-2.5-pro"
DEFAULT_QUALITY_GATE_IMAGE_VERIFY_MODEL = "gemini-2.5-pro"
DEFAULT_QUALITY_GATE_IMAGE_INTEGRATE_MODEL = "gemini-2.5-pro"

IMAGE_BACKFILL_BUCKET = "quality-gate-diagrams"


def deterministic_prechecks_enabled() -> bool:
    """
    Regex/tag answer-key/formatting prechecks and post-LLM overrides.

    Default **off** — scoring uses LLM rubric only. Set ``QUALITY_GATE_DETERMINISTIC=1`` to re-enable.
    """
    raw = (os.environ.get("QUALITY_GATE_DETERMINISTIC") or "0").strip().lower()
    return raw in ("1", "true", "yes", "on")


def default_diagram_model() -> str:
    """Model for graph-candidate SVG + stem merge (override with ``MODEL_QUALITY_GATE_SVG``)."""
    override = (os.environ.get("MODEL_QUALITY_GATE_SVG") or "").strip()
    if override:
        return override
    return DEFAULT_QUALITY_GATE_DIAGRAM_MODEL


def _env_model(name: str, default: str) -> str:
    override = (os.environ.get(name) or "").strip()
    return override or default


def default_image_model() -> str:
    return _env_model("MODEL_QUALITY_GATE_IMAGE", DEFAULT_QUALITY_GATE_IMAGE_MODEL)


def default_image_fallback_model() -> str:
    return _env_model("MODEL_QUALITY_GATE_IMAGE_FALLBACK", DEFAULT_QUALITY_GATE_IMAGE_FALLBACK)


def default_image_fast_model() -> str:
    return _env_model("MODEL_QUALITY_GATE_IMAGE_FAST", DEFAULT_QUALITY_GATE_IMAGE_FAST)


def default_image_brief_model() -> str:
    return _env_model("MODEL_QUALITY_GATE_IMAGE_BRIEF", DEFAULT_QUALITY_GATE_IMAGE_BRIEF_MODEL)


def default_image_verify_model() -> str:
    return _env_model("MODEL_QUALITY_GATE_IMAGE_VERIFY", DEFAULT_QUALITY_GATE_IMAGE_VERIFY_MODEL)


def default_image_integrate_model() -> str:
    return _env_model("MODEL_QUALITY_GATE_IMAGE_INTEGRATE", DEFAULT_QUALITY_GATE_IMAGE_INTEGRATE_MODEL)


def default_llm_provider() -> str:
    v = (os.environ.get("QUALITY_GATE_LLM") or DEFAULT_QUALITY_GATE_LLM).strip().lower()
    if v in ("vertex", "gemini", "google"):
        return "vertex"
    if v in ("anthropic", "claude"):
        return "anthropic"
    raise ValueError(
        f"Unknown QUALITY_GATE_LLM={v!r}; use 'vertex' (default) or 'anthropic'."
    )


def default_sync_model() -> str:
    """Resolved sync model when ``--model`` / UI field is empty."""
    override = (os.environ.get("MODEL_QUALITY_GATE") or "").strip()
    if override:
        return override
    return (
        DEFAULT_QUALITY_GATE_MODEL_ANTHROPIC
        if default_llm_provider() == "anthropic"
        else DEFAULT_QUALITY_GATE_MODEL_VERTEX
    )


# Back-compat name used in a few imports; prefer ``default_sync_model()`` for new code.
DEFAULT_QUALITY_GATE_MODEL = DEFAULT_QUALITY_GATE_MODEL_VERTEX

# After the primary id, ``assess_question`` retries these on Vertex 404 only.
_QUALITY_GATE_VERTEX_404_FALLBACKS: tuple[str, ...] = (
    "gemini-2.5-flash",
    "gemini-1.5-flash-002",
)


def _env_float(name: str, default: float) -> float:
    raw = (os.environ.get(name) or "").strip()
    if not raw:
        return default
    try:
        return float(raw)
    except ValueError:
        return default


def _env_int(name: str, default: int) -> int:
    raw = (os.environ.get(name) or "").strip()
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def use_full_rubric() -> bool:
    """Set ``QUALITY_GATE_FULL_RUBRIC=1`` to send the full ``prompt.md`` (~6k+ tokens) each call."""
    raw = (os.environ.get("QUALITY_GATE_FULL_RUBRIC") or "0").strip().lower()
    return raw in ("1", "true", "yes", "on")


def make_vertex_llm_client():
    """``LLMClient`` with env pacing — used by Quality Gate scoring and diagram helpers."""
    from project import LLMClient

    min_delay = _env_float("QUALITY_GATE_MIN_DELAY", _env_float("API_MIN_DELAY", 8.0))
    rate_limit_delay = _env_float("API_RATE_LIMIT_DELAY", 30.0)
    return LLMClient(min_delay=min_delay, rate_limit_delay=rate_limit_delay)


def quota_error_pause_seconds() -> float:
    """Sleep after a quota/429 failure before attempting the next question."""
    return _env_float("QUALITY_GATE_QUOTA_PAUSE_S", 90.0)


def long_quota_pause_seconds() -> float:
    """Extra sleep when many consecutive quota errors occur in one job."""
    return _env_float("QUALITY_GATE_LONG_QUOTA_PAUSE_S", 180.0)


def max_consecutive_quota_errors() -> int:
    return max(1, _env_int("QUALITY_GATE_MAX_CONSECUTIVE_QUOTA_ERRORS", 3))


def is_quota_rate_limit_error(exc: BaseException) -> bool:
    from project import GeminiQuotaExhaustedError

    if isinstance(exc, GeminiQuotaExhaustedError):
        return True
    s = str(exc).lower()
    return (
        "429" in s
        or "resource_exhausted" in s
        or "quota" in s
        or "rate limit" in s
        or "too many requests" in s
    )


def quality_gate_model_try_order(primary: str, *, vertex_not_found_fallbacks: bool) -> List[str]:
    """Primary model first, then optional env list, then Vertex defaults — de-duplicated."""
    p = (primary or "").strip()
    raw = (os.environ.get("QUALITY_GATE_404_FALLBACK_MODELS") or "").strip()
    extra = [x.strip() for x in raw.split(",") if x.strip()] if raw else []
    seen: set[str] = set()
    out: List[str] = []
    tail: tuple[str, ...] = _QUALITY_GATE_VERTEX_404_FALLBACKS if vertex_not_found_fallbacks else ()
    for m in [p, *extra, *tail]:
        if not m or m in seen:
            continue
        seen.add(m)
        out.append(m)
    return out
