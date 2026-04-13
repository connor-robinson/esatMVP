#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Update ai_generated_questions.correct_option for recent rows using
correct_option_reconcile (distractor_map + solution text).

Usage:
  python reconcile_recent_db_correct_options.py           # default: last 21 days
  python reconcile_recent_db_correct_options.py --days 7
  python reconcile_recent_db_correct_options.py --dry-run
"""

from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from dotenv import load_dotenv

# UTF-8 on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except AttributeError:
        pass


def main() -> int:
    parser = argparse.ArgumentParser(description="Reconcile correct_option for recent DB questions")
    parser.add_argument("--days", type=int, default=21, help="Include rows created in the last N days")
    parser.add_argument("--dry-run", action="store_true", help="Print changes only, do not update")
    args = parser.parse_args()

    root = Path(__file__).resolve().parent
    load_dotenv(root / ".env.local")

    url = (os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or "").strip()
    key = (os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or "").strip()
    if not url or not key:
        print("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (.env.local)", file=sys.stderr)
        return 1

    from supabase import create_client

    from correct_option_reconcile import reconcile_correct_option

    client = create_client(url, key)
    since = (datetime.now(timezone.utc) - timedelta(days=max(1, args.days))).isoformat()

    cols = (
        "id, generation_id, run_id, created_at, correct_option, options, "
        "distractor_map, solution_reasoning"
    )

    rows: list = []
    page = 0
    page_size = 1000
    while True:
        start = page * page_size
        end = start + page_size - 1
        q = (
            client.table("ai_generated_questions")
            .select(cols)
            .gte("created_at", since)
            .order("created_at", desc=True)
        )
        r = q.range(start, end).execute()
        batch = r.data or []
        rows.extend(batch)
        if len(batch) < page_size:
            break
        page += 1

    print(f"Loaded {len(rows)} row(s) with created_at >= {since[:10]} (last {args.days} days)")

    updates: list[tuple[str, str, str, str | None]] = []
    for row in rows:
        rid = row.get("id")
        if not rid:
            continue
        old = (row.get("correct_option") or "").strip().upper()[:1] or ""
        opts = row.get("options")
        if not isinstance(opts, dict):
            opts = {}
        dm = row.get("distractor_map")
        if not isinstance(dm, dict):
            dm = {}
        reasoning = row.get("solution_reasoning")
        sol = {"reasoning": reasoning if isinstance(reasoning, str) else ""}

        question = {"correct_option": old or row.get("correct_option"), "options": opts}
        new_letter, reason = reconcile_correct_option(question, dm, sol)
        if not new_letter or new_letter not in "ABCDEFGH":
            continue
        if new_letter == old:
            continue
        updates.append((str(rid), old or "?", new_letter, reason))

    if not updates:
        print("No rows need correct_option changes.")
        return 0

    print(f"Planned updates: {len(updates)}")
    for rid, o, n, reason in updates[:50]:
        print(f"  {rid[:8]}…  {o} -> {n}  ({reason})")
    if len(updates) > 50:
        print(f"  … and {len(updates) - 50} more")

    if args.dry_run:
        print("Dry run — no database writes.")
        return 0

    now_iso = datetime.now(timezone.utc).isoformat()
    ok = 0
    err = 0
    for rid, _o, new_letter, _reason in updates:
        try:
            client.table("ai_generated_questions").update(
                {"correct_option": new_letter, "updated_at": now_iso}
            ).eq("id", rid).execute()
            ok += 1
        except Exception as e:
            print(f"ERROR updating {rid}: {e}", file=sys.stderr)
            err += 1

    print(f"Updated {ok} row(s); {err} error(s).")
    return 0 if err == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
