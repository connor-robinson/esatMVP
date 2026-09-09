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
VALID_VISUAL_TYPES = {
    "none",
    "graph",
    "table",
    "chem_structure",
    "energy_profile",
    "bio_diagram",
    "pedigree",
}
RENDERED_VISUAL_TYPES = {"graph", "chem_structure", "energy_profile", "bio_diagram", "pedigree"}
_VISUAL_ALIASES = {
    "diagram": "bio_diagram",
    "cycle": "bio_diagram",
    "schematic": "bio_diagram",
    "structure": "chem_structure",
    "structural": "chem_structure",
    "energy": "energy_profile",
    "reaction_profile": "energy_profile",
    "text": "none",
    "plain": "none",
}


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
    subject: str = "mathematics"
    repair_feedback: str = ""
    prior_question: dict[str, Any] | None = None
    mix_hint: str = ""


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


def normalize_visual_type(raw: Any, *, diagram_type: str = "", stimulus_type: str = "") -> str:
    value = str(raw or "").strip().lower()
    if not value:
        value = str(stimulus_type or diagram_type or "").strip().lower()
    value = _VISUAL_ALIASES.get(value, value)
    if value in VALID_VISUAL_TYPES:
        return value
    return ""


def visual_type_of(plan: dict[str, Any] | None) -> str:
    plan = plan or {}
    return normalize_visual_type(
        plan.get("visual_type"),
        diagram_type=str(plan.get("diagram_type") or ""),
        stimulus_type=str(plan.get("stimulus_type") or ""),
    )


def build_question_payload(inp: NsaaQuestionDesignerInput) -> dict[str, Any]:
    options = inp.reference_options or {}
    if not isinstance(options, dict):
        options = {}
    subject = (inp.subject or "mathematics").strip().lower()
    payload: dict[str, Any] = {
        "source_question_id": inp.source_question_id,
        "exam": "NSAA",
        "subject": subject,
        "exam_year": inp.exam_year,
        "paper_name": inp.paper_name,
        "question_number": inp.question_number,
        "original_stem": (inp.reference_question or "").strip(),
        "original_options": {str(k): str(v) for k, v in options.items()},
        "instructions": (
            "Read the original NSAA question and any attached diagram. "
            "Choose sibling or far, then write a NEW question. "
            "Set idea_plan.visual_type. Use a table, graph, structure, pedigree, "
            "or schematic only when it genuinely helps the reasoning."
        ),
    }
    if subject == "mathematics":
        payload["instructions"] = (
            "Read the original NSAA question and any attached diagram. "
            "Choose sibling or far, then write a NEW ESAT-style MCQ. "
            "Strongly prefer a geometry/graph diagram when the source supports it. "
            "If a diagram does not help the reasoning, use visual_type none or table. "
            "Only skip if the source cannot become a fair MCQ."
        )
    elif subject == "physics":
        payload["instructions"] = (
            "Read the original NSAA Physics question and any attached diagram. "
            "Choose sibling or far, then write a NEW ESAT-style Physics MCQ. "
            "Strongly prefer a graph when the source is graph-based. "
            "Use visual_type none or table when a rendered diagram is not natural. "
            "Do not invent circuit/schematic visuals the renderer cannot draw. "
            "Cover Easy through Extreme difficulty when appropriate. "
            "Only skip if the source cannot become a fair MCQ."
        )
    if inp.repair_feedback.strip():
        payload["repair_feedback"] = inp.repair_feedback.strip()
        payload["instructions"] = (
            "Revise the previous generated question. "
            "Address the reviewer's critique. Choose sibling or far again if needed."
        )
    if inp.prior_question:
        payload["prior_generated_question"] = inp.prior_question
    if inp.mix_hint.strip():
        payload["batch_mix_hint"] = inp.mix_hint.strip()
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


def parse_question_design(
    parsed: dict[str, Any],
    *,
    model: str = "",
    usage: dict[str, Any] | None = None,
    subject: str = "mathematics",
) -> NsaaQuestionDesign:
    skip = bool(parsed.get("skip"))
    mode = str(parsed.get("variation_mode") or "").strip().lower()
    if mode in {"generalisation", "generalization"}:
        mode = "far"
    options = _normalize_options(parsed.get("options"))
    correct = str(parsed.get("correct_option") or parsed.get("correct_answer") or "").strip().upper()
    idea_plan = parsed.get("idea_plan") if isinstance(parsed.get("idea_plan"), dict) else {}
    for key in ("table", "chem_structure", "pedigree"):
        if key not in idea_plan and isinstance(parsed.get(key), dict):
            idea_plan[key] = parsed[key]
    visual_type = visual_type_of(idea_plan) or visual_type_of(parsed)
    if visual_type:
        idea_plan["visual_type"] = visual_type
    # energy_profile is drawn with the graph renderer.
    if visual_type == "energy_profile":
        idea_plan.setdefault("diagram_type", "graph")
        idea_plan.setdefault("graph_preset", "science_xy")
    needs_diagram = bool(parsed.get("needs_diagram", visual_type in RENDERED_VISUAL_TYPES))
    if visual_type in {"none", "table"}:
        needs_diagram = False
    elif visual_type in RENDERED_VISUAL_TYPES:
        needs_diagram = True
    design = NsaaQuestionDesign(
        skip=skip,
        skip_reason=str(parsed.get("skip_reason") or "").strip(),
        variation_mode=mode,
        mode_reason=str(parsed.get("mode_reason") or "").strip(),
        difficulty=str(parsed.get("difficulty") or "Medium").strip() or "Medium",
        needs_diagram=needs_diagram,
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
    subject_key = (subject or "mathematics").strip().lower()
    if mode not in VALID_MODES:
        errors.append(f"variation_mode must be sibling or far, got {mode!r}")
    if not design.stem:
        errors.append("stem is empty")
    if len(design.options) < 4:
        errors.append("need at least 4 options")
    if design.correct_option not in design.options:
        errors.append("correct_option is not one of the options")
    math_text_ok = {"none", "table"}
    chem_ok = {"none", "graph", "table", "chem_structure", "energy_profile"}
    bio_ok = {"none", "graph", "table", "bio_diagram", "pedigree"}
    physics_ok = {"none", "graph", "table"}

    if subject_key == "mathematics" and visual_type not in math_text_ok:
        if not design.needs_diagram:
            errors.append("needs_diagram must be true for a mathematics diagram question")
        diagram_type = str(idea_plan.get("diagram_type") or "").strip().lower()
        if diagram_type not in VALID_DIAGRAM_TYPES:
            errors.append("idea_plan.diagram_type must be geometry or graph")
        if not str(idea_plan.get("visual_brief") or "").strip():
            errors.append("idea_plan.visual_brief is empty")
    else:
        if subject_key == "mathematics":
            if visual_type not in math_text_ok:
                errors.append("mathematics visual_type must be graph/geometry, none, or table")
        elif not visual_type:
            errors.append(
                "idea_plan.visual_type must be none, graph, table, chem_structure, energy_profile, "
                "bio_diagram, or pedigree"
            )
        elif subject_key == "chemistry" and visual_type not in chem_ok:
            errors.append(
                "chemistry visual_type must be none, graph, table, chem_structure, or energy_profile "
                "(apparatus is not supported)"
            )
        elif subject_key == "biology" and visual_type not in bio_ok:
            errors.append("biology visual_type must be none, graph, table, bio_diagram, or pedigree")
        elif subject_key == "physics" and visual_type not in physics_ok:
            errors.append("physics visual_type must be none, graph, or table")
        if visual_type == "table" and not (idea_plan.get("table") or parsed.get("table")):
            errors.append("visual_type table requires idea_plan.table")
        if visual_type == "chem_structure":
            chem = idea_plan.get("chem_structure") or parsed.get("chem_structure") or {}
            if not isinstance(chem, dict):
                errors.append("visual_type chem_structure requires idea_plan.chem_structure")
            elif not str(chem.get("smiles") or chem.get("SMILES") or "").strip():
                errors.append("chem_structure requires a valid SMILES string (no atom coordinates)")
            elif chem.get("atoms") or chem.get("bonds"):
                errors.append("chem_structure must use SMILES only; do not specify atoms or bonds")
            else:
                try:
                    from .chem_rdkit import normalize_chem_structure_payload

                    normalized = normalize_chem_structure_payload(chem)
                    idea_plan["chem_structure"] = {
                        "smiles": normalized["smiles"],
                        "input_smiles": normalized.get("input_smiles") or normalized["smiles"],
                    }
                    idea_plan["rdkit_properties"] = {
                        k: normalized[k]
                        for k in (
                            "molecular_formula",
                            "exact_mass",
                            "molecular_weight",
                            "num_atoms",
                            "num_heavy_atoms",
                            "num_rings",
                            "canonical_smiles",
                        )
                        if k in normalized
                    }
                    idea_plan["rdkit_properties"]["canonical_smiles"] = normalized["smiles"]
                    idea_plan["rdkit_properties"]["input_smiles"] = (
                        normalized.get("input_smiles") or normalized["smiles"]
                    )
                except Exception as exc:
                    errors.append(str(exc))
        if visual_type == "pedigree" and not (idea_plan.get("pedigree") or parsed.get("pedigree")):
            errors.append("visual_type pedigree requires idea_plan.pedigree")
        if visual_type in {"graph", "energy_profile", "bio_diagram"} and not str(
            idea_plan.get("visual_brief") or ""
        ).strip():
            errors.append("idea_plan.visual_brief is empty")
        if visual_type in {"graph", "energy_profile"}:
            preset = str(idea_plan.get("graph_preset") or "").strip()
            if preset:
                from .graph_presets import GRAPH_PRESETS, normalize_graph_preset

                if normalize_graph_preset(preset) not in GRAPH_PRESETS and preset.lower() not in GRAPH_PRESETS:
                    errors.append(
                        "graph_preset must be one of cartesian, science_xy, log_x, signed_y, multi_series"
                    )
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
    call: MultimodalCallResult = call_json_multimodal(
        system_prompt=_load_prompt(),
        user_payload=build_question_payload(inp),
        image_bytes=image_bytes,
        mime_type=mime_type,
        model=model or NSAA_DIAGRAM_MODEL or DEFAULT_DIAGRAM_DESIGNER_MODEL,
        thinking_level=thinking_level,
        temperature=temperature,
    )
    return parse_question_design(
        dict(call.parsed),
        model=call.model,
        usage=call.usage,
        subject=inp.subject,
    )

