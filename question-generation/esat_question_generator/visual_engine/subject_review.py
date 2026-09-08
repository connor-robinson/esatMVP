"""Run existing Chemistry/Biology verifier prompts on generated NSAA items."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from .llm import call_json_multimodal
from .question_designer import NSAA_DIAGRAM_MODEL

_PACK = Path(__file__).resolve().parents[1] / "by_subject_prompts" / "new"

_VERIFIER_FILES = {
    "chemistry": _PACK / "Chemistry" / "Chemistry Verifier.md",
    "biology": _PACK / "Biology" / "Biology Verifier.md",
}
_STYLE_FILES = {
    "chemistry": _PACK / "Chemistry" / "Chemistry Style_checker.md",
    "biology": _PACK / "Biology" / "Biology Style_checker.md",
}


def _load(path: Path) -> str:
    return path.read_text(encoding="utf-8") if path.is_file() else ""


def run_subject_verifier(
    *,
    subject: str,
    stem: str,
    options: dict[str, str],
    correct_option: str,
    explanation: str,
    idea_plan: dict[str, Any],
    image_bytes: bytes | None = None,
    model: str | None = None,
) -> dict[str, Any]:
    key = (subject or "").strip().lower()
    prompt = _load(_VERIFIER_FILES.get(key, Path()))
    if not prompt:
        return {"verdict": "SKIP", "notes": "no verifier prompt"}
    extra = (
        "The visual/table must be treated as part of the scientific evidence. "
        "Verify the rendered information, not merely the written stem. "
        "Independently solve the MCQ and verify exactly one answer is correct."
    )
    if key == "chemistry":
        extra += (
            " CHEMISTRY CHECK: balance equations where applicable; check atom counts, "
            "charges, oxidation/ionic notation, formulae, Mr/Ar values, and units."
        )
    else:
        extra += (
            " BIOLOGY CHECK: verify biological mechanism and terminology; check table/graph "
            "values, diagram relationships, and pedigree inheritance logic where relevant."
        )
    call = call_json_multimodal(
        system_prompt=prompt + "\n\n" + extra,
        user_payload={
            "idea_plan": idea_plan,
            "question": {
                "stem": stem,
                "options": options,
                "correct_option": correct_option,
            },
            "solution": {"reasoning": explanation},
        },
        image_bytes=image_bytes,
        mime_type="image/png",
        model=model or NSAA_DIAGRAM_MODEL,
        thinking_level="medium",
        temperature=0.0,
    )
    parsed = dict(call.parsed)
    parsed["model"] = call.model
    return parsed


def verdict_is_pass(parsed: dict[str, Any]) -> bool:
    return str(parsed.get("verdict") or "").strip().upper() == "PASS"
