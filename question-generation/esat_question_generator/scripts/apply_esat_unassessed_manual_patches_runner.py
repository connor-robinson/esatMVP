"""Shared runner for ESAT unassessed manual exact-patch apply scripts."""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path
from typing import Any, Dict, List, Optional

from quality_gate.manual_part1_apply import (
    CohortConfig,
    analyze_decision,
    build_retire_patch,
    fetch_rows_by_ids,
    load_manual_decisions,
    run_replacement_quality_gate,
)


def _iso_now() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).isoformat()


def run_cohort_apply(
    *,
    config: CohortConfig,
    manual_path: Path,
    dry_run: bool,
    apply: bool,
    force: bool,
    question_id: Optional[str],
    skip_replacement_qg: bool,
    report_path: Path,
) -> int:
    from quality_gate.defaults import default_sync_model, make_vertex_llm_client
    from quality_gate.schemas import effective_action
    from quality_gate.supabase_io import get_supabase, update_question_assessment

    _, decisions_by_id, checksum = load_manual_decisions(manual_path, config=config)
    ids = sorted(decisions_by_id.keys())
    if question_id:
        qid = question_id.strip()
        if qid not in decisions_by_id:
            print(f"ERROR: {qid} not in manual file")
            return 1
        ids = [qid]

    client = get_supabase()
    rows_by_id = fetch_rows_by_ids(client, ids)

    job_id = f"{config.job_id_prefix}_{_iso_now()[:10].replace('-', '')}"
    llm = None
    model = default_sync_model()
    if apply and not skip_replacement_qg:
        llm = make_vertex_llm_client()

    results: List[Dict[str, Any]] = []
    counts: Counter = Counter()
    errors: List[Dict[str, Any]] = []
    replacements_created: List[Dict[str, Any]] = []
    answer_keys_changed = 0
    originals_retired = 0
    applied_approve = 0

    hash_buckets = ("hash_mismatch", "manual_patch_content_mismatch")

    for qid in ids:
        decision = decisions_by_id[qid]
        row = rows_by_id.get(qid)
        bucket, reasons, plan = analyze_decision(
            row,
            decision,
            config=config,
            source_checksum=checksum,
            force=force,
        )
        entry: Dict[str, Any] = {
            "id": qid,
            "id_prefix": qid[:8],
            "operation": (decision.get("implementation") or {}).get("operation"),
            "decision": decision.get("decision"),
            "bucket": bucket,
            "reasons": reasons,
        }
        counts[bucket] += 1

        if bucket == "would_retire_and_create_replacement" and plan:
            entry["replacement_preview"] = {
                "stem_preview": str((plan.get("replacement_record") or {}).get("question_stem") or "")[:120],
            }

        skip_buckets = {
            "already_applied",
            "row_missing",
            "post_check_blocked",
            "error",
            *hash_buckets,
        }
        if apply and plan and bucket not in skip_buckets:
            try:
                if bucket == "would_retire_and_create_replacement":
                    rep = plan["replacement_record"]
                    insert_resp = client.table("ai_generated_questions").insert(rep).execute()
                    inserted = (insert_resp.data or [None])[0]
                    if not inserted:
                        raise RuntimeError("replacement insert returned no row")
                    rep_id = str(inserted.get("id") or rep["id"])
                    retire_patch = build_retire_patch(
                        row,
                        decision,
                        config=config,
                        source_checksum=checksum,
                        replacement_id=rep_id,
                    )
                    update_question_assessment(client, qid, retire_patch)
                    originals_retired += 1

                    rep_row = {**rep, **inserted}
                    qg_blocked = False
                    if skip_replacement_qg:
                        entry["replacement_id"] = rep_id
                        entry["replacement_qg"] = "skipped"
                    else:
                        result, _, used_model, qg_patch = run_replacement_quality_gate(
                            rep_row,
                            config=config,
                            llm=llm,
                            model=model,
                            job_id=job_id,
                        )
                        eff = effective_action(result)
                        update_question_assessment(client, rep_id, qg_patch)
                        entry["replacement_id"] = rep_id
                        entry["replacement_qg"] = {
                            "verdict": result.verdict,
                            "action": eff,
                            "model": used_model,
                        }
                        if not (result.verdict == "Pass" and eff == "approve"):
                            qg_blocked = True
                            counts["replacement_qg_blocked"] += 1
                            counts[bucket] -= 1
                            entry["bucket"] = "replacement_qg_blocked"
                            entry["reasons"] = [
                                f"replacement QG verdict={result.verdict} action={eff}"
                            ]

                    replacements_created.append(
                        {
                            "original_id": qid,
                            "replacement_id": rep_id,
                            "qg_blocked": qg_blocked,
                        }
                    )
                    entry["applied"] = True
                elif plan.get("approve_patch"):
                    update_question_assessment(client, qid, plan["approve_patch"])
                    applied_approve += 1
                    if plan.get("answer_key_changed"):
                        answer_keys_changed += 1
                    entry["applied"] = True
            except Exception as exc:
                errors.append({"id": qid[:8], "bucket": bucket, "error": str(exc)})
                entry["error"] = str(exc)
                counts["error"] += 1

        results.append(entry)

    stem_hash_mismatches = sum(counts.get(b, 0) for b in hash_buckets)
    summary = {
        "no_change_approvals": counts.get("would_approve_no_change", 0),
        "patched_in_place": counts.get("would_patch_and_approve", 0),
        "retagged_and_patched": counts.get("would_retag_and_approve", 0),
        "asset_replacements": counts.get("would_replace_asset_and_approve", 0),
        "originals_retired": originals_retired if apply else counts.get("would_retire_and_create_replacement", 0),
        "replacements_created": len(replacements_created) if apply else counts.get("would_retire_and_create_replacement", 0),
        "answer_keys_changed": answer_keys_changed if apply else sum(
            1
            for qid in ids
            if (decisions_by_id[qid].get("implementation") or {}).get("answer_key_patch")
        ),
        "stem_hash_mismatches": stem_hash_mismatches,
        "post_check_blocked": counts.get("post_check_blocked", 0),
        "replacement_qg_blocked": counts.get("replacement_qg_blocked", 0),
        "remaining_human_review": counts.get("replacement_qg_blocked", 0),
        "already_applied": counts.get("already_applied", 0),
        "row_missing": counts.get("row_missing", 0),
        "errors": counts.get("error", 0) + len(errors),
        "total_decisions": len(ids),
        "accounted_for": sum(counts.values()),
        "all_accounted": sum(counts.values()) == len(ids),
        "audit_entries_created": applied_approve + originals_retired if apply else 0,
    }

    report = {
        "generated_at": _iso_now(),
        "mode": "apply" if apply else "dry_run",
        "cohort": config.cohort_label,
        "manual_patch_version": config.manual_patch_version,
        "source_file": config.source_filename,
        "source_checksum_sha256": checksum,
        "manual_path": str(manual_path),
        "summary": summary,
        "bucket_counts": dict(counts),
        "applied_approve": applied_approve,
        "applied_retire": originals_retired,
        "replacements_created": replacements_created,
        "apply_errors": errors,
        "results": results,
    }
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"=== ESAT unassessed {config.cohort_label} manual patches ===")
    print(f"Mode: {report['mode']}")
    print(f"Decisions: {len(ids)}")
    for key, val in summary.items():
        print(f"  {key}: {val}")
    print(f"Report: {report_path}")
    if errors:
        print(f"Apply errors: {len(errors)}")
    if not summary["all_accounted"]:
        print("WARNING: not all UUIDs accounted for in bucket counts")
        return 1
    if stem_hash_mismatches or summary["post_check_blocked"] or summary["errors"]:
        return 1 if not dry_run else (0 if apply else 1)
    return 0
