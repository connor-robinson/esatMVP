#!/usr/bin/env python3
"""Export ESAT cohorts split into JSON parts for supervisor review."""

from __future__ import annotations

import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

_BASE = Path(__file__).resolve().parent.parent
if str(_BASE) not in sys.path:
    sys.path.insert(0, str(_BASE))

OUT_DIR = _BASE / "quality_gate" / "exports"
PARTS = 2  # 2 files per cohort => 4 files total


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_payload(raw: Any) -> Dict[str, Any]:
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str) and raw.strip():
        return json.loads(raw)
    return {}


def fetch_all_esat(client: Any) -> List[Dict[str, Any]]:
    cols = (
        "id, generation_id, schema_id, created_at, updated_at, subjects, test_type, "
        "primary_tag, secondary_tags, difficulty, status, question_stem, options, "
        "correct_option, solution_reasoning, solution_key_insight, distractor_map, "
        "quality_gate_assessed_at, quality_gate_verdict, quality_gate_action, "
        "quality_gate_reason, quality_gate_payload, quality_gate_job_id"
    )
    out: List[Dict[str, Any]] = []
    offset = 0
    while True:
        q = (
            client.table("ai_generated_questions")
            .select(cols)
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


def is_borderline_only_human_review(row: Dict[str, Any]) -> bool:
    from quality_gate.curriculum_reassessment.eligibility import (
        _non_curriculum_blockers,
        _row_to_result,
    )

    if (row.get("quality_gate_action") or "").strip() != "human_review":
        return False
    payload = _parse_payload(row.get("quality_gate_payload"))
    result = _row_to_result(row, payload)
    cm = (payload.get("curriculum_validation") or {}).get("curriculum_match") or result.curriculum_match
    if cm != "borderline":
        return False
    hard, _ = _non_curriculum_blockers(result, payload, row)
    return not hard


def shape_row(row: Dict[str, Any], *, cohort: str) -> Dict[str, Any]:
    payload = _parse_payload(row.get("quality_gate_payload"))
    cv = payload.get("curriculum_validation") or {}
    scores = payload.get("scores") or {}
    return {
        "id": row.get("id"),
        "id_prefix": str(row.get("id", ""))[:8],
        "cohort": cohort,
        "generation_id": row.get("generation_id"),
        "schema_id": row.get("schema_id"),
        "subject": row.get("subjects"),
        "test_type": row.get("test_type") or "ESAT",
        "primary_tag": row.get("primary_tag"),
        "secondary_tags": row.get("secondary_tags"),
        "difficulty": row.get("difficulty"),
        "status": row.get("status"),
        "question_stem": row.get("question_stem"),
        "options": row.get("options"),
        "correct_option": row.get("correct_option"),
        "solution_reasoning": row.get("solution_reasoning"),
        "solution_key_insight": row.get("solution_key_insight"),
        "distractor_map": row.get("distractor_map"),
        "quality_gate": {
            "assessed_at": row.get("quality_gate_assessed_at"),
            "verdict": row.get("quality_gate_verdict"),
            "action": row.get("quality_gate_action"),
            "reason": row.get("quality_gate_reason"),
            "job_id": row.get("quality_gate_job_id"),
            "curriculum_match": cv.get("curriculum_match"),
            "curriculum_reason": cv.get("curriculum_reason"),
            "curriculum_confidence": cv.get("confidence"),
            "scores": scores,
            "human_blocking_issues": (payload.get("auto_fix_triage") or {}).get("human_blocking_issues"),
            "disposition_labels": (payload.get("review_disposition") or {}).get("labels"),
        },
    }


def split_even(items: List[Dict[str, Any]], parts: int) -> List[List[Dict[str, Any]]]:
    n = len(items)
    if n == 0:
        return [[] for _ in range(parts)]
    size = math.ceil(n / parts)
    return [items[i * size : (i + 1) * size] for i in range(parts)]


def write_parts(
    *,
    cohort_key: str,
    cohort_label: str,
    rows: List[Dict[str, Any]],
    parts: int,
) -> List[Path]:
    shaped = [shape_row(r, cohort=cohort_key) for r in rows]
    chunks = split_even(shaped, parts)
    written: List[Path] = []
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for i, chunk in enumerate(chunks, start=1):
        doc = {
            "exported_at": _iso_now(),
            "cohort": cohort_key,
            "cohort_label": cohort_label,
            "part": i,
            "parts_total": parts,
            "questions_in_part": len(chunk),
            "questions_in_cohort": len(shaped),
            "questions": chunk,
        }
        path = OUT_DIR / f"esat_{cohort_key}_part{i}of{parts}.json"
        path.write_text(json.dumps(doc, ensure_ascii=False, indent=2), encoding="utf-8")
        written.append(path)
    return written


def main() -> int:
    from quality_gate.supabase_io import get_supabase

    client = get_supabase()
    all_rows = fetch_all_esat(client)
    unassessed = [r for r in all_rows if not r.get("quality_gate_assessed_at")]
    borderline_only = [r for r in all_rows if is_borderline_only_human_review(r)]

    u_paths = write_parts(
        cohort_key="unassessed",
        cohort_label="Never quality-gate scored (no quality_gate_assessed_at)",
        rows=unassessed,
        parts=PARTS,
    )
    b_paths = write_parts(
        cohort_key="borderline_curriculum_only",
        cohort_label="human_review with borderline curriculum as sole blocker",
        rows=borderline_only,
        parts=PARTS,
    )

    print("=== ESAT export (4 files) ===")
    print(f"Unassessed total: {len(unassessed)}")
    for p in u_paths:
        print(f"  {p}")
    print(f"Borderline-only human_review total: {len(borderline_only)}")
    for p in b_paths:
        print(f"  {p}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
