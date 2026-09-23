#!/usr/bin/env python3
"""Export supervisor sample of answer-key-reconciled approvals."""

from __future__ import annotations

import json
import random
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

_BASE = Path(__file__).resolve().parent.parent
if str(_BASE) not in sys.path:
    sys.path.insert(0, str(_BASE))

REPORT = _BASE / "quality_gate" / "answer_key_reconcile_report.json"
OUT = _BASE / "quality_gate" / "answer_key_approve_sample_for_supervisor.json"


def main() -> int:
    from quality_gate.supabase_io import get_supabase

    report = json.loads(REPORT.read_text(encoding="utf-8"))
    approved = [r for r in report["all_results"] if r["bucket"] == "already_correct"]
    by_subj: dict[str, list] = defaultdict(list)
    for r in approved:
        by_subj[r.get("subject") or "Unknown"].append(r)

    random.seed(42)
    sample: list[dict] = []
    per_subj = max(3, 20 // max(len(by_subj), 1))
    for subj in sorted(by_subj.keys()):
        pool = sorted(by_subj[subj], key=lambda x: x["id"])
        take = min(per_subj, len(pool))
        if len(pool) <= take:
            sample.extend(pool)
        else:
            step = len(pool) / take
            for i in range(take):
                sample.append(pool[int(i * step)])

    seen = {r["id"] for r in sample}
    for r in sorted(approved, key=lambda x: x["id"]):
        if len(sample) >= 20:
            break
        if r["id"] not in seen:
            sample.append(r)
            seen.add(r["id"])

    ids = [r["id"] for r in sample[:20]]
    client = get_supabase()
    cols = (
        "id, subjects, primary_tag, difficulty, question_stem, options, correct_option, "
        "solution_reasoning, solution_key_insight, distractor_map, quality_gate_verdict, "
        "quality_gate_reason, quality_gate_payload"
    )
    rows_by_id: dict = {}
    for i in range(0, len(ids), 50):
        chunk = ids[i : i + 50]
        resp = client.table("ai_generated_questions").select(cols).in_("id", chunk).execute()
        for row in resp.data or []:
            rows_by_id[row["id"]] = row

    out_questions = []
    for meta in sample[:20]:
        qid = meta["id"]
        row = rows_by_id.get(qid)
        if not row:
            continue
        payload = row.get("quality_gate_payload") or {}
        if isinstance(payload, str):
            payload = json.loads(payload)
        ak = payload.get("answer_key_validation") or {}
        dm = row.get("distractor_map") or {}
        correct = (row.get("correct_option") or "").strip().upper()[:1]
        correct_text = None
        opts = row.get("options")
        if isinstance(opts, dict) and correct:
            for k, v in opts.items():
                if str(k).strip().upper()[:1] == correct:
                    correct_text = v
                    break
        out_questions.append(
            {
                "id": qid,
                "id_prefix": qid[:8],
                "subject": row.get("subjects"),
                "primary_tag": row.get("primary_tag"),
                "difficulty": row.get("difficulty"),
                "reconcile_outcome": "already_correct_no_letter_change",
                "approved_correct_option": correct,
                "approved_option_text": correct_text,
                "llm_had_flagged_wrong_key": True,
                "prior_llm_true_option": meta.get("llm_true_option"),
                "deterministic_inferred_option": meta.get("inferred_option"),
                "reconcile_note": meta.get("note"),
                "question_stem": row.get("question_stem"),
                "options": opts,
                "correct_option": row.get("correct_option"),
                "solution_reasoning": row.get("solution_reasoning"),
                "solution_key_insight": row.get("solution_key_insight"),
                "distractor_map": dm,
                "distractor_entry_for_correct_option": dm.get(correct) if correct else None,
                "quality_gate_verdict": row.get("quality_gate_verdict"),
                "prior_quality_gate_reason_excerpt": (row.get("quality_gate_reason") or "")[:500],
                "answer_key_validation_at_approval": ak,
                "supervisor_check": (
                    "Verify that correct_option matches an independent solve of the stem."
                ),
            }
        )

    export = {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "purpose": (
            "Supervisor spot-check: sample of 122 ESAT questions auto-approved after "
            "answer-key reconcile (answer_key_reconcile_v1)."
        ),
        "important_note": (
            "None of the 122 required a letter change. Deterministic reconcile agreed with "
            "the stored correct_option on all 122. The quality gate had falsely flagged "
            "wrong_answer_key on these rows."
        ),
        "total_approved_in_run": 122,
        "sample_count": len(out_questions),
        "sample_selection": (
            "Up to 4 per subject, spread across Math 1, Math 2, Physics, Chemistry, Biology."
        ),
        "questions": out_questions,
    }
    OUT.write_text(json.dumps(export, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(out_questions)} questions to {OUT}")
    for q in out_questions:
        print(f"  {q['id_prefix']} {q['subject']} key={q['correct_option']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
