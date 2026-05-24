#!/usr/bin/env python3
"""
Reset human/auto verification: approved → pending.

Keeps AI quality-gate scores/flags and deleted rows unchanged.

  python scripts/reset_verified_questions.py
  python scripts/reset_verified_questions.py --execute
  python scripts/reset_verified_questions.py --execute --clear-run-state
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

_BASE = Path(__file__).resolve().parent.parent
if str(_BASE) not in sys.path:
    sys.path.insert(0, str(_BASE))

STATE_PATH = _BASE / "quality_gate" / "run_state.json"


def _clear_run_state() -> None:
    payload = {
        "job_id": "",
        "running": False,
        "last_update": datetime.now(timezone.utc).isoformat(),
        "stats": {
            "processed": 0,
            "errors": 0,
            "auto_approved": 0,
            "pending_operator": 0,
            "skipped_deleted": 0,
            "calibration_gold": 0,
            "graph_candidates": 0,
            "graph_missing_expected": 0,
            "batch_api_jobs": 0,
            "diagrams_inserted": 0,
            "diagram_errors": 0,
        },
        "last_error": None,
        "log_tail": [],
        "verification_reset": True,
    }
    STATE_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Cleared {STATE_PATH}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Reset approved questions to pending for re-review.")
    parser.add_argument("--execute", action="store_true", help="Apply DB update (default is dry-run)")
    parser.add_argument(
        "--clear-run-state",
        action="store_true",
        help="Reset quality_gate/run_state.json auto_approved counters",
    )
    ns = parser.parse_args(argv)

    from quality_gate.runner import init_env
    from quality_gate.supabase_io import count_approved_questions, get_supabase, reset_approved_to_pending

    init_env()
    client = get_supabase()
    n = count_approved_questions(client)
    print(f"Approved rows (status=approved): {n}")

    if not ns.execute:
        print("Dry-run only. Re-run with --execute to set status=pending on these rows.")
        if ns.clear_run_state:
            print("(Run state not cleared in dry-run.)")
        return 0

    updated = reset_approved_to_pending(client)
    remaining = count_approved_questions(client)
    print(f"Reset {updated} row(s) to pending. Remaining approved: {remaining}")

    if ns.clear_run_state:
        _clear_run_state()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
