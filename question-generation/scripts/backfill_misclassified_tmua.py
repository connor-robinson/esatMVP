#!/usr/bin/env python3
"""
DEPRECATED: Do not use — incorrectly treats all M_<hex> ids as TMUA.

Use reclassify_exam_type.py instead (schema corpus from ESAT vs TMUA files).

Old doc:
Reclassify TMUA rows in ai_generated_questions that were saved as ESAT Math 1/2.

Detection:
  - schema_id matching M_<hex> -> Paper 1
  - schema_id matching R_<hex> -> Paper 2
  - idea_plan.paper Paper1/Paper 2 hints when present

  python backfill_misclassified_tmua.py           # dry-run
  python backfill_misclassified_tmua.py --apply
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

_BASE = Path(__file__).resolve().parent.parent
if str(_BASE / "esat_question_generator") not in sys.path:
    sys.path.insert(0, str(_BASE / "esat_question_generator"))

for env_path in (_BASE.parent / ".env.local", _BASE / "esat_question_generator" / ".env.local"):
    if env_path.is_file():
        try:
            from dotenv import load_dotenv

            load_dotenv(env_path)
        except ImportError:
            pass
        break

TMUA_M_SCHEMA = re.compile(r"^M_[0-9a-f]{6,}$", re.I)
TMUA_R_SCHEMA = re.compile(r"^R_[0-9a-f]{6,}$", re.I)

COLS = "id, schema_id, subjects, test_type, idea_plan, status"


def _parse_idea_plan(raw: Any) -> Dict[str, Any]:
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str) and raw.strip():
        try:
            parsed = json.loads(raw)
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {}
    return {}


def tmua_subject_for_row(row: Dict[str, Any]) -> Optional[str]:
    schema_id = (row.get("schema_id") or "").strip()
    if TMUA_R_SCHEMA.match(schema_id):
        return "Paper 2"
    if TMUA_M_SCHEMA.match(schema_id):
        return "Paper 1"

    idea = _parse_idea_plan(row.get("idea_plan"))
    paper = (idea.get("paper") or "").strip()
    if paper in ("Paper1", "Paper 1"):
        return "Paper 1"
    if paper in ("Paper2", "Paper 2"):
        return "Paper 2"
    return None


def build_patch(row: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    target_subject = tmua_subject_for_row(row)
    if not target_subject:
        return None

    current_subject = (row.get("subjects") or "").strip()
    current_test_type = (row.get("test_type") or "").strip()

    if current_subject == target_subject and current_test_type == "TMUA":
        return None

    return {
        "subjects": target_subject,
        "test_type": "TMUA",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Write updates to Supabase (default: dry-run)",
    )
    args = parser.parse_args()

    try:
        from supabase import create_client
    except ImportError:
        print("pip install supabase", file=sys.stderr)
        return 1

    url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY", file=sys.stderr)
        return 1

    client = create_client(url, key)
    page_size = 500
    offset = 0
    would_update = 0
    by_target: Dict[str, int] = {"Paper 1": 0, "Paper 2": 0}

    while True:
        resp = (
            client.table("ai_generated_questions")
            .select(COLS)
            .neq("status", "deleted")
            .order("id")
            .range(offset, offset + page_size - 1)
            .execute()
        )
        batch = resp.data or []
        if not batch:
            break

        for row in batch:
            patch = build_patch(row)
            if not patch:
                continue
            would_update += 1
            by_target[patch["subjects"]] = by_target.get(patch["subjects"], 0) + 1

            if would_update <= 8:
                print(
                    f"  {row['id'][:8]}… {row.get('schema_id')!r}: "
                    f"{row.get('subjects')!r}/{row.get('test_type')!r} -> "
                    f"{patch['subjects']!r}/TMUA"
                )

            if args.apply:
                client.table("ai_generated_questions").update(patch).eq(
                    "id", row["id"]
                ).execute()

        if len(batch) < page_size:
            break
        offset += page_size

    print(f"\nRows to update: {would_update}")
    print(f"  Paper 1: {by_target.get('Paper 1', 0)}")
    print(f"  Paper 2: {by_target.get('Paper 2', 0)}")
    if not args.apply:
        print("\nDry-run only. Re-run with --apply to write.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
