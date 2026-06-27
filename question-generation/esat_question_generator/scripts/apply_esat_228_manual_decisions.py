#!/usr/bin/env python3
"""
Apply manual keep/reject decisions for the 228 ESAT curriculum-reassessed questions.

Examples (from ``esat_question_generator/``):

  python scripts/apply_esat_228_manual_decisions.py --dry-run
  python scripts/apply_esat_228_manual_decisions.py --apply
  python scripts/apply_esat_228_manual_decisions.py --apply --question-id <uuid>
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Dict, List, Optional

_BASE = Path(__file__).resolve().parent.parent
_REPO = _BASE.parent.parent
if str(_BASE) not in sys.path:
    sys.path.insert(0, str(_BASE))

DEFAULT_MANUAL = _REPO / "data" / "manual_overrides" / "esat_228_manual_keep_reject.json"


def _iso_now() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).isoformat()


def run(
    *,
    manual_path: Path,
    dry_run: bool,
    question_id: Optional[str],
    limit: int,
    batch_size: int,
    force: bool,
    report_path: Optional[Path],
) -> int:
    from quality_gate.manual_curriculum_apply import (
        MANUAL_AUDIT_VERSION,
        SOURCE_FILENAME,
        analyze_decision,
        fetch_rows_by_ids,
        file_sha256,
        load_manual_decisions,
    )
    from quality_gate.supabase_io import get_supabase

    _, decisions_by_id, checksum = load_manual_decisions(manual_path)
    ids = sorted(decisions_by_id.keys())
    if question_id:
        qid = question_id.strip()
        if qid not in decisions_by_id:
            print(f"ERROR: question-id {qid} not in manual file")
            return 1
        ids = [qid]
    if limit > 0:
        ids = ids[:limit]

    client = get_supabase()
    rows_by_id = fetch_rows_by_ids(client, ids)

    counts: Counter = Counter()
    exceptions: List[Dict[str, Any]] = []
    examples: Dict[str, List[Dict]] = defaultdict(list)

    for qid in ids:
        decision = decisions_by_id[qid]
        row = rows_by_id.get(qid)
        bucket, reasons, built = analyze_decision(row, decision, force=force)
        counts[bucket] += 1
        if reasons and bucket not in ("already_applied", "unchanged"):
            exceptions.append({"id": qid[:8], "bucket": bucket, "reasons": reasons})
        if len(examples[bucket]) < 3:
            examples[bucket].append(
                {
                    "id": qid[:8],
                    "decision": decision.get("decision"),
                    "category": decision.get("decision_category"),
                    "reasons": reasons[:3],
                }
            )

        if dry_run or built is None or bucket in (
            "row_missing",
            "manual_override_content_mismatch",
            "manual_keep_blocked_by_newer_issue",
            "already_applied",
            "unchanged",
            "error",
        ):
            continue

        built["patch"]["quality_gate_payload"]["manual_curriculum_audits"][-1][
            "source_checksum"
        ] = checksum
        try:
            client.table("ai_generated_questions").update(built["patch"]).eq("id", qid).execute()
            counts["applied"] += 1
        except Exception as exc:
            counts["apply_errors"] += 1
            exceptions.append({"id": qid[:8], "bucket": "apply_error", "reasons": [str(exc)]})

    report = {
        "generated_at": _iso_now(),
        "mode": "dry_run" if dry_run else "apply",
        "manual_file": str(manual_path),
        "source_checksum_sha256": checksum,
        "manual_audit_version": MANUAL_AUDIT_VERSION,
        "source_filename": SOURCE_FILENAME,
        "total_decisions_loaded": len(decisions_by_id),
        "unique_ids": len(decisions_by_id),
        "processed_ids": len(ids),
        "counts": dict(counts),
        "exceptions": exceptions,
        "examples": {k: v for k, v in examples.items()},
    }

    print("=== ESAT 228 manual decision report ===")
    for key in [
        "would_approve",
        "would_regenerate_out_of_syllabus",
        "would_regenerate_invalid_question",
        "already_applied",
        "unchanged",
        "manual_override_content_mismatch",
        "manual_keep_blocked_by_newer_issue",
        "row_missing",
        "applied",
        "apply_errors",
    ]:
        if counts.get(key):
            print(f"  {key}: {counts[key]}")
    print(f"  checksum: {checksum}")
    if exceptions:
        print(f"\nExceptions ({len(exceptions)}):")
        for ex in exceptions[:20]:
            print(json.dumps(ex))
        if len(exceptions) > 20:
            print(f"  ... and {len(exceptions) - 20} more")

    out = report_path or (_BASE / "quality_gate" / "manual_228_apply_report.json")
    out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"\nReport written to {out}")

    if counts.get("row_missing") or counts.get("manual_override_content_mismatch"):
        return 1
    if not dry_run and counts.get("apply_errors"):
        return 1
    return 0


def verify_post_apply(client: Any) -> Dict[str, Any]:
    from quality_gate.manual_curriculum_apply import MANUAL_AUDIT_VERSION, _parse_payload

    rows = []
    off = 0
    while True:
        r = (
            client.table("ai_generated_questions")
            .select("id, status, quality_gate_action, quality_gate_payload, subjects, primary_tag")
            .neq("status", "deleted")
            .range(off, off + 499)
            .execute()
        )
        batch = r.data or []
        rows.extend(batch)
        if len(batch) < 500:
            break
        off += 500

    manual_rows = []
    for row in rows:
        pl = _parse_payload(row.get("quality_gate_payload"))
        if pl.get("manual_audit_version") == MANUAL_AUDIT_VERSION:
            manual_rows.append(row)

    stats = Counter()
    contradictory = []
    for row in manual_rows:
        pl = _parse_payload(row.get("quality_gate_payload"))
        cv = pl.get("curriculum_validation") or {}
        dec = cv.get("manual_audit_decision") or (
            "keep" if pl.get("recommended_action") == "approve" else "reject"
        )
        action = row.get("quality_gate_action")
        status = row.get("status")
        match = cv.get("curriculum_match")
        if dec == "keep" or pl.get("manual_audit_version") and any(
            a.get("new_decision") == "keep"
            for a in (pl.get("manual_curriculum_audits") or [])
            if isinstance(a, dict)
        ):
            if action == "approve" and status == "approved":
                stats["keep_approved"] += 1
            elif action == "human_review":
                stats["keep_still_human_review"] += 1
            else:
                stats["keep_other"] += 1
        else:
            if action == "regenerate" and status != "approved":
                stats["reject_regenerate"] += 1
            elif status == "approved":
                stats["reject_still_approved"] += 1
            else:
                stats["reject_other"] += 1
        if match == "in_syllabus" and action == "human_review":
            contradictory.append(row["id"][:8])
        if match == "out_of_syllabus" and status == "approved":
            contradictory.append(row["id"][:8])

    return {
        "manual_rows": len(manual_rows),
        "stats": dict(stats),
        "contradictory_ids": contradictory[:20],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Apply ESAT 228 manual curriculum decisions")
    parser.add_argument("--manual-file", default=str(DEFAULT_MANUAL))
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--question-id", default="")
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--batch-size", type=int, default=50)
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--report", default="")
    args = parser.parse_args()

    if not args.dry_run and not args.apply:
        args.dry_run = True

    manual_path = Path(args.manual_file)
    report_path = Path(args.report) if args.report else None

    code = run(
        manual_path=manual_path,
        dry_run=not args.apply,
        question_id=args.question_id or None,
        limit=args.limit,
        batch_size=args.batch_size,
        force=args.force,
        report_path=report_path,
    )

    if args.apply and code == 0:
        from quality_gate.supabase_io import get_supabase

        verification = verify_post_apply(get_supabase())
        print("\n=== Post-apply verification ===")
        print(json.dumps(verification, indent=2))
        if report_path:
            data = json.loads(report_path.read_text(encoding="utf-8"))
        else:
            data = json.loads(
                (_BASE / "quality_gate" / "manual_228_apply_report.json").read_text(encoding="utf-8")
            )
        data["verification"] = verification
        out = report_path or (_BASE / "quality_gate" / "manual_228_apply_report.json")
        out.write_text(json.dumps(data, indent=2), encoding="utf-8")

    return code


if __name__ == "__main__":
    raise SystemExit(main())
