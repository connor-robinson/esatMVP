"""Repeatedly repair an explicit, non-overlapping list of question IDs."""

from __future__ import annotations

import argparse
import json
import time

from .export_questions import export_jobs
from .run_with_progress import is_quota_or_credit_error, is_transient_network_error
from .runner import process_single_job


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--ids", required=True, help="Comma-separated question IDs")
    parser.add_argument("--max-attempts", type=int, default=6)
    parser.add_argument("--network-wait", type=int, default=30)
    parser.add_argument("--quota-wait", type=int, default=900)
    args = parser.parse_args()

    failed = []
    for question_id in [int(value) for value in args.ids.split(",") if value.strip()]:
        succeeded = False
        for attempt in range(1, args.max_attempts + 1):
            try:
                jobs = export_jobs(question_id=question_id, download=True)
                if not jobs or jobs[0].image_bytes is None:
                    raise ConnectionError("question image download failed")
                result = process_single_job(jobs[0], force=True)
                print(json.dumps({"attempt": attempt, **result}), flush=True)
                if result.get("status") == "auto_approved":
                    succeeded = True
                    break
                time.sleep(min(60, attempt * 10))
            except Exception as exc:
                print(
                    json.dumps(
                        {"question_id": question_id, "attempt": attempt, "error": str(exc)}
                    ),
                    flush=True,
                )
                if is_quota_or_credit_error(exc):
                    time.sleep(args.quota_wait)
                elif is_transient_network_error(exc):
                    time.sleep(args.network_wait)
                else:
                    time.sleep(min(60, attempt * 10))
        if not succeeded:
            failed.append(question_id)

    print(json.dumps({"repair_complete": not failed, "failed_ids": failed}), flush=True)
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
