#!/usr/bin/env python3
"""
Full quality-gate reset: clear all assessments, verdicts, and run metadata.

Non-deleted rows lose every quality_gate_* field. Approved rows become pending.
Deleted rows are untouched.

  python scripts/reset_all_quality_gate.py
  python scripts/reset_all_quality_gate.py --execute --clear-run-state
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
            "answer_key_fixed": 0,
        },
        "last_error": None,
        "log_tail": [],
        "full_reset": True,
    }
    STATE_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Cleared {STATE_PATH}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Clear all quality gate data from Supabase.")
    parser.add_argument("--execute", action="store_true", help="Apply (default is dry-run)")
    parser.add_argument("--clear-run-state", action="store_true", help="Reset run_state.json")
    ns = parser.parse_args(argv)

    from quality_gate.runner import init_env
    from quality_gate.supabase_io import (
        clear_all_quality_gate_assessments,
        count_assessed_questions,
        count_approved_questions,
        get_supabase,
    )

    init_env()
    client = get_supabase()
    assessed = count_assessed_questions(client)
    approved = count_approved_questions(client)
    print(f"Assessed rows (quality_gate_assessed_at set): {assessed}")
    print(f"Approved rows: {approved}")

    if not ns.execute:
        print("Dry-run only. Re-run with --execute to wipe quality gate fields.")
        return 0

    stats = clear_all_quality_gate_assessments(client, reset_status_to_pending=True)
    print("Done:", stats)
    print(f"Remaining assessed: {count_assessed_questions(client)}")
    print(f"Remaining approved: {count_approved_questions(client)}")

    if ns.clear_run_state:
        _clear_run_state()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
