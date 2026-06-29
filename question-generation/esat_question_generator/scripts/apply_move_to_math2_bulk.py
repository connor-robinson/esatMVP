#!/usr/bin/env python3
"""Bulk-apply move_to_math2: retag as Math 2 and approve."""

from __future__ import annotations

import argparse
import json
import re
import sys
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

_BASE = Path(__file__).resolve().parent.parent
if str(_BASE) not in sys.path:
    sys.path.insert(0, str(_BASE))

AUDIT_VERSION = "move_to_math2_bulk_v1"
M1_TAG = re.compile(r"^M1-M(\d+)$", re.I)
MM_TAG = re.compile(r"^M2-MM(\d+)$", re.I)


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_payload(raw: Any) -> Dict[str, Any]:
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str) and raw.strip():
        return json.loads(raw)
    return {}


def _pick_math2_primary_tag(row: Dict[str, Any], payload: Dict[str, Any]) -> str:
    cv = payload.get("curriculum_validation") or {}
    codes = [str(c).strip() for c in (cv.get("required_topic_codes") or []) if c]
    mm = [c for c in codes if c.upper().startswith("M2-MM")]
    if mm:
        return mm[0]
  # M1-only codes on a Math-2-bound question: map M1-Mn -> M2-MMn (best-effort).
    m1 = [c for c in codes if c.upper().startswith("M1-M")]
    if m1:
        m = M1_TAG.match(m1[0])
        if m:
            return f"M2-MM{m.group(1)}"
    existing = str(row.get("primary_tag") or "").strip()
    m = M1_TAG.match(existing)
    if m:
        return f"M2-MM{m.group(1)}"
    return "M2-MM1"


def _remap_secondary_tags(tags: Any) -> List[str]:
    if not isinstance(tags, list):
        return []
    out: List[str] = []
    for t in tags:
        s = str(t).strip()
        m = M1_TAG.match(s)
        if m:
            out.append(f"M2-MM{m.group(1)}")
        elif s and not s.upper().startswith("M1-"):
            out.append(s)
    return list(dict.fromkeys(out))


def build_patch(row: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], str]:
    subj = (row.get("subjects") or "").strip()
    if subj not in ("Math 1", "Mathematics 1", "Paper 1"):
        return None, f"skip_subject:{subj or 'missing'}"

    payload = _parse_payload(row.get("quality_gate_payload"))
    new_primary = _pick_math2_primary_tag(row, payload)
    new_secondary = _remap_secondary_tags(row.get("secondary_tags"))

    cv = dict(payload.get("curriculum_validation") or {})
    cv.update(
        {
            "curriculum_match": "in_syllabus",
            "curriculum_validation_status": "valid",
            "curriculum_reason": (
                "Bulk paper move: reassigned from Math 1 to Math 2; "
                "content judged appropriate for Mathematics 2."
            ),
            "paper_move_applied_at": _iso_now(),
        }
    )
    payload["curriculum_validation"] = cv
    payload["recommended_action"] = "approve"
    payload["effective_recommended_action"] = "approve"

    rd = dict(payload.get("review_disposition") or {})
    drop = {
        "off_syllabus",
        "borderline",
        "wrong_paper",
        "math2_content_on_math1",
        "off-syllabus for Math 1 (requires Math 2 content)",
        "off-syllabus for Math 1 (fits Math 2)",
    }
    labels = [l for l in (rd.get("labels") or []) if l not in drop]
    rd["labels"] = labels
    rd["outcome"] = "keep"
    payload["review_disposition"] = rd

    triage = dict(payload.get("auto_fix_triage") or {})
    triage["human_blocking_issues"] = [
        i
        for i in (triage.get("human_blocking_issues") or [])
        if "math 2" not in str(i).lower() and "wrong paper" not in str(i).lower()
    ]
    triage["recommended_action_after_auto_fix"] = "approve"
    payload["auto_fix_triage"] = triage

    payload["paper_move_audit"] = {
        "version": AUDIT_VERSION,
        "applied_at": _iso_now(),
        "from_subject": subj,
        "to_subject": "Math 2",
        "from_primary_tag": row.get("primary_tag"),
        "to_primary_tag": new_primary,
    }

    patch: Dict[str, Any] = {
        "subjects": "Math 2",
        "primary_tag": new_primary,
        "secondary_tags": new_secondary,
        "quality_gate_action": "approve",
        "status": "approved",
        "quality_gate_payload": payload,
    }
    return patch, "applied"


def fetch_rows(client: Any) -> List[Dict[str, Any]]:
    cols = (
        "id, subjects, primary_tag, secondary_tags, test_type, status, "
        "quality_gate_action, quality_gate_verdict, quality_gate_payload"
    )
    out: List[Dict[str, Any]] = []
    offset = 0
    while True:
        q = (
            client.table("ai_generated_questions")
            .select(cols)
            .eq("quality_gate_action", "move_to_math2")
            .neq("status", "deleted")
            .or_("test_type.eq.ESAT,test_type.is.null")
            .order("id")
            .range(offset, offset + 499)
        )
        batch = list(q.execute().data or [])
        if not batch:
            break
        out.extend(batch)
        if len(batch) < 500:
            break
        offset += 500
    return out


def main() -> int:
    from quality_gate.supabase_io import get_supabase, update_question_assessment

    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--apply", action="store_true")
    parser.add_argument(
        "--report",
        default=str(_BASE / "quality_gate" / "move_to_math2_apply_report.json"),
    )
    args = parser.parse_args()
    if not args.dry_run and not args.apply:
        args.dry_run = True

    client = get_supabase()
    rows = fetch_rows(client)
    results: List[Dict[str, Any]] = []
    errors: List[Dict[str, Any]] = []
    applied = 0

    for row in rows:
        patch, note = build_patch(row)
        entry = {
            "id": row["id"],
            "id_prefix": str(row["id"])[:8],
            "from_subject": row.get("subjects"),
            "from_primary_tag": row.get("primary_tag"),
            "verdict": row.get("quality_gate_verdict"),
            "note": note,
            "patch_summary": None if patch is None else {
                "subjects": patch.get("subjects"),
                "primary_tag": patch.get("primary_tag"),
                "secondary_tags": patch.get("secondary_tags"),
            },
        }
        if patch is None:
            entry["bucket"] = "skipped"
            results.append(entry)
            continue
        entry["bucket"] = "would_apply"
        results.append(entry)
        if args.apply:
            try:
                update_question_assessment(client, row["id"], patch)
                applied += 1
                entry["bucket"] = "applied"
            except Exception as exc:
                errors.append({"id": str(row["id"])[:8], "error": str(exc)})
                entry["bucket"] = "error"

    report = {
        "generated_at": _iso_now(),
        "mode": "apply" if args.apply else "dry_run",
        "candidate_count": len(rows),
        "applied": applied,
        "errors": errors,
        "results": results,
    }
    Path(args.report).write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print("=== move_to_math2 bulk apply ===")
    print(f"Mode: {report['mode']}")
    print(f"Candidates: {len(rows)}")
    print(f"Applied: {applied}")
    print(f"Errors: {len(errors)}")
    print(f"Report: {args.report}")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
