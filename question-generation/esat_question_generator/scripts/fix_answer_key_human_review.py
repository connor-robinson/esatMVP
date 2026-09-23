#!/usr/bin/env python3
"""Reconcile and approve ESAT human_review rows blocked only by answer-key issues."""

from __future__ import annotations

import argparse
import json
import sys
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

_BASE = Path(__file__).resolve().parent.parent
if str(_BASE) not in sys.path:
    sys.path.insert(0, str(_BASE))

AUDIT_VERSION = "answer_key_reconcile_v1"
ANSWER_KEY_LABELS = frozenset({"wrong_answer_key", "wrong_answer_key_fixed"})


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_payload(raw: Any) -> Dict[str, Any]:
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str) and raw.strip():
        return json.loads(raw)
    return {}


def _has_answer_key_flag(result, payload: Dict[str, Any]) -> bool:
    labels = set(result.disposition_labels)
    if labels & ANSWER_KEY_LABELS:
        return True
    ak = payload.get("answer_key_validation") or {}
    if ak.get("was_wrong") or ak.get("apply_fix"):
        return True
    issues = result.human_blocking_issues or []
    return any("answer" in str(i).lower() or "key" in str(i).lower() for i in issues)


def _non_answer_key_blockers(result, payload: Dict[str, Any], row: Dict[str, Any]) -> List[str]:
    from quality_gate.schemas import _blocking_disposition_labels, _curriculum_is_out_of_syllabus

    blockers: List[str] = []
    verdict = (row.get("quality_gate_verdict") or result.verdict or "").strip()
    if verdict == "Major":
        blockers.append("verdict_major")
    cm = result.curriculum_match or ""
    if cm == "borderline":
        blockers.append("curriculum_borderline")
    if _curriculum_is_out_of_syllabus(cm):
        blockers.append("curriculum_out_of_syllabus")
    if int(result.scores.get("solution_quality") or 5) <= 2:
        blockers.append("solution_quality_low")
    if int(result.scores.get("esat_realism_pacing") or 5) <= 2:
        blockers.append("pacing_low")
    if "deterministic_conflict" in result.disposition_labels:
        blockers.append("deterministic_conflict")
    if result.disposition_outcome == "move_paper":
        blockers.append("disposition_move_paper")
    blocking = _blocking_disposition_labels(result.disposition_labels)
    for lab in blocking:
        if lab in ANSWER_KEY_LABELS or lab in ("formatting_fixed",):
            continue
        blockers.append(f"label:{lab}")
    for issue in result.human_blocking_issues or []:
        low = str(issue).lower()
        if "answer" in low or "key" in low:
            continue
        if "format" in low:
            continue
        if "off-syllabus" in low or "off_syllabus" in low or "math2" in low or "belongs_in" in low:
            blockers.append(f"human_blocking:{issue}")
            continue
        if any(
            tok in low
            for tok in (
                "missing diagram",
                "missing graph",
                "pacing",
                "too easy",
                "too long",
                "solution",
                "distractor",
                "deterministic",
            )
        ):
            blockers.append(f"human_blocking:{issue}")
    return blockers


def classify_row(row: Dict[str, Any]) -> Dict[str, Any]:
    from quality_gate.answer_key import build_answer_key_patch, build_answer_key_precheck
    from quality_gate.schemas import parse_quality_gate_json

    payload = _parse_payload(row.get("quality_gate_payload"))
    result = parse_quality_gate_json(deepcopy(payload.get("raw") or payload))
    pre = build_answer_key_precheck(row)
    stored = (row.get("correct_option") or "").strip().upper()[:1]
    ak = payload.get("answer_key_validation") or {}
    llm_true = (ak.get("true_option") or "").strip().upper()[:1]

    other = _non_answer_key_blockers(result, payload, row)
    if not _has_answer_key_flag(result, payload):
        return {"bucket": "skip_not_answer_key", "other_blockers": other}

    if other:
        return {
            "bucket": "skip_other_blockers",
            "other_blockers": other,
            "precheck": pre,
            "stored": stored,
            "llm_true": llm_true,
        }

    patch: Dict[str, Any] = {}
    bucket = "unfixable"
    note = ""

    if not pre["mismatch_detected"]:
        bucket = "already_correct"
        note = "Deterministic reconcile agrees with stored key; LLM false alarm."
    else:
        content_patch, reason = build_answer_key_patch(row)
        if content_patch:
            bucket = "fixable_reconcile"
            patch = content_patch
            note = reason or "reconcile_correct_option"
        elif llm_true and llm_true != stored:
            opts = row.get("options") or {}
            if isinstance(opts, dict) and llm_true in {str(k).strip().upper()[:1] for k in opts}:
                if pre.get("inferred_option") in (None, llm_true):
                    bucket = "fixable_llm_true_option"
                    patch = {"correct_option": llm_true}
                    note = ak.get("reason") or "llm_true_option"
                else:
                    bucket = "conflict_reconcile_vs_llm"
                    note = f"reconcile={pre.get('inferred_option')} llm={llm_true}"
            else:
                bucket = "unfixable_invalid_llm_option"
        else:
            bucket = "unfixable_no_inference"

    return {
        "bucket": bucket,
        "patch": patch,
        "note": note,
        "precheck": pre,
        "stored": stored,
        "llm_true": llm_true,
        "other_blockers": other,
    }


def build_db_patch(row: Dict[str, Any], classification: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    bucket = classification["bucket"]
    if bucket not in ("already_correct", "fixable_reconcile", "fixable_llm_true_option"):
        return None

    payload = _parse_payload(row.get("quality_gate_payload"))
    content_patch = dict(classification.get("patch") or {})
    new_letter = content_patch.get("correct_option") or (row.get("correct_option") or "").strip().upper()[:1]

    ak = dict(payload.get("answer_key_validation") or {})
    ak.update(
        {
            "stored_option": (row.get("correct_option") or "").strip().upper()[:1],
            "true_option": new_letter,
            "was_wrong": bucket != "already_correct",
            "apply_fix": False,
            "reason": classification.get("note") or "answer_key_reconcile_v1",
        }
    )
    payload["answer_key_validation"] = ak
    payload["answer_key_will_fix"] = False
    payload["recommended_action"] = "approve"
    payload["effective_recommended_action"] = "approve"

    rd = dict(payload.get("review_disposition") or {})
    labels = [l for l in (rd.get("labels") or []) if l not in ANSWER_KEY_LABELS]
    rd["labels"] = labels
    rd["outcome"] = "keep"
    payload["review_disposition"] = rd

    triage = dict(payload.get("auto_fix_triage") or {})
    triage["human_blocking_issues"] = [
        i
        for i in (triage.get("human_blocking_issues") or [])
        if "answer" not in str(i).lower() and "key" not in str(i).lower()
    ]
    triage["recommended_action_after_auto_fix"] = "approve"
    triage["reason"] = "Answer key verified by deterministic reconcile."
    payload["auto_fix_triage"] = triage

    now = _iso_now()
    payload["answer_key_reconcile_audit"] = {
        "version": AUDIT_VERSION,
        "applied_at": now,
        "bucket": bucket,
        "note": classification.get("note"),
        "precheck": classification.get("precheck"),
    }

    patch: Dict[str, Any] = {
        "quality_gate_action": "approve",
        "quality_gate_payload": payload,
        "status": "approved",
    }
    if content_patch:
        patch.update(content_patch)
    return patch


def fetch_candidates(client: Any) -> List[Dict[str, Any]]:
    cols = (
        "id, subjects, test_type, status, question_stem, options, correct_option, "
        "solution_reasoning, solution_key_insight, distractor_map, "
        "quality_gate_verdict, quality_gate_action, quality_gate_payload"
    )
    out: List[Dict[str, Any]] = []
    offset = 0
    page = 500
    while True:
        q = (
            client.table("ai_generated_questions")
            .select(cols)
            .eq("quality_gate_action", "human_review")
            .neq("status", "deleted")
            .or_("test_type.eq.ESAT,test_type.is.null")
            .order("id")
            .range(offset, offset + page - 1)
        )
        resp = q.execute()
        batch = list(resp.data or [])
        if not batch:
            break
        out.extend(batch)
        if len(batch) < page:
            break
        offset += page
    return out


def main() -> int:
    from quality_gate.supabase_io import get_supabase, update_question_assessment

    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--sample", type=int, default=8)
    parser.add_argument("--report", default=str(_BASE / "quality_gate" / "answer_key_reconcile_report.json"))
    args = parser.parse_args()
    if not args.dry_run and not args.apply:
        args.dry_run = True

    client = get_supabase()
    rows = fetch_candidates(client)

    results: List[Dict[str, Any]] = []
    counts: Dict[str, int] = {}
    to_apply: List[Tuple[Dict[str, Any], Dict[str, Any], Dict[str, Any]]] = []

    for row in rows:
        cls = classify_row(row)
        bucket = cls["bucket"]
        counts[bucket] = counts.get(bucket, 0) + 1
        entry = {
            "id": row["id"],
            "id_prefix": str(row["id"])[:8],
            "subject": row.get("subjects"),
            "bucket": bucket,
            "stored_option": cls.get("stored"),
            "inferred_option": (cls.get("precheck") or {}).get("inferred_option"),
            "llm_true_option": cls.get("llm_true"),
            "content_patch": cls.get("patch") or {},
            "note": cls.get("note"),
            "other_blockers": cls.get("other_blockers") or [],
        }
        results.append(entry)
        db_patch = build_db_patch(row, cls)
        if db_patch:
            to_apply.append((row, cls, db_patch))

    sample = [r for r in results if r["bucket"] in ("already_correct", "fixable_reconcile", "fixable_llm_true_option")][: args.sample]

    applied = 0
    errors: List[Dict[str, Any]] = []
    if args.apply:
        for row, cls, db_patch in to_apply:
            try:
                update_question_assessment(client, row["id"], db_patch)
                applied += 1
            except Exception as exc:
                errors.append({"id": str(row["id"])[:8], "error": str(exc)})

    report = {
        "generated_at": _iso_now(),
        "mode": "apply" if args.apply else "dry_run",
        "candidates_human_review": len(rows),
        "counts": counts,
        "will_apply": len(to_apply),
        "applied": applied,
        "errors": errors,
        "sample_verification": sample,
        "all_results": results,
    }
    report_path = Path(args.report)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print("=== Answer key reconcile ===")
    print(f"Mode: {report['mode']}")
    print(f"human_review candidates scanned: {len(rows)}")
    for k, v in sorted(counts.items()):
        print(f"  {k}: {v}")
    print(f"Will apply / applied: {len(to_apply)} / {applied}")
    print("\nSample verification:")
    for s in sample:
        print(
            f"  {s['id_prefix']} {s['bucket']} stored={s['stored_option']} "
            f"inferred={s['inferred_option']} patch={s['content_patch']}"
        )
    print(f"\nReport: {report_path}")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
