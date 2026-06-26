"""Post-reassessment action mapping with confidence sensitivity."""

from __future__ import annotations

from dataclasses import replace
from typing import Any, Dict, Literal, Optional

from quality_gate.curriculum_match_parse import CurriculumMatch, parse_curriculum_match
from quality_gate.schemas import (
    QualityGateResult,
    RecommendedAction,
    effective_action,
    effective_action_with_graph_queue,
)

Confidence = Literal["high", "medium", "low"]


def parse_reassessment_confidence(raw: Any) -> Optional[Confidence]:
    if raw not in ("high", "medium", "low"):
        return None
    return raw  # type: ignore[return-value]


def action_from_reassessment(
    *,
    curriculum_match: CurriculumMatch,
    confidence: Confidence,
    base_result: QualityGateResult,
    row: Dict[str, Any],
) -> RecommendedAction:
    """
    Confidence-sensitive post-reassessment actions.

    - in_syllabus + high → approve
    - in_syllabus + medium/low → human_review
    - borderline → human_review
    - out_of_syllabus + high → existing destructive rules (regenerate / move_to_math2)
    - out_of_syllabus + medium/low → human_review
    """
    if curriculum_match == "borderline":
        return "human_review"
    if curriculum_match == "in_syllabus":
        return "approve" if confidence == "high" else "human_review"

    # out_of_syllabus
    if confidence != "high":
        return "human_review"

    sim = replace(
        base_result,
        curriculum_match=curriculum_match,
        curriculum_validation_status="valid",
        recommended_action="regenerate",
    )
    eff = effective_action(sim, row=row, downgrade_low_confidence_pass=False)
    return effective_action_with_graph_queue(sim, eff)


def parse_reassessment_response(data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate and normalize the curriculum-only model response."""
    if "curriculum_match" not in data and isinstance(data.get("curriculum_validation"), dict):
        data = {**data, **data["curriculum_validation"]}

    match = parse_curriculum_match(data.get("curriculum_match"))
    if match is None:
        raise ValueError(f"invalid curriculum_match: {data.get('curriculum_match')!r}")

    score = data.get("syllabus_fit_score")
    if score is None:
        defaults = {"in_syllabus": 5, "borderline": 3, "out_of_syllabus": 1}
        score_int = defaults.get(match, 3)
    else:
        try:
            score_int = int(score)
        except (TypeError, ValueError) as e:
            raise ValueError(f"invalid syllabus_fit_score: {score!r}") from e
        if not 1 <= score_int <= 5:
            raise ValueError(f"syllabus_fit_score out of range: {score_int}")

    confidence = parse_reassessment_confidence(data.get("confidence"))
    if confidence is None:
        confidence = "medium"

    def _str_list(key: str, *, limit: int) -> list[str]:
        raw = data.get(key)
        if not isinstance(raw, list):
            return []
        out: list[str] = []
        for item in raw:
            s = str(item).strip()
            if s:
                out.append(s[:500])
        return out[:limit]

    reason = str(data.get("reason") or "").strip()[:2000]
    if not reason:
        reason = f"Curriculum reassessment: {match}."
    return {
        "curriculum_match": match,
        "syllabus_fit_score": score_int,
        "required_topic_codes": _str_list("required_topic_codes", limit=24),
        "required_knowledge": _str_list("required_knowledge", limit=24),
        "borderline_or_external_knowledge": _str_list("borderline_or_external_knowledge", limit=12),
        "reason": reason,
        "confidence": confidence,
    }
