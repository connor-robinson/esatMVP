#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Backfill ``solution_reasoning`` (and empty ``solution_key_insight``) on Supabase
``ai_generated_questions`` using local ``backups/*/questions.jsonl`` and optionally
``runs/*/accepted.jsonl``.

Requires ``SUPABASE_URL`` and ``SUPABASE_SERVICE_ROLE_KEY`` (e.g. in ``.env.local``).

Usage (from ``esat_question_generator/``):

  python backfill_solution_reasoning_from_backups.py --dry-run
  python backfill_solution_reasoning_from_backups.py --apply
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# UTF-8 on Windows
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


def _bank_item_solution_fields(item: Dict[str, Any]) -> Tuple[str, str]:
    from db_sync import solution_text_fields_for_db

    qpkg = item.get("question_package") or {}
    sol = qpkg.get("solution")
    return solution_text_fields_for_db(sol)


def _merge_solution_store(
    store: Dict[str, Dict[str, str]],
    generation_id: str,
    reasoning: str,
    key_insight: str,
) -> None:
    gid = (generation_id or "").strip()
    if not gid or gid == "unknown":
        return
    reasoning = (reasoning or "").strip()
    key_insight = (key_insight or "").strip()
    if not reasoning and not key_insight:
        return
    cur = store.get(gid)
    if not cur:
        store[gid] = {"reasoning": reasoning, "key_insight": key_insight}
        return
    if len(reasoning) > len(cur.get("reasoning") or ""):
        cur["reasoning"] = reasoning
    if len(key_insight) > len(cur.get("key_insight") or ""):
        cur["key_insight"] = key_insight


def _scan_jsonl_file(path: Path, store: Dict[str, Dict[str, str]]) -> int:
    count = 0
    try:
        text = path.read_text(encoding="utf-8")
    except OSError:
        return 0
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            obj = json.loads(line)
        except json.JSONDecodeError:
            continue
        if "question_data" in obj:
            qd = obj.get("question_data")
            if not isinstance(qd, dict):
                continue
        else:
            qd = obj
        gid = (qd.get("id") or qd.get("generation_id") or "").strip()
        r, k = _bank_item_solution_fields(qd)
        _merge_solution_store(store, gid, r, k)
        count += 1
    return count


def _collect_local_index(base_dir: Path, include_runs: bool) -> Dict[str, Dict[str, str]]:
    store: Dict[str, Dict[str, str]] = {}
    backup_root = base_dir / "backups"
    if backup_root.is_dir():
        for jsonl in sorted(backup_root.glob("*/*.jsonl")):
            _scan_jsonl_file(jsonl, store)
    if include_runs:
        for jsonl in sorted(base_dir.glob("runs/**/accepted.jsonl")):
            _scan_jsonl_file(jsonl, store)
    return store


def _iter_db_rows(client: Any, page_size: int) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    offset = 0
    while True:
        res = (
            client.table("ai_generated_questions")
            .select("id,generation_id,solution_reasoning,solution_key_insight")
            .range(offset, offset + page_size - 1)
            .execute()
        )
        batch = res.data or []
        if not batch:
            break
        rows.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size
    return rows


def _needs_reasoning(val: Any) -> bool:
    if val is None:
        return True
    return not str(val).strip()


def main() -> int:
    parser = argparse.ArgumentParser(description="Backfill solution_reasoning from local JSONL backups.")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Perform Supabase updates (default: dry-run only).",
    )
    parser.add_argument(
        "--no-runs",
        action="store_true",
        help="Skip runs/**/accepted.jsonl (backups only).",
    )
    parser.add_argument(
        "--base-dir",
        type=str,
        default="",
        help="Generator directory (default: this script's directory).",
    )
    args = parser.parse_args()
    base_dir = Path(args.base_dir).resolve() if args.base_dir else Path(__file__).resolve().parent
    _load_env(base_dir)
    os.chdir(base_dir)

    index = _collect_local_index(base_dir, include_runs=not args.no_runs)
    print(f"Local index: {len(index)} generation_id keys with non-empty solution text from backups/runs.")

    from db_sync import DatabaseSync, normalize_question_math_spacing

    sync = DatabaseSync()
    if not sync.enabled or not sync.client:
        print("Supabase client not configured (check SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).", file=sys.stderr)
        return 1

    rows = _iter_db_rows(sync.client, page_size=1000)
    empty_reasoning = [r for r in rows if _needs_reasoning(r.get("solution_reasoning"))]
    print(f"DB rows scanned: {len(rows)}; empty solution_reasoning: {len(empty_reasoning)}")

    updated = 0
    skipped_no_local = 0
    skipped_still_empty = 0
    for row in empty_reasoning:
        gid = (row.get("generation_id") or "").strip()
        if not gid:
            continue
        local = index.get(gid)
        if not local:
            skipped_no_local += 1
            continue
        patch: Dict[str, Any] = {}
        new_r = (local.get("reasoning") or "").strip()
        new_k = (local.get("key_insight") or "").strip()
        if new_r:
            patch["solution_reasoning"] = new_r
        if new_k and _needs_reasoning(row.get("solution_key_insight")):
            patch["solution_key_insight"] = new_k
        if not patch:
            skipped_still_empty += 1
            continue
        patch = normalize_question_math_spacing(patch)
        if args.apply:
            sync.client.table("ai_generated_questions").update(patch).eq("generation_id", gid).execute()
        updated += 1
        mode = "UPDATE" if args.apply else "would_update"
        print(f"{mode} generation_id={gid} keys={list(patch.keys())}")

    print(
        f"Done. {updated} row(s) {'updated' if args.apply else 'would be updated'}; "
        f"no local match: {skipped_no_local}; local had no reasoning: {skipped_still_empty}."
    )
    if not args.apply and updated:
        print("Re-run with --apply to write changes to Supabase.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
