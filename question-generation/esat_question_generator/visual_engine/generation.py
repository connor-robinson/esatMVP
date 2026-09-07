"""Generate / regenerate diagrams with a hard attempt cap."""

from __future__ import annotations

import json
import traceback
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from .auto_checks import collision_from_exc, run_auto_checks
from .diagram_designer import DiagramDesignerInput, run_diagram_designer
from .errors import DiagramLayoutError, VisualSpecError
from .render_matplotlib import render_diagram

MAX_AUTO_ATTEMPTS = 2
MAX_MANUAL_ATTEMPTS = 3

CORRECTION_TEMPLATE = """Regenerate this diagram.

The previous attempt is structurally close, but:
{critique}

Preserve all geometry and labels that were already correct.
Do not redesign the diagram.
Make the smallest possible correction.
"""


def build_correction_prompt(critique: str, tags: list[str] | None = None) -> str:
    bits = [t.strip() for t in (tags or []) if t.strip()]
    extra = ""
    if bits:
        extra = "Selected problems: " + ", ".join(bits) + "\n"
    body = extra + (critique or "").strip()
    if not body:
        body = "- a layout or labelling issue needs a small fix"
    if not body.startswith("-"):
        body = "- " + body
    return CORRECTION_TEMPLATE.format(critique=body)


@dataclass
class GenerationResult:
    question_id: str
    attempt: int
    ok: bool
    spec: dict[str, Any] | None = None
    png_path: Path | None = None
    spec_path: Path | None = None
    source_image_path: Path | None = None
    auto_flags: list[dict[str, str]] = field(default_factory=list)
    error: str = ""
    parent_attempt_id: int | None = None


def generate_diagram(
    inp: DiagramDesignerInput,
    out_dir: str | Path,
    *,
    attempt: int = 1,
    parent_attempt_id: int | None = None,
    designer_model: str | None = None,
    thinking_level: str = "high",
    choices: dict[str, Any] | None = None,
    correct_answer: str | None = None,
) -> GenerationResult:
    """Attempt 1: normal generation. Attempt 2+: correction using inp.repair_feedback."""
    question_id = str(inp.source_question_id or "unknown")
    out = Path(out_dir)
    attempt_dir = out / f"attempt_{attempt:02d}"
    attempt_dir.mkdir(parents=True, exist_ok=True)
    result = GenerationResult(
        question_id=question_id,
        attempt=attempt,
        ok=False,
        parent_attempt_id=parent_attempt_id,
    )
    spec_dict: dict[str, Any] | None = None
    try:
        designer = run_diagram_designer(inp, model=designer_model, thinking_level=thinking_level)
        spec_dict = designer.visual_spec
        spec_path = attempt_dir / "visual_spec.json"
        spec_path.write_text(json.dumps(spec_dict, ensure_ascii=False, indent=2), encoding="utf-8")
        (attempt_dir / "gemini_designer_raw.txt").write_text(designer.raw_text, encoding="utf-8")
        png_path = attempt_dir / "rendered.png"
        render_diagram(spec_dict, png_path)
        (out / "rendered.png").write_bytes(png_path.read_bytes())
        (out / "visual_spec.json").write_text(json.dumps(spec_dict, ensure_ascii=False, indent=2), encoding="utf-8")
        result.spec = spec_dict
        result.png_path = png_path
        result.spec_path = spec_path
        result.ok = True
    except (VisualSpecError, DiagramLayoutError, Exception) as exc:
        result.error = f"{type(exc).__name__}: {exc}"
        (attempt_dir / "errors.json").write_text(
            json.dumps(
                {"error": result.error, "traceback": traceback.format_exc(), "collision": collision_from_exc(exc)},
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )
        if spec_dict:
            spec_path = attempt_dir / "visual_spec.json"
            if not spec_path.exists():
                spec_path.write_text(json.dumps(spec_dict, ensure_ascii=False, indent=2), encoding="utf-8")
            result.spec = spec_dict
            result.spec_path = spec_path

    result.auto_flags = run_auto_checks(
        png_path=result.png_path,
        spec=result.spec,
        render_error=result.error,
        collision_failure="collision" in result.error.lower(),
        choices=choices,
        correct_answer=correct_answer,
        diagram_required=True,
    )
    return result


def regenerate_diagram(
    inp: DiagramDesignerInput,
    out_dir: str | Path,
    *,
    critique: str,
    tags: list[str] | None = None,
    prior_spec: dict[str, Any] | None = None,
    attempt: int,
    parent_attempt_id: int | None = None,
    designer_model: str | None = None,
    thinking_level: str = "high",
    choices: dict[str, Any] | None = None,
    correct_answer: str | None = None,
    allow_manual_third: bool = False,
) -> GenerationResult:
    """Regenerate from the original question/spec plus a concise critique."""
    if attempt > MAX_MANUAL_ATTEMPTS:
        raise ValueError(f"Attempt {attempt} exceeds the hard cap of {MAX_MANUAL_ATTEMPTS}")
    if attempt > MAX_AUTO_ATTEMPTS and not allow_manual_third:
        raise ValueError("Attempt 3 requires an explicit manual request")
    patched = DiagramDesignerInput(
        reference_question=inp.reference_question,
        reference_solution=inp.reference_solution,
        diagram_image_path=inp.diagram_image_path,
        diagram_image_bytes=inp.diagram_image_bytes,
        subject=inp.subject,
        math_paper=inp.math_paper,
        schema_block=inp.schema_block,
        target_difficulty=inp.target_difficulty,
        variation_mode=inp.variation_mode,
        idea_plan=inp.idea_plan,
        source_question_id=inp.source_question_id,
        repair_feedback=build_correction_prompt(critique, tags),
        prior_spec=prior_spec if prior_spec is not None else inp.prior_spec,
    )
    return generate_diagram(
        patched,
        out_dir,
        attempt=attempt,
        parent_attempt_id=parent_attempt_id,
        designer_model=designer_model,
        thinking_level=thinking_level,
        choices=choices,
        correct_answer=correct_answer,
    )
