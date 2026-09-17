"""Background regenerate queue for the Streamlit review app.

Regenerate diagram/question must not block the UI. Jobs run in daemon workers;
the reviewer is deferred to the end of the queue and can keep approving.
"""

from __future__ import annotations

import copy
import json
import os
import queue
import threading
import traceback
from pathlib import Path
from typing import Any

from visual_engine.generation import MAX_MANUAL_ATTEMPTS

_STATUS_PATH = Path(__file__).resolve().parent / "review_data" / "regen_queue_status.json"

# Keep modest: each job hits Vertex (designer +/- verifier). Halved to ease 429s.
DEFAULT_WORKERS = 2


def _worker_count() -> int:
    try:
        from visual_engine.llm import _load_env

        _load_env()
    except Exception:
        pass
    raw = (os.environ.get("REVIEW_REGEN_WORKERS") or str(DEFAULT_WORKERS)).strip()
    try:
        n = int(raw)
    except ValueError:
        n = DEFAULT_WORKERS
    return max(1, min(n, 8))


_job_q: queue.Queue[dict[str, Any]] = queue.Queue()
_jobs: dict[str, dict[str, Any]] = {}
_lock = threading.Lock()
_workers_started = 0
_worker_target = 0
_worker_threads: list[threading.Thread] = []


def _alive_workers() -> int:
    return sum(1 for t in _worker_threads if t.is_alive())


def _persist_status() -> None:
    try:
        _STATUS_PATH.parent.mkdir(parents=True, exist_ok=True)
        with _lock:
            payload = {
                "jobs": copy.deepcopy(_jobs),
                "queued": _job_q.qsize(),
                "workers": _alive_workers() or _worker_target,
            }
        _STATUS_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    except OSError:
        pass


def _set_job(qid: str, **fields: Any) -> None:
    with _lock:
        cur = dict(_jobs.get(qid) or {})
        cur.update(fields)
        cur["question_id"] = qid
        _jobs[qid] = cur
    _persist_status()


def job_statuses() -> dict[str, dict[str, Any]]:
    with _lock:
        return copy.deepcopy(_jobs)


def active_regen_qids() -> set[str]:
    with _lock:
        return {
            qid
            for qid, job in _jobs.items()
            if str(job.get("status") or "") in {"queued", "running"}
        }


def _worker_loop(worker_id: int) -> None:
    while True:
        job = _job_q.get()
        qid = str(job.get("question_id") or "")
        kind = str(job.get("kind") or "diagram")
        _set_job(qid, status="running", error="", kind=kind, worker=worker_id)
        try:
            from visual_engine.review_store import ReviewStore

            store = ReviewStore()
            if kind == "question":
                from visual_engine.nsaa_batch import regenerate_nsaa_question
                from visual_engine.question_designer import NSAA_DIAGRAM_MODEL

                regenerate_nsaa_question(
                    store,
                    job["item"],
                    feedback=str(job.get("feedback") or ""),
                    model=NSAA_DIAGRAM_MODEL,
                )
            else:
                # Lazy import avoids circular init with review_app helpers.
                from visual_engine.review_app import _regenerate_diagram_only

                err = _regenerate_diagram_only(
                    store,
                    job["item"],
                    feedback=str(job.get("feedback") or ""),
                    tags=list(job.get("tags") or []),
                )
                if err:
                    raise RuntimeError(err)
            _set_job(qid, status="done", error="")
        except Exception as exc:
            _set_job(
                qid,
                status="error",
                error=f"{type(exc).__name__}: {exc}",
                traceback=traceback.format_exc(),
            )
        finally:
            _job_q.task_done()
            _persist_status()


def ensure_workers() -> int:
    """Start the configured worker pool if needed. Returns live worker count."""
    global _workers_started, _worker_target
    with _lock:
        target = _worker_count()
        _worker_target = target
        # Drop dead threads so we can refill after a Streamlit reload/crash.
        alive = [t for t in _worker_threads if t.is_alive()]
        _worker_threads[:] = alive
        _workers_started = len(alive)
        while _workers_started < target:
            wid = _workers_started + 1
            thread = threading.Thread(
                target=_worker_loop,
                args=(wid,),
                name=f"review-regen-worker-{wid}",
                daemon=True,
            )
            thread.start()
            _worker_threads.append(thread)
            _workers_started += 1
    _persist_status()
    return _alive_workers() or _worker_target


def restart_workers() -> int:
    """Refill the pool to the configured size (safe if already running)."""
    return ensure_workers()


def _ensure_worker() -> None:
    ensure_workers()


def preflight_diagram_regen(item: dict[str, Any]) -> str | None:
    diagram = item.get("diagram") or {}
    attempt = int(diagram.get("attempt") or 1)
    if attempt >= MAX_MANUAL_ATTEMPTS:
        return "Hard cap reached (3 attempts). Reject instead."
    if not diagram.get("id"):
        return "No diagram attempt to regenerate."
    qid = str(item.get("question_id") or "")
    if qid in active_regen_qids():
        return "Already regenerating this item."
    return None


def preflight_question_regen(item: dict[str, Any], *, is_nsaa: bool) -> str | None:
    if not is_nsaa:
        return "Question regen is only for NSAA-sourced items."
    diagram = item.get("diagram") or {}
    attempt = int(diagram.get("attempt") or 1)
    if attempt >= MAX_MANUAL_ATTEMPTS:
        return "Hard cap reached (3 attempts). Reject instead."
    qid = str(item.get("question_id") or "")
    if qid in active_regen_qids():
        return "Already regenerating this item."
    return None


def enqueue_diagram_regen(
    item: dict[str, Any],
    *,
    feedback: str = "",
    tags: list[str] | None = None,
    session_id: str = "",
    session_label: str = "",
) -> str | None:
    """Queue diagram regen. Returns error string, or None if queued."""
    err = preflight_diagram_regen(item)
    if err:
        return err
    _ensure_worker()
    qid = str(item.get("question_id") or "")
    sid = str(session_id or "unknown").strip() or "unknown"
    label = str(session_label or sid).strip() or sid
    payload = {
        "kind": "diagram",
        "question_id": qid,
        "item": copy.deepcopy(item),
        "feedback": feedback,
        "tags": list(tags or []),
        "session_id": sid,
        "session_label": label,
    }
    _set_job(
        qid,
        status="queued",
        error="",
        kind="diagram",
        session_id=sid,
        session_label=label,
    )
    _job_q.put(payload)
    return None


def enqueue_question_regen(
    item: dict[str, Any],
    *,
    feedback: str = "",
    session_id: str = "",
    session_label: str = "",
) -> str | None:
    """Queue full question regen. Returns error string, or None if queued."""
    source = {}
    try:
        source = json.loads(item.get("source_json") or "{}")
    except json.JSONDecodeError:
        source = {}
    is_nsaa = str(source.get("pipeline") or "") == "nsaa"
    err = preflight_question_regen(item, is_nsaa=is_nsaa)
    if err:
        return err
    _ensure_worker()
    qid = str(item.get("question_id") or "")
    sid = str(session_id or "unknown").strip() or "unknown"
    label = str(session_label or sid).strip() or sid
    payload = {
        "kind": "question",
        "question_id": qid,
        "item": copy.deepcopy(item),
        "feedback": feedback,
        "tags": [],
        "session_id": sid,
        "session_label": label,
    }
    _set_job(
        qid,
        status="queued",
        error="",
        kind="question",
        session_id=sid,
        session_label=label,
    )
    _job_q.put(payload)
    return None


def summarize_jobs() -> str:
    snap = regen_snapshot()
    if not snap["has_activity"] and not snap["workers"]:
        return ""
    bits = [f"{snap['workers']} workers"] if snap["workers"] else []
    if snap["running"]:
        bits.append(f"running {snap['running']}")
    if snap["queued"]:
        bits.append(f"queued {snap['queued']}")
    if snap["failed"]:
        bits.append(f"failed {snap['failed']}")
    if snap["done_recent"]:
        bits.append(f"done {snap['done_recent']}")
    return ", ".join(bits)


def regen_snapshot() -> dict[str, Any]:
    """Totals + per-browser-session breakdown for the status panel."""
    configured = _worker_count()
    workers = _alive_workers() or _worker_target or configured
    jobs = job_statuses()
    running_jobs = [(q, j) for q, j in jobs.items() if j.get("status") == "running"]
    queued_jobs = [(q, j) for q, j in jobs.items() if j.get("status") == "queued"]
    error_jobs = [(q, j) for q, j in jobs.items() if j.get("status") == "error"]
    done_jobs = [(q, j) for q, j in jobs.items() if j.get("status") == "done"]

    by_session: dict[str, dict[str, Any]] = {}
    for qid, job in jobs.items():
        sid = str(job.get("session_id") or "unknown")
        label = str(job.get("session_label") or sid)
        bucket = by_session.setdefault(
            sid,
            {
                "session_id": sid,
                "label": label,
                "running": 0,
                "queued": 0,
                "failed": 0,
                "done": 0,
                "running_ids": [],
                "queued_ids": [],
            },
        )
        st = str(job.get("status") or "")
        if st == "running":
            bucket["running"] += 1
            bucket["running_ids"].append(qid)
        elif st == "queued":
            bucket["queued"] += 1
            bucket["queued_ids"].append(qid)
        elif st == "error":
            bucket["failed"] += 1
        elif st == "done":
            bucket["done"] += 1

    sessions = sorted(
        by_session.values(),
        key=lambda s: (-(s["running"] + s["queued"]), str(s["label"])),
    )
    active_total = len(running_jobs) + len(queued_jobs)
    return {
        "workers": workers,
        "workers_started": _workers_started,
        "running": len(running_jobs),
        "queued": len(queued_jobs),
        "failed": len(error_jobs),
        "done_recent": len(done_jobs),
        "active_total": active_total,
        "has_activity": bool(jobs) or workers > 0,
        "sessions": sessions,
        "running_ids": [q for q, _ in running_jobs],
        "queued_ids": [q for q, _ in queued_jobs],
        "errors": error_jobs[-5:],
    }
