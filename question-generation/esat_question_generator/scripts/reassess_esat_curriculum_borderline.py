#!/usr/bin/env python3
"""
Targeted ESAT curriculum-only reassessment (borderline sole blocker).

Examples (from ``esat_question_generator/``):

  python scripts/reassess_esat_curriculum_borderline.py --dry-run
  python scripts/reassess_esat_curriculum_borderline.py --apply
  python scripts/reassess_esat_curriculum_borderline.py --apply --limit 10
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import uuid
from collections import Counter, defaultdict
from copy import deepcopy
from dataclasses import replace
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

_BASE = Path(__file__).resolve().parent.parent
if str(_BASE) not in sys.path:
    sys.path.insert(0, str(_BASE))

SELECT_COLS = (
    "id, schema_id, subjects, primary_tag, secondary_tags, test_type, status, "
    "question_stem, options, correct_option, solution_reasoning, "
    "quality_gate_assessed_at, quality_gate_verdict, quality_gate_action, "
    "quality_gate_payload, quality_gate_job_id"
)


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_payload(raw: Any) -> Dict[str, Any]:
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str) and raw.strip():
        return json.loads(raw)
    return {}


def fetch_assessed_rows(client: Any) -> List[Dict[str, Any]]:
    """Fetch quality-gate assessed rows (deleted excluded with IS DISTINCT FROM semantics)."""
    rows: List[Dict[str, Any]] = []
    offset = 0
    page = 500
    while True:
        resp = (
            client.table("ai_generated_questions")
            .select(SELECT_COLS)
            .not_.is_("quality_gate_assessed_at", "null")
            .neq("status", "deleted")
            .range(offset, offset + page - 1)
            .execute()
        )
        batch = list(resp.data or [])
        rows.extend(batch)
        if len(batch) < page:
            break
        offset += page
    return rows


def _row_to_result(row: Dict[str, Any], payload: Dict[str, Any]):
    from quality_gate.schemas import parse_quality_gate_json

    raw = payload.get("raw") if isinstance(payload.get("raw"), dict) else payload
    if isinstance(raw, dict) and raw.get("verdict"):
        return parse_quality_gate_json(deepcopy(raw))
    return parse_quality_gate_json(deepcopy(payload))


def classify_cohort(rows: List[Dict[str, Any]]) -> Tuple[Counter, Dict[str, List[Dict]], List[Dict]]:
    from quality_gate.curriculum_reassessment.eligibility import is_curriculum_only_review_candidate
    from quality_gate.curriculum_reassessment.esat_cohort import is_confirmed_esat

    counts: Counter = Counter()
    examples: Dict[str, List[Dict]] = defaultdict(list)
    eligible: List[Dict] = []
    null_tt_excluded: List[Dict] = []

    for row in rows:
        tt = row.get("test_type")
        confirmed, _ = is_confirmed_esat(row)
        if tt is None and not confirmed:
            null_tt_excluded.append(row)
        if not confirmed:
            counts["skipped_not_confirmed_esat"] += 1
            continue

        ok, bucket, reasons = is_curriculum_only_review_candidate(row)
        counts[bucket] += 1
        if len(examples[bucket]) < 3:
            pl = _parse_payload(row.get("quality_gate_payload"))
            cv = pl.get("curriculum_validation") or {}
            examples[bucket].append(
                {
                    "id": row["id"][:8],
                    "subject": row.get("subjects"),
                    "test_type": row.get("test_type"),
                    "action": row.get("quality_gate_action"),
                    "match": cv.get("curriculum_match"),
                    "reasons": reasons[:4],
                }
            )
        if ok:
            row["_eligibility_bucket"] = bucket
            row["_eligibility_reasons"] = reasons
            eligible.append(row)

    counts["null_test_type_excluded"] = len(null_tt_excluded)
    return counts, examples, eligible


def apply_reassessment(
    client: Any,
    row: Dict[str, Any],
    *,
    llm: Any,
    model: str,
    run_id: str,
    dry_run: bool,
    stats: Counter,
) -> None:
    from quality_gate.curriculum_reassessment.actions import action_from_reassessment
    from quality_gate.curriculum_reassessment.assess import reassess_curriculum
    from quality_gate.curriculum_reassessment.audit import (
        append_payload_audit_fallback,
        insert_audit_record,
    )
    from quality_gate.curriculum_reassessment.constants import REASSESS_VERSION
    from quality_gate.runner import build_graph_notes_for_db
    from quality_gate.schemas import effective_action, effective_action_with_graph_queue

    qid = row["id"]
    bucket = row.get("_eligibility_bucket", "")
    reasons = row.get("_eligibility_reasons", [])
    old_payload = _parse_payload(row.get("quality_gate_payload"))
    old_cv = deepcopy(old_payload.get("curriculum_validation") or {})
    prior_eff = old_payload.get("effective_recommended_action") or row.get("quality_gate_action")

    if dry_run:
        stats["would_reassess"] += 1
        return

    base_result = _row_to_result(row, old_payload)
    new_cv, raw, model_used = reassess_curriculum(llm, row, model=model)
    stats["api_calls"] += 1

    updated_result = replace(
        base_result,
        curriculum_match=new_cv["curriculum_match"],
        syllabus_fit_score=new_cv["syllabus_fit_score"],
        curriculum_validation_status="valid",
        curriculum_validator_version=REASSESS_VERSION,
        required_topic_codes=new_cv.get("required_topic_codes") or [],
        suspicious_topics=new_cv.get("suspicious_topics") or [],
        curriculum_reason=new_cv.get("curriculum_reason") or new_cv.get("reason") or "",
        curriculum_flags=[],
    )

    new_action = action_from_reassessment(
        curriculum_match=new_cv["curriculum_match"],
        confidence=new_cv["confidence"],
        base_result=updated_result,
        row=row,
    )
    # Recompute payload effective action for non-curriculum guards still in base result.
    sim_eff = effective_action(
        updated_result,
        row=row,
        downgrade_low_confidence_pass=False,
    )
    sim_eff = effective_action_with_graph_queue(updated_result, sim_eff)
    if new_action == "approve" and sim_eff != "approve":
        new_action = sim_eff

    new_payload = updated_result.to_payload()
    new_payload["effective_recommended_action"] = new_action
    new_payload["curriculum_validation"] = new_cv
    if "quality_gate_payload_v1" not in old_payload:
        preserved = deepcopy(old_payload)
        preserved["preserved_at"] = _iso_now()
        preserved["preserved_reason"] = "curriculum_reassessment_v2"
        new_payload["quality_gate_payload_v1"] = preserved
    else:
        new_payload["quality_gate_payload_v1"] = old_payload["quality_gate_payload_v1"]

    audit_entry = {
        "id": str(uuid.uuid4()),
        "question_id": qid,
        "validator_version": REASSESS_VERSION,
        "model": model_used,
        "reassessed_at": _iso_now(),
        "eligibility_bucket": bucket,
        "eligibility_reasons": reasons,
        "prior_curriculum_validation": old_cv,
        "prior_effective_action": prior_eff,
        "new_curriculum_validation": new_cv,
        "new_effective_action": new_action,
        "raw_model_response": raw,
        "run_id": run_id,
    }

    try:
        insert_audit_record(
            client,
            question_id=qid,
            validator_version=REASSESS_VERSION,
            model=model_used,
            eligibility_bucket=bucket,
            eligibility_reasons=reasons,
            prior_curriculum_validation=old_cv,
            prior_effective_action=str(prior_eff) if prior_eff else None,
            new_curriculum_validation=new_cv,
            new_effective_action=new_action,
            raw_model_response=raw,
            run_id=run_id,
        )
        stats["audit_table_rows"] += 1
    except Exception as exc:
        new_payload = append_payload_audit_fallback(new_payload, audit_entry)
        stats["audit_payload_fallback"] += 1
        stats["audit_table_errors"] += 1
        print(f"[warn] audit table insert failed for {qid[:8]}: {exc}", flush=True)

    old_status = row.get("status")
    new_status = old_status
    if new_action == "approve":
        new_status = "approved"
    elif old_status == "approved" and new_action != "approve":
        new_status = "pending_review"

    patch = {
        "quality_gate_action": new_action,
        "quality_gate_payload": new_payload,
        "status": new_status,
    }
    client.table("ai_generated_questions").update(patch).eq("id", qid).execute()
    stats["applied"] += 1

    match = new_cv["curriculum_match"]
    conf = new_cv["confidence"]
    if match == "in_syllabus" and conf == "high" and new_action == "approve":
        stats["in_syllabus_high_approve"] += 1
    elif match == "in_syllabus" and conf != "high":
        stats["in_syllabus_medlow_human_review"] += 1
    elif match == "borderline":
        stats["borderline_human_review"] += 1
    elif match == "out_of_syllabus" and conf == "high":
        stats["out_of_syllabus_high_destructive"] += 1
    elif match == "out_of_syllabus":
        stats["out_of_syllabus_medlow_human_review"] += 1

    if new_status == "approved" and old_status != "approved":
        stats["status_to_approved"] += 1
    if prior_eff == "human_review" and new_action != "human_review":
        stats["action_left_human_review"] += 1


def verify_post_run(client: Any, run_id: str, stats: Counter) -> Dict[str, Any]:
    from quality_gate.curriculum_reassessment.audit import AUDIT_TABLE

    report: Dict[str, Any] = {"run_id": run_id}
    try:
        resp = (
            client.table(AUDIT_TABLE)
            .select("id", count="exact")
            .eq("run_id", run_id)
            .execute()
        )
        report["audit_records_for_run"] = int(getattr(resp, "count", 0) or len(resp.data or []))
    except Exception as e:
        report["audit_query_error"] = str(e)

    # Sample outcomes by category
    samples: Dict[str, List[Dict]] = defaultdict(list)
    try:
        rows = (
            client.table(AUDIT_TABLE)
            .select("new_curriculum_validation, new_effective_action, question_id")
            .eq("run_id", run_id)
            .limit(500)
            .execute()
            .data
            or []
        )
        for r in rows:
            cv = r.get("new_curriculum_validation") or {}
            key = f"{cv.get('curriculum_match')}_{cv.get('confidence')}"
            if len(samples[key]) < 5:
                samples[key].append(
                    {
                        "question_id": str(r.get("question_id", ""))[:8],
                        "match": cv.get("curriculum_match"),
                        "confidence": cv.get("confidence"),
                        "action": r.get("new_effective_action"),
                    }
                )
        report["samples_by_category"] = dict(samples)
    except Exception as e:
        report["sample_query_error"] = str(e)

    report["stats"] = dict(stats)
    return report


def main() -> int:
    from quality_gate.defaults import default_llm_provider, default_sync_model, make_vertex_llm_client
    from quality_gate.supabase_io import get_supabase

    parser = argparse.ArgumentParser(description="ESAT curriculum-only reassessment")
    parser.add_argument("--dry-run", action="store_true", help="Classify only; no API or DB writes")
    parser.add_argument("--apply", action="store_true", help="Run reassessment and apply results")
    parser.add_argument("--limit", type=int, default=0, help="Max eligible rows to process")
    parser.add_argument("--batch-size", type=int, default=10)
    parser.add_argument("--sleep", type=float, default=1.5, help="Seconds between batches")
    parser.add_argument("--model", default="", help="Override sync model")
    parser.add_argument("--report", default="", help="Write JSON report to path")
    args = parser.parse_args()

    if not args.dry_run and not args.apply:
        args.dry_run = True

    client = get_supabase()
    rows = fetch_assessed_rows(client)
    counts, examples, eligible = classify_cohort(rows)

    null_tt_eligible = sum(1 for r in eligible if r.get("test_type") is None)

    print("=== ESAT curriculum reassessment dry-run counts ===")
    for key in [
        "eligible_genuine_borderline",
        "eligible_invalid_curriculum_output",
        "skipped_other_blocking",
        "skipped_ambiguous_blocking_issue",
        "skipped_missing_required_validation",
        "skipped_already_in_syllabus",
        "skipped_already_out_of_syllabus",
        "skipped_already_reassessed",
        "skipped_not_confirmed_esat",
        "null_test_type_excluded",
    ]:
        print(f"  {key}: {counts.get(key, 0)}")
    print(f"  eligible_total: {len(eligible)}")
    print(f"  eligible_with_null_test_type: {null_tt_eligible}")
    print()

    for bucket, exs in examples.items():
        if exs:
            print(f"--- examples: {bucket} ---")
            for ex in exs:
                print(json.dumps(ex))

    report = {
        "generated_at": _iso_now(),
        "mode": "dry_run" if args.dry_run and not args.apply else "apply",
        "counts": dict(counts),
        "eligible_total": len(eligible),
        "eligible_null_test_type": null_tt_eligible,
        "examples": {k: v for k, v in examples.items()},
    }

    if args.dry_run and not args.apply:
        if args.report:
            Path(args.report).write_text(json.dumps(report, indent=2), encoding="utf-8")
        return 0

    # Live apply
    run_id = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S") + "-" + uuid.uuid4().hex[:8]
    model = (args.model or default_sync_model()).strip()
    if default_llm_provider() == "anthropic":
        from quality_gate.claude_client import ClaudePurgeClient

        llm = ClaudePurgeClient()
    else:
        llm = make_vertex_llm_client()
    stats: Counter = Counter()
    stats["eligible_before"] = len(eligible)

    to_process = eligible[: args.limit] if args.limit > 0 else eligible
    print(f"\n=== Applying reassessment run_id={run_id} model={model} n={len(to_process)} ===")

    for i, row in enumerate(to_process):
        try:
            # Idempotency re-check
            ok, bucket, reasons = __import__(
                "quality_gate.curriculum_reassessment.eligibility",
                fromlist=["is_curriculum_only_review_candidate"],
            ).is_curriculum_only_review_candidate(row)
            if not ok:
                stats["skipped_during_execution"] += 1
                continue
            row["_eligibility_bucket"] = bucket
            row["_eligibility_reasons"] = reasons
            apply_reassessment(
                client,
                row,
                llm=llm,
                model=model,
                run_id=run_id,
                dry_run=False,
                stats=stats,
            )
        except Exception as exc:
            stats["failed_api_or_apply"] += 1
            print(f"[error] {row['id'][:8]}: {exc}", flush=True)
        if (i + 1) % args.batch_size == 0:
            print(f"  progress {i + 1}/{len(to_process)}", flush=True)
            time.sleep(args.sleep)

    verification = verify_post_run(client, run_id, stats)
    report["run_id"] = run_id
    report["model"] = model
    report["verification"] = verification
    report["apply_stats"] = dict(stats)

    print("\n=== Post-run verification ===")
    for k, v in sorted(stats.items()):
        print(f"  {k}: {v}")
    if verification.get("samples_by_category"):
        print("\n=== Samples by outcome ===")
        for cat, samples in verification["samples_by_category"].items():
            print(f"  {cat}:")
            for s in samples:
                print(f"    {json.dumps(s)}")

    if args.report:
        Path(args.report).write_text(json.dumps(report, indent=2), encoding="utf-8")
    else:
        out = _BASE / "quality_gate" / f"curriculum_reassessment_report_{run_id}.json"
        out.write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(f"\nReport written to {out}")

    return 0 if stats["failed_api_or_apply"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
