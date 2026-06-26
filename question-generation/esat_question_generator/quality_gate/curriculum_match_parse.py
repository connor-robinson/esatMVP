"""Strict curriculum_match parsing and action mapping (validator v2)."""

from __future__ import annotations

import re
from typing import Any, List, Literal, Optional, Tuple

CurriculumMatch = Literal["in_syllabus", "borderline", "out_of_syllabus"]
CurriculumValidationStatus = Literal["valid", "invalid_model_output", "model_error"]

CURRICULUM_MATCH_VALUES = frozenset({"in_syllabus", "borderline", "out_of_syllabus"})
# Legacy alias from v1 prompts / stored rows
_OFF_SYLLABUS_ALIASES = frozenset({"off_syllabus", "off syllabus", "off-syllabus"})

CURRICULUM_VALIDATOR_VERSION = "v2"

RecommendedAction = Literal["approve", "human_review", "regenerate", "move_to_math2", "delete"]

_IN_SYLLABUS_REASON_PHRASES = (
    "perfectly align",
    "align perfectly",
    "squarely within",
    "explicitly covered",
    "all concepts are",
    "firmly within",
    "core to the",
    "perfectly suited",
    "well within",
    "directly assesses",
    "falls under",
    "falls directly under",
)

_BORDERLINE_REASON_PHRASES = (
    "borderline",
    "edge of",
    "adjacent to",
    "not clearly stated",
    "might require",
    "may require",
)


class InconsistentQualityGateResult(ValueError):
    """Raised when curriculum fields contradict each other."""


def parse_curriculum_match(value: Any) -> Optional[CurriculumMatch]:
    """
    Parse a raw model value into a strict curriculum_match enum.

    Returns None for Booleans, prose, null, arrays, objects, and unknown strings.
    Never maps invalid values to borderline or in_syllabus.
    """
    if value is None:
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, (list, dict, int, float)):
        return None
    if not isinstance(value, str):
        value = str(value)
    s = value.strip()
    if not s:
        return None
    # Exact enum (case-insensitive)
    key = re.sub(r"[\s\-]+", "_", s.casefold()).strip("_")
    if key in CURRICULUM_MATCH_VALUES:
        return key  # type: ignore[return-value]
    if key in _OFF_SYLLABUS_ALIASES or key == "out_of_syllabus":
        return "out_of_syllabus"
    # Reject explanatory prose and other garbage
    if len(s) > 40 or " " in s and key not in CURRICULUM_MATCH_VALUES:
        return None
    return None


def normalize_stored_curriculum_match(value: Any) -> Optional[CurriculumMatch]:
    """Parse stored DB / payload values, including legacy ``off_syllabus``."""
    return parse_curriculum_match(value)


def action_from_curriculum(match: CurriculumMatch) -> RecommendedAction:
    """Default action mapping from a valid curriculum_match."""
    if match == "in_syllabus":
        return "approve"
    if match == "borderline":
        return "human_review"
    return "regenerate"


def is_out_of_syllabus(match: Optional[str]) -> bool:
    if not match:
        return False
    m = (match or "").casefold().replace("-", "_")
    return m in ("out_of_syllabus", "off_syllabus")


def detect_curriculum_inconsistency(
    *,
    curriculum_match: Optional[CurriculumMatch],
    syllabus_fit_score: int,
    curriculum_flags: List[Any],
    suspicious_topics: List[str],
    recommended_action: Optional[str],
    curriculum_reason: str = "",
) -> Optional[str]:
    """
    Return a short reason string if output looks internally inconsistent.

    Does not prove syllabus membership — only flags likely parser/model bugs.
    """
    if curriculum_match is None:
        return None
    reason_cf = (curriculum_reason or "").casefold()
    flag_count = len(curriculum_flags or [])
    sus = suspicious_topics or []

    if curriculum_match == "in_syllabus" and syllabus_fit_score <= 2:
        return "in_syllabus with syllabus_fit_score <= 2"

    if is_out_of_syllabus(curriculum_match) and recommended_action == "approve":
        return "out_of_syllabus with recommended_action approve"

    if (
        curriculum_match == "borderline"
        and not sus
        and flag_count == 0
        and syllabus_fit_score >= 5
        and recommended_action == "approve"
    ):
        return "borderline with score 5, no flags, LLM recommended approve"

    if curriculum_match == "borderline" and reason_cf:
        if any(p in reason_cf for p in _IN_SYLLABUS_REASON_PHRASES) and not any(
            p in reason_cf for p in _BORDERLINE_REASON_PHRASES
        ):
            return "borderline but curriculum_reason reads in-syllabus"

    return None


def validate_curriculum_consistency(
    *,
    curriculum_match: Optional[CurriculumMatch],
    syllabus_fit_score: int,
    curriculum_flags: List[Any],
    suspicious_topics: List[str],
    recommended_action: Optional[str],
    curriculum_reason: str = "",
    effective_action: Optional[str] = None,
    strict: bool = False,
) -> Tuple[Optional[str], bool]:
    """
    Returns (inconsistency_reason, should_reassess).

    If ``strict`` is True, raises InconsistentQualityGateResult on hard conflicts.
    """
    inc = detect_curriculum_inconsistency(
        curriculum_match=curriculum_match,
        syllabus_fit_score=syllabus_fit_score,
        curriculum_flags=curriculum_flags,
        suspicious_topics=suspicious_topics,
        recommended_action=recommended_action,
        curriculum_reason=curriculum_reason,
    )
    if inc and strict:
        if curriculum_match == "in_syllabus" and syllabus_fit_score <= 2:
            raise InconsistentQualityGateResult(inc)
        if is_out_of_syllabus(curriculum_match or "") and effective_action == "approve":
            raise InconsistentQualityGateResult(inc)
    should_reassess = bool(inc)
    return inc, should_reassess
