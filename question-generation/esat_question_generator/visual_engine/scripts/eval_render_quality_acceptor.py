#!/usr/bin/env python3
"""Benchmark render_quality_acceptor against manual Streamlit decisions.

Compares model ACCEPT/REJECT to human ``approved`` / ``rejected`` labels in
``review_data/review.db``. Optionally includes ``needs_edit`` as reject.

Usage (from question-generation/esat_question_generator):

  python -m visual_engine.scripts.eval_render_quality_acceptor
  python -m visual_engine.scripts.eval_render_quality_acceptor --limit 40 --workers 2
  python -m visual_engine.scripts.eval_render_quality_acceptor --deterministic-only
"""

from __future__ import annotations

import argparse
import json
import random
import time
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from visual_engine.render_quality_acceptor import (
    DEFAULT_ACCEPTOR_MODEL,
    evaluate_review_item,
    resolve_png_path,
)
from visual_engine.review_store import DEFAULT_DB_PATH, ReviewStore

HUMAN_ACCEPT = {"approved"}
HUMAN_REJECT = {"rejected"}


def _utc_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")


def _human_label(status: str, *, include_needs_edit: bool) -> str | None:
    s = (status or "").strip().lower()
    if s in HUMAN_ACCEPT:
        return "ACCEPT"
    if s in HUMAN_REJECT:
        return "REJECT"
    if include_needs_edit and s == "needs_edit":
        return "REJECT"
    return None


def _select_items(
    store: ReviewStore,
    *,
    include_needs_edit: bool,
    diagram_only: bool,
    require_image: bool,
    limit: int,
    balance: bool,
    seed: int,
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for status in ("approved", "rejected", "needs_edit"):
        if status == "needs_edit" and not include_needs_edit:
            continue
        rows.extend(store.list_items(status_filter=status, latest_only=True))

    filtered: list[dict[str, Any]] = []
    for item in rows:
        if _human_label(str(item.get("question_status") or ""), include_needs_edit=include_needs_edit) is None:
            continue
        diagram = item.get("diagram") or {}
        resolved = resolve_png_path(
            (diagram or {}).get("image_path"),
            question_id=str(item.get("question_id") or ""),
        )
        if require_image and resolved is None:
            continue
        if diagram_only and resolved is None:
            # Missing PNG is only useful gold when the human also rejected / needs_edit.
            status = str(item.get("question_status") or "").lower()
            if status not in {"rejected", "needs_edit"}:
                continue
        if resolved is not None and isinstance(diagram, dict):
            # Prefer a resolvable path for vision calls.
            item = {**item, "diagram": {**diagram, "image_path": str(resolved)}}
        filtered.append(item)

    rng = random.Random(seed)
    if balance:
        by_label: dict[str, list[dict[str, Any]]] = {"ACCEPT": [], "REJECT": []}
        for item in filtered:
            label = _human_label(
                str(item.get("question_status") or ""),
                include_needs_edit=include_needs_edit,
            )
            if label:
                by_label[label].append(item)
        for key in by_label:
            rng.shuffle(by_label[key])
        if limit > 0:
            per = max(1, limit // 2)
            selected = by_label["ACCEPT"][:per] + by_label["REJECT"][:per]
        else:
            n = min(len(by_label["ACCEPT"]), len(by_label["REJECT"]))
            selected = by_label["ACCEPT"][:n] + by_label["REJECT"][:n]
        rng.shuffle(selected)
        return selected

    rng.shuffle(filtered)
    if limit > 0:
        return filtered[:limit]
    return filtered


def _metrics(rows: list[dict[str, Any]]) -> dict[str, Any]:
    # Positive class = REJECT (catching bad renders matters most).
    tp = fp = tn = fn = 0
    for row in rows:
        human = row["human"]
        pred = row["decision"]
        if human == "REJECT" and pred == "REJECT":
            tp += 1
        elif human == "ACCEPT" and pred == "REJECT":
            fp += 1
        elif human == "ACCEPT" and pred == "ACCEPT":
            tn += 1
        elif human == "REJECT" and pred == "ACCEPT":
            fn += 1

    def _safe_div(a: float, b: float) -> float:
        return float(a) / float(b) if b else 0.0

    precision = _safe_div(tp, tp + fp)
    recall = _safe_div(tp, tp + fn)
    f1 = _safe_div(2 * precision * recall, precision + recall) if (precision + recall) else 0.0
    accuracy = _safe_div(tp + tn, tp + tn + fp + fn)
    specificity = _safe_div(tn, tn + fp)
    return {
        "n": len(rows),
        "confusion": {"tp_reject": tp, "fp_reject": fp, "tn_accept": tn, "fn_accept_bad": fn},
        "accuracy": round(accuracy, 4),
        "reject_precision": round(precision, 4),
        "reject_recall": round(recall, 4),
        "reject_f1": round(f1, 4),
        "accept_specificity": round(specificity, 4),
        "false_accept_rate": round(_safe_div(fn, tp + fn), 4),
        "false_reject_rate": round(_safe_div(fp, tn + fp), 4),
        "agreement": round(accuracy, 4),
    }


def _eval_one(
    item: dict[str, Any],
    *,
    include_needs_edit: bool,
    model: str,
    thinking_level: str,
    skip_vision: bool,
) -> dict[str, Any]:
    human = _human_label(
        str(item.get("question_status") or ""),
        include_needs_edit=include_needs_edit,
    )
    assert human is not None
    t0 = time.perf_counter()
    try:
        result = evaluate_review_item(
            item,
            model=model,
            thinking_level=thinking_level,
            skip_vision=skip_vision,
        )
        err = ""
    except Exception as exc:  # noqa: BLE001 - collect per-item failures for the report
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
    elapsed = time.perf_counter() - t0
    diagram = item.get("diagram") or {}
    return {
        "question_id": item.get("question_id"),
        "subject": item.get("subject"),
        "human_status": item.get("question_status"),
        "human": human,
        "decision": result.decision,
        "agree": result.decision == human,
        "confidence": result.confidence,
        "source": result.source,
        "diagram_ok": result.diagram_ok,
        "question_ok": result.question_ok,
        "reject_reasons": result.reject_reasons,
        "issues": result.issues[:8],
        "summary": result.summary,
        "model": result.model,
        "image_path": (diagram or {}).get("image_path"),
        "elapsed_s": round(elapsed, 3),
        "error": err,
        "usage": result.usage,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", default=str(DEFAULT_DB_PATH), help="Path to review.db")
    parser.add_argument("--limit", type=int, default=0, help="Max items (0 = all selected)")
    parser.add_argument("--workers", type=int, default=2, help="Parallel Gemini workers")
    parser.add_argument("--seed", type=int, default=13)
    parser.add_argument(
        "--balance",
        action="store_true",
        default=True,
        help="Balance ACCEPT/REJECT sample (default on)",
    )
    parser.add_argument("--no-balance", action="store_true", help="Do not balance classes")
    parser.add_argument(
        "--include-needs-edit",
        action="store_true",
        help="Treat needs_edit as human REJECT",
    )
    parser.add_argument(
        "--diagram-only",
        action="store_true",
        default=True,
        help="Prefer items with diagram images (default on)",
    )
    parser.add_argument("--all-types", action="store_true", help="Include text-only items")
    parser.add_argument("--model", default=DEFAULT_ACCEPTOR_MODEL)
    parser.add_argument("--thinking-level", default="high")
    parser.add_argument(
        "--deterministic-only",
        action="store_true",
        help="Skip vision; baseline from auto_checks / text gates only",
    )
    parser.add_argument(
        "--require-image",
        action="store_true",
        help="Only evaluate items with a resolvable rendered PNG (fairer vision comparison)",
    )
    parser.add_argument(
        "--out-dir",
        default="",
        help="Report directory (default: visual_engine/eval/output/render_quality_*)",
    )
    args = parser.parse_args()

    balance = bool(args.balance) and not bool(args.no_balance)
    diagram_only = bool(args.diagram_only) and not bool(args.all_types)
    store = ReviewStore(Path(args.db))
    items = _select_items(
        store,
        include_needs_edit=bool(args.include_needs_edit),
        diagram_only=diagram_only,
        require_image=bool(args.require_image),
        limit=int(args.limit or 0),
        balance=balance,
        seed=int(args.seed),
    )
    if not items:
        print("No labeled items found to evaluate.")
        return 1

    human_counts = Counter(
        _human_label(str(i.get("question_status") or ""), include_needs_edit=bool(args.include_needs_edit))
        for i in items
    )
    print(
        f"Evaluating {len(items)} items "
        f"(human={dict(human_counts)}, model={args.model}, "
        f"deterministic_only={args.deterministic_only}, workers={args.workers})",
        flush=True,
    )

    rows: list[dict[str, Any]] = []
    workers = max(1, int(args.workers))
    if workers == 1:
        for idx, item in enumerate(items, 1):
            row = _eval_one(
                item,
                include_needs_edit=bool(args.include_needs_edit),
                model=str(args.model),
                thinking_level=str(args.thinking_level),
                skip_vision=bool(args.deterministic_only),
            )
            rows.append(row)
            mark = "OK" if row["agree"] else "DIFF"
            print(
                f"[{idx}/{len(items)}] {mark} {row['question_id']} "
                f"human={row['human']} pred={row['decision']} "
                f"src={row['source']} ({row['elapsed_s']}s)",
                flush=True,
            )
    else:
        with ThreadPoolExecutor(max_workers=workers) as pool:
            futures = {
                pool.submit(
                    _eval_one,
                    item,
                    include_needs_edit=bool(args.include_needs_edit),
                    model=str(args.model),
                    thinking_level=str(args.thinking_level),
                    skip_vision=bool(args.deterministic_only),
                ): item
                for item in items
            }
            done = 0
            for fut in as_completed(futures):
                row = fut.result()
                rows.append(row)
                done += 1
                mark = "OK" if row["agree"] else "DIFF"
                print(
                    f"[{done}/{len(items)}] {mark} {row['question_id']} "
                    f"human={row['human']} pred={row['decision']} "
                    f"src={row['source']} ({row['elapsed_s']}s)",
                    flush=True,
                )

    # Stable order for reports
    rows.sort(key=lambda r: (not r["agree"], r.get("human") or "", r.get("question_id") or ""))
    metrics = _metrics(rows)
    disagreements = [r for r in rows if not r["agree"]]
    by_source = Counter(r.get("source") or "" for r in rows)

    out_dir = Path(args.out_dir) if args.out_dir else (
        Path(__file__).resolve().parents[1] / "eval" / "output" / f"render_quality_{_utc_stamp()}"
    )
    out_dir.mkdir(parents=True, exist_ok=True)
    report = {
        "created_at": datetime.now(timezone.utc).isoformat(),
        "db": str(Path(args.db).resolve()),
        "model": args.model,
        "thinking_level": args.thinking_level,
        "deterministic_only": bool(args.deterministic_only),
        "include_needs_edit": bool(args.include_needs_edit),
        "diagram_only": diagram_only,
        "balance": balance,
        "seed": args.seed,
        "human_counts": dict(human_counts),
        "prediction_source_counts": dict(by_source),
        "metrics": metrics,
        "disagreement_count": len(disagreements),
        "disagreements": disagreements[:100],
        "rows": rows,
    }
    (out_dir / "report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")

    lines = [
        "# Render quality acceptor vs manual review",
        "",
        f"- Items: **{metrics['n']}**",
        f"- Agreement: **{metrics['agreement']:.1%}**",
        f"- Reject precision: **{metrics['reject_precision']:.1%}**",
        f"- Reject recall: **{metrics['reject_recall']:.1%}**",
        f"- Reject F1: **{metrics['reject_f1']:.1%}**",
        f"- False accept rate (bad marked ACCEPT): **{metrics['false_accept_rate']:.1%}**",
        f"- False reject rate (good marked REJECT): **{metrics['false_reject_rate']:.1%}**",
        f"- Confusion: `{metrics['confusion']}`",
        f"- Model: `{args.model}` deterministic_only={args.deterministic_only}",
        "",
        "## Disagreements",
        "",
    ]
    if not disagreements:
        lines.append("_None_")
    else:
        for row in disagreements[:40]:
            lines.append(
                f"- `{row['question_id']}` human={row['human']} pred={row['decision']} "
                f"src={row['source']} reasons={row.get('reject_reasons')} "
                f"summary={row.get('summary')!r}"
            )
    (out_dir / "SUMMARY.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

    print()
    print(json.dumps({"metrics": metrics, "out_dir": str(out_dir)}, indent=2))
    print(f"Wrote {out_dir / 'SUMMARY.md'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
