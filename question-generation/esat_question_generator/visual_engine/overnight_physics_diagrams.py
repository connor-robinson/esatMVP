"""Overnight Physics diagram pipeline.

1. Finish / continue magnetism diagram generation (target 20).
2. Generate 50 more Physics diagrams (any topic, diagrams-only).
3. Strict quality on the overnight cohort:
   - major (REJECT) → delete/reject
   - minor (soft flags) → regenerate once; if still not clean → delete
4. Top up until keepers >= --min-keep (default 40) or --hours elapses.

Usage (from question-generation/esat_question_generator):

  python -u -m visual_engine.overnight_physics_diagrams --hours 8 --min-keep 40
"""

from __future__ import annotations

import argparse
import json
import os
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from visual_engine.auto_checks import has_reject
from visual_engine.nsaa_batch import (
    NSAA_DIAGRAM_MODEL,
    regenerate_nsaa_question,
    run_batch,
)
from visual_engine.render_quality_acceptor import (
    DEFAULT_ACCEPTOR_MODEL,
    evaluate_review_item,
    is_diagram_visual_type,
    resolve_png_path,
)
from visual_engine.review_store import ReviewStore

STATUS_PATH = Path(__file__).resolve().parent / "review_data" / "overnight_physics_diagrams_status.json"
COHORT_PATH = Path(__file__).resolve().parent / "review_data" / "overnight_physics_diagrams_cohort.json"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _write_status(payload: dict[str, Any]) -> None:
    STATUS_PATH.parent.mkdir(parents=True, exist_ok=True)
    STATUS_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _load_cohort() -> dict[str, Any]:
    if COHORT_PATH.is_file():
        try:
            data = json.loads(COHORT_PATH.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                return data
        except (OSError, json.JSONDecodeError):
            pass
    return {
        "created_at": _now(),
        "question_ids": [],
        "magnetism_ids": [],
        "general_ids": [],
        "kept_ids": [],
        "rejected_ids": [],
        "regenerated_ids": [],
    }


def _save_cohort(cohort: dict[str, Any]) -> None:
    COHORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    COHORT_PATH.write_text(json.dumps(cohort, ensure_ascii=False, indent=2), encoding="utf-8")


def _visual_type(item: dict[str, Any]) -> str:
    try:
        source = json.loads(item.get("source_json") or "{}")
    except json.JSONDecodeError:
        source = {}
    if isinstance(source, dict):
        return str(source.get("visual_type") or item.get("topic") or "").strip().lower()
    return str(item.get("topic") or "").strip().lower()


def _soft_flags(result: Any) -> list[dict[str, str]]:
    flags = list(getattr(result, "auto_flags", None) or [])
    return [f for f in flags if str(f.get("severity") or "") != "reject"]


def _is_major(result: Any) -> bool:
    return str(getattr(result, "decision", "")).upper() == "REJECT" or has_reject(
        list(getattr(result, "auto_flags", None) or [])
    )


def _is_minor(result: Any) -> bool:
    if _is_major(result):
        return False
    return bool(_soft_flags(result)) or str(getattr(result, "decision", "")).upper() != "ACCEPT"


def _feedback_from_result(result: Any, *, prefix: str) -> str:
    reasons = ", ".join(result.reject_reasons) if result.reject_reasons else ""
    issues = "; ".join((result.issues or [])[:5])
    soft = "; ".join(
        str(f.get("message") or f.get("code") or "") for f in _soft_flags(result)[:5]
    )
    parts = [prefix]
    if reasons:
        parts.append(reasons)
    if result.summary:
        parts.append(str(result.summary).strip())
    if issues:
        parts.append(issues)
    if soft:
        parts.append(f"soft: {soft}")
    return " | ".join(p for p in parts if p)[:1800]


def _reject_item(store: ReviewStore, item: dict[str, Any], feedback: str) -> None:
    qid = str(item.get("question_id") or "")
    store.set_question_status(qid, "rejected", feedback=feedback)
    diagram = item.get("diagram") or {}
    attempt_id = diagram.get("id") if isinstance(diagram, dict) else None
    if attempt_id:
        store.set_diagram_status(int(attempt_id), "rejected", feedback=feedback)


def _eval_item(item: dict[str, Any], *, model: str, aggressive: bool) -> Any:
    diagram = item.get("diagram") or {}
    if isinstance(diagram, dict):
        resolved = resolve_png_path(
            diagram.get("image_path"),
            question_id=str(item.get("question_id") or ""),
        )
        if resolved is not None:
            item = {**item, "diagram": {**diagram, "image_path": str(resolved)}}
    return evaluate_review_item(
        item,
        model=model,
        thinking_level="high",
        aggressive=aggressive,
    )


def _collect_physics_diagram_ids(store: ReviewStore) -> set[str]:
    out: set[str] = set()
    for item in store.list_items(status_filter="pending", latest_only=True):
        if str(item.get("subject") or "") != "Physics":
            continue
        if not is_diagram_visual_type(_visual_type(item)):
            continue
        qid = str(item.get("question_id") or "")
        if qid:
            out.add(qid)
    return out


def _run_magnetism(n: int, model: str) -> dict[str, Any]:
    print(f"\n=== PHASE magnetism diagrams (target {n}) ===", flush=True)
    from visual_engine.generate_physics_magnetism_diagrams import main as mag_main
    import sys

    argv = sys.argv
    try:
        sys.argv = [
            "generate_physics_magnetism_diagrams",
            "--n",
            str(n),
            "--per-source",
            "2",
            "--model",
            model,
        ]
        code = mag_main()
    finally:
        sys.argv = argv
    return {"status": "ok" if code == 0 else "failed", "exit_code": code}


def _run_general_physics(n: int, model: str) -> dict[str, Any]:
    print(f"\n=== PHASE general Physics diagrams (target {n}) ===", flush=True)
    return run_batch(
        n=n,
        subject="physics",
        diagrams_only=True,
        model=model,
        review_label="Physics",
        force=False,
    )


def _qa_cohort(
    store: ReviewStore,
    cohort: dict[str, Any],
    *,
    acceptor_model: str,
    designer_model: str,
) -> dict[str, Any]:
    print("\n=== PHASE strict quality ===", flush=True)
    ids = list(dict.fromkeys(cohort.get("question_ids") or []))
    kept: list[str] = list(cohort.get("kept_ids") or [])
    rejected: list[str] = list(cohort.get("rejected_ids") or [])
    regenerated: list[str] = list(cohort.get("regenerated_ids") or [])

    pending_items = {
        str(i.get("question_id") or ""): i
        for i in store.list_items(status_filter="pending", latest_only=True)
        if str(i.get("subject") or "") == "Physics"
        and is_diagram_visual_type(_visual_type(i))
    }

    # Include any new Physics diagram pending rows created overnight.
    for qid in pending_items:
        if qid not in ids:
            ids.append(qid)

    stats = {
        "evaluated": 0,
        "kept": 0,
        "rejected_major": 0,
        "regenerated": 0,
        "rejected_after_regen": 0,
    }

    for idx, qid in enumerate(ids, start=1):
        if qid in kept or qid in rejected:
            continue
        item = pending_items.get(qid) or store.get_item(qid)
        if not item:
            continue
        if str(item.get("question_status") or "").lower() == "rejected":
            rejected.append(qid)
            continue
        if not is_diagram_visual_type(_visual_type(item)):
            continue

        stats["evaluated"] += 1
        print(f"[qa {idx}/{len(ids)}] {qid}", flush=True)
        try:
            first = _eval_item(item, model=acceptor_model, aggressive=False)
        except Exception as exc:
            print(f"  eval error → reject: {exc}", flush=True)
            _reject_item(store, item, f"[overnight_qa] evaluator_error | {exc}")
            rejected.append(qid)
            stats["rejected_major"] += 1
            continue

        if _is_major(first):
            fb = _feedback_from_result(first, prefix="[overnight_qa major]")
            print(f"  MAJOR → delete ({first.decision})", flush=True)
            _reject_item(store, item, fb)
            rejected.append(qid)
            stats["rejected_major"] += 1
            continue

        if _is_minor(first):
            fb = _feedback_from_result(first, prefix="[overnight_qa minor→regen]")
            print(f"  MINOR → regenerate once", flush=True)
            try:
                regenerate_nsaa_question(
                    store,
                    item,
                    feedback=fb,
                    model=designer_model,
                )
                regenerated.append(qid)
                stats["regenerated"] += 1
            except Exception as exc:
                print(f"  regen failed → delete: {exc}", flush=True)
                _reject_item(store, item, f"[overnight_qa regen_failed] {exc}")
                rejected.append(qid)
                stats["rejected_after_regen"] += 1
                continue

            refreshed = store.get_item(qid) or item
            try:
                second = _eval_item(refreshed, model=acceptor_model, aggressive=True)
            except Exception as exc:
                print(f"  re-eval error → delete: {exc}", flush=True)
                _reject_item(store, refreshed, f"[overnight_qa reeval_error] {exc}")
                rejected.append(qid)
                stats["rejected_after_regen"] += 1
                continue

            # After regen: any major OR remaining minor → delete.
            if _is_major(second) or _is_minor(second):
                fb2 = _feedback_from_result(second, prefix="[overnight_qa post-regen delete]")
                print(f"  still flawed → delete", flush=True)
                _reject_item(store, refreshed, fb2)
                rejected.append(qid)
                stats["rejected_after_regen"] += 1
                continue

            print("  clean after regen → keep", flush=True)
            kept.append(qid)
            stats["kept"] += 1
            continue

        print("  clean → keep", flush=True)
        kept.append(qid)
        stats["kept"] += 1

    cohort["question_ids"] = ids
    cohort["kept_ids"] = list(dict.fromkeys(kept))
    cohort["rejected_ids"] = list(dict.fromkeys(rejected))
    cohort["regenerated_ids"] = list(dict.fromkeys(regenerated))
    _save_cohort(cohort)
    stats["kept_total"] = len(cohort["kept_ids"])
    print(json.dumps(stats, indent=2), flush=True)
    return stats


def _wait_for_magnetism_process(*, poll_s: float = 30.0) -> None:
    """Block while another magnetism generator is writing the same review.db."""
    try:
        import psutil  # type: ignore
    except ImportError:
        psutil = None
    if psutil is None:
        print("psutil not installed; not waiting on magnetism process.", flush=True)
        return
    while True:
        hits = []
        for proc in psutil.process_iter(["pid", "cmdline"]):
            try:
                cmd = " ".join(proc.info.get("cmdline") or [])
            except (psutil.Error, TypeError):
                continue
            if "generate_physics_magnetism_diagrams" in cmd and str(proc.info.get("pid")) != str(
                os.getpid()
            ):
                hits.append(proc.info.get("pid"))
        if not hits:
            return
        print(f"Waiting for magnetism job pid={hits} …", flush=True)
        time.sleep(poll_s)


def run_overnight(
    *,
    hours: float,
    min_keep: int,
    magnetism_n: int,
    general_n: int,
    designer_model: str,
    acceptor_model: str,
    skip_magnetism: bool,
    wait_for_magnetism: bool,
) -> dict[str, Any]:
    started = time.time()
    deadline = started + max(0.1, hours) * 3600.0
    store = ReviewStore()
    cohort = _load_cohort()
    known: set[str] = set(cohort.get("question_ids") or [])

    state: dict[str, Any] = {
        "status": "running",
        "started_at": _now(),
        "deadline_at": datetime.fromtimestamp(deadline, tz=timezone.utc).isoformat(),
        "hours": hours,
        "min_keep": min_keep,
        "magnetism_n": magnetism_n,
        "general_n": general_n,
        "phase": "start",
        "kept": 0,
    }
    _write_status(state)

    def time_left() -> bool:
        return time.time() < deadline

    def _ingest_new(bucket: str) -> list[str]:
        after = _collect_physics_diagram_ids(store)
        new_ids = sorted(after - known)
        for qid in new_ids:
            known.add(qid)
            if qid not in cohort["question_ids"]:
                cohort["question_ids"].append(qid)
            if qid not in cohort.get(bucket, []):
                cohort.setdefault(bucket, []).append(qid)
        _save_cohort(cohort)
        print(f"Ingested {len(new_ids)} new Physics diagram ids into {bucket}", flush=True)
        return new_ids

    try:
        if wait_for_magnetism:
            state["phase"] = "wait_magnetism"
            _write_status(state)
            _wait_for_magnetism_process()
            _ingest_new("magnetism_ids")

        if not skip_magnetism and time_left():
            state["phase"] = "magnetism"
            _write_status(state)
            try:
                _run_magnetism(magnetism_n, designer_model)
            except Exception:
                traceback.print_exc()
            _ingest_new("magnetism_ids")
        else:
            _ingest_new("magnetism_ids")

        if time_left():
            state["phase"] = "general_physics"
            _write_status(state)
            try:
                summary = _run_general_physics(general_n, designer_model)
                state["general_summary"] = {
                    k: summary.get(k)
                    for k in ("generated", "skipped", "errors", "visual_type_counts", "status")
                }
            except Exception:
                traceback.print_exc()
            _ingest_new("general_ids")

        # First QA pass
        if time_left():
            state["phase"] = "quality"
            _write_status(state)
            qa = _qa_cohort(
                store,
                cohort,
                acceptor_model=acceptor_model,
                designer_model=designer_model,
            )
            state["qa"] = qa
            state["kept"] = qa.get("kept_total", 0)
            _write_status(state)

        # Top-up until min_keep
        topup_round = 0
        while time_left() and len(cohort.get("kept_ids") or []) < min_keep:
            topup_round += 1
            need = min_keep - len(cohort.get("kept_ids") or [])
            # Generate extra with attrition buffer (~2x)
            gen_n = max(10, min(40, need * 2))
            state["phase"] = f"topup_{topup_round}"
            state["kept"] = len(cohort.get("kept_ids") or [])
            _write_status(state)
            print(
                f"\n=== TOP-UP {topup_round}: need {need} more keepers → generate {gen_n} ===",
                flush=True,
            )
            try:
                _run_general_physics(gen_n, designer_model)
            except Exception:
                traceback.print_exc()
            _ingest_new("general_ids")
            qa = _qa_cohort(
                store,
                cohort,
                acceptor_model=acceptor_model,
                designer_model=designer_model,
            )
            state["qa"] = qa
            state["kept"] = qa.get("kept_total", 0)
            _write_status(state)
            if qa.get("evaluated", 0) == 0 and gen_n > 0:
                print("No new items to evaluate; stopping top-up.", flush=True)
                break

        kept_n = len(cohort.get("kept_ids") or [])
        state["status"] = "completed" if kept_n >= min_keep else "completed_short"
        state["finished_at"] = _now()
        state["kept"] = kept_n
        state["elapsed_hours"] = round((time.time() - started) / 3600.0, 3)
        state["cohort_path"] = str(COHORT_PATH)
        _write_status(state)
        print(json.dumps(state, indent=2), flush=True)
        print(
            f"\nDONE kept={kept_n} (min_keep={min_keep}). "
            f"Review pending keepers in Streamlit; rejected were deleted from queue.",
            flush=True,
        )
        return state
    except Exception as exc:
        state["status"] = "error"
        state["error"] = f"{type(exc).__name__}: {exc}"
        state["finished_at"] = _now()
        _write_status(state)
        raise


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--hours", type=float, default=8.0)
    parser.add_argument("--min-keep", type=int, default=40)
    parser.add_argument("--magnetism-n", type=int, default=20)
    parser.add_argument("--general-n", type=int, default=50)
    parser.add_argument("--skip-magnetism", action="store_true")
    parser.add_argument(
        "--wait-for-magnetism",
        action="store_true",
        help="Wait until any running generate_physics_magnetism_diagrams process exits.",
    )
    parser.add_argument("--model", default=NSAA_DIAGRAM_MODEL)
    parser.add_argument("--acceptor-model", default=DEFAULT_ACCEPTOR_MODEL)
    args = parser.parse_args()

    run_overnight(
        hours=float(args.hours),
        min_keep=int(args.min_keep),
        magnetism_n=int(args.magnetism_n),
        general_n=int(args.general_n),
        designer_model=str(args.model),
        acceptor_model=str(args.acceptor_model),
        skip_magnetism=bool(args.skip_magnetism),
        wait_for_magnetism=bool(args.wait_for_magnetism),
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
