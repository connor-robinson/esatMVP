#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Cheap LLM router: choose ESAT Mathematics 1 vs Mathematics 2 for an ``M*`` schema
before ``run_once``. Intended for gemini-2.5-flash (or similar).

Environment:
  ESAT_MATH_ROUTER_MODEL — override model id (default: MODEL_CLASSIFIER or gemini-2.5-flash)
  MATH2_TARGET_SHARE — quota target for Math 2 share in (0,1), default 0.5
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, Optional

from project import LLMClient, GeminiQuotaExhaustedError, read_text, safe_json_load

_ROUTER_SYSTEM = """You route ESAT mathematics generation to the correct paper.

Official structure (do not invent topics):

**Mathematics 1** topics: Units; Number; Ratio and proportion; Algebra; Geometry; Statistics; Probability.

**Mathematics 2** topics: Algebra and functions; Coordinate geometry; Trigonometry; Exponentials and logarithms; Sequences and series; Binomial expansion; Differentiation and integration.

Rules:
1) If the schema is *explicitly and primarily* about Mathematics 2 syllabus content (e.g. binomial expansion as core, integration/differentiation as core, formal sequences/series focus, trig identities as the main move, logs/exponentials as the main move), set eligibility to `math2_only` and target_paper to `Math 2`.

2) If the schema is clearly only Mathematics 1 territory with no fair way to write a genuine Math 2 item (statistics/probability focus, units/ratio drill, basic geometry with no AS-level pure structure), set eligibility to `math1_only` and target_paper to `Math 1`.

3) For overlap (algebra, coordinate geometry, number, etc.): decide if a **Mathematics 2** item is viable — short, thinking-led, no long grind, no Further Maths, no reward from beyond-spec methods, closer to ESAT Math 2 / TMUA-style pure reasoning. If yes, set eligibility to `overlap`, math2_style_viable true, and target_paper to `Math 2` if that mode fits the schema better, else `Math 1`.

4) Never assign `Math 2` if the question would need content outside Mathematics 1+2 specifications.

Output **raw JSON only** (one object, no markdown fences) with exactly these keys:
- target_paper: string, "Math 1" or "Math 2"
- eligibility: string, "math1_only" | "math2_only" | "overlap"
- math2_style_viable: boolean
- rationale: string (one short paragraph)

Example shape: {"target_paper": "Math 1", "eligibility": "overlap", "math2_style_viable": false, "rationale": "..."}
"""


def _curriculum_digest(base_dir: str) -> str:
    p = Path(base_dir) / "by_subject_prompts" / "new" / "ESAT_curriculum.md"
    if p.is_file():
        try:
            raw = read_text(str(p))
            if len(raw) > 6000:
                return raw[:6000] + "\n\n[truncated]\n"
            return raw
        except OSError:
            pass
    return (
        "Mathematics 1: Units, Number, Ratio and proportion, Algebra, Geometry, Statistics, Probability.\n"
        "Mathematics 2: Algebra and functions, Coordinate geometry, Trigonometry, Exponentials and logarithms, "
        "Sequences and series, Binomial expansion, Differentiation and integration.\n"
    )


def call_math_paper_router(
    api_key: str,
    base_dir: str,
    schema_id: str,
    schema_block: str,
    model: Optional[str] = None,
    min_delay: float = 0.5,
) -> Dict[str, Any]:
    """
    One Flash call. Returns dict with target_paper, eligibility, math2_style_viable, rationale.
    On failure, returns a safe default (Math 1, overlap, viable false).
    """
    model = (
        model
        or os.environ.get("ESAT_MATH_ROUTER_MODEL", "").strip()
        or os.environ.get("MODEL_CLASSIFIER", "").strip()
        or "gemini-2.5-flash"
    )
    digest = _curriculum_digest(base_dir)
    user = f"""schema_id: {schema_id}

# Official curriculum (reference)
{digest}

# Schema block (invariant for this generator)
{schema_block}

Choose target_paper and eligibility per your rules. Return JSON only."""

    rld = float(os.environ.get("API_RATE_LIMIT_DELAY", "30.0"))
    llm = LLMClient(api_key=api_key, min_delay=min_delay, rate_limit_delay=rld)
    try:
        txt = llm.generate(
            model=model,
            system_prompt=_ROUTER_SYSTEM,
            user_prompt=user,
            temperature=0.2,
            trace_label="Math paper router",
        )
        obj = safe_json_load(txt)
        if not isinstance(obj, dict):
            raise ValueError("router output not a dict")
        tp = str(obj.get("target_paper", "")).strip()
        if tp not in ("Math 1", "Math 2"):
            raise ValueError(f"invalid target_paper: {tp}")
        elig = str(obj.get("eligibility", "overlap")).strip()
        if elig not in ("math1_only", "math2_only", "overlap"):
            elig = "overlap"
        viable = bool(obj.get("math2_style_viable", False))
        obj["target_paper"] = tp
        obj["eligibility"] = elig
        obj["math2_style_viable"] = viable
        obj.setdefault("rationale", "")
        return obj
    except GeminiQuotaExhaustedError:
        raise
    except Exception as e:
        return {
            "target_paper": "Math 1",
            "eligibility": "overlap",
            "math2_style_viable": False,
            "rationale": f"router_failed: {e}",
            "_router_error": str(e),
        }


def merge_router_with_quota(
    router: Dict[str, Any],
    session_math1: int,
    session_math2: int,
    target_math2_share: Optional[float] = None,
) -> str:
    """
    Return ``\"Math 1\"`` or ``\"Math 2\"`` combining router judgment with session quota.
    """
    if target_math2_share is None:
        try:
            target_math2_share = float(os.environ.get("MATH2_TARGET_SHARE", "0.5"))
        except ValueError:
            target_math2_share = 0.5
    target_math2_share = max(0.05, min(0.95, target_math2_share))

    elig = str(router.get("eligibility", "overlap")).strip()
    if elig == "math2_only":
        return "Math 2"
    if elig == "math1_only":
        return "Math 1"

    suggested = str(router.get("target_paper", "Math 1")).strip()
    if suggested not in ("Math 1", "Math 2"):
        suggested = "Math 1"
    viable = bool(router.get("math2_style_viable", False))
    if suggested == "Math 2" and not viable:
        suggested = "Math 1"

    total = session_math1 + session_math2
    if total == 0:
        return suggested

    share_m2 = session_math2 / total
    band = 0.04
    if share_m2 < target_math2_share - band:
        return "Math 2" if viable else "Math 1"
    if share_m2 > target_math2_share + band:
        return "Math 1"
    return suggested
