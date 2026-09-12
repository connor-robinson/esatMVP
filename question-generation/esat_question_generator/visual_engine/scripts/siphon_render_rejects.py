#!/usr/bin/env python3
"""Siphon bad diagram renders out of the Streamlit pending queue.

Runs the strict render-quality acceptor on pending diagram questions and marks
REJECT decisions as ``rejected`` (with feedback), leaving ACCEPT items pending
for human review.

Usage (from question-generation/esat_question_generator):

  python -u -m visual_engine.scripts.siphon_render_rejects --workers 3
  python -u -m visual_engine.scripts.siphon_render_rejects --dry-run --limit 20
"""

from __future__ import annotations

import argparse
import json
import time
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from visual_engine.render_quality_acceptor import (
    DEFAULT_ACCEPTOR_MODEL,
    evaluate_review_item,
    is_diagram_visual_type,
    resolve_png_path,
)
from visual_engine.review_store import DEFAULT_DB_PATH, ReviewStore

FEEDBACK_PREFIX = "[render_quality_acceptor]"


def _visual_type(item: dict[str, Any]) -> str:
    try:
        source = json.loads(item.get("source_json") or "{}")
    except json.JSONDecodeError:
        source = {}
    if isinstance(source, dict):
        return str(source.get("visual_type") or item.get("topic") or "")
    return str(item.get("topic") or "")


def _select_pending_diagrams(store: ReviewStore, *, limit: int) -> list[dict[str, Any]]:
    items = store.list_items(status_filter="pending", latest_only=True)
    selected: list[dict[str, Any]] = []
    for item in items:
        vt = _visual_type(item)
        if not is_diagram_visual_type(vt):
            continue
        diagram = item.get("diagram") or {}
        resolved = resolve_png_path(
            (diagram or {}).get("image_path"),
            question_id=str(item.get("question_id") or ""),
        )
        # Missing PNG for a diagram type is a reject candidate; keep it.
        if resolved is not None and isinstance(diagram, dict):
            item = {**item, "diagram": {**diagram, "image_path": str(resolved)}}
        selected.append(item)
        if limit > 0 and len(selected) >= limit:
            break
    return selected


def _feedback(result: Any) -> str:
    reasons = ", ".join(result.reject_reasons) if result.reject_reasons else "render_fail"
    summary = (result.summary or "").strip()
    issues = "; ".join(result.issues[:4]) if result.issues else ""
    parts = [FEEDBACK_PREFIX, reasons]
    if summary:
        parts.append(summary)
    if issues and issues not in summary:
        parts.append(issues)
    return " | ".join(parts)[:1800]


def _apply_reject(store: ReviewStore, item: dict[str, Any], result: Any) -> None:
    qid = str(item.get("question_id") or "")
    store.set_question_status(qid, "rejected", feedback=_feedback(result))
    diagram = item.get("diagram") or {}
    attempt_id = diagram.get("id") if isinstance(diagram, dict) else None
    if attempt_id:
        store.set_diagram_status(int(attempt_id), "rejected", feedback=_feedback(result))


def _eval_one(item: dict[str, Any], *, model: str, thinking_level: str) -> dict[str, Any]:
    t0 = time.perf_counter()
    try:
        result = evaluate_review_item(
            item,
            model=model,
            thinking_level=thinking_level,
            aggressive=True,
        )
        err = ""
    except Exception as exc:  # noqa: BLE001
        from visual_engine.render_quality_acceptor import RenderQualityResult

        result = RenderQualityResult(
            decision="REJECT",
            confidence=0.0,
            diagram_ok=False,
            question_ok=False,
            issues=[f"evaluator_error: {exc}"],
            reject_reasons=["evaluator_error"],
            summary=str(exc),
            source="error",
            skipped_vision=True,
        )
        err = str(exc)
    return {
        "question_id": item.get("question_id"),
        "subject": item.get("subject"),
        "visual_type": _visual_type(item),
        "decision": result.decision,
        "confidence": result.confidence,
        "source": result.source,
        "reject_reasons": result.reject_reasons,
        "summary": result.summary,
        "issues": result.issues[:6],
        "elapsed_s": round(time.perf_counter() - t0, 3),
        "error": err,
        "_result": result,
        "_item": item,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", default=str(DEFAULT_DB_PATH))
    parser.add_argument("--limit", type=int, default=0, help="0 = all pending diagram items")
    parser.add_argument("--workers", type=int, default=3)
    parser.add_argument("--model", default=DEFAULT_ACCEPTOR_MODEL)
    parser.add_argument("--thinking-level", default="high")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Evaluate only; do not write rejected status to review.db",
    )
    parser.add_argument(
        "--out-dir",
        default="",
        help="Report directory (default under visual_engine/eval/output/)",
    )
    args = parser.parse_args()

    store = ReviewStore(Path(args.db))
    items = _select_pending_diagrams(store, limit=int(args.limit or 0))
    if not items:
        print("No pending diagram questions found.", flush=True)
        return 0

    print(
        f"Siphoning {len(items)} pending diagram questions "
        f"(model={args.model}, workers={args.workers}, dry_run={args.dry_run})",
        flush=True,
    )

    rows: list[dict[str, Any]] = []
    decisions: Counter[str] = Counter()
    workers = max(1, int(args.workers))

    def _safe_console(text: str) -> str:
        return (text or "").encode("ascii", errors="replace").decode("ascii")

    def _handle(row: dict[str, Any], idx: int) -> None:
        result = row.pop("_result")
        item = row.pop("_item")
        if result.decision == "REJECT" and not args.dry_run:
            _apply_reject(store, item, result)
            row["applied"] = "rejected"
        else:
            row["applied"] = "none" if result.decision == "ACCEPT" else "dry_run_reject"
        decisions[result.decision] += 1
        rows.append(row)
        print(
            _safe_console(
                f"[{idx}/{len(items)}] {result.decision} {row['question_id']} "
                f"src={row['source']} conf={row['confidence']:.2f} "
                f"({row['elapsed_s']}s) {row.get('summary', '')[:100]}"
            ),
            flush=True,
        )

    if workers == 1:
        for i, item in enumerate(items, 1):
            _handle(
                _eval_one(item, model=str(args.model), thinking_level=str(args.thinking_level)),
                i,
            )
    else:
        with ThreadPoolExecutor(max_workers=workers) as pool:
            futures = {
                pool.submit(
                    _eval_one,
                    item,
                    model=str(args.model),
                    thinking_level=str(args.thinking_level),
                ): item
                for item in items
            }
            done = 0
            for fut in as_completed(futures):
                done += 1
                _handle(fut.result(), done)

    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    out_dir = Path(args.out_dir) if args.out_dir else (
        Path(__file__).resolve().parents[1] / "eval" / "output" / f"siphon_render_{stamp}"
    )
    out_dir.mkdir(parents=True, exist_ok=True)
    report = {
        "created_at": datetime.now(timezone.utc).isoformat(),
        "db": str(Path(args.db).resolve()),
        "dry_run": bool(args.dry_run),
        "model": args.model,
        "n": len(rows),
        "decisions": dict(decisions),
        "reject_rate": round(decisions["REJECT"] / len(rows), 4) if rows else 0.0,
        "counts_after": store.counts() if not args.dry_run else None,
        "rows": rows,
    }
    (out_dir / "report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    summary = [
        "# Render reject siphon",
        "",
        f"- Evaluated: **{len(rows)}** pending diagram questions",
        f"- REJECT: **{decisions['REJECT']}** ({report['reject_rate']:.1%})",
        f"- ACCEPT (left pending): **{decisions['ACCEPT']}**",
        f"- dry_run: `{args.dry_run}`",
        f"- model: `{args.model}`",
        "",
    ]
    (out_dir / "SUMMARY.md").write_text("\n".join(summary), encoding="utf-8")
    print(json.dumps({"decisions": dict(decisions), "reject_rate": report["reject_rate"], "out_dir": str(out_dir)}, indent=2), flush=True)
    print(f"Wrote {out_dir / 'SUMMARY.md'}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
