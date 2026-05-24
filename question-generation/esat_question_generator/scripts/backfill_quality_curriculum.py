#!/usr/bin/env python3
"""
Re-run Quality Gate curriculum validation on existing Supabase rows.

Does not auto-delete. Use --apply to write quality_gate_* columns.
Use --mark-needs-review to set status=needs_review on off-syllabus/borderline rows.

Examples (from ``esat_question_generator/``):

  python scripts/backfill_quality_curriculum.py --subject "Math 1" --limit 200 --dry-run
  python scripts/backfill_quality_curriculum.py --subject "Mathematics 1" --apply
"""

from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

_BASE = Path(__file__).resolve().parent.parent
if str(_BASE) not in sys.path:
    sys.path.insert(0, str(_BASE))

SELECT_COLS = (
    "id, schema_id, subjects, difficulty, status, primary_tag, secondary_tags, "
    "question_stem, options, correct_option, solution_reasoning, solution_key_insight, "
    "distractor_map, quality_gate_assessed_at, quality_gate_payload, quality_gate_action"
)


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def fetch_rows(
    client: Any,
    *,
    subject: Optional[str],
    limit: int,
    only_assessed: bool,
) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    offset = 0
    page = 200
    while len(out) < limit:
        q = (
            client.table("ai_generated_questions")
            .select(SELECT_COLS)
            .neq("status", "deleted")
            .order("id")
            .range(offset, offset + page - 1)
        )
        if subject:
            q = q.eq("subjects", subject)
        if only_assessed:
            q = q.not_.is_("quality_gate_assessed_at", "null")
        resp = q.execute()
        batch = list(resp.data or [])
        if not batch:
            break
        out.extend(batch)
        if len(batch) < page:
            break
        offset += page
    return out[:limit]


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Backfill curriculum-aware quality gate fields.")
    parser.add_argument("--subject", default="", help='e.g. "Math 1" or "Mathematics 2"')
    parser.add_argument("--limit", type=int, default=100)
    parser.add_argument("--dry-run", action="store_true", help="Print summary only (default if --apply omitted)")
    parser.add_argument("--apply", action="store_true", help="Write updates to Supabase")
    parser.add_argument(
        "--mark-needs-review",
        action="store_true",
        help="Set status=needs_review when curriculum_match is off_syllabus or borderline",
    )
    parser.add_argument("--model", default="", help="Override quality gate model id")
    parser.add_argument("--only-assessed", action="store_true", help="Only rows already assessed")
    parser.add_argument("--apply-tag-fixes", action="store_true", help="Re-run classifier for wrong/missing tags")
    ns = parser.parse_args(argv)
    dry_run = not ns.apply

    from project import LLMClient
    from quality_gate.assess import assess_question
    from quality_gate.defaults import default_sync_model
    from quality_gate.runner import default_job_id, init_env
    from quality_gate.schemas import effective_action, effective_action_with_graph_queue
    from quality_gate.supabase_io import get_supabase, update_question_assessment

    init_env()
    client = get_supabase()
    llm = LLMClient()
    model = (ns.model or "").strip() or default_sync_model()
    job_id = default_job_id() + "-curriculum-backfill"
    subject = (ns.subject or "").strip() or None

    rows = fetch_rows(
        client,
        subject=subject,
        limit=max(1, int(ns.limit)),
        only_assessed=bool(ns.only_assessed),
    )
    print(f"Loaded {len(rows)} row(s) subject={subject!r} dry_run={dry_run}")

    stats = {"processed": 0, "off_syllabus": 0, "borderline": 0, "errors": 0}
    for row in rows:
        qid = str(row.get("id") or "")
        if not qid:
            continue
        try:
            result, raw, used_model = assess_question(llm, row, model=model)
            base_eff = effective_action(result, row=row)
            eff = effective_action_with_graph_queue(result, base_eff)
            payload = result.to_payload()
            payload["effective_recommended_action"] = eff
            payload["raw_model_excerpt"] = (raw)[:4000]
            payload["curriculum_backfill"] = True

            content_patch: Dict[str, Any] = {}
            if not dry_run:
                from quality_gate.formatting import build_formatting_patch, should_apply_formatting_fix
                from quality_gate.formatting import detect_formatting_issues

                if should_apply_formatting_fix(
                    issues=detect_formatting_issues(row),
                    llm_apply_fix=result.formatting_apply_fix,
                    eff=eff,
                ):
                    fp = build_formatting_patch(row)
                    if fp:
                        content_patch.update(fp)
                        payload["formatting_fix_applied"] = sorted(fp.keys())

                if ns.apply_tag_fixes and eff != "delete":
                    from quality_gate.tag_relabel import maybe_relabel_tags

                    tag_patch = maybe_relabel_tags(row, result, llm=llm, model=used_model)
                    if tag_patch:
                        content_patch.update(tag_patch)
                        payload["tag_relabel_applied"] = tag_patch.get("primary_tag")

            if result.curriculum_match == "off_syllabus":
                stats["off_syllabus"] += 1
            elif result.curriculum_match == "borderline":
                stats["borderline"] += 1

            if dry_run:
                print(
                    f"[dry] {qid} match={result.curriculum_match} eff={eff} "
                    f"syllabus={result.syllabus_fit_score} flags={len(result.curriculum_flags)} "
                    f"{result.curriculum_reason[:80]}"
                )
            else:
                patch: Dict[str, Any] = {
                    "quality_gate_assessed_at": _iso_now(),
                    "quality_gate_verdict": result.verdict,
                    "quality_gate_action": eff,
                    "quality_gate_reason": (result.curriculum_reason or result.reasoning)[:8000],
                    "quality_gate_payload": payload,
                    "quality_gate_job_id": job_id,
                    "quality_gate_model": used_model,
                }
                if ns.mark_needs_review and result.curriculum_match in ("off_syllabus", "borderline"):
                    patch["status"] = "needs_review"
                update_question_assessment(client, qid, patch)
                print(f"[ok] {qid} match={result.curriculum_match} eff={eff}")
            stats["processed"] += 1
        except Exception as e:
            stats["errors"] += 1
            print(f"[err] {qid}: {e}", file=sys.stderr)

    print("Summary:", stats)
    return 0 if stats["errors"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
