"""Gemini multimodal visual verifier for rendered diagrams."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from .llm import DEFAULT_DIAGRAM_DESIGNER_MODEL, call_json_multimodal

DEFAULT_VERIFIER_MODEL = os.environ.get("MODEL_DIAGRAM_VERIFIER", DEFAULT_DIAGRAM_DESIGNER_MODEL)


@dataclass
class VisualVerifierResult:
    verdict: str
    issues: list[str] = field(default_factory=list)
    math_incorrect: bool = False
    too_similar_to_source: bool = False
    looks_bad: bool = False
    repair_instructions: str = ""
    raw_text: str = ""
    model: str = ""
    usage: dict[str, Any] = field(default_factory=dict)


def _load_prompt() -> str:
    path = Path(__file__).resolve().parent / "prompts" / "diagram_visual_verifier.md"
    return path.read_text(encoding="utf-8")


def _normalize_verdict(value: str) -> str:
    v = (value or "").strip().upper()
    if v in {"PASS", "FIX", "FAIL"}:
        return v
    return "FAIL"


def run_visual_verifier(
    *,
    generated_png_bytes: bytes,
    visual_spec: dict[str, Any],
    question_concept: str,
    variation_mode: str,
    source_png_bytes: bytes | None = None,
    model: str | None = None,
    thinking_level: str = "medium",
    temperature: float = 0.1,
) -> VisualVerifierResult:
    """Review a rendered diagram PNG against spec and question concept."""
    payload: dict[str, Any] = {
        "visual_spec": visual_spec,
        "question_concept": question_concept.strip(),
        "variation_mode": variation_mode.strip().lower(),
        "instructions": (
            "The first attached image is the GENERATED diagram to review. "
            "If a second image is attached, it is the ORIGINAL source diagram."
        ),
    }
    extra: list[tuple[bytes, str]] | None = None
    if source_png_bytes:
        extra = [(source_png_bytes, "image/png")]

    call = call_json_multimodal(
        system_prompt=_load_prompt(),
        user_payload=payload,
        image_bytes=generated_png_bytes,
        mime_type="image/png",
        extra_images=extra,
        model=model or DEFAULT_VERIFIER_MODEL,
        thinking_level=thinking_level,
        temperature=temperature,
    )
    parsed = call.parsed
    issues = parsed.get("issues") or []
    if not isinstance(issues, list):
        issues = [str(issues)]
    return VisualVerifierResult(
        verdict=_normalize_verdict(str(parsed.get("verdict") or "FAIL")),
        issues=[str(item) for item in issues if str(item).strip()],
        math_incorrect=bool(parsed.get("math_incorrect")),
        too_similar_to_source=bool(parsed.get("too_similar_to_source")),
        looks_bad=bool(parsed.get("looks_bad")),
        repair_instructions=str(parsed.get("repair_instructions") or "").strip(),
        raw_text=call.raw_text,
        model=call.model,
        usage=call.usage,
    )
