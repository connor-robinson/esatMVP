"""Apply manual curriculum decisions for ESAT 228 reassessment review."""

from __future__ import annotations

import hashlib
import json
import re
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional, Set, Tuple

from quality_gate.curriculum import normalize_subject
from quality_gate.curriculum_reassessment.constants import REASSESS_VERSION
from quality_gate.curriculum_reassessment.eligibility import (
    _human_blocking_blockers,
    _non_curriculum_blockers,
    _parse_payload,
    _row_to_result,
    _unresolved_answer_key,
    _unresolved_formatting,
)
from quality_gate.curriculum_reassessment.esat_cohort import is_confirmed_esat

MANUAL_AUDIT_VERSION = "esat_228_manual_review_v1"
SOURCE_FILENAME = "esat_228_manual_keep_reject.json"

EXPECTED_TOTAL = 228
EXPECTED_KEEP = 186
EXPECTED_REJECT = 42
EXPECTED_OUT_OF_SYLLABUS = 40
EXPECTED_INVALID_QUESTION = 2

ALLOWED_DECISIONS = frozenset({"keep", "reject"})
ALLOWED_CATEGORIES = frozenset({"in_syllabus", "out_of_syllabus", "invalid_question"})
ALLOWED_ACTIONS = frozenset({"approve", "regenerate"})

ApplyBucket = Literal[
    "would_approve",
    "would_regenerate_out_of_syllabus",
    "would_regenerate_invalid_question",
    "already_applied",
    "manual_override_content_mismatch",
    "manual_keep_blocked_by_newer_issue",
    "row_missing",
    "unchanged",
    "error",
]


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def file_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def normalize_stem(text: Any) -> str:
    s = str(text or "")
    s = s.replace("\r\n", "\n").replace("\r", "\n")
    s = re.sub(r"\s+", " ", s.strip())
    return s


def load_manual_decisions(path: Path) -> Tuple[Dict[str, Any], Dict[str, Dict[str, Any]], str]:
    if not path.is_file():
        raise FileNotFoundError(f"manual file not found: {path}")
    raw_text = path.read_text(encoding="utf-8")
    try:
        data = json.loads(raw_text)
    except json.JSONDecodeError as e:
        raise ValueError(f"manual file cannot be parsed: {e}") from e

    decisions = data.get("decisions")
    if not isinstance(decisions, list):
        raise ValueError("manual file missing decisions array")

    by_id: Dict[str, Dict[str, Any]] = {}
    for item in decisions:
        if not isinstance(item, dict):
            raise ValueError("decision entry is not an object")
        qid = str(item.get("id") or "").strip()
        if not qid:
            raise ValueError("decision missing id")
        if qid in by_id:
            raise ValueError(f"duplicate decision id: {qid}")
        decision = str(item.get("decision") or "").strip().lower()
        category = str(item.get("decision_category") or "").strip().lower()
        action = str(item.get("recommended_action") or "").strip().lower()
        if decision not in ALLOWED_DECISIONS:
            raise ValueError(f"unexpected decision {decision!r} for {qid}")
        if category not in ALLOWED_CATEGORIES:
            raise ValueError(f"unexpected decision_category {category!r} for {qid}")
        if action not in ALLOWED_ACTIONS:
            raise ValueError(f"unexpected recommended_action {action!r} for {qid}")
        if decision == "keep":
            if category != "in_syllabus" or action != "approve":
                raise ValueError(f"keep decision must be in_syllabus/approve for {qid}")
        if decision == "reject":
            if action != "regenerate":
                raise ValueError(f"reject decision must regenerate for {qid}")
            if category not in ("out_of_syllabus", "invalid_question"):
                raise ValueError(f"reject decision has invalid category for {qid}")
        by_id[qid] = item

    if len(by_id) != EXPECTED_TOTAL:
        raise ValueError(f"expected {EXPECTED_TOTAL} decisions, found {len(by_id)}")

    keep = sum(1 for d in by_id.values() if d["decision"] == "keep")
    reject = sum(1 for d in by_id.values() if d["decision"] == "reject")
    oos = sum(1 for d in by_id.values() if d.get("decision_category") == "out_of_syllabus")
    invalid = sum(1 for d in by_id.values() if d.get("decision_category") == "invalid_question")

    if keep != EXPECTED_KEEP:
        raise ValueError(f"expected {EXPECTED_KEEP} keep, found {keep}")
    if reject != EXPECTED_REJECT:
        raise ValueError(f"expected {EXPECTED_REJECT} reject, found {reject}")
    if oos != EXPECTED_OUT_OF_SYLLABUS:
        raise ValueError(f"expected {EXPECTED_OUT_OF_SYLLABUS} out_of_syllabus, found {oos}")
    if invalid != EXPECTED_INVALID_QUESTION:
        raise ValueError(f"expected {EXPECTED_INVALID_QUESTION} invalid_question, found {invalid}")

    checksum = hashlib.sha256(raw_text.encode("utf-8")).hexdigest()
    return data, by_id, checksum


def _already_applied(payload: Dict[str, Any]) -> bool:
    if payload.get("manual_audit_version") == MANUAL_AUDIT_VERSION:
        return True
    if payload.get("curriculum_manual_audit_version") == MANUAL_AUDIT_VERSION:
        return True
    audits = payload.get("manual_curriculum_audits") or []
    return any(
        isinstance(a, dict) and a.get("manual_audit_version") == MANUAL_AUDIT_VERSION
        for a in audits
    )


def _validate_row_content(
    row: Dict[str, Any],
    decision: Dict[str, Any],
) -> List[str]:
    reasons: List[str] = []
    confirmed, why = is_confirmed_esat(row)
    if not confirmed:
        reasons.append(f"not_confirmed_esat: {why}")

    payload = _parse_payload(row.get("quality_gate_payload"))
    cv = payload.get("curriculum_validation") or {}
    if cv.get("curriculum_validator_version") != REASSESS_VERSION:
        reasons.append(
            f"curriculum_validator_version={cv.get('curriculum_validator_version')!r}, expected {REASSESS_VERSION}"
        )

    db_stem = normalize_stem(row.get("question_stem"))
    json_stem = normalize_stem(decision.get("question_stem"))
    if db_stem != json_stem:
        reasons.append("question_stem_mismatch")

    db_subject = normalize_subject(row.get("subjects"))
    json_subject = normalize_subject(decision.get("subject"))
    if db_subject.casefold() != json_subject.casefold():
        reasons.append(f"subject_mismatch db={db_subject!r} json={json_subject!r}")

    db_tag = str(row.get("primary_tag") or "").strip()
    json_tag = str(decision.get("primary_tag") or "").strip()
    if db_tag != json_tag:
        reasons.append(f"primary_tag_mismatch db={db_tag!r} json={json_tag!r}")

    return reasons


def has_newer_blocker_for_keep(row: Dict[str, Any]) -> List[str]:
    """Block manual keep approval if a non-curriculum issue appeared after export selection."""
    payload = _parse_payload(row.get("quality_gate_payload"))
    if row.get("status") in ("deleted", "moderated"):
        return [f"status={row.get('status')}"]
    if payload.get("manual_audit_version") and payload.get("manual_audit_version") != MANUAL_AUDIT_VERSION:
        return [f"newer_manual_audit_version={payload.get('manual_audit_version')}"]
    try:
        result = _row_to_result(row, payload)
    except Exception as exc:
        return [f"payload_parse_failed: {exc}"]

    if result.verdict != "Pass":
        return [f"verdict={result.verdict}"]
    if _unresolved_answer_key(result, payload):
        return ["unresolved_wrong_answer_key"]
    if _unresolved_formatting(result):
        return ["unresolved_formatting"]
    if result.auto_fixable_issues:
        return [f"auto_fixable_issues={result.auto_fixable_issues[:3]}"]
    hb_block, hb_amb = _human_blocking_blockers(result)
    if hb_block:
        return [f"human_blocking_issues={hb_block[:3]}"]
    if hb_amb:
        return [f"ambiguous_human_blocking={hb_amb[:3]}"]
    blockers, _ = _non_curriculum_blockers(result, payload, row)
    # human_review from curriculum-only state is not a blocker for keep.
    blockers = [
        b
        for b in blockers
        if not b.startswith("stored_action=human_review")
        and not b.startswith("recommended_action=human_review")
        and b != "verdict=Pass"
    ]
    return blockers


def build_manual_patch(
    row: Dict[str, Any],
    decision: Dict[str, Any],
    *,
    source_file: str,
    source_checksum: str,
) -> Dict[str, Any]:
    old_payload = _parse_payload(row.get("quality_gate_payload"))
    payload = deepcopy(old_payload)
    cv = deepcopy(payload.get("curriculum_validation") or {})
    prior_match = cv.get("curriculum_match")
    prior_action = row.get("quality_gate_action") or payload.get("effective_recommended_action")

    dec = decision["decision"]
    category = decision["decision_category"]
    reason = str(decision.get("reason") or "").strip()
    confidence = str(decision.get("manual_confidence") or "high").strip().lower()
    now = _iso_now()

    rd = deepcopy(payload.get("review_disposition") or {})
    labels = list(rd.get("labels") or [])

    if dec == "keep":
        new_action = "approve"
        new_status = "approved"
        cv.update(
            {
                "curriculum_match": "in_syllabus",
                "curriculum_validation_status": "valid",
                "syllabus_fit_score": 5,
                "curriculum_reason": reason,
                "curriculum_decision_source": "manual_audit",
                "curriculum_manual_audit_version": MANUAL_AUDIT_VERSION,
                "manual_audit_decision": "keep",
                "manual_audit_reason": reason,
                "manual_audit_confidence": confidence,
                "manual_audit_applied_at": now,
            }
        )
        rd["outcome"] = "keep"
        rd["labels"] = [l for l in labels if l not in ("off_syllabus", "borderline")]
        bucket: ApplyBucket = "would_approve"
    elif category == "out_of_syllabus":
        new_action = "regenerate"
        new_status = "pending"
        cv.update(
            {
                "curriculum_match": "out_of_syllabus",
                "curriculum_validation_status": "valid",
                "curriculum_reason": reason,
                "curriculum_decision_source": "manual_audit",
                "curriculum_manual_audit_version": MANUAL_AUDIT_VERSION,
                "manual_audit_decision": "reject",
                "manual_audit_reason": reason,
                "manual_audit_confidence": confidence,
                "manual_audit_applied_at": now,
            }
        )
        rd["outcome"] = "regenerate"
        if "off_syllabus" not in labels:
            labels.append("off_syllabus")
        rd["labels"] = labels
        bucket = "would_regenerate_out_of_syllabus"
    else:
        new_action = "regenerate"
        new_status = "pending"
        cv.update(
            {
                "curriculum_decision_source": "manual_audit",
                "curriculum_manual_audit_version": MANUAL_AUDIT_VERSION,
                "manual_audit_decision": "reject",
                "manual_audit_reason": reason,
                "manual_audit_confidence": confidence,
                "manual_audit_applied_at": now,
                "manual_invalid_reason": reason,
            }
        )
        rd["outcome"] = "regenerate"
        if "manual_invalid_question" not in labels:
            labels.append("manual_invalid_question")
        rd["labels"] = labels
        bucket = "would_regenerate_invalid_question"

    payload["curriculum_validation"] = cv
    payload["recommended_action"] = new_action
    payload["effective_recommended_action"] = new_action
    payload["review_disposition"] = rd
    payload["decision_source"] = "manual_audit"
    payload["manual_audit_version"] = MANUAL_AUDIT_VERSION

    audit_entry = {
        "manual_audit_version": MANUAL_AUDIT_VERSION,
        "applied_at": now,
        "source_file": source_file,
        "source_checksum": source_checksum,
        "prior_curriculum_match": prior_match,
        "prior_action": prior_action,
        "new_decision": dec,
        "new_action": new_action,
        "decision_category": category,
        "reason": reason,
        "confidence": confidence,
    }
    existing_audits = payload.get("manual_curriculum_audits")
    if not isinstance(existing_audits, list):
        existing_audits = []
    payload["manual_curriculum_audits"] = [*existing_audits, audit_entry]

    if "quality_gate_payload_v1" not in payload:
        preserved = deepcopy(old_payload)
        preserved["preserved_at"] = now
        preserved["preserved_reason"] = "manual_esat_228_review_v1"
        payload["quality_gate_payload_v1"] = preserved

    return {
        "bucket": bucket,
        "patch": {
            "quality_gate_action": new_action,
            "quality_gate_payload": payload,
            "status": new_status,
        },
        "audit_entry": audit_entry,
    }


def analyze_decision(
    row: Optional[Dict[str, Any]],
    decision: Dict[str, Any],
    *,
    force: bool = False,
) -> Tuple[ApplyBucket, List[str], Optional[Dict[str, Any]]]:
    qid = decision["id"]
    if row is None:
        return "row_missing", [f"missing row {qid}"], None

    payload = _parse_payload(row.get("quality_gate_payload"))
    if _already_applied(payload) and not force:
        return "already_applied", ["already esat_228_manual_review_v1"], None

    mismatches = _validate_row_content(row, decision)
    if mismatches:
        return "manual_override_content_mismatch", mismatches, None

    if decision["decision"] == "keep":
        blockers = has_newer_blocker_for_keep(row)
        if blockers:
            return "manual_keep_blocked_by_newer_issue", blockers, None

    built = build_manual_patch(
        row,
        decision,
        source_file=SOURCE_FILENAME,
        source_checksum="pending",
    )
    bucket = built["bucket"]

    if not force and _already_applied(payload):
        return "already_applied", ["already esat_228_manual_review_v1"], None

    # unchanged if already in target state
    target_action = built["patch"]["quality_gate_action"]
    target_status = built["patch"]["status"]
    cv = payload.get("curriculum_validation") or {}
    if (
        row.get("quality_gate_action") == target_action
        and row.get("status") == target_status
        and payload.get("manual_audit_version") == MANUAL_AUDIT_VERSION
        and (
            decision["decision"] != "keep"
            or cv.get("curriculum_match") == "in_syllabus"
        )
    ):
        return "unchanged", ["already in target state"], built

    return bucket, [], built


def fetch_rows_by_ids(client: Any, ids: List[str]) -> Dict[str, Dict[str, Any]]:
    out: Dict[str, Dict[str, Any]] = {}
    cols = (
        "id, schema_id, subjects, primary_tag, secondary_tags, test_type, status, "
        "question_stem, options, correct_option, quality_gate_verdict, quality_gate_action, "
        "quality_gate_payload, quality_gate_assessed_at"
    )
    for i in range(0, len(ids), 100):
        chunk = ids[i : i + 100]
        resp = (
            client.table("ai_generated_questions")
            .select(cols)
            .in_("id", chunk)
            .execute()
        )
        for row in resp.data or []:
            out[str(row["id"])] = row
    return out
