"""Run past paper conversion with progress file updates for the review UI."""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import os
import sys
import threading
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict

from .export_questions import download_image, export_jobs, sha256_bytes
from .runner import process_single_job

STATUS_FILE = Path(__file__).resolve().parent / ".conversion_status.json"


def write_status(payload: Dict[str, Any]) -> None:
    STATUS_FILE.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def is_quota_or_credit_error(exc: Exception) -> bool:
    message = str(exc).lower()
    return any(
        marker in message
        for marker in (
            "429",
            "resource_exhausted",
            "resource exhausted",
            "quota",
            "rate limit",
            "billing",
            "credit",
        )
    )


def is_transient_network_error(exc: Exception) -> bool:
    """Return True for failures that should pause and retry, not skip a question."""
    message = f"{exc.__class__.__name__}: {exc}".lower()
    # Empty HTTP bodies from Supabase Storage are wrapped as JSONDecodeError.
    # Real model JSON problems look like "Expecting ',' delimiter" and must NOT
    # pause the whole batch as a network outage.
    empty_json_body = (
        "jsondecodeerror" in message
        and "expecting value: line 1 column 1 (char 0)" in message
    )
    return empty_json_body or any(
        marker in message
        for marker in (
            "connecterror",
            "connectionerror",
            "connecttimeout",
            "readtimeout",
            "writetimeout",
            "pooltimeout",
            "remoteprotocolerror",
            "getaddrinfo failed",
            "temporary failure in name resolution",
            "server disconnected",
            "connection reset",
            "connection aborted",
            "connection refused",
            "timed out",
            "timeout",
            "502 bad gateway",
            "503 service unavailable",
            "504 gateway timeout",
        )
    )


def hydrate_image(job) -> None:
    if job.image_bytes is not None:
        return
    if not job.question_image_url:
        return
    job.image_bytes = download_image(job.question_image_url)
    job.image_hash = sha256_bytes(job.image_bytes)


class QuotaPause:
    """Coordinate one quota pause across every worker in this process."""

    def __init__(self, wait_seconds: int, status: Dict[str, Any], status_lock: threading.Lock):
        self.wait_seconds = max(60, wait_seconds)
        self.status = status
        self.status_lock = status_lock
        self._lock = threading.Lock()
        self._pause_until = 0.0

    def wait_if_needed(self) -> None:
        while True:
            with self._lock:
                remaining = self._pause_until - time.time()
            if remaining <= 0:
                with self.status_lock:
                    if self.status.get("status") == "paused_quota":
                        self.status["status"] = "running"
                        self.status.pop("nextRetryAt", None)
                        write_status(self.status)
                return
            time.sleep(min(60, remaining))

    def trigger(self, question_id: int, exc: Exception) -> None:
        with self._lock:
            self._pause_until = max(self._pause_until, time.time() + self.wait_seconds)
            retry_at = datetime.fromtimestamp(self._pause_until, timezone.utc)
        with self.status_lock:
            self.status["status"] = "paused_quota"
            self.status["message"] = (
                f"Vertex quota/credit pause at question {question_id}; "
                f"all workers retry at {retry_at.isoformat()}"
            )
            self.status["lastError"] = str(exc)
            self.status["nextRetryAt"] = retry_at.isoformat()
            write_status(self.status)
        print(self.status["message"], file=sys.stderr)


class NetworkPause:
    """Coordinate a short connectivity pause across every worker."""

    def __init__(self, wait_seconds: int, status: Dict[str, Any], status_lock: threading.Lock):
        self.wait_seconds = max(10, wait_seconds)
        self.status = status
        self.status_lock = status_lock
        self._lock = threading.Lock()
        self._pause_until = 0.0

    def wait_if_needed(self) -> None:
        while True:
            with self._lock:
                remaining = self._pause_until - time.time()
            if remaining <= 0:
                with self.status_lock:
                    if self.status.get("status") == "paused_network":
                        self.status["status"] = "running"
                        self.status["message"] = "Connectivity retry in progress"
                        self.status.pop("nextRetryAt", None)
                        write_status(self.status)
                return
            time.sleep(min(30, remaining))

    def trigger(self, question_id: int, exc: Exception) -> None:
        with self._lock:
            self._pause_until = max(self._pause_until, time.time() + self.wait_seconds)
            retry_at = datetime.fromtimestamp(self._pause_until, timezone.utc)
        with self.status_lock:
            self.status["status"] = "paused_network"
            self.status["message"] = (
                f"Temporary network pause at question {question_id}; "
                f"all workers retry at {retry_at.isoformat()}"
            )
            self.status["lastError"] = str(exc)
            self.status["nextRetryAt"] = retry_at.isoformat()
            write_status(self.status)
        print(self.status["message"], file=sys.stderr, flush=True)


def process_job(
    job,
    *,
    dry_run: bool,
    quota_pause: QuotaPause,
    network_pause: NetworkPause,
) -> Dict[str, Any]:
    while True:
        quota_pause.wait_if_needed()
        network_pause.wait_if_needed()
        try:
            hydrate_image(job)
            return process_single_job(job, dry_run=dry_run, force=False)
        except Exception as exc:
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


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Past paper conversion with progress tracking")
    scope = parser.add_mutually_exclusive_group(required=True)
    scope.add_argument("--paper-id", type=int)
    scope.add_argument("--all", action="store_true", help="Process every past-paper question")
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--quota-wait-seconds",
        type=int,
        default=int(os.environ.get("PAST_PAPER_QUOTA_WAIT_S", "900")),
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=int(os.environ.get("PAST_PAPER_WORKERS", "1")),
        help="Parallel conversion workers; start with 2 to limit Vertex timeouts",
    )
    parser.add_argument(
        "--network-wait-seconds",
        type=int,
        default=int(os.environ.get("PAST_PAPER_NETWORK_WAIT_S", "60")),
        help="Shared retry delay after a temporary DNS/network failure",
    )
    args = parser.parse_args(argv)
    args.workers = max(1, min(8, args.workers))

    jobs = export_jobs(
        paper_id=args.paper_id if not args.all else None,
        limit=args.limit,
        download=False,
    )
    total = len(jobs)

    status: Dict[str, Any] = {
        "status": "running",
        "total": total,
        "completed": 0,
        "successful": 0,
        "failed": 0,
        "message": f"Processing {total} question(s)...",
        "paperId": args.paper_id,
        "scope": "all" if args.all else "paper",
        "deduplication": "question_id + SHA-256 source image hash",
        "workers": args.workers,
        "failedQuestionIds": [],
        "diagramReviewQuestionIds": [],
    }
    write_status(status)

    if total == 0:
        status["status"] = "completed"
        status["message"] = "No questions to process"
        write_status(status)
        print(json.dumps({"results": []}))
        return 0

    results = []
    status_lock = threading.Lock()
    quota_pause = QuotaPause(args.quota_wait_seconds, status, status_lock)
    network_pause = NetworkPause(args.network_wait_seconds, status, status_lock)
    consecutive_failures = 0
    failure_spike_limit = max(
        8,
        int(os.environ.get("PAST_PAPER_FAILURE_SPIKE_LIMIT", "12")),
    )
    stop_requested = False
    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as executor:
            futures = {
                executor.submit(
                    process_job,
                    job,
                    dry_run=args.dry_run,
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
                results.append(result)

                with status_lock:
                    # Honour an external pause (studio / manual status edit).
                    if STATUS_FILE.is_file():
                        try:
                            disk = json.loads(STATUS_FILE.read_text(encoding="utf-8"))
                            if str(disk.get("status") or "").startswith("paused"):
                                status["status"] = disk.get("status") or "paused"
                                status["message"] = disk.get("message") or "Paused externally"
                                status["lastError"] = disk.get("lastError") or status.get("lastError")
                                write_status(status)
                                stop_requested = True
                        except Exception:
                            pass

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
                            f"Paused after {consecutive_failures} consecutive failures "
                            f"(last question {job.question_id}). "
                            "Fix the extractor / requeue before resuming."
                        )
                        status["failureSpikeLimit"] = failure_spike_limit
                        write_status(status)
                        stop_requested = True
                    elif not str(status.get("status") or "").startswith("paused"):
                        status["message"] = (
                            f"Processed {status['completed']}/{total}; "
                            f"{args.workers} workers active"
                        )
                        write_status(status)

                if stop_requested:
                    for pending in futures:
                        pending.cancel()
                    break

        if stop_requested and str(status.get("status") or "").startswith("paused"):
            print(status["message"], file=sys.stderr, flush=True)
            write_status(status)
            return 2

        status["status"] = "completed"
        status["message"] = f"Done: {status['successful']} ok, {status['failed']} failed"
        write_status(status)
    except KeyboardInterrupt:
        status["status"] = "stopped"
        status["message"] = "Stopped safely; rerun resumes without duplicate conversions"
        write_status(status)
        return 130
    except Exception as exc:
        status["status"] = "error"
        status["message"] = f"Batch aborted: {exc}"
        status["error"] = str(exc)
        write_status(status)
        raise
    finally:
        if status.get("status") == "running":
            status["status"] = "error"
            status["message"] = "Batch stopped unexpectedly (process killed or crashed)"
            write_status(status)

    print(json.dumps({"results": results}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
