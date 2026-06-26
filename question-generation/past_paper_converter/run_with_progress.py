"""Run past paper conversion with progress file updates for the review UI."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict

from .export_questions import export_jobs
from .runner import process_single_job

STATUS_FILE = Path(__file__).resolve().parent / ".conversion_status.json"


def write_status(payload: Dict[str, Any]) -> None:
    STATUS_FILE.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Past paper conversion with progress tracking")
    parser.add_argument("--paper-id", type=int, required=True)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(argv)

    jobs = export_jobs(paper_id=args.paper_id, limit=args.limit, download=True)
    total = len(jobs)

    status: Dict[str, Any] = {
        "status": "running",
        "total": total,
        "completed": 0,
        "successful": 0,
        "failed": 0,
        "message": f"Processing {total} question(s)...",
        "paperId": args.paper_id,
    }
    write_status(status)

    if total == 0:
        status["status"] = "completed"
        status["message"] = "No questions to process"
        write_status(status)
        print(json.dumps({"results": []}))
        return 0

    results = []
    for i, job in enumerate(jobs, start=1):
        status["message"] = f"Processing question {i}/{total} (id {job.question_id})..."
        write_status(status)

        result = process_single_job(job, dry_run=args.dry_run, force=False)
        results.append(result)

        status["completed"] = i
        st = result.get("status", "")
        if st in ("auto_approved", "skipped_cached"):
            status["successful"] += 1
        elif st == "failed":
            status["failed"] += 1
        write_status(status)

    status["status"] = "completed"
    status["message"] = f"Done: {status['successful']} ok, {status['failed']} failed"
    write_status(status)

    print(json.dumps({"results": results}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
