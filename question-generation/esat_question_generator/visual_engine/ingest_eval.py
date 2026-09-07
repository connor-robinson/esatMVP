"""Ingest a Phase 2 eval run into the local review SQLite store."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .review_store import ReviewStore


def ingest_eval_run(run_dir: str | Path, *, store: ReviewStore | None = None) -> dict[str, int]:
    root = Path(run_dir)
    store = store or ReviewStore()
    report_path = root / "report.json"
    if not report_path.is_file():
        raise FileNotFoundError(f"No report.json in {root}")
    report = json.loads(report_path.read_text(encoding="utf-8"))
    records = report.get("records") or []
    added_q = 0
    added_d = 0
    for rec in records:
        qid = f"eval-{rec.get('question_id')}-{rec.get('variation_mode')}"
        case_dir = root / f"q{rec.get('question_id')}_{rec.get('variation_mode')}"
        stem = ""
        meta_path = case_dir / "meta.json"
        if meta_path.is_file():
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
        else:
            meta = {}
        spec: dict[str, Any] = {}
        spec_path = case_dir / "visual_spec.json"
        if spec_path.is_file():
            spec = json.loads(spec_path.read_text(encoding="utf-8"))
        source_path = case_dir / "source_diagram.png"
        png_path = case_dir / "rendered.png"
        store.upsert_question(
            question_id=qid,
            subject=str(rec.get("exam_name") or "eval"),
            topic=str(rec.get("variation_mode") or ""),
            difficulty="",
            stem=stem or f"Eval diagram for past-paper Q{rec.get('question_id')} ({rec.get('variation_mode')}).",
            choices={},
            correct_answer="",
            explanation="",
            diagram_required=True,
            diagram_status="pending" if rec.get("verifier_verdict") != "PASS" else "pending",
            question_status="pending",
            source=meta,
        )
        added_q += 1
        store.add_diagram_attempt(
            question_id=qid,
            attempt=1,
            image_path=str(png_path) if png_path.is_file() else "",
            spec_path=str(spec_path) if spec_path.is_file() else "",
            source_image_path=str(source_path) if source_path.is_file() else "",
            original_spec=spec,
            generation_spec=spec,
            status="pending",
            feedback="; ".join(rec.get("verifier_issues") or []),
        )
        added_d += 1
    return {"questions": added_q, "diagrams": added_d}


if __name__ == "__main__":
    import argparse
    import sys

    parser = argparse.ArgumentParser(description="Ingest a Phase 2 eval run into the review DB")
    parser.add_argument("run_dir")
    args = parser.parse_args()
    counts = ingest_eval_run(args.run_dir)
    print(json.dumps(counts))
    raise SystemExit(0)
