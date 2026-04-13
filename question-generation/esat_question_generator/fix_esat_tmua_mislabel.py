#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Repair rows where ``db_sync`` wrongly set ``test_type = TMUA`` / ``subjects = Paper 1``
for ESAT mathematics (schema ids like ``M_<hash>``).

Usage (from ``esat_question_generator/``):

  python fix_esat_tmua_mislabel.py --dry-run
  python fix_esat_tmua_mislabel.py --apply
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except AttributeError:
        pass


def _load_env(base_dir: Path) -> None:
    try:
        from dotenv import load_dotenv
    except ImportError:
        return
    for name in (".env.local", ".env"):
        p = base_dir / name
        if p.is_file():
            load_dotenv(p)
            return


def _infer_math_paper(row: Dict[str, Any]) -> str:
    idea = row.get("idea_plan")
    if isinstance(idea, str):
        try:
            idea = json.loads(idea)
        except json.JSONDecodeError:
            idea = {}
    if not isinstance(idea, dict):
        idea = {}
    mod = (idea.get("module") or "").lower()
    if "mathematics2" in mod:
        return "Math 2"
    if "mathematics1" in mod:
        return "Math 1"
    pt = row.get("primary_tag")
    if isinstance(pt, str):
        u = pt.upper()
        if pt.startswith("M2-") or u.startswith("MM") or "MATHEMATICS 2" in u:
            return "Math 2"
    return "Math 1"


def _iter_tmua_paper1(client: Any, page_size: int = 1000) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    offset = 0
    while True:
        res = (
            client.table("ai_generated_questions")
            .select(
                "id,generation_id,schema_id,test_type,subjects,idea_plan,primary_tag"
            )
            .eq("test_type", "TMUA")
            .eq("subjects", "Paper 1")
            .range(offset, offset + page_size - 1)
            .execute()
        )
        batch = res.data or []
        if not batch:
            break
        out.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size
    return out


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Write updates to Supabase.")
    args = parser.parse_args()
    base_dir = Path(__file__).resolve().parent
    _load_env(base_dir)
    os.chdir(base_dir)

    from db_sync import DatabaseSync

    sync = DatabaseSync()
    if not sync.enabled or not sync.client:
        print("Supabase not configured.", file=sys.stderr)
        return 1

    rows = _iter_tmua_paper1(sync.client)
    targets = [r for r in rows if (r.get("schema_id") or "").startswith("M_")]
    print(f"TMUA + Paper 1 rows: {len(rows)}; ESAT-style M_* schemas: {len(targets)}")

    for row in targets:
        gid = row.get("generation_id", "")
        paper = _infer_math_paper(row)
        patch = {"test_type": "ESAT", "subjects": paper}
        mode = "UPDATE" if args.apply else "would_update"
        print(f"{mode} {gid} -> test_type=ESAT subjects={paper}")
        if args.apply:
            sync.client.table("ai_generated_questions").update(patch).eq(
                "generation_id", gid
            ).execute()

    print(f"Done. {len(targets)} row(s) {'updated' if args.apply else 'would be updated'}.")
    if not args.apply and targets:
        print("Re-run with --apply to write changes.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
