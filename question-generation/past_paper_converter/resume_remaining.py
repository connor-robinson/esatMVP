"""Resume conversion: failed questions first, then remaining image questions."""

from __future__ import annotations

import concurrent.futures
import json
import sys
import threading
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set

from .db import make_client
from .export_questions import export_jobs
from .run_with_progress import (
    STATUS_FILE,
    NetworkPause,
    QuotaPause,
    write_status,
)
from .runner import process_single_job

PAGE_SIZE = 1000


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _paginate(build_query) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    offset = 0
    while True:
        page = build_query().range(offset, offset + PAGE_SIZE - 1).execute().data or []
        rows.extend(page)
        if len(page) < PAGE_SIZE:
            return rows
        offset += PAGE_SIZE


def failed_question_ids() -> List[int]:
    client = make_client()
    rows = _paginate(
        lambda: client.table("question_conversions")
        .select("question_id")
        .eq("status", "failed")
    )
    return sorted({int(row["question_id"]) for row in rows})


def never_converted_question_ids() -> List[int]:
    client = make_client()
    img_ids = {
        int(row["id"])
        for row in (
            client.table("questions")
            .select("id")
            .eq("content_format", "image")
            .execute()
            .data
            or []
        )
    }
    approved: Set[int] = set()
    offset = 0
    while True:
        page = (
            client.table("question_conversions")
            .select("question_id")
            .eq("status", "auto_approved")
            .range(offset, offset + PAGE_SIZE - 1)
            .execute()
            .data
            or []
        )
        approved.update(int(row["question_id"]) for row in page)
        if len(page) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
    return sorted(img_ids - approved)


def _process_job_force(job, *, quota_pause, network_pause):
    """Like run_with_progress.process_job but always re-runs extraction."""
    while True:
        quota_pause.wait_if_needed()
        network_pause.wait_if_needed()
        try:
            from .run_with_progress import hydrate_image

            hydrate_image(job)
            return process_single_job(job, dry_run=False, force=True)
        except Exception as exc:
            from .run_with_progress import is_quota_or_credit_error, is_transient_network_error
            import traceback

            if is_quota_or_credit_error(exc):
                quota_pause.trigger(job.question_id, exc)
                continue
            if is_transient_network_error(exc):
                network_pause.trigger(job.question_id, exc)
                continue
            err = str(exc) or exc.__class__.__name__
            print(f"ERROR question {job.question_id}: {err}", file=sys.stderr, flush=True)
            traceback.print_exc()
            return {
                "question_id": job.question_id,
                "status": "failed",
                "report": {"pipeline_error": err},
            }


def run_question_ids(
    question_ids: List[int],
    *,
    workers: int = 2,
    phase: str = "batch",
    failure_spike_limit: int = 20,
) -> Dict[str, Any]:
    jobs = []
    for qid in question_ids:
        jobs.extend(export_jobs(question_id=qid, download=False))

    total = len(jobs)
    status: Dict[str, Any] = {
        "status": "running",
        "phase": phase,
        "total": total,
        "completed": 0,
        "successful": 0,
        "failed": 0,
        "message": f"{phase}: processing {total} question(s)...",
        "workers": workers,
        "failedQuestionIds": [],
        "diagramReviewQuestionIds": [],
        "startedAt": _now_iso(),
    }
    write_status(status)

    if total == 0:
        status["status"] = "completed"
        status["message"] = f"{phase}: nothing to do"
        status["finishedAt"] = _now_iso()
        write_status(status)
        return status

    status_lock = threading.Lock()
    quota_pause = QuotaPause(900, status, status_lock)
    network_pause = NetworkPause(60, status, status_lock)
    consecutive_failures = 0
    stop_requested = False

    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as executor:
        futures = {
            executor.submit(
                _process_job_force,
                job,
                quota_pause=quota_pause,
                network_pause=network_pause,
            ): job
            for job in jobs
        }
        for future in concurrent.futures.as_completed(futures):
            if stop_requested:
                break
            job = futures[future]
            result = future.result()
            with status_lock:
                status["completed"] += 1
                status["lastQuestionId"] = job.question_id
                status["remaining"] = total - status["completed"]
                st = result.get("status", "")
                if st in ("auto_approved", "skipped_cached"):
                    status["successful"] += 1
                    consecutive_failures = 0
                elif st == "failed":
                    status["failed"] += 1
                    status["failedQuestionIds"].append(job.question_id)
                    consecutive_failures += 1
                    report = result.get("report") or {}
                    if report.get("pipeline_error"):
                        status["lastError"] = str(report.get("pipeline_error"))
                    elif report.get("missing_options"):
                        status["lastError"] = (
                            f"missing_options ({report.get('option_count')}/"
                            f"{report.get('expected_count')})"
                        )
                report = result.get("report") or {}
                if report.get("diagram_review_status") == "needs_review":
                    status["diagramReviewQuestionIds"].append(job.question_id)
                if consecutive_failures >= failure_spike_limit:
                    status["status"] = "paused_failure_spike"
                    status["message"] = (
                        f"{phase}: paused after {consecutive_failures} consecutive "
                        f"failures (last question {job.question_id})"
                    )
                    write_status(status)
                    stop_requested = True
                else:
                    status["message"] = (
                        f"{phase}: {status['completed']}/{total}; "
                        f"{status['successful']} ok, {status['failed']} failed"
                    )
                    write_status(status)
                print(
                    f"[{phase} {status['completed']}/{total}] q{job.question_id} -> {st}",
                    flush=True,
                )
            if stop_requested:
                for pending in futures:
                    pending.cancel()
                break

    if stop_requested:
        status["finishedAt"] = _now_iso()
        write_status(status)
        return status

    status["status"] = "completed"
    status["message"] = (
        f"{phase}: done {status['successful']} ok, {status['failed']} failed"
    )
    status["finishedAt"] = _now_iso()
    write_status(status)
    return status


def resume_remaining(*, workers: int = 2) -> Dict[str, Any]:
    """Process failed conversions first, then remaining image questions."""
    failed = failed_question_ids()
    remaining = [qid for qid in never_converted_question_ids() if qid not in set(failed)]

    summary: Dict[str, Any] = {
        "startedAt": _now_iso(),
        "failedPhase": None,
        "remainingPhase": None,
    }

    print(f"Phase 1: {len(failed)} failed question(s)", flush=True)
    failed_result = run_question_ids(failed, workers=workers, phase="failed")
    summary["failedPhase"] = failed_result
    if failed_result.get("status") == "paused_failure_spike":
        summary["status"] = "paused_failure_spike"
        summary["finishedAt"] = _now_iso()
        return summary

    # Recompute remaining after failures may have been fixed.
    still_failed = set(failed_question_ids())
    remaining = [
        qid for qid in never_converted_question_ids() if qid not in still_failed
    ]
    print(f"Phase 2: {len(remaining)} remaining image question(s)", flush=True)
    remaining_result = run_question_ids(remaining, workers=workers, phase="remaining")
    summary["remainingPhase"] = remaining_result
    summary["status"] = remaining_result.get("status", "completed")
    summary["finishedAt"] = _now_iso()
    return summary
