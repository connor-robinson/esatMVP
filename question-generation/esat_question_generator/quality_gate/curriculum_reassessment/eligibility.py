"""Eligibility for curriculum-only ESAT reassessment."""

from __future__ import annotations

import json
from copy import deepcopy
from dataclasses import replace
from typing import Any, Dict, List, Literal, Optional, Tuple

from quality_gate.curriculum_match_parse import parse_curriculum_match
from quality_gate.schemas import (
    QualityGateResult,
    _blocking_disposition_labels,
    _has_hard_fail,
    effective_action,
    effective_action_with_graph_queue,
    parse_quality_gate_json,
)

from .constants import (
    CURRICULUM_ONLY_ISSUE_CODES,
    KNOWN_BLOCKING_ISSUE_CODES,
    MAX_BLOCKING_FORMATTING_SCORE,
    MAX_BLOCKING_PACING_SCORE,
    MAX_BLOCKING_SOLUTION_SCORE,
    REASSESS_VERSION,
)
from .esat_cohort import is_confirmed_esat

EligibilityBucket = Literal[
    "eligible_genuine_borderline",
    "eligible_invalid_curriculum_output",
    "skipped_other_blocking",
    "skipped_ambiguous_blocking_issue",
    "skipped_missing_required_validation",
    "skipped_already_in_syllabus",
    "skipped_already_out_of_syllabus",
    "skipped_already_reassessed",
    "skipped_not_confirmed_esat",
]


def _parse_payload(raw: Any) -> Dict[str, Any]:
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str) and raw.strip():
        return json.loads(raw)
    return {}


def _normalize_issue_code(issue: str) -> str:
    return issue.strip().lower().replace(" ", "_").replace("-", "_")


def classify_issue_code(issue: str) -> Literal["curriculum_only", "blocking", "ambiguous"]:
    code = _normalize_issue_code(issue)
    if not code:
        return "ambiguous"
    if code in CURRICULUM_ONLY_ISSUE_CODES:
        return "curriculum_only"
    if code in KNOWN_BLOCKING_ISSUE_CODES:
        return "blocking"
    return "ambiguous"


def _row_to_result(row: Dict[str, Any], payload: Dict[str, Any]) -> QualityGateResult:
    raw = payload.get("raw") if isinstance(payload.get("raw"), dict) else payload
    if isinstance(raw, dict) and raw.get("verdict"):
        return parse_quality_gate_json(deepcopy(raw))
    return parse_quality_gate_json(deepcopy(payload))


def _require_section(payload: Dict[str, Any], key: str, reasons: List[str]) -> bool:
    if key not in payload or payload.get(key) is None:
        reasons.append(f"missing {key}")
        return False
    return True


def _validate_required_fields(
    row: Dict[str, Any], payload: Dict[str, Any]
) -> Tuple[bool, List[str]]:
    reasons: List[str] = []

    if not (row.get("question_stem") or "").strip():
        reasons.append("missing question_stem")
    if not row.get("options"):
        reasons.append("missing options")
    if not row.get("correct_option"):
        reasons.append("missing correct_option")

    if not row.get("quality_gate_verdict") and not payload.get("verdict"):
        reasons.append("missing quality_gate_verdict")

    _require_section(payload, "curriculum_validation", reasons)
    _require_section(payload, "formatting_validation", reasons)
    _require_section(payload, "answer_key_validation", reasons)
    _require_section(payload, "review_disposition", reasons)
    _require_section(payload, "auto_fix_triage", reasons)

    scores = payload.get("scores")
    if not isinstance(scores, dict):
        reasons.append("missing scores")
    else:
        for key in ("solution_quality", "esat_realism_pacing"):
            val = scores.get(key)
            if val is None:
                reasons.append(f"missing scores.{key}")
            else:
                try:
                    int(val)
                except (TypeError, ValueError):
                    reasons.append(f"invalid scores.{key}")

    fmt = payload.get("formatting_validation") if isinstance(payload.get("formatting_validation"), dict) else {}
    if fmt.get("formatting_score") is None:
        reasons.append("missing formatting_validation.formatting_score")

    return len(reasons) == 0, reasons


def _unresolved_answer_key(result: QualityGateResult, payload: Dict[str, Any]) -> bool:
    labels = set(result.disposition_labels)
    if "wrong_answer_key_fixed" in labels:
        return False
    if "wrong_answer_key" in labels:
        return True
    ak = payload.get("answer_key_validation") or {}
    if ak.get("was_wrong"):
        return True
    return bool(result.answer_key_was_wrong)


def _unresolved_formatting(result: QualityGateResult) -> bool:
    labels = set(result.disposition_labels)
    if "formatting_fixed" in labels:
        return False
    if "formatting" in labels:
        return True
    return bool(result.formatting_apply_fix)


def _human_blocking_blockers(result: QualityGateResult) -> Tuple[List[str], List[str]]:
    """Return (blocking_reasons, ambiguous_reasons)."""
    blocking: List[str] = []
    ambiguous: List[str] = []
    for issue in result.human_blocking_issues:
        kind = classify_issue_code(issue)
        if kind == "curriculum_only":
            continue
        if kind == "blocking":
            blocking.append(issue)
        else:
            ambiguous.append(issue)
    return blocking, ambiguous


def _non_curriculum_blockers(
    result: QualityGateResult,
    payload: Dict[str, Any],
    row: Dict[str, Any],
) -> Tuple[List[str], List[str]]:
    """Return (hard_blockers, ambiguous_blockers)."""
    reasons: List[str] = []
    ambiguous: List[str] = []

    if result.verdict != "Pass":
        reasons.append(f"verdict={result.verdict}")
    if result.disposition_outcome and result.disposition_outcome != "keep":
        reasons.append(f"disposition_outcome={result.disposition_outcome}")

    if _unresolved_answer_key(result, payload):
        reasons.append("unresolved_wrong_answer_key")
    if _unresolved_formatting(result):
        reasons.append("unresolved_formatting")

    stored_action = row.get("quality_gate_action")
    if stored_action in ("delete", "regenerate", "move_to_math2"):
        reasons.append(f"stored_action={stored_action}")
    if result.recommended_action in ("delete", "regenerate", "move_to_math2"):
        reasons.append(f"recommended_action={result.recommended_action}")

    hb_block, hb_amb = _human_blocking_blockers(result)
    if hb_block:
        reasons.append(f"human_blocking_issues={hb_block[:3]}")
    ambiguous.extend(hb_amb)

    if result.auto_fixable_issues:
        reasons.append(f"auto_fixable_issues={result.auto_fixable_issues[:3]}")

    blocking_labels = _blocking_disposition_labels(result.disposition_labels)
    if blocking_labels:
        reasons.append(f"blocking_disposition_labels={blocking_labels}")

    if "deterministic_conflict" in result.disposition_labels:
        reasons.append("deterministic_conflict")

    solution_q = int(result.scores.get("solution_quality") or 0)
    if solution_q <= MAX_BLOCKING_SOLUTION_SCORE:
        reasons.append(f"solution_quality={solution_q}")

    if result.pacing_score <= MAX_BLOCKING_PACING_SCORE:
        reasons.append(f"pacing_score={result.pacing_score}")

    if result.formatting_score <= MAX_BLOCKING_FORMATTING_SCORE:
        reasons.append(f"formatting_score={result.formatting_score}")

    if result.graph_mode in ("candidate", "missing_expected"):
        reasons.append(f"graph_mode={result.graph_mode}")

    if _has_hard_fail(result.curriculum_flags):
        reasons.append("hard_fail_curriculum_flag")

    if result.calibration_tier == "gold":
        reasons.append("calibration_tier=gold")

    return reasons, ambiguous


def would_approve_if_in_syllabus(result: QualityGateResult, row: Dict[str, Any]) -> Tuple[bool, str]:
    scores = dict(result.scores)
    scores["syllabus_fit"] = max(int(scores.get("syllabus_fit") or 0), 4)
    sim = replace(
        result,
        curriculum_match="in_syllabus",
        curriculum_validation_status="valid",
        curriculum_inconsistency_reason=None,
        recommended_action="approve",
        scores=scores,
        syllabus_fit_score=max(result.syllabus_fit_score, 4),
    )
    labels = set(result.disposition_labels)
    disp_labels = list(result.disposition_labels)
    if "wrong_answer_key_fixed" in labels:
        sim = replace(sim, answer_key_was_wrong=False)
        disp_labels = [l for l in disp_labels if l not in ("wrong_answer_key", "wrong_answer_key_fixed")]
    if "formatting_fixed" in labels:
        sim = replace(sim, formatting_apply_fix=False)
        disp_labels = [l for l in disp_labels if l not in ("formatting", "formatting_fixed")]
    if disp_labels != list(result.disposition_labels):
        sim = replace(sim, disposition_labels=disp_labels)
    eff = effective_action(sim, row=row, downgrade_low_confidence_pass=False)
    eff = effective_action_with_graph_queue(sim, eff)
    return eff == "approve", eff


def is_curriculum_only_review_candidate(
    row: Dict[str, Any],
) -> Tuple[bool, EligibilityBucket, List[str]]:
    """
    Returns:
        eligible: whether the record should receive a curriculum-only AI rerun
        bucket: reporting category
        reasons: eligibility or exclusion reasons
    """
    confirmed, confirm_reason = is_confirmed_esat(row)
    if not confirmed:
        return False, "skipped_not_confirmed_esat", [confirm_reason]

    payload = _parse_payload(row.get("quality_gate_payload"))
    if not payload:
        return False, "skipped_missing_required_validation", ["missing quality_gate_payload"]

    ok_fields, field_reasons = _validate_required_fields(row, payload)
    if not ok_fields:
        return False, "skipped_missing_required_validation", field_reasons

    cv = payload.get("curriculum_validation") or {}
    if cv.get("curriculum_validator_version") == REASSESS_VERSION:
        return False, "skipped_already_reassessed", ["already v2_borderline_reassessment"]

    raw_match = cv.get("curriculum_match")
    parsed: Optional[str] = parse_curriculum_match(raw_match)
    invalid_output = parsed is None

    if parsed == "in_syllabus":
        return False, "skipped_already_in_syllabus", ["stored curriculum_match=in_syllabus"]
    if parsed == "out_of_syllabus":
        return False, "skipped_already_out_of_syllabus", ["stored curriculum_match=out_of_syllabus"]

    try:
        result = _row_to_result(row, payload)
    except Exception as exc:
        return False, "skipped_missing_required_validation", [f"payload_parse_failed: {exc}"]

    blockers, ambiguous = _non_curriculum_blockers(result, payload, row)
    if ambiguous:
        return False, "skipped_ambiguous_blocking_issue", [f"ambiguous_human_blocking={ambiguous[:3]}"]
    if blockers:
        bucket: EligibilityBucket = (
            "skipped_other_blocking"
            if (parsed == "borderline" or invalid_output)
            else "skipped_missing_required_validation"
        )
        return False, bucket, blockers

    ok, sim_eff = would_approve_if_in_syllabus(result, row)
    if not ok:
        return False, "skipped_other_blocking", [f"simulated_eff_if_in_syllabus={sim_eff}"]

    if invalid_output:
        return True, "eligible_invalid_curriculum_output", [
            "invalid historical curriculum_match; otherwise approvable"
        ]
    if parsed == "borderline":
        return True, "eligible_genuine_borderline", ["borderline is sole blocking issue"]

    return False, "skipped_missing_required_validation", [f"unclassified curriculum_match={raw_match!r}"]
