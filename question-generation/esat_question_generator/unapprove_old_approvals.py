"""
Revert status from approved -> pending for rows whose updated_at is before
start of yesterday (UTC). Keeps approvals touched on today or yesterday (UTC).

Dry-run by default; pass --execute to apply.

  python unapprove_old_approvals.py
  python unapprove_old_approvals.py --execute
"""
from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime, timedelta, timezone


def _cutoff_start_of_yesterday_utc() -> datetime:
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    return today_start - timedelta(days=1)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Apply updates (default is dry-run: count and sample only).",
    )
    args = parser.parse_args()

    # Ensure imports resolve from esat_question_generator/
    root = os.path.dirname(os.path.abspath(__file__))
    if root not in sys.path:
        sys.path.insert(0, root)

    from quality_gate.supabase_io import TABLE, get_supabase

    client = get_supabase()
    cutoff = _cutoff_start_of_yesterday_utc()
    cutoff_iso = cutoff.isoformat()

    count_resp = (
        client.table(TABLE)
        .select("id", count="exact", head=True)
        .eq("status", "approved")
        .lt("updated_at", cutoff_iso)
        .execute()
    )
    total = count_resp.count if getattr(count_resp, "count", None) is not None else 0

    print(f"Cutoff (UTC): updated_at < {cutoff_iso} (midnight at start of yesterday UTC).")
    print(f"Matching approved rows: {total}")

    sample = client.table(TABLE).select("id, updated_at").eq("status", "approved").lt("updated_at", cutoff_iso).limit(20).execute()
    for r in sample.data or []:
        print(f"  {r.get('id')}  updated_at={r.get('updated_at')}")

    if not args.execute:
        print("Dry-run only. Re-run with --execute to set status=pending on these rows.")
        return 0

    up = (
        client.table(TABLE)
        .update({"status": "pending", "updated_at": datetime.now(timezone.utc).isoformat()})
        .eq("status", "approved")
        .lt("updated_at", cutoff_iso)
    )
    up.execute()
    print("Update sent (all matching rows on server). Re-counting…")
    check = (
        client.table(TABLE)
        .select("id", count="exact", head=True)
        .eq("status", "approved")
        .lt("updated_at", cutoff_iso)
        .execute()
    )
    remaining = check.count if getattr(check, "count", None) is not None else -1
    print(f"Remaining approved rows still before cutoff (should be 0): {remaining}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
