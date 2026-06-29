#!/usr/bin/env python3
"""
Read-only benchmark: run curriculum validator v3 against manual esat_228 labels.

Does NOT read or write manual-applied question state beyond fetching content fields.

Examples (from ``esat_question_generator/``):

  python scripts/eval_curriculum_benchmark_228.py --only-rejects
  python scripts/eval_curriculum_benchmark_228.py --limit 10
  python scripts/eval_curriculum_benchmark_228.py
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

_BASE = Path(__file__).resolve().parent.parent
_REPO = _BASE.parent.parent
if str(_BASE) not in sys.path:
    sys.path.insert(0, str(_BASE))

DEFAULT_MANUAL = _REPO / "data" / "manual_overrides" / "esat_228_manual_keep_reject.json"


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def run_eval(
    *,
    manual_path: Path,
    limit: int,
    only_rejects: bool,
    only_ids: Optional[List[str]],
    batch_sleep: float,
    model: str,
    out_dir: Path,
) -> int:
    from quality_gate.curriculum_benchmark.metrics import (
        build_confusion_matrix,
        benchmark_summary,
        gold_label_from_decision,
        is_correct_prediction,
        is_critical_false_positive,
    )
    from quality_gate.curriculum_reassessment.assess import reassess_curriculum
    from quality_gate.curriculum_reassessment.constants import BENCHMARK_VALIDATOR_VERSION
    from quality_gate.defaults import default_llm_provider, default_sync_model, make_vertex_llm_client
    from quality_gate.manual_curriculum_apply import fetch_rows_by_ids, load_manual_decisions
    from quality_gate.claude_client import ClaudePurgeClient

    _, decisions_by_id, checksum = load_manual_decisions(manual_path)
    ids = sorted(decisions_by_id.keys())
    if only_rejects:
        ids = [i for i in ids if decisions_by_id[i]["decision"] == "reject"]
    if only_ids:
        ids = [i for i in ids if i in only_ids]
    if limit > 0:
        ids = ids[:limit]

    from quality_gate.supabase_io import get_supabase

    client = get_supabase()
    rows_by_id = fetch_rows_by_ids(client, ids)

    if default_llm_provider() == "anthropic":
        llm = ClaudePurgeClient()
    else:
        llm = make_vertex_llm_client()
    model = model or default_sync_model()

    results: List[Dict[str, Any]] = []
    errors: List[Dict[str, Any]] = []

    for i, qid in enumerate(ids):
        decision = decisions_by_id[qid]
        row = rows_by_id.get(qid)
        if row is None:
            errors.append({"id": qid, "error": "row_missing"})
            continue
        try:
            parsed, raw, model_used = reassess_curriculum(
                llm,
                row,
                model=model,
                use_benchmark_rules=True,
                validator_version=BENCHMARK_VALIDATOR_VERSION,
            )
            gold = gold_label_from_decision(decision)
            pred = parsed.get("curriculum_match", "")
            conf = parsed.get("confidence", "medium")
            correct = is_correct_prediction(gold, pred, conf)
            entry = {
                "id": qid,
                "id_prefix": qid[:8],
                "subject": decision.get("subject"),
                "primary_tag": decision.get("primary_tag"),
                "manual_decision": decision.get("decision"),
                "manual_category": decision.get("decision_category"),
                "manual_reason": decision.get("reason"),
                "gold": gold,
                "predicted_match": pred,
                "predicted_confidence": conf,
                "syllabus_fit_score": parsed.get("syllabus_fit_score"),
                "required_knowledge": parsed.get("required_knowledge"),
                "borderline_or_external_knowledge": parsed.get("borderline_or_external_knowledge"),
                "predicted_reason": parsed.get("reason"),
                "correct": correct,
                "critical_false_positive": is_critical_false_positive(gold, pred, conf),
                "validator_version": BENCHMARK_VALIDATOR_VERSION,
                "model": model_used,
            }
            results.append(entry)
        except Exception as exc:
            errors.append({"id": qid[:8], "error": str(exc)})
        if (i + 1) % 5 == 0:
            print(f"  progress {i + 1}/{len(ids)}", flush=True)
            time.sleep(batch_sleep)

    summary = benchmark_summary(results)
    matrix = build_confusion_matrix(results)
    disagreements = [r for r in results if not r["correct"]]
    critical_fps = [r for r in results if r["critical_false_positive"]]

    report = {
        "generated_at": _iso_now(),
        "mode": "read_only_benchmark",
        "manual_file": str(manual_path),
        "manual_checksum_sha256": checksum,
        "validator_version": BENCHMARK_VALIDATOR_VERSION,
        "model": model,
        "evaluated_count": len(results),
        "error_count": len(errors),
        "summary": summary,
        "confusion_matrix": matrix,
        "critical_false_positives": critical_fps,
        "disagreements": disagreements,
        "errors": errors,
        "all_results": results,
    }

    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    main_out = out_dir / f"benchmark_228_{stamp}.json"
    main_out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print("\n=== ESAT 228 curriculum benchmark (read-only) ===")
    print(f"Validator: {BENCHMARK_VALIDATOR_VERSION}")
    print(f"Model: {model}")
    print(f"Evaluated: {len(results)} / {len(ids)}")
    print(f"Accuracy: {summary['accuracy']}")
    print(f"Critical false positives (reject + in_syllabus + high): {summary['critical_false_positive_count']}")
    print(f"Disagreements: {summary['disagreement_count']}")
    print("\nConfusion matrix:")
    for k, v in matrix.items():
        print(f"  {k}: {v}")
    if critical_fps:
        print("\nCRITICAL false positives:")
        for r in critical_fps:
            print(f"  {r['id_prefix']} gold={r['gold']} manual={r['manual_category']}")
    print(f"\nFull report: {main_out}")

    return 1 if summary["critical_false_positive_count"] > 0 else 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Benchmark curriculum validator vs manual 228")
    parser.add_argument("--manual-file", default=str(DEFAULT_MANUAL))
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--only-rejects", action="store_true")
    parser.add_argument("--question-id", action="append", default=[])
    parser.add_argument("--sleep", type=float, default=1.5)
    parser.add_argument("--model", default="")
    parser.add_argument("--out-dir", default=str(_BASE / "quality_gate" / "benchmark_reports"))
    args = parser.parse_args()

    return run_eval(
        manual_path=Path(args.manual_file),
        limit=args.limit,
        only_rejects=args.only_rejects,
        only_ids=args.question_id or None,
        batch_sleep=args.sleep,
        model=args.model.strip(),
        out_dir=Path(args.out_dir),
    )


if __name__ == "__main__":
    raise SystemExit(main())
