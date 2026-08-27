"""Force-retry failed conversions until they approve (or attempts exhausted)."""

from __future__ import annotations

import json
import sys
import time
from typing import Any, Dict, List

from .db import make_client
from .export_questions import export_jobs
from .resume_remaining import failed_question_ids
from .run_with_progress import hydrate_image, write_status
from .runner import process_single_job


def retry_until_success(
    question_ids: List[int] | None = None,
    *,
    max_attempts: int = 8,
    pause_s: float = 2.0,
) -> Dict[str, Any]:
    ids = list(question_ids) if question_ids is not None else failed_question_ids()
    remaining = list(ids)
    history: Dict[str, List[str]] = {str(qid): [] for qid in ids}
    attempt = 0

    write_status(
        {
            "status": "running",
            "phase": "retry_until_success",
            "total": len(ids),
            "remaining": len(remaining),
            "message": f"Retrying {len(remaining)} failed question(s) until success",
            "failedQuestionIds": remaining,
        }
    )

    while remaining and attempt < max_attempts:
        attempt += 1
        print(f"\n=== attempt {attempt}/{max_attempts}: {remaining} ===", flush=True)
        still: List[int] = []
        for qid in remaining:
            jobs = export_jobs(question_id=qid, download=False)
            if not jobs:
                history[str(qid)].append("missing_job")
                still.append(qid)
                continue
            job = jobs[0]
            try:
                hydrate_image(job)
                result = process_single_job(job, dry_run=False, force=True)
            except Exception as exc:
                result = {
                    "question_id": qid,
                    "status": "failed",
                    "report": {"pipeline_error": str(exc)},
                }
            status = result.get("status") or "failed"
            report = result.get("report") or {}
            flags = [
                key
                for key in (
                    "missing_options",
                    "answer_letter_missing",
                    "katex_errors",
                    "graphical_options_incomplete",
                    "diagram_crop_failed",
                    "pipeline_error",
                )
                if report.get(key)
            ]
            detail = status if status == "auto_approved" else f"{status}:{','.join(flags) or 'unknown'}"
            history[str(qid)].append(detail)
            print(f"  q{qid} -> {detail}", flush=True)
            if status != "auto_approved":
                still.append(qid)
            write_status(
                {
                    "status": "running",
                    "phase": "retry_until_success",
                    "attempt": attempt,
                    "total": len(ids),
                    "remaining": len(still) + len(remaining) - remaining.index(qid) - 1,
                    "message": f"attempt {attempt}: q{qid} -> {detail}",
                    "failedQuestionIds": still,
                    "history": history,
                }
            )
        remaining = still
        if remaining and attempt < max_attempts:
            time.sleep(pause_s)

    # Confirm live failed set among original ids
    client = make_client()
    live_failed = []
    for qid in ids:
        rows = (
            client.table("question_conversions")
            .select("status")
            .eq("question_id", qid)
            .eq("status", "failed")
            .limit(1)
            .execute()
            .data
            or []
        )
        if rows:
            live_failed.append(qid)

    payload = {
        "status": "completed" if not live_failed else "incomplete",
        "phase": "retry_until_success",
        "attempts": attempt,
        "originalIds": ids,
        "stillFailed": live_failed,
        "history": history,
        "message": (
            "All recovered"
            if not live_failed
            else f"Still failed after {attempt} attempts: {live_failed}"
        ),
    }
    write_status(payload)
    return payload


def main(argv: list[str] | None = None) -> int:
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--question-id", type=int, action="append", default=None)
    parser.add_argument("--max-attempts", type=int, default=8)
    args = parser.parse_args(argv)
    result = retry_until_success(args.question_id, max_attempts=args.max_attempts)
    print(json.dumps(result, indent=2))
    return 0 if result.get("status") == "completed" else 2


if __name__ == "__main__":
    raise SystemExit(main())
