#!/usr/bin/env python3
"""
Correct exam/subject labels using schema corpus files (ESAT vs TMUA).

Fixes the mistaken backfill that moved all M_<hex> rows to TMUA Paper 1.
ESAT and TMUA share the hex schema id format but ids are disjoint corpora.

  python reclassify_exam_type.py              # dry-run (Paper 1/TMUA bucket)
  python reclassify_exam_type.py --apply
  python reclassify_exam_type.py --scope all --apply
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional, Set, Tuple

_BASE = Path(__file__).resolve().parent.parent
_SCHEMA_DIR = _BASE / "esat_question_generator" / "schemas"

for env_path in (_BASE.parent / ".env.local", _BASE / "esat_question_generator" / ".env.local"):
    if env_path.is_file():
        try:
            from dotenv import load_dotenv

            load_dotenv(env_path)
        except ImportError:
            pass
        break

HEX_SCHEMA = re.compile(r"^(M|R)_[0-9a-f]{6,}$", re.I)
SCHEMA_HEADING = re.compile(r"^## \*\*([MR]_[0-9a-f]{6,})\.", re.I | re.M)

COLS = "id, schema_id, subjects, test_type, primary_tag, idea_plan, status"


@dataclass
class SchemaCorpora:
    esat: Set[str]
    tmua_p1: Set[str]
    tmua_p2: Set[str]

    def lookup(self, schema_id: str) -> str:
        sid = (schema_id or "").strip()
        if sid in self.tmua_p2:
            return "tmua_paper2_file"
        if sid in self.tmua_p1:
            return "tmua_paper1_file"
        if sid in self.esat:
            return "esat_file"
        if HEX_SCHEMA.match(sid):
            return "hex_unknown_file"
        return "legacy_or_other"


def load_schema_corpora() -> SchemaCorpora:
    def ids_from(*names: str) -> Set[str]:
        found: Set[str] = set()
        for name in names:
            path = _SCHEMA_DIR / name
            if not path.is_file():
                continue
            text = path.read_text(encoding="utf-8", errors="ignore")
            found |= set(SCHEMA_HEADING.findall(text))
        return found

    return SchemaCorpora(
        esat=ids_from("Schemas_ESAT.md", "Schemas_ESAT_Top.md", "Schemas_NSAA.md"),
        tmua_p1=ids_from("Schemas_TMUA_Paper1.md"),
        tmua_p2=ids_from("Schemas_TMUA_Paper2.md"),
    )


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


def esat_math_paper(row: Dict[str, Any]) -> str:
    tag = (row.get("primary_tag") or "").upper()
    if tag.startswith("M2-") or "-MM" in tag or tag.startswith("MM"):
        return "Math 2"
    return "Math 1"


def target_labels(row: Dict[str, Any], corpora: SchemaCorpora) -> Optional[Tuple[str, str]]:
    schema_id = (row.get("schema_id") or "").strip()
    corpus = corpora.lookup(schema_id)
    idea = _parse_idea_plan(row.get("idea_plan"))
    idea_paper = (idea.get("paper") or "").strip()

    if corpus == "tmua_paper2_file" or idea_paper in ("Paper2", "Paper 2"):
        return ("Paper 2", "TMUA")
    if corpus == "tmua_paper1_file" or idea_paper in ("Paper1", "Paper 1"):
        return ("Paper 1", "TMUA")
    if corpus == "esat_file":
        return (esat_math_paper(row), "ESAT")
    return None


def build_patch(row: Dict[str, Any], corpora: SchemaCorpora) -> Optional[Dict[str, str]]:
    target = target_labels(row, corpora)
    if not target:
        return None

    subject, test_type = target
    current_subject = (row.get("subjects") or "").strip()
    current_test_type = (row.get("test_type") or "").strip()

    if current_subject == subject and current_test_type == test_type:
        return None

    return {"subjects": subject, "test_type": test_type}


def row_in_scope(row: Dict[str, Any], scope: str) -> bool:
    if scope == "all":
        return True
    if scope == "paper1_bucket":
        return (
            (row.get("subjects") or "").strip() == "Paper 1"
            and (row.get("test_type") or "").strip() == "TMUA"
        )
    raise ValueError(f"Unknown scope: {scope}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Write updates to Supabase (default: dry-run)",
    )
    parser.add_argument(
        "--scope",
        choices=["paper1_bucket", "all"],
        default="paper1_bucket",
        help="Which rows to consider (default: current Paper 1 / TMUA bucket)",
    )
    args = parser.parse_args()

    try:
        from supabase import create_client
    except ImportError:
        print("pip install supabase python-dotenv", file=sys.stderr)
        return 1

    url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY", file=sys.stderr)
        return 1

    corpora = load_schema_corpora()
    print(
        f"Schema corpora: ESAT={len(corpora.esat)}, "
        f"TMUA P1={len(corpora.tmua_p1)}, TMUA P2={len(corpora.tmua_p2)}"
    )

    client = create_client(url, key)
    page_size = 500
    offset = 0
    would_update = 0
    unchanged = 0
    skipped = 0
    by_target: Counter[str] = Counter()

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
            if not row_in_scope(row, args.scope):
                continue

            patch = build_patch(row, corpora)
            if patch is None:
                target = target_labels(row, corpora)
                if target is None:
                    skipped += 1
                else:
                    unchanged += 1
                continue

            would_update += 1
            label = f"{patch['subjects']}/{patch['test_type']}"
            by_target[label] += 1

            if would_update <= 10:
                print(
                    f"  {row['id'][:8]}… {row.get('schema_id')!r}: "
                    f"{row.get('subjects')!r}/{row.get('test_type')!r} -> "
                    f"{patch['subjects']!r}/{patch['test_type']!r}"
                )

            if args.apply:
                client.table("ai_generated_questions").update(patch).eq(
                    "id", row["id"]
                ).execute()

        if len(batch) < page_size:
            break
        offset += page_size

    print(f"\nScope: {args.scope}")
    print(f"Rows to update: {would_update}")
    print(f"Already correct: {unchanged}")
    print(f"Skipped (no corpus match): {skipped}")
    for label, count in sorted(by_target.items()):
        print(f"  -> {label}: {count}")

    if not args.apply:
        print("\nDry-run only. Re-run with --apply to write.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
