"""Keep NSAA→ESAT generation running for a wall-clock duration.

One ``nsaa_esat_batch`` pass stops when diagram/text/far pools for that pass
are scheduled out. This wrapper restarts passes until ``--hours`` elapses so
far-reuse can continue overnight.

Example (8 hours, 4 workers)::

    python -m visual_engine.nsaa_esat_overnight --hours 8 --workers 4
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

_PKG_ROOT = Path(__file__).resolve().parent.parent
if str(_PKG_ROOT) not in sys.path:
    sys.path.insert(0, str(_PKG_ROOT))

from visual_engine.nsaa_esat_batch import STATUS_PATH, run_esat_batch
from visual_engine.question_designer import NSAA_DIAGRAM_MODEL

OVERNIGHT_STATUS_PATH = Path(__file__).resolve().parent / "review_data" / "nsaa_esat_overnight_status.json"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _write_overnight(payload: dict) -> None:
    OVERNIGHT_STATUS_PATH.parent.mkdir(parents=True, exist_ok=True)
    OVERNIGHT_STATUS_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    # Mirror a short pointer into the main batch status so the Streamlit panel
    # still shows something useful between rounds.
    try:
        if STATUS_PATH.is_file():
            data = json.loads(STATUS_PATH.read_text(encoding="utf-8"))
        else:
            data = {}
        if isinstance(data, dict):
            data["overnight"] = {
                "active": payload.get("status") == "running",
                "round": payload.get("round"),
                "hours": payload.get("hours"),
                "deadline_at": payload.get("deadline_at"),
                "rounds_completed": payload.get("rounds_completed"),
                "total_generated": payload.get("total_generated"),
            }
            if payload.get("status") == "running":
                data["status"] = "running"
            STATUS_PATH.write_text(json.dumps(data, indent=2), encoding="utf-8")
    except (OSError, json.JSONDecodeError, TypeError):
        pass


def run_overnight(*, hours: float, workers: int, model: str) -> dict:
    hours = max(0.1, float(hours))
    workers = max(1, min(int(workers), 8))
    started = time.time()
    deadline = started + hours * 3600.0
    deadline_iso = datetime.fromtimestamp(deadline, tz=timezone.utc).isoformat()
    round_n = 0
    total_generated = 0
    rounds: list[dict] = []

    state = {
        "status": "running",
        "pipeline": "nsaa_esat_overnight",
        "hours": hours,
        "workers": workers,
        "model": model,
        "started_at": _now(),
        "deadline_at": deadline_iso,
        "round": 0,
        "rounds_completed": 0,
        "total_generated": 0,
        "rounds": rounds,
        "note": (
            "Restarts full diagram→text→far passes until the deadline so generation "
            "does not stop when one pass exhausts its scheduled pools."
        ),
    }
    _write_overnight(state)
    print(
        f"[overnight] running until {deadline_iso} ({hours:g}h), workers={workers}",
        flush=True,
    )

    try:
        while time.time() < deadline:
            round_n += 1
            left_h = (deadline - time.time()) / 3600.0
            state["round"] = round_n
            state["status"] = "running"
            _write_overnight(state)
            print(
                f"[overnight] round {round_n} starting ({left_h:.2f}h left)",
                flush=True,
            )
            result = run_esat_batch(cycles=0, workers=workers, model=model)
            gen = int(((result or {}).get("generated") or {}).get("total") or 0)
            total_generated += gen
            rounds.append(
                {
                    "round": round_n,
                    "finished_at": _now(),
                    "generated": gen,
                    "status": (result or {}).get("status"),
                    "target_cycles": (result or {}).get("target_cycles"),
                }
            )
            state["rounds_completed"] = round_n
            state["total_generated"] = total_generated
            state["last_round"] = rounds[-1]
            _write_overnight(state)
            print(
                f"[overnight] round {round_n} done generated={gen} "
                f"cumulative={total_generated}",
                flush=True,
            )
            if time.time() >= deadline:
                break
            # Short pause so status files flush and APIs cool off between passes.
            time.sleep(20)
    except KeyboardInterrupt:
        state["status"] = "interrupted"
        state["finished_at"] = _now()
        _write_overnight(state)
        print("[overnight] interrupted", flush=True)
        return state

    state["status"] = "completed"
    state["finished_at"] = _now()
    state["elapsed_hours"] = (time.time() - started) / 3600.0
    _write_overnight(state)
    print(
        f"[overnight] finished rounds={round_n} total_generated={total_generated}",
        flush=True,
    )
    return state


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Loop NSAA ESAT batch generation until a wall-clock deadline."
    )
    parser.add_argument("--hours", type=float, default=8.0, help="Wall-clock hours to keep going")
    parser.add_argument("--workers", type=int, default=4, help="Concurrent generate workers")
    parser.add_argument("--model", default=NSAA_DIAGRAM_MODEL)
    args = parser.parse_args()
    run_overnight(hours=args.hours, workers=args.workers, model=args.model)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
