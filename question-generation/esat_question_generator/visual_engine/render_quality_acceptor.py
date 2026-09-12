"""Vision + structured accept/reject for rendered NSAA review items.

Decides whether stem/options (+ diagram when required) rendered well enough
for human review. Reuses deterministic ``auto_checks`` and a Gemini multimodal
render-QA prompt (not full answer-key grading).
"""

from __future__ import annotations

import json
import os
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

from .auto_checks import has_reject, run_auto_checks
from .llm import DEFAULT_DIAGRAM_DESIGNER_MODEL, call_json_multimodal

DEFAULT_ACCEPTOR_MODEL = os.environ.get(
    "MODEL_RENDER_QUALITY_ACCEPTOR",
    os.environ.get("MODEL_DIAGRAM_VERIFIER", DEFAULT_DIAGRAM_DESIGNER_MODEL),
)

PROMPT_PATH = Path(__file__).resolve().parent / "prompts" / "render_quality_acceptor.md"

DIAGRAM_VISUAL_TYPES = frozenset(
    {
        "graph",
        "geometry",
        "pedigree",
        "bio_diagram",
        "chem_structure",
        "energy_profile",
        "circuit",
        "diagram",
    }
)

# Soft auto_checks codes that become rejects in aggressive/siphon mode.
AGGRESSIVE_SOFT_CODES = frozenset(
    {
        "collision_check_failure",
        "labels_outside_canvas",
        "malformed_mathtext",
        "malformed_spec",
    }
)

# ACCEPT must clear this confidence floor in aggressive mode, else REJECT.
AGGRESSIVE_ACCEPT_MIN_CONFIDENCE = 0.82


def is_diagram_visual_type(visual_type: str) -> bool:
    return (visual_type or "").strip().lower() in DIAGRAM_VISUAL_TYPES


def _promote_soft_flags(flags: list[dict[str, str]]) -> list[dict[str, str]]:
    promoted: list[dict[str, str]] = []
    for f in flags:
        code = str(f.get("code") or "")
        if code in AGGRESSIVE_SOFT_CODES and f.get("severity") != "reject":
            promoted.append({**f, "severity": "reject"})
        else:
            promoted.append(f)
    return promoted


def _apply_aggressive_bias(result: RenderQualityResult) -> RenderQualityResult:
    """Push borderline ACCEPTs toward REJECT for queue siphoning."""
    if result.decision != "ACCEPT":
        return result

    reasons = list(result.reject_reasons)
    issues = list(result.issues)

    soft_hits = [
        str(f.get("code") or "")
        for f in result.auto_flags
        if str(f.get("code") or "") in AGGRESSIVE_SOFT_CODES
    ]
    if soft_hits:
        reasons.extend(soft_hits)
        return RenderQualityResult(
            decision="REJECT",
            confidence=max(result.confidence, 0.8),
            diagram_ok=False,
            question_ok=result.question_ok,
            issues=issues or [f"Aggressive reject on soft flag(s): {', '.join(soft_hits)}"],
            reject_reasons=list(dict.fromkeys(reasons)),
            summary=(result.summary or "Rejected under aggressive soft-flag policy.").strip(),
            source=result.source if result.source != "vision" else "hybrid",
            auto_flags=result.auto_flags,
            model=result.model,
            raw_text=result.raw_text,
            usage=result.usage,
            skipped_vision=result.skipped_vision,
        )

    if result.confidence < AGGRESSIVE_ACCEPT_MIN_CONFIDENCE:
        reasons.append("low_accept_confidence")
        return RenderQualityResult(
            decision="REJECT",
            confidence=result.confidence,
            diagram_ok=result.diagram_ok,
            question_ok=result.question_ok,
            issues=issues
            + [f"ACCEPT confidence {result.confidence:.2f} below {AGGRESSIVE_ACCEPT_MIN_CONFIDENCE}"],
            reject_reasons=list(dict.fromkeys(reasons)),
            summary=(
                result.summary
                or f"Borderline ACCEPT demoted (confidence {result.confidence:.2f})."
            ).strip(),
            source=result.source,
            auto_flags=result.auto_flags,
            model=result.model,
            raw_text=result.raw_text,
            usage=result.usage,
            skipped_vision=result.skipped_vision,
        )

    if not result.diagram_ok or not result.question_ok:
        reasons.append("partial_ok_false")
        return RenderQualityResult(
            decision="REJECT",
            confidence=max(result.confidence, 0.75),
            diagram_ok=result.diagram_ok,
            question_ok=result.question_ok,
            issues=issues,
            reject_reasons=list(dict.fromkeys(reasons)),
            summary=(result.summary or "Rejected because diagram_ok/question_ok was false.").strip(),
            source=result.source,
            auto_flags=result.auto_flags,
            model=result.model,
            raw_text=result.raw_text,
            usage=result.usage,
            skipped_vision=result.skipped_vision,
        )

    return result


@dataclass
class RenderQualityResult:
    decision: str  # ACCEPT | REJECT
    confidence: float = 0.0
    diagram_ok: bool = True
    question_ok: bool = True
    issues: list[str] = field(default_factory=list)
    reject_reasons: list[str] = field(default_factory=list)
    summary: str = ""
    source: str = ""  # deterministic | vision | hybrid
    auto_flags: list[dict[str, str]] = field(default_factory=list)
    model: str = ""
    raw_text: str = ""
    usage: dict[str, Any] = field(default_factory=dict)
    skipped_vision: bool = False

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def _load_prompt() -> str:
    return PROMPT_PATH.read_text(encoding="utf-8")


def _normalize_decision(value: str) -> str:
    v = (value or "").strip().upper()
    if v in {"ACCEPT", "REJECT"}:
        return v
    if v in {"PASS", "OK", "APPROVE", "APPROVED"}:
        return "ACCEPT"
    return "REJECT"


def _parse_choices(raw: Any) -> dict[str, str]:
    if isinstance(raw, dict):
        return {str(k): str(v) for k, v in raw.items()}
    if isinstance(raw, str) and raw.strip():
        try:
            obj = json.loads(raw)
        except json.JSONDecodeError:
            return {}
        if isinstance(obj, dict):
            return {str(k): str(v) for k, v in obj.items()}
    return {}


def _parse_json_obj(raw: Any) -> dict[str, Any]:
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str) and raw.strip():
        try:
            obj = json.loads(raw)
        except json.JSONDecodeError:
            return {}
        if isinstance(obj, dict):
            return obj
    return {}


def _spec_summary(spec: dict[str, Any] | None) -> dict[str, Any]:
    if not spec:
        return {}
    objects = spec.get("objects") if isinstance(spec.get("objects"), list) else []
    labels = spec.get("labels") if isinstance(spec.get("labels"), list) else []
    types: list[str] = []
    for obj in objects:
        if isinstance(obj, dict) and obj.get("type"):
            types.append(str(obj["type"]))
    label_texts: list[str] = []
    for lab in labels[:24]:
        if isinstance(lab, dict) and lab.get("text") is not None:
            label_texts.append(str(lab.get("text")))
    return {
        "object_types": types[:40],
        "label_texts": label_texts,
        "coordinate_system": spec.get("coordinate_system"),
        "title": spec.get("title"),
    }


def resolve_png_path(
    png_path: str | Path | None,
    *,
    question_id: str = "",
    review_root: Path | None = None,
) -> Path | None:
    """Resolve a usable rendered PNG, falling back to review_data/artifacts."""
    candidates: list[Path] = []
    if png_path:
        candidates.append(Path(png_path))
    qid = (question_id or "").strip()
    if qid:
        root = review_root or (Path(__file__).resolve().parent / "review_data")
        art = root / "artifacts" / qid
        candidates.extend(
            [
                art / "rendered.png",
                art / "attempt_01" / "rendered.png",
                art / "attempt_02" / "rendered.png",
                art / "attempt_03" / "rendered.png",
            ]
        )
        # Prefer highest attempt_* folder that exists.
        if art.is_dir():
            attempts = sorted(
                [p for p in art.glob("attempt_*/rendered.png") if p.is_file()],
                key=lambda p: p.parent.name,
                reverse=True,
            )
            candidates[2:2] = attempts
    seen: set[str] = set()
    for cand in candidates:
        key = str(cand)
        if key in seen:
            continue
        seen.add(key)
        if cand.is_file():
            return cand
    return None


def _read_png(path: str | Path | None) -> bytes | None:
    if not path:
        return None
    p = Path(path)
    if not p.is_file():
        return None
    try:
        data = p.read_bytes()
    except OSError:
        return None
    return data or None


def _question_text_flags(
    *,
    stem: str,
    choices: dict[str, str],
    correct_answer: str,
) -> list[dict[str, str]]:
    flags: list[dict[str, str]] = []
    if not (stem or "").strip():
        flags.append({"code": "stem_empty", "message": "Stem is empty", "severity": "reject"})
    elif len(stem.strip()) < 20:
        flags.append(
            {
                "code": "stem_too_short",
                "message": "Stem looks truncated or incomplete",
                "severity": "reject",
            }
        )
    filled = {k: v for k, v in choices.items() if str(v).strip()}
    if len(filled) < 2:
        flags.append(
            {
                "code": "options_broken",
                "message": f"Fewer than 2 non-empty options ({len(filled)})",
                "severity": "reject",
            }
        )
    flags.extend(run_auto_checks(choices=choices, correct_answer=correct_answer, diagram_required=False))
    return flags


def _deterministic_reject(
    *,
    stem: str,
    choices: dict[str, str],
    correct_answer: str,
    diagram_required: bool,
    png_path: str | Path | None,
    spec: dict[str, Any] | None,
) -> tuple[list[dict[str, str]], RenderQualityResult | None]:
    flags = _question_text_flags(stem=stem, choices=choices, correct_answer=correct_answer)
    if diagram_required:
        flags.extend(
            run_auto_checks(
                png_path=png_path,
                spec=spec,
                choices=None,
                correct_answer=None,
                diagram_required=True,
            )
        )
    if not has_reject(flags):
        return flags, None

    reasons = [str(f.get("code") or "auto_reject") for f in flags if f.get("severity") == "reject"]
    issues = [str(f.get("message") or f.get("code") or "") for f in flags if f.get("severity") == "reject"]
    diagram_ok = not any(
        str(f.get("code") or "").startswith("png_") or str(f.get("code") or "") in {"render_failed"}
        for f in flags
        if f.get("severity") == "reject"
    )
    question_ok = not any(
        str(f.get("code") or "")
        in {"stem_empty", "stem_too_short", "options_broken", "duplicate_options", "correct_answer_count"}
        for f in flags
        if f.get("severity") == "reject"
    )
    return flags, RenderQualityResult(
        decision="REJECT",
        confidence=0.95,
        diagram_ok=diagram_ok if diagram_required else True,
        question_ok=question_ok,
        issues=[i for i in issues if i],
        reject_reasons=reasons,
        summary="Rejected by deterministic render/text checks.",
        source="deterministic",
        auto_flags=flags,
        skipped_vision=True,
    )


def _merge_vision(
    *,
    parsed: dict[str, Any],
    auto_flags: list[dict[str, str]],
    model: str,
    raw_text: str,
    usage: dict[str, Any],
) -> RenderQualityResult:
    decision = _normalize_decision(str(parsed.get("decision") or "REJECT"))
    issues_raw = parsed.get("issues") or []
    reasons_raw = parsed.get("reject_reasons") or []
    if not isinstance(issues_raw, list):
        issues_raw = [str(issues_raw)]
    if not isinstance(reasons_raw, list):
        reasons_raw = [str(reasons_raw)]
    try:
        confidence = float(parsed.get("confidence") if parsed.get("confidence") is not None else 0.5)
    except (TypeError, ValueError):
        confidence = 0.5
    confidence = max(0.0, min(1.0, confidence))

    soft = [f for f in auto_flags if f.get("severity") != "reject"]
    issues = [str(i) for i in issues_raw if str(i).strip()]
    for f in soft:
        msg = str(f.get("message") or f.get("code") or "").strip()
        if msg and msg not in issues:
            issues.append(msg)

    return RenderQualityResult(
        decision=decision,
        confidence=confidence,
        diagram_ok=bool(parsed.get("diagram_ok", decision == "ACCEPT")),
        question_ok=bool(parsed.get("question_ok", decision == "ACCEPT")),
        issues=issues,
        reject_reasons=[str(r) for r in reasons_raw if str(r).strip()],
        summary=str(parsed.get("summary") or "").strip(),
        source="hybrid" if soft else "vision",
        auto_flags=auto_flags,
        model=model,
        raw_text=raw_text,
        usage=usage,
        skipped_vision=False,
    )


def evaluate_render_quality(
    *,
    stem: str,
    choices: dict[str, Any] | str | None,
    correct_answer: str = "",
    diagram_required: bool = True,
    png_path: str | Path | None = None,
    spec: dict[str, Any] | str | None = None,
    visual_type: str = "",
    subject: str = "",
    explanation: str = "",
    model: str | None = None,
    thinking_level: str = "high",
    temperature: float = 0.1,
    force_vision: bool = False,
    skip_vision: bool = False,
    aggressive: bool = False,
) -> RenderQualityResult:
    """Accept or reject based on whether question (+ diagram) rendered properly."""
    choice_map = _parse_choices(choices)
    spec_obj = _parse_json_obj(spec)
    png_bytes = _read_png(png_path) if diagram_required else None

    flags, early = _deterministic_reject(
        stem=stem or "",
        choices=choice_map,
        correct_answer=correct_answer or "",
        diagram_required=bool(diagram_required),
        png_path=png_path if diagram_required else None,
        spec=spec_obj or None,
    )
    if aggressive:
        flags = _promote_soft_flags(flags)
        if early is None and has_reject(flags):
            reasons = [str(f.get("code") or "auto_reject") for f in flags if f.get("severity") == "reject"]
            issues = [
                str(f.get("message") or f.get("code") or "")
                for f in flags
                if f.get("severity") == "reject"
            ]
            early = RenderQualityResult(
                decision="REJECT",
                confidence=0.9,
                diagram_ok=False,
                question_ok=True,
                issues=[i for i in issues if i],
                reject_reasons=reasons,
                summary="Rejected by aggressive soft-flag promotion.",
                source="deterministic",
                auto_flags=flags,
                skipped_vision=True,
            )
    if early is not None and not force_vision:
        return _apply_aggressive_bias(early) if aggressive else early

    if skip_vision:
        result = RenderQualityResult(
            decision="ACCEPT",
            confidence=0.55,
            diagram_ok=True,
            question_ok=True,
            issues=[str(f.get("message") or "") for f in flags if f.get("severity") != "reject"],
            reject_reasons=[],
            summary="Deterministic checks passed; vision skipped.",
            source="deterministic",
            auto_flags=flags,
            skipped_vision=True,
        )
        return _apply_aggressive_bias(result) if aggressive else result

    # Text-only items with clean deterministic checks: still optionally vision-skip.
    if not diagram_required and not force_vision:
        result = RenderQualityResult(
            decision="ACCEPT",
            confidence=0.7,
            diagram_ok=True,
            question_ok=True,
            issues=[],
            reject_reasons=[],
            summary="Text-only item passed deterministic render checks.",
            source="deterministic",
            auto_flags=flags,
            skipped_vision=True,
        )
        return _apply_aggressive_bias(result) if aggressive else result

    if diagram_required and not png_bytes:
        # Should have been caught deterministically; keep a hard reject.
        result = RenderQualityResult(
            decision="REJECT",
            confidence=0.99,
            diagram_ok=False,
            question_ok=True,
            issues=["Generated PNG missing or unreadable"],
            reject_reasons=["png_missing"],
            summary="Diagram required but PNG could not be loaded for vision QA.",
            source="deterministic",
            auto_flags=flags,
            skipped_vision=True,
        )
        return result

    payload: dict[str, Any] = {
        "diagram_required": bool(diagram_required),
        "image_attached": bool(png_bytes),
        "subject": (subject or "").strip(),
        "visual_type": (visual_type or "").strip(),
        "strict_prefilter": bool(aggressive),
        "question": {
            "stem": (stem or "").strip(),
            "options": choice_map,
            "correct_option": (correct_answer or "").strip(),
        },
        "explanation_excerpt": (explanation or "").strip()[:800],
        "visual_spec_summary": _spec_summary(spec_obj),
        "deterministic_flags": flags,
        "instructions": (
            "The attached image is the GENERATED diagram for this question. "
            "Decide ACCEPT or REJECT based on render quality and stem-diagram usability. "
            + (
                "This is a STRICT prefilter: prefer REJECT on any notable layout/render issue."
                if aggressive
                else ""
            )
        ),
    }

    call = call_json_multimodal(
        system_prompt=_load_prompt(),
        user_payload=payload,
        image_bytes=png_bytes,
        mime_type="image/png",
        model=model or DEFAULT_ACCEPTOR_MODEL,
        thinking_level=thinking_level,
        temperature=temperature,
    )
    result = _merge_vision(
        parsed=call.parsed if isinstance(call.parsed, dict) else {},
        auto_flags=flags,
        model=call.model,
        raw_text=call.raw_text,
        usage=call.usage,
    )
    return _apply_aggressive_bias(result) if aggressive else result


def evaluate_review_item(
    item: dict[str, Any],
    *,
    model: str | None = None,
    thinking_level: str = "high",
    force_vision: bool = False,
    skip_vision: bool = False,
    aggressive: bool = False,
) -> RenderQualityResult:
    """Evaluate a ``ReviewStore`` item dict (question + latest diagram)."""
    source = _parse_json_obj(item.get("source_json"))
    diagram = item.get("diagram") or {}
    if not isinstance(diagram, dict):
        diagram = {}

    spec = _parse_json_obj(diagram.get("generation_spec_json") or diagram.get("original_spec_json"))
    if not spec:
        # Fall back to artifact visual_spec beside the PNG when present.
        image_path = str(diagram.get("image_path") or "")
        if image_path:
            sibling = Path(image_path).with_name("visual_spec.json")
            if sibling.is_file():
                try:
                    spec = json.loads(sibling.read_text(encoding="utf-8"))
                except (OSError, json.JSONDecodeError):
                    spec = {}

    visual_type = str(source.get("visual_type") or item.get("topic") or "")
    vt = visual_type.strip().lower()
    # Real diagram types always require a PNG. none/table do not.
    if is_diagram_visual_type(vt):
        diagram_required = True
    elif vt in {"none", "table", "text"}:
        diagram_required = False
    else:
        diagram_required = bool(item.get("diagram_required"))

    png = resolve_png_path(
        diagram.get("image_path"),
        question_id=str(item.get("question_id") or ""),
    )

    return evaluate_render_quality(
        stem=str(item.get("stem") or ""),
        choices=item.get("choices_json") or {},
        correct_answer=str(item.get("correct_answer") or ""),
        diagram_required=diagram_required,
        png_path=png,
        spec=spec,
        visual_type=visual_type,
        subject=str(item.get("subject") or ""),
        explanation=str(item.get("explanation") or ""),
        model=model,
        thinking_level=thinking_level,
        force_vision=force_vision,
        skip_vision=skip_vision,
        aggressive=aggressive,
    )
