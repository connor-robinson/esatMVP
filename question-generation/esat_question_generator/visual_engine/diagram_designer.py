"""Gemini multimodal Diagram Designer stage."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from .errors import VisualSpecError
from .llm import MultimodalCallResult, _mime_for_path, call_json_multimodal
from .schema import VisualSpec, parse_spec


@dataclass
class DiagramDesignerInput:
    reference_question: str
    reference_solution: str = ""
    diagram_image_path: Path | None = None
    diagram_image_bytes: bytes | None = None
    subject: str = "mathematics"
    math_paper: str = "Math 1"
    schema_block: str = ""
    target_difficulty: str = "Medium"
    variation_mode: str = "sibling"
    idea_plan: dict[str, Any] | None = None
    source_question_id: str | None = None
    repair_feedback: str = ""
    prior_spec: dict[str, Any] | None = None


@dataclass
class DiagramDesignerResult:
    visual_spec: dict[str, Any]
    validated: VisualSpec
    raw_text: str
    model: str
    usage: dict[str, Any] = field(default_factory=dict)


def _load_prompt() -> str:
    path = Path(__file__).resolve().parent / "prompts" / "diagram_designer.md"
    return path.read_text(encoding="utf-8")


def _load_image_bytes(inp: DiagramDesignerInput) -> tuple[bytes, str]:
    if inp.diagram_image_bytes:
        return inp.diagram_image_bytes, "image/png"
    if inp.diagram_image_path:
        path = Path(inp.diagram_image_path)
        if not path.exists():
            raise FileNotFoundError(f"Diagram image not found: {path}")
        return path.read_bytes(), _mime_for_path(path)
    raise ValueError("Diagram Designer requires diagram_image_path or diagram_image_bytes")


def build_user_payload(inp: DiagramDesignerInput) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "reference_question": inp.reference_question.strip(),
        "reference_solution": inp.reference_solution.strip(),
        "subject": inp.subject,
        "math_paper": inp.math_paper,
        "reasoning_schema": inp.schema_block.strip(),
        "target_difficulty": inp.target_difficulty,
        "variation_mode": inp.variation_mode.strip().lower(),
        "instructions": (
            "Return a complete visual_spec JSON for the NEW diagram. "
            "The attached image is the ORIGINAL reference diagram only."
        ),
    }
    if inp.idea_plan:
        payload["idea_plan"] = inp.idea_plan
    if inp.source_question_id:
        payload["source_question_id"] = inp.source_question_id
    if inp.repair_feedback.strip():
        payload["repair_feedback"] = inp.repair_feedback.strip()
    if inp.prior_spec:
        payload["prior_visual_spec"] = inp.prior_spec
    return payload


def run_diagram_designer(
    inp: DiagramDesignerInput,
    *,
    model: str | None = None,
    thinking_level: str = "high",
    temperature: float = 0.2,
) -> DiagramDesignerResult:
    """Generate and validate a visual_spec from reference Q + diagram image."""
    image_bytes, mime_type = _load_image_bytes(inp)
    call: MultimodalCallResult = call_json_multimodal(
        system_prompt=_load_prompt(),
        user_payload=build_user_payload(inp),
        image_bytes=image_bytes,
        mime_type=mime_type,
        model=model,
        thinking_level=thinking_level,
        temperature=temperature,
    )
    spec_dict = dict(call.parsed)
    if inp.source_question_id and not spec_dict.get("source_question_id"):
        spec_dict["source_question_id"] = inp.source_question_id
    if inp.variation_mode and not spec_dict.get("variation_mode"):
        spec_dict["variation_mode"] = inp.variation_mode.strip().lower()
    try:
        validated = parse_spec(spec_dict)
    except VisualSpecError as exc:
        raise VisualSpecError(f"Diagram Designer returned invalid visual_spec: {exc}") from exc
    return DiagramDesignerResult(
        visual_spec=validated.to_dict(),
        validated=validated,
        raw_text=call.raw_text,
        model=call.model,
        usage=call.usage,
    )
