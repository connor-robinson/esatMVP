"""Multimodal NSAA question designer: choose sibling/far and write a diagram MCQ."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from .errors import VisualSpecError
from .llm import DEFAULT_DIAGRAM_DESIGNER_MODEL, MultimodalCallResult, _mime_for_path, call_json_multimodal

NSAA_DIAGRAM_MODEL = "gemini-3.7-flash"
VALID_MODES = {"sibling", "far"}
VALID_DIAGRAM_TYPES = {"geometry", "graph"}


@dataclass
class NsaaQuestionDesignerInput:
    source_question_id: str
    reference_question: str
    reference_options: dict[str, Any] | None = None
    diagram_image_path: Path | None = None
    diagram_image_bytes: bytes | None = None
    exam_year: int = 0
    paper_name: str = ""
    question_number: int = 0
    repair_feedback: str = ""
    prior_question: dict[str, Any] | None = None


@dataclass
class NsaaQuestionDesign:
    skip: bool
    skip_reason: str = ""
    variation_mode: str = ""
    mode_reason: str = ""
    difficulty: str = "Medium"
    needs_diagram: bool = True
    stem: str = ""
    options: dict[str, str] = field(default_factory=dict)
    correct_option: str = ""
    explanation: str = ""
    idea_plan: dict[str, Any] = field(default_factory=dict)
    raw: dict[str, Any] = field(default_factory=dict)
    model: str = ""
    usage: dict[str, Any] = field(default_factory=dict)


def _load_prompt() -> str:
    path = Path(__file__).resolve().parent / "prompts" / "nsaa_question_designer.md"
    return path.read_text(encoding="utf-8")


def _load_image_bytes(inp: NsaaQuestionDesignerInput) -> tuple[bytes | None, str]:
    if inp.diagram_image_bytes:
        return inp.diagram_image_bytes, "image/png"
    if inp.diagram_image_path:
        path = Path(inp.diagram_image_path)
        if not path.exists():
            raise FileNotFoundError(f"Diagram image not found: {path}")
        return path.read_bytes(), _mime_for_path(path)
    return None, "image/png"


def build_question_payload(inp: NsaaQuestionDesignerInput) -> dict[str, Any]:
    options = inp.reference_options or {}
    if not isinstance(options, dict):
        options = {}
    payload: dict[str, Any] = {
        "source_question_id": inp.source_question_id,
        "exam": "NSAA",
        "exam_year": inp.exam_year,
        "paper_name": inp.paper_name,
        "question_number": inp.question_number,
        "original_stem": (inp.reference_question or "").strip(),
        "original_options": {str(k): str(v) for k, v in options.items()},
        "instructions": (
            "Read the original NSAA question and the attached diagram. "
            "Choose sibling or far, then write a NEW diagram MCQ. "
            "If it cannot be a geometry/graph diagram question, skip."
        ),
    }
    if inp.repair_feedback.strip():
        payload["repair_feedback"] = inp.repair_feedback.strip()
        payload["instructions"] = (
            "Revise the previous generated question. Keep it a diagram MCQ. "
            "Address the reviewer's critique. Choose sibling or far again if needed."
        )
    if inp.prior_question:
        payload["prior_generated_question"] = inp.prior_question
    return payload


def _normalize_options(raw: Any) -> dict[str, str]:
    if isinstance(raw, dict):
        items = [(str(k).strip().upper(), str(v).strip()) for k, v in raw.items() if str(v).strip()]
        items.sort(key=lambda kv: kv[0])
        return {k: v for k, v in items}
    if isinstance(raw, list):
        letters = "ABCDEFGH"
        out: dict[str, str] = {}
        for i, item in enumerate(raw):
            if i >= len(letters):
                break
            text = str(item).strip()
            if text:
                out[letters[i]] = text
        return out
    return {}


def parse_question_design(parsed: dict[str, Any], *, model: str = "", usage: dict[str, Any] | None = None) -> NsaaQuestionDesign:
    skip = bool(parsed.get("skip"))
    mode = str(parsed.get("variation_mode") or "").strip().lower()
    if mode in {"generalisation", "generalization"}:
        mode = "far"
    options = _normalize_options(parsed.get("options"))
    correct = str(parsed.get("correct_option") or parsed.get("correct_answer") or "").strip().upper()
    idea_plan = parsed.get("idea_plan") if isinstance(parsed.get("idea_plan"), dict) else {}
    design = NsaaQuestionDesign(
        skip=skip,
        skip_reason=str(parsed.get("skip_reason") or "").strip(),
        variation_mode=mode,
        mode_reason=str(parsed.get("mode_reason") or "").strip(),
        difficulty=str(parsed.get("difficulty") or "Medium").strip() or "Medium",
        needs_diagram=bool(parsed.get("needs_diagram", True)),
        stem=str(parsed.get("stem") or "").strip(),
        options=options,
        correct_option=correct,
        explanation=str(parsed.get("explanation") or "").strip(),
        idea_plan=idea_plan,
        raw=dict(parsed),
        model=model,
        usage=usage or {},
    )
    if skip:
        return design
    errors: list[str] = []
    if mode not in VALID_MODES:
        errors.append(f"variation_mode must be sibling or far, got {mode!r}")
    if not design.stem:
        errors.append("stem is empty")
    if len(design.options) < 4:
        errors.append("need at least 4 options")
    if design.correct_option not in design.options:
        errors.append("correct_option is not one of the options")
    if not design.needs_diagram:
        errors.append("needs_diagram must be true for a kept question")
    diagram_type = str(idea_plan.get("diagram_type") or "").strip().lower()
    if diagram_type not in VALID_DIAGRAM_TYPES:
        errors.append("idea_plan.diagram_type must be geometry or graph")
    if not str(idea_plan.get("visual_brief") or "").strip():
        errors.append("idea_plan.visual_brief is empty")
    if errors:
        raise VisualSpecError("NSAA question designer output invalid: " + "; ".join(errors))
    return design


def run_nsaa_question_designer(
    inp: NsaaQuestionDesignerInput,
    *,
    model: str | None = None,
    thinking_level: str = "high",
    temperature: float = 0.3,
) -> NsaaQuestionDesign:
    image_bytes, mime_type = _load_image_bytes(inp)
    if not image_bytes:
        raise VisualSpecError("NSAA question designer requires the original diagram image")
    call: MultimodalCallResult = call_json_multimodal(
        system_prompt=_load_prompt(),
        user_payload=build_question_payload(inp),
        image_bytes=image_bytes,
        mime_type=mime_type,
        model=model or NSAA_DIAGRAM_MODEL or DEFAULT_DIAGRAM_DESIGNER_MODEL,
        thinking_level=thinking_level,
        temperature=temperature,
    )
    return parse_question_design(dict(call.parsed), model=call.model, usage=call.usage)
