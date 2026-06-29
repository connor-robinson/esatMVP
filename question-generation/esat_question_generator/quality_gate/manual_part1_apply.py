"""Apply exact manual patches for ESAT unassessed part 1 (100 questions)."""

from __future__ import annotations

import hashlib
import json
import re
import uuid
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional, Tuple

from quality_gate.curriculum import normalize_subject
from quality_gate.curriculum_match_parse import CURRICULUM_VALIDATOR_VERSION

MANUAL_PATCH_VERSION = "esat_unassessed_part1_v2_exact_patches"
SOURCE_FILENAME = "esat_unassessed_part1_manual_decisions_100_v2_exact_patches.json"
EXPECTED_TOTAL = 100

FIGURE_FRAGMENT_RE = re.compile(
    r'<figure\b[^>]*class="qg-diagram"[^>]*>.*?</figure>',
    re.DOTALL | re.IGNORECASE,
)

ApplyBucket = Literal[
    "would_approve_no_change",
    "would_patch_and_approve",
    "would_retag_and_approve",
    "would_replace_asset_and_approve",
    "would_retire_and_create_replacement",
    "already_applied",
    "hash_mismatch",
    "row_missing",
    "post_check_blocked",
    "replacement_qg_blocked",
    "error",
]

FETCH_COLS = (
    "id, generation_id, schema_id, subjects, difficulty, primary_tag, secondary_tags, "
    "test_type, status, question_stem, options, correct_option, solution_reasoning, "
    "solution_key_insight, distractor_map, quality_gate_verdict, quality_gate_action, "
    "quality_gate_payload, quality_gate_assessed_at, quality_gate_job_id, quality_gate_model"
)


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_payload(raw: Any) -> Dict[str, Any]:
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str) and raw.strip():
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return {}
    return {}


def file_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def stem_sha256(stem: Any) -> str:
    normalized = re.sub(r"\s+", " ", str(stem or "").strip())
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def load_manual_decisions(path: Path) -> Tuple[Dict[str, Any], Dict[str, Dict[str, Any]], str]:
    if not path.is_file():
        raise FileNotFoundError(f"manual file not found: {path}")
    raw_text = path.read_text(encoding="utf-8")
    data = json.loads(raw_text)
    decisions = data.get("decisions")
    if not isinstance(decisions, list):
        raise ValueError("manual file missing decisions array")
    by_id: Dict[str, Dict[str, Any]] = {}
    for item in decisions:
        qid = str(item.get("id") or "").strip()
        if not qid:
            raise ValueError("decision missing id")
        if qid in by_id:
            raise ValueError(f"duplicate decision id: {qid}")
        by_id[qid] = item
    if len(by_id) != EXPECTED_TOTAL:
        raise ValueError(f"expected {EXPECTED_TOTAL} decisions, found {len(by_id)}")
    checksum = hashlib.sha256(raw_text.encode("utf-8")).hexdigest()
    return data, by_id, checksum


def fetch_rows_by_ids(client: Any, ids: List[str]) -> Dict[str, Dict[str, Any]]:
    out: Dict[str, Dict[str, Any]] = {}
    unique = [i.strip() for i in ids if (i or "").strip()]
    for i in range(0, len(unique), 50):
        chunk = unique[i : i + 50]
        resp = (
            client.table("ai_generated_questions")
            .select(FETCH_COLS)
            .in_("id", chunk)
            .execute()
        )
        for row in resp.data or []:
            out[str(row["id"])] = row
    return out


def _already_applied(payload: Dict[str, Any], *, force: bool) -> bool:
    if force:
        return False
    if payload.get("manual_patch_version") == MANUAL_PATCH_VERSION:
        return True
    audits = payload.get("manual_part1_audits") or []
    return any(
        isinstance(a, dict) and a.get("manual_patch_version") == MANUAL_PATCH_VERSION
        for a in audits
    )


def _verify_stem_hash(row: Dict[str, Any], decision: Dict[str, Any]) -> Optional[str]:
    expected = str(decision.get("question_stem_sha256") or "").strip()
    if not expected:
        return "missing_expected_stem_sha256"
    actual = stem_sha256(row.get("question_stem"))
    if actual != expected:
        return f"stem_sha256_mismatch expected={expected[:12]}… actual={actual[:12]}…"
    return None


def map_set_fields_to_db(set_fields: Dict[str, Any]) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    for key, value in (set_fields or {}).items():
        if key == "subject":
            out["subjects"] = value
        else:
            out[key] = value
    return out


def apply_remove_fragments(stem: str, fragments: List[str]) -> str:
    text = str(stem or "")
    if not fragments:
        return text
    for note in fragments:
        low = str(note or "").casefold()
        if "figure" in low and "qg-diagram" in low:
            text = FIGURE_FRAGMENT_RE.sub("", text)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def _validate_answer_key_patch(row: Dict[str, Any], ak_patch: Optional[Dict[str, Any]]) -> List[str]:
    if not ak_patch:
        return []
    errs: List[str] = []
    to_letter = str(ak_patch.get("to") or "").strip().upper()[:1]
    from_letter = str(ak_patch.get("from") or "").strip().upper()[:1]
    stored = str(row.get("correct_option") or "").strip().upper()[:1]
    opts = row.get("options") if isinstance(row.get("options"), dict) else {}
    opt_letters = {str(k).strip().upper()[:1] for k in opts}
    if from_letter and stored and from_letter != stored:
        errs.append(f"answer_key_patch.from={from_letter} stored={stored}")
    if to_letter and to_letter not in opt_letters:
        errs.append(f"answer_key_patch.to={to_letter} not in options")
    return errs


def build_content_patch(row: Dict[str, Any], decision: Dict[str, Any]) -> Tuple[Dict[str, Any], bool]:
    impl = decision.get("implementation") or {}
    set_fields = map_set_fields_to_db(impl.get("set_fields") or {})
    fragments = impl.get("remove_fragments") or []
    answer_key_changed = False

    if "question_stem" not in set_fields and fragments:
        set_fields["question_stem"] = apply_remove_fragments(
            str(row.get("question_stem") or ""), fragments
        )

    ak_patch = impl.get("answer_key_patch")
    patch_errs = _validate_answer_key_patch(row, ak_patch)
    if patch_errs:
        raise ValueError("; ".join(patch_errs))

    if ak_patch:
        to_letter = str(ak_patch.get("to") or "").strip().upper()[:1]
        if to_letter:
            set_fields.setdefault("correct_option", to_letter)
            answer_key_changed = True

    return set_fields, answer_key_changed


def merged_row(row: Dict[str, Any], content_patch: Dict[str, Any]) -> Dict[str, Any]:
    return {**row, **content_patch}


def validate_schema(row: Dict[str, Any]) -> List[str]:
    errs: List[str] = []
    stem = str(row.get("question_stem") or "").strip()
    if not stem:
        errs.append("empty_question_stem")
    opts = row.get("options")
    if not isinstance(opts, dict) or len(opts) < 2:
        errs.append("invalid_options")
        return errs
    co = str(row.get("correct_option") or "").strip().upper()[:1]
    if not re.match(r"^[A-H]$", co):
        errs.append("invalid_correct_option")
    elif co not in {str(k).strip().upper()[:1] for k in opts}:
        errs.append("correct_option_not_in_options")
    return errs


def run_post_checks(row: Dict[str, Any], decision: Dict[str, Any]) -> List[str]:
    from quality_gate.answer_key import build_answer_key_precheck
    from quality_gate.assess import run_curriculum_precheck
    from quality_gate.formatting import detect_formatting_issues

    failures = validate_schema(row)
    pre = build_answer_key_precheck(row)
    co = str(row.get("correct_option") or "").strip().upper()[:1]
    expected = str(decision.get("corrected_option") or co).strip().upper()[:1]
    if pre.get("mismatch_detected") and pre.get("inferred_option"):
        inferred = str(pre["inferred_option"]).strip().upper()[:1]
        if inferred != expected:
            failures.append(
                f"answer_key_reconcile inferred={inferred} expected={expected}"
            )
    if co != expected:
        failures.append(f"correct_option={co} expected_corrected={expected}")

    flags = run_curriculum_precheck(row)
    hard = [f for f in flags if f.get("severity") == "hard_fail"]
    if hard:
        failures.append(f"curriculum_hard_fail:{hard[0].get('flag_id')}")

    cm = str(decision.get("curriculum_match") or "").strip()
    subj = normalize_subject(row.get("subjects"))
    if cm == "out_of_syllabus" and decision.get("decision") == "accept":
        failures.append("decision_accept_but_out_of_syllabus")

    fmt = detect_formatting_issues(row)
    if any(f.get("severity") == "error" for f in fmt):
        failures.append("formatting_errors")

    return failures


def _append_manual_audit(
    payload: Dict[str, Any],
    *,
    decision: Dict[str, Any],
    operation: str,
    source_checksum: str,
    extra: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    out = deepcopy(payload)
    now = _iso_now()
    audit_entry = {
        "manual_patch_version": MANUAL_PATCH_VERSION,
        "applied_at": now,
        "source_file": SOURCE_FILENAME,
        "source_checksum_sha256": source_checksum,
        "decision": decision.get("decision"),
        "recommended_action": decision.get("recommended_action"),
        "operation": operation,
        "reason": decision.get("reason"),
        "confidence": decision.get("manual_confidence"),
    }
    if extra:
        audit_entry.update(extra)
    audits = out.get("manual_part1_audits")
    if not isinstance(audits, list):
        audits = []
    out["manual_part1_audits"] = [*audits, audit_entry]
    out["manual_patch_version"] = MANUAL_PATCH_VERSION
    out["decision_source"] = "manual_part1_exact_patches"
    return out


def build_approve_payload(
    row: Dict[str, Any],
    decision: Dict[str, Any],
    *,
    operation: str,
    source_checksum: str,
    content_patch: Dict[str, Any],
    answer_key_changed: bool,
) -> Dict[str, Any]:
    payload = _parse_payload(row.get("quality_gate_payload"))
    cm = str(decision.get("curriculum_match") or "in_syllabus").strip()
    if cm not in ("in_syllabus", "borderline", "out_of_syllabus"):
        cm = "in_syllabus" if decision.get("decision") == "accept" else "out_of_syllabus"

    cv = dict(payload.get("curriculum_validation") or {})
    cv.update(
        {
            "curriculum_match": cm if decision.get("decision") == "accept" else cv.get("curriculum_match", cm),
            "curriculum_validation_status": "valid",
            "curriculum_validator_version": CURRICULUM_VALIDATOR_VERSION,
            "curriculum_reason": str(decision.get("reason") or "")[:2000],
            "curriculum_decision_source": "manual_part1_exact_patches",
        }
    )
    if decision.get("decision") == "accept" or operation == "retag_and_patch_in_place":
        cv["curriculum_match"] = "in_syllabus"

    ak = dict(payload.get("answer_key_validation") or {})
    co = str((content_patch.get("correct_option") or row.get("correct_option") or "")).strip().upper()[:1]
    ak.update(
        {
            "stored_option": co,
            "true_option": co,
            "was_wrong": answer_key_changed,
            "apply_fix": False,
            "reason": "manual_part1_exact_patches",
        }
    )

    payload.update(
        {
            "verdict": "Pass",
            "recommended_action": "approve",
            "effective_recommended_action": "approve",
            "curriculum_validation": cv,
            "answer_key_validation": ak,
            "review_disposition": {
                "outcome": "keep",
                "labels": [],
                "notes": "Approved via manual part1 exact patches.",
            },
            "auto_fix_triage": {
                "human_blocking_issues": [],
                "recommended_action_after_auto_fix": "approve",
                "reason": "Manual supervisor review (part 1 unassessed).",
            },
        }
    )
    payload = _append_manual_audit(
        payload,
        decision=decision,
        operation=operation,
        source_checksum=source_checksum,
        extra={"post_patch_action": "approve"},
    )

    patch: Dict[str, Any] = {
        "quality_gate_assessed_at": _iso_now(),
        "quality_gate_verdict": "Pass",
        "quality_gate_action": "approve",
        "quality_gate_reason": str(decision.get("reason") or "")[:8000],
        "quality_gate_payload": payload,
        "quality_gate_job_id": row.get("quality_gate_job_id") or f"manual_part1_{_iso_now()[:10]}",
        "status": "approved",
    }
    if content_patch:
        patch.update(content_patch)
    return patch


def build_retire_patch(
    row: Dict[str, Any],
    decision: Dict[str, Any],
    *,
    source_checksum: str,
    replacement_id: Optional[str] = None,
) -> Dict[str, Any]:
    payload = _parse_payload(row.get("quality_gate_payload"))
    payload = _append_manual_audit(
        payload,
        decision=decision,
        operation="retire_original_and_create_replacement",
        source_checksum=source_checksum,
        extra={
            "retired": True,
            "replacement_question_id": replacement_id,
        },
    )
    payload["retired_by_manual_part1"] = True
    payload["replacement_for_question_id"] = None
    if replacement_id:
        payload["replacement_question_id"] = replacement_id
    return {
        "status": "pending",
        "quality_gate_assessed_at": _iso_now(),
        "quality_gate_verdict": "Major",
        "quality_gate_action": "regenerate",
        "quality_gate_reason": str(decision.get("reason") or "")[:8000],
        "quality_gate_payload": payload,
    }


def build_replacement_record(
    original: Dict[str, Any],
    replacement_question: Dict[str, Any],
    *,
    original_id: str,
    source_checksum: str,
) -> Dict[str, Any]:
    new_uuid = str(uuid.uuid4())
    gen_id = f"manual_part1_{original_id[:8]}_{new_uuid[:8]}"
    rq = replacement_question
    record: Dict[str, Any] = {
        "id": new_uuid,
        "generation_id": gen_id,
        "schema_id": original.get("schema_id") or f"M_manual_{new_uuid[:8]}",
        "difficulty": rq.get("difficulty") or original.get("difficulty") or "Medium",
        "status": "pending",
        "subjects": rq.get("subject") or original.get("subjects"),
        "test_type": original.get("test_type") or "ESAT",
        "primary_tag": rq.get("primary_tag"),
        "secondary_tags": rq.get("secondary_tags") or [],
        "question_stem": rq.get("question_stem"),
        "options": rq.get("options"),
        "correct_option": rq.get("correct_option"),
        "solution_reasoning": rq.get("solution_reasoning") or "",
        "solution_key_insight": rq.get("solution_key_insight") or "",
        "distractor_map": rq.get("distractor_map") or {},
        "quality_gate_payload": {
            "replacement_for_question_id": original_id,
            "manual_patch_version": MANUAL_PATCH_VERSION,
            "manual_part1_audits": [
                {
                    "manual_patch_version": MANUAL_PATCH_VERSION,
                    "applied_at": _iso_now(),
                    "source_file": SOURCE_FILENAME,
                    "source_checksum_sha256": source_checksum,
                    "operation": "replacement_created",
                    "original_question_id": original_id,
                }
            ],
        },
    }
    return record


def analyze_decision(
    row: Optional[Dict[str, Any]],
    decision: Dict[str, Any],
    *,
    source_checksum: str,
    force: bool = False,
) -> Tuple[ApplyBucket, List[str], Optional[Dict[str, Any]]]:
    qid = str(decision.get("id") or "")
    if row is None:
        return "row_missing", [f"missing row {qid}"], None

    payload = _parse_payload(row.get("quality_gate_payload"))
    if _already_applied(payload, force=force):
        return "already_applied", ["already esat_unassessed_part1_v2_exact_patches"], None

    hash_err = _verify_stem_hash(row, decision)
    impl = decision.get("implementation") or {}
    operation = str(impl.get("operation") or "").strip()

    if hash_err and operation not in (
        "patch_in_place",
        "retag_and_patch_in_place",
        "replace_missing_asset_with_self_contained_data_and_patch",
    ):
        return "hash_mismatch", [hash_err], None

    plan: Dict[str, Any] = {
        "id": qid,
        "operation": operation,
        "decision": decision.get("decision"),
        "post_patch_action": impl.get("post_patch_action"),
    }

    try:
        if operation == "no_change":
            post_row = merged_row(row, {})
            if hash_err:
                return "hash_mismatch", [hash_err], None
            blockers = run_post_checks(post_row, decision)
            if blockers:
                return "post_check_blocked", blockers, plan
            plan["approve_patch"] = build_approve_payload(
                row,
                decision,
                operation=operation,
                source_checksum=source_checksum,
                content_patch={},
                answer_key_changed=False,
            )
            return "would_approve_no_change", [], plan

        if operation in (
            "patch_in_place",
            "retag_and_patch_in_place",
            "replace_missing_asset_with_self_contained_data_and_patch",
        ):
            content_patch, answer_key_changed = build_content_patch(row, decision)
            post_row = merged_row(row, content_patch)
            blockers = run_post_checks(post_row, decision)
            if blockers:
                return "post_check_blocked", blockers, plan
            plan["content_patch"] = content_patch
            plan["answer_key_changed"] = answer_key_changed
            plan["approve_patch"] = build_approve_payload(
                row,
                decision,
                operation=operation,
                source_checksum=source_checksum,
                content_patch=content_patch,
                answer_key_changed=answer_key_changed,
            )
            bucket: ApplyBucket
            if operation == "retag_and_patch_in_place":
                bucket = "would_retag_and_approve"
            elif operation == "replace_missing_asset_with_self_contained_data_and_patch":
                bucket = "would_replace_asset_and_approve"
            else:
                bucket = "would_patch_and_approve"
            return bucket, [], plan

        if operation == "retire_original_and_create_replacement":
            rq = impl.get("replacement_question")
            if not isinstance(rq, dict):
                return "error", ["missing replacement_question"], plan
            replacement = build_replacement_record(
                row,
                rq,
                original_id=qid,
                source_checksum=source_checksum,
            )
            rep_row = {**replacement}
            rep_decision = {
                **decision,
                "curriculum_match": "in_syllabus",
                "decision": "accept",
                "corrected_option": rq.get("correct_option"),
            }
            blockers = run_post_checks(rep_row, rep_decision)
            if blockers:
                return "post_check_blocked", blockers, plan
            plan["replacement_record"] = replacement
            plan["retire_patch"] = build_retire_patch(
                row, decision, source_checksum=source_checksum
            )
            return "would_retire_and_create_replacement", [], plan

        return "error", [f"unknown operation {operation!r}"], plan
    except Exception as exc:
        return "error", [str(exc)], plan


def run_replacement_quality_gate(
    row: Dict[str, Any],
    *,
    llm: Any,
    model: str,
    job_id: str,
) -> Tuple[Any, str, str, Dict[str, Any]]:
    """Run full LLM quality gate on a replacement row. Returns (result, raw, model_used, db_patch)."""
    from quality_gate.assess import assess_question
    from quality_gate.schemas import effective_action

    result, raw_text, used_model = assess_question(llm, row, model=model)
    eff = effective_action(result)
    payload = result.to_payload()
    payload["raw_model_excerpt"] = (raw_text or "")[:4000]
    payload["effective_recommended_action"] = eff
    payload["replacement_for_question_id"] = (
        _parse_payload(row.get("quality_gate_payload")).get("replacement_for_question_id")
    )
    payload["manual_patch_version"] = MANUAL_PATCH_VERSION

    patch: Dict[str, Any] = {
        "quality_gate_assessed_at": _iso_now(),
        "quality_gate_verdict": result.verdict,
        "quality_gate_action": eff,
        "quality_gate_reason": result.reasoning[:8000],
        "quality_gate_payload": payload,
        "quality_gate_job_id": job_id,
        "quality_gate_model": used_model,
    }
    if result.verdict == "Pass" and eff == "approve":
        patch["status"] = "approved"
    return result, raw_text, used_model, patch

