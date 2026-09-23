#!/usr/bin/env python3
"""Export ESAT (non-TMUA) questions still needing quality-gate / operator processing."""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

_BASE = Path(__file__).resolve().parent.parent
if str(_BASE) not in sys.path:
    sys.path.insert(0, str(_BASE))

OUT_DIR = _BASE / "quality_gate"

# Actions that still need human or pipeline follow-up
NEEDS_PROCESSING_ACTIONS = frozenset(
    {"human_review", "regenerate", "delete", "move_to_math2"}
)


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _cv(payload: Dict[str, Any]) -> Dict[str, Any]:
    return dict(payload.get("curriculum_validation") or {})


def _scores(payload: Dict[str, Any]) -> Dict[str, Any]:
    return dict(payload.get("scores") or {})


def _parse_payload(raw: Any) -> Dict[str, Any]:
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str) and raw.strip():
        return json.loads(raw)
    return {}


def _processing_criteria() -> Dict[str, Any]:
    return {
        "curriculum_fit": {
            "in_syllabus": "Every required fact/method is in the assigned ESAT module or permitted Math 1 content.",
            "borderline": "Probably solvable but a required term/depth/application is unclear from spec → human_review.",
            "out_of_syllabus": "Requires knowledge not in module and not supplied → regenerate or delete.",
        },
        "validity": {
            "answer_key": "Stored correct_option must match independent solve; wrong key blocks approve.",
            "underdetermined_stem": "Stem must determine a unique answer; multiple valid outcomes → invalid.",
            "solution_quality": "Solution must be correct and complete (score ≤2 blocks auto-approve).",
        },
        "pacing": {
            "target": "~90 seconds per item under exam conditions.",
            "esat_realism_pacing": "Score 1–5; ≤2 blocks auto-approve (too long/hard for ESAT pacing).",
        },
        "formatting": "LaTeX, line breaks, diagrams/tables; score ≤2 blocks auto-approve.",
        "other_actions": {
            "approve": "Strong pass — eligible for question bank.",
            "human_review": "Borderline curriculum, pacing, wording, or triage ambiguity.",
            "regenerate": "Out of syllabus or major content flaw.",
            "move_to_math2": "Sound item on wrong paper (Math 1 row needs Math 2).",
            "delete": "Unsalvageable.",
        },
        "auto_approve_requires": [
            "curriculum_match=in_syllabus with high confidence",
            "no wrong answer key",
            "solution_quality, esat_realism_pacing, formatting scores > 2",
            "no deterministic conflicts or human_blocking_issues",
        ],
    }


def fetch_rows(client: Any, *, include_unassessed: bool) -> List[Dict[str, Any]]:
    cols = (
        "id, generation_id, schema_id, created_at, updated_at, subjects, test_type, "
        "primary_tag, secondary_tags, difficulty, status, question_stem, options, "
        "correct_option, solution_reasoning, solution_key_insight, distractor_map, "
        "quality_gate_verdict, quality_gate_action, quality_gate_reason, "
        "quality_gate_payload, quality_gate_calibration_tier, "
        "quality_gate_graph_candidate, quality_gate_graph_mode, "
        "quality_gate_assessed_at, quality_gate_job_id, media_upload_code"
    )
    out: List[Dict[str, Any]] = []
    offset = 0
    page = 500
    while True:
        q = (
            client.table("ai_generated_questions")
            .select(cols)
            .neq("status", "deleted")
            .or_("test_type.eq.ESAT,test_type.is.null")
            .order("id")
            .range(offset, offset + page - 1)
        )
        resp = q.execute()
        batch = list(resp.data or [])
        if not batch:
            break
        for row in batch:
            assessed = row.get("quality_gate_assessed_at")
            action = (row.get("quality_gate_action") or "").strip()
            if not assessed:
                if include_unassessed:
                    out.append(row)
            elif action in NEEDS_PROCESSING_ACTIONS:
                out.append(row)
        if len(batch) < page:
            break
        offset += page
    return out


def shape_export_row(row: Dict[str, Any]) -> Dict[str, Any]:
    payload = _parse_payload(row.get("quality_gate_payload"))
    cv = _cv(payload)
    scores = _scores(payload)
    triage = dict(payload.get("auto_fix_triage") or {})
    assessed = bool(row.get("quality_gate_assessed_at"))
    action = (row.get("quality_gate_action") or "").strip()
    if not assessed:
        bucket = "unassessed"
    else:
        bucket = action or "unknown"

    blocking: List[str] = []
    if triage.get("human_blocking_issues"):
        blocking.extend([str(x) for x in triage["human_blocking_issues"]])
    labels = (payload.get("review_disposition") or {}).get("labels") or []
    if labels:
        blocking.extend([str(x) for x in labels if x not in blocking])

    return {
        "id": row.get("id"),
        "id_prefix": str(row.get("id", ""))[:8],
        "generation_id": row.get("generation_id"),
        "schema_id": row.get("schema_id"),
        "subject": row.get("subjects"),
        "test_type": row.get("test_type") or "ESAT",
        "primary_tag": row.get("primary_tag"),
        "secondary_tags": row.get("secondary_tags"),
        "difficulty": row.get("difficulty"),
        "status": row.get("status"),
        "processing_bucket": bucket,
        "question_stem": row.get("question_stem"),
        "options": row.get("options"),
        "correct_option": row.get("correct_option"),
        "solution_reasoning": row.get("solution_reasoning"),
        "solution_key_insight": row.get("solution_key_insight"),
        "distractor_map": row.get("distractor_map"),
        "quality_gate": {
            "assessed": assessed,
            "verdict": row.get("quality_gate_verdict"),
            "action": action or None,
            "reason": row.get("quality_gate_reason"),
            "assessed_at": row.get("quality_gate_assessed_at"),
            "job_id": row.get("quality_gate_job_id"),
            "scores": scores,
            "curriculum_match": cv.get("curriculum_match"),
            "curriculum_confidence": cv.get("confidence"),
            "curriculum_reason": cv.get("curriculum_reason"),
            "exam_timing_notes": payload.get("exam_timing_notes"),
            "human_blocking_issues": blocking,
            "manual_audit_version": (payload.get("curriculum_reassessment_audits") or [{}])[-1].get(
                "manual_audit_version"
            )
            if isinstance(payload.get("curriculum_reassessment_audits"), list)
            else payload.get("manual_audit_version"),
        },
        "what_to_check": {
            "in_curriculum": cv.get("curriculum_match"),
            "solvable_in_exam_time": scores.get("esat_realism_pacing"),
            "solution_valid": scores.get("solution_quality"),
            "answer_key_ok": not (payload.get("answer_key_validation") or {}).get("was_wrong"),
            "formatting_ok": (payload.get("formatting_validation") or {}).get("formatting_score"),
        },
    }


def main() -> int:
    from quality_gate.supabase_io import (
        count_assessed_breakdown,
        count_questions_gate_overview,
        get_supabase,
    )

    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--out",
        default=str(OUT_DIR / "esat_pending_processing_export.json"),
    )
    args = parser.parse_args()

    client = get_supabase()
    overview = count_questions_gate_overview(client, test_type="ESAT")
    breakdown = count_assessed_breakdown(client, test_type="ESAT")
    rows = fetch_rows(client, include_unassessed=True)

    by_bucket: Dict[str, int] = {}
    for r in rows:
        shaped = shape_export_row(r)
        b = shaped["processing_bucket"]
        by_bucket[b] = by_bucket.get(b, 0) + 1

    export = {
        "exported_at": _iso_now(),
        "scope": "ESAT and null test_type (excludes TMUA)",
        "counts": {
            "total_non_tmua_in_pool": overview["total"],
            "assessed": overview["assessed"],
            "unassessed_never_scored": overview["unassessed"],
            "needs_processing_total": len(rows),
            "by_quality_gate_action": breakdown["by_action"],
            "by_status": breakdown["by_status"],
            "needs_operator_assessed_only": breakdown["needs_operator"],
            "export_by_bucket": by_bucket,
            "curriculum_reassessment_note": (
                "228 borderline cohort manually resolved (esat_228_manual_review_v1). "
                "~45 network-failed reassessments still pending retry after benchmark passes."
            ),
        },
        "processing_criteria": _processing_criteria(),
        "questions": [shape_export_row(r) for r in rows],
    }

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(export, ensure_ascii=False, indent=2), encoding="utf-8")

    print("=== ESAT pending processing export ===")
    print(f"Total non-TMUA pool: {overview['total']}")
    print(f"Unassessed (never scored): {overview['unassessed']}")
    print(f"Needs processing (export): {len(rows)}")
    for k, v in sorted(by_bucket.items()):
        print(f"  {k}: {v}")
    print(f"\nWritten: {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
