"""Configuration and exam-specific rules."""

from __future__ import annotations

import os
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[2]
ENV_PATH = PROJECT_ROOT / ".env.local"

if ENV_PATH.exists():
    load_dotenv(ENV_PATH)

DEFAULT_FLASH_MODEL = os.environ.get("MODEL_PAST_PAPER_EXTRACT", "gemini-2.5-flash")
DEFAULT_PRO_MODEL = os.environ.get("MODEL_PAST_PAPER_PRO", "gemini-2.5-pro")
DEFAULT_BATCH_MODEL = os.environ.get("MODEL_PAST_PAPER_BATCH", DEFAULT_FLASH_MODEL)

STORAGE_BUCKET = "question-images"
STORAGE_PREFIX = "past-papers"

BLUR_THRESHOLD = float(os.environ.get("PAST_PAPER_BLUR_THRESHOLD", "100"))
CONFIDENCE_THRESHOLD = float(os.environ.get("PAST_PAPER_CONFIDENCE_THRESHOLD", "0.85"))

CACHE_DIR = Path(__file__).resolve().parent / "_cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

# Extra margin around AI diagram bbox (fraction of image width/height)
DIAGRAM_BBOX_PAD_X = float(os.environ.get("PAST_PAPER_DIAGRAM_PAD_X", "0.08"))
DIAGRAM_BBOX_PAD_Y = float(os.environ.get("PAST_PAPER_DIAGRAM_PAD_Y", "0.10"))
DIAGRAM_EDGE_EXPAND_STEP = float(
    os.environ.get("PAST_PAPER_DIAGRAM_EDGE_EXPAND_STEP", "0.03")
)
DIAGRAM_EDGE_INK_THRESHOLD = float(
    os.environ.get("PAST_PAPER_DIAGRAM_EDGE_INK_THRESHOLD", "0.015")
)
DIAGRAM_MAX_EDGE_EXPANSIONS = int(
    os.environ.get("PAST_PAPER_DIAGRAM_MAX_EDGE_EXPANSIONS", "5")
)
GEMINI_REQUEST_TIMEOUT_MS = int(float(os.environ.get("PAST_PAPER_GEMINI_TIMEOUT_S", "180")) * 1000)


def uses_variable_option_count(exam_name: str, paper_name: str) -> bool:
    """Whether option count varies by question (extract only letters printed).

    ENGAA/NSAA Section 1–2 items often show A–F through A–H.
    TMUA past papers also vary (commonly A–E up to A–H depending on year/item);
    newer CBT formats often standardise on five choices.
    """
    exam = (exam_name or "").upper()
    paper = (paper_name or "").lower()
    if exam == "TMUA":
        return True
    return exam in ("ENGAA", "NSAA") and (
        "section 1" in paper or "section 2" in paper
    )


def expected_option_letters(
    exam_name: str,
    paper_name: str,
    part_name: Optional[str] = None,
) -> List[str]:
    """Return allowed MCQ letters for a past-paper question.

    For variable-count exams this is the maximum allowed set (used to reject
    invented letters), not a required count.
    """
    exam = (exam_name or "").upper()
    paper = (paper_name or "").lower()
    part = (part_name or "").lower()

    # NSAA Section 2 uses A–F
    if exam == "NSAA" and "section 2" in paper:
        return list("ABCDEF")

    # ENGAA Section 2 uses A–H
    if exam == "ENGAA" and "section 2" in paper:
        return list("ABCDEFGH")

    # TMUA: allow up to A–H; actual count is per-question (see uses_variable_option_count)
    if exam == "TMUA":
        return list("ABCDEFGH")

    # NSAA Section 1 and ENGAA Section 1 default allow A–H
    return list("ABCDEFGH")


def gemini_api_key() -> str:
    key = (os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY") or "").strip()
    if not key:
        raise RuntimeError(
            "GEMINI_API_KEY or GOOGLE_API_KEY required in .env.local "
            "(or set GOOGLE_CLOUD_PROJECT for Vertex AI mode)"
        )
    return key


def vertex_config() -> tuple[str, str]:
    project = (os.environ.get("GOOGLE_CLOUD_PROJECT") or "").strip()
    location = (os.environ.get("GOOGLE_CLOUD_LOCATION") or "global").strip()
    return project, location


def use_vertex_ai() -> bool:
    project, _ = vertex_config()
    has_api_key = bool(
        (os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY") or "").strip()
    )
    return bool(project) and not has_api_key


def vertex_client_location(location: str) -> str:
    loc = (location or "").strip()
    if loc.lower() != "global":
        return loc
    if os.environ.get("VERTEX_GENAI_NO_GLOBAL_REMAP", "").strip().lower() in ("1", "true", "yes"):
        return loc
    return (os.environ.get("VERTEX_GENAI_LOCATION") or "us-central1").strip() or "us-central1"


def supabase_url() -> str:
    url = (os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or "").strip()
    if not url:
        raise RuntimeError("SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL required")
    return url


def supabase_service_key() -> str:
    key = (os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or "").strip()
    if not key:
        raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY required for writes")
    return key


def promote_to_questions_table() -> bool:
    """Whether auto-approved conversions should copy text into questions table."""
    return os.environ.get("PAST_PAPER_PROMOTE_TO_QUESTIONS", "1").strip().lower() in (
        "1",
        "true",
        "yes",
    )
