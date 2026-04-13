#!/usr/bin/env python3
"""Quality gate CLI — run assessments and batch confirmations."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))


def _build_cohort(ns: argparse.Namespace) -> "CohortFilters":
    from quality_gate.schemas import CohortFilters

    subjects = [s.strip() for s in (ns.subjects or "").split(",") if s.strip()]
    difficulties = [s.strip() for s in (ns.difficulties or "").split(",") if s.strip()]
    statuses = [s.strip() for s in (ns.statuses or "").split(",") if s.strip()]
    tt = ns.test_type.strip() if ns.test_type else None
    if tt == "any":
        tt = None
    return CohortFilters(
        test_type=tt,
        subjects=subjects or None,
        difficulties=difficulties or None,
        statuses=statuses or None,
        schema_id_prefix=(ns.schema_prefix or "").strip() or None,
        only_unassessed=not ns.force_reassess,
        exclude_deleted=not ns.include_deleted,
    )


def cmd_run(ns: argparse.Namespace) -> int:
    import os

    from quality_gate.batch_api import default_batch_model
    from quality_gate.defaults import default_sync_model
    from quality_gate.runner import default_job_id, init_env, run_quality_gate_job

    init_env()
    llm_override = (getattr(ns, "quality_gate_llm", None) or "").strip().lower()
    if llm_override in ("anthropic", "vertex"):
        os.environ["QUALITY_GATE_LLM"] = llm_override
    job_id = (ns.job_id or "").strip() or default_job_id()
    cohort = _build_cohort(ns)
    log: list[str] = []

    model_arg = (ns.model or "").strip()
    if model_arg:
        model = model_arg
    elif ns.batch_api:
        model = default_batch_model()
    else:
        model = default_sync_model()

    run_quality_gate_job(
        job_id=job_id,
        cohort=cohort,
        limit=max(1, int(ns.limit)),
        model=model,
        dry_run=bool(ns.dry_run),
        record_only=bool(ns.record_only),
        force_reassess=bool(ns.force_reassess),
        page_size=max(1, int(ns.page_size)),
        state_path=Path(ns.state_file).resolve() if ns.state_file else None,
        log_lines=log,
        use_batch_api=bool(ns.batch_api),
        batch_poll_interval_s=float(ns.batch_poll_interval),
        batch_timeout_s=float(ns.batch_timeout),
        auto_svg_diagrams=bool(getattr(ns, "auto_svg", False)),
        diagram_model=(getattr(ns, "diagram_model", None) or "").strip(),
    )
    for line in log[-40:]:
        print(line)
    return 0


def cmd_apply_deletes(ns: argparse.Namespace) -> int:
    from quality_gate.runner import init_env
    from quality_gate.supabase_io import fetch_ids_for_job_action, get_supabase, soft_delete_questions

    init_env()
    client = get_supabase()
    job_id = ns.job_id.strip()
    ids = fetch_ids_for_job_action(client, job_id, "delete")
    print(f"Found {len(ids)} row(s) with action=delete for job {job_id}")
    if ns.dry_run:
        for qid in ids[:50]:
            print(qid)
        if len(ids) > 50:
            print(f"... and {len(ids) - 50} more")
        return 0
    n = soft_delete_questions(client, ids)
    print(f"Soft-deleted {n} row(s).")
    return 0


def cmd_export_regen(ns: argparse.Namespace) -> int:
    from quality_gate.runner import init_env
    from quality_gate.supabase_io import fetch_ids_for_job_action, get_supabase

    init_env()
    client = get_supabase()
    job_id = ns.job_id.strip()
    ids = fetch_ids_for_job_action(client, job_id, "regenerate")
    out = Path(ns.output).resolve()
    out.write_text("\n".join(json.dumps({"id": qid}) for qid in ids) + ("\n" if ids else ""), encoding="utf-8")
    print(f"Wrote {len(ids)} line(s) to {out}")
    return 0


def cmd_generate_missing_svgs(ns: argparse.Namespace) -> int:
    from quality_gate.runner import init_env
    from quality_gate.svg_backfill import run_missing_svg_backfill

    init_env()
    log: list[str] = []
    stats = run_missing_svg_backfill(
        limit=max(1, int(ns.limit)),
        diagram_model=(getattr(ns, "diagram_model", None) or "").strip(),
        dry_run=bool(ns.dry_run),
        page_size=max(10, int(ns.page_size)),
        log_lines=log,
        require_operator_queue=bool(getattr(ns, "operator_queue_only", False)),
        verbose_llm_trace=bool(getattr(ns, "verbose_llm_trace", False)),
    )
    print(json.dumps(stats, indent=2))
    if log:
        print("\n--- backfill log ---")
        print("\n".join(log))
    if bool(ns.dry_run):
        return 0
    return 0 if stats.get("errors", 0) == 0 else 1


def cmd_reset_graph_gate(ns: argparse.Namespace) -> int:
    from quality_gate.runner import init_env
    from quality_gate.supabase_io import clear_quality_gate_for_graph_flagged_rows, count_graph_flagged_rows, get_supabase

    init_env()
    client = get_supabase()
    n = count_graph_flagged_rows(client)
    print(f"Non-deleted rows with quality_gate_graph_candidate=true: {n}")
    if ns.dry_run:
        print("Dry run — no database changes.")
        return 0
    cleared = clear_quality_gate_for_graph_flagged_rows(client)
    print(f"Cleared quality gate fields on {cleared} row(s) (graph-flagged only).")
    return 0


def cmd_counts(ns: argparse.Namespace) -> int:
    from quality_gate.runner import init_env
    from quality_gate.supabase_io import get_supabase, summarize_quality_gate_job

    init_env()
    client = get_supabase()
    summary = summarize_quality_gate_job(client, ns.job_id.strip())
    print(json.dumps(summary, indent=2))
    return 0


def main() -> int:
    p = argparse.ArgumentParser(description="ESAT question checker (AI scoring + database updates)")
    sub = p.add_subparsers(dest="cmd", required=True)

    r = sub.add_parser("run", help="Score questions with Claude or Gemini, optionally update Supabase")
    r.add_argument(
        "--job-id",
        default="",
        help="Optional label stored on each row (default: auto-generated id)",
    )
    r.add_argument("--limit", type=int, default=50, help="Maximum number of questions to process")
    r.add_argument(
        "--page-size",
        type=int,
        default=25,
        help="How many DB rows to fetch per internal page (leave default unless advised)",
    )
    r.add_argument(
        "--model",
        default="",
        help="Model id for this run (Gemini or Claude). Omit to use MODEL_QUALITY_GATE or defaults "
        "(gemini-2.5-flash for Vertex, Claude Haiku for Anthropic; batch uses MODEL_QUALITY_GATE_BATCH).",
    )
    r.add_argument(
        "--llm",
        dest="quality_gate_llm",
        choices=("anthropic", "vertex"),
        default="",
        help="Sync scoring backend: vertex (ADC + Gemini, default) or anthropic (ANTHROPIC_API_KEY). "
        "Applied after .env load. Ignored with --batch-api (always Gemini Developer API).",
    )
    r.add_argument("--test-type", default="ESAT", help="Filter: ESAT | TMUA | any (any = no exam filter)")
    r.add_argument(
        "--subjects",
        default="",
        help="Optional filter: comma-separated subject names as in DB (e.g. Math 1, Physics)",
    )
    r.add_argument(
        "--difficulties",
        default="",
        help="Optional filter: Easy, Medium, Hard, Extreme (comma-separated)",
    )
    r.add_argument(
        "--statuses",
        default="",
        help="Optional filter: comma-separated row statuses (default: all non-deleted)",
    )
    r.add_argument(
        "--schema-prefix",
        default="",
        help="Optional filter: schema id starts with this text (e.g. M_ for math)",
    )
    r.add_argument(
        "--dry-run",
        action="store_true",
        help="Practice mode: call the model but do not write to the database",
    )
    r.add_argument(
        "--record-only",
        action="store_true",
        help="Save AI scores to the DB but do not auto-approve Pass questions",
    )
    r.add_argument(
        "--force-reassess",
        action="store_true",
        help="Also process questions that already have a quality score",
    )
    r.add_argument(
        "--include-deleted",
        action="store_true",
        help="Include soft-deleted questions in the pool (unusual)",
    )
    r.add_argument(
        "--state-file",
        default="",
        help="Where to write progress JSON (default: quality_gate/run_state.json next to this tool)",
    )
    r.add_argument(
        "--batch-api",
        action="store_true",
        help="Use Gemini Developer batch mode (needs GEMINI_API_KEY or GOOGLE_API_KEY; not Vertex GCS batch)",
    )
    r.add_argument(
        "--batch-poll-interval",
        type=float,
        default=15.0,
        help="With --batch-api: how often to poll job status in seconds",
    )
    r.add_argument(
        "--batch-timeout",
        type=float,
        default=86400.0,
        help="With --batch-api: max seconds to wait for each batch job",
    )
    r.add_argument(
        "--auto-svg",
        action="store_true",
        help="For graph-candidate rows: generate exam-style SVG (Vertex Gemini) and merge into question_stem. "
        "Default: 4-phase pipeline (scene→layout→collision→render) + archetypes. "
        "A/B test single-shot: export QUALITY_GATE_SVG_PIPELINE=0 (or false/no/off) to use prompt_svg_diagram.md only "
        "(often worse on complex figures). Uses MODEL_QUALITY_GATE_SVG or gemini-2.5-pro. "
        "Requires Google ADC if scoring on Claude.",
    )
    r.add_argument(
        "--diagram-model",
        default="",
        help="Gemini model id for --auto-svg (overrides MODEL_QUALITY_GATE_SVG), e.g. gemini-3.1-pro-preview",
    )
    r.set_defaults(func=cmd_run)

    d = sub.add_parser(
        "apply-deletes",
        help="Mark as deleted every question in a run that the AI recommended deleting",
    )
    d.add_argument("--job-id", required=True, help="Same run label as --job-id on run")
    d.add_argument("--dry-run", action="store_true", help="List ids only; do not delete")
    d.set_defaults(func=cmd_apply_deletes)

    e = sub.add_parser("export-regen", help="Write a JSONL file of question ids to regenerate")
    e.add_argument("--job-id", required=True)
    e.add_argument("--output", "-o", required=True)
    e.set_defaults(func=cmd_export_regen)

    c = sub.add_parser("counts", help="Print per-action counts and calibration/graph stats for a run")
    c.add_argument("--job-id", required=True)
    c.set_defaults(func=cmd_counts)

    g = sub.add_parser(
        "reset-graph-gate",
        help="Clear quality-gate columns only for rows still flagged graph-candidate (for re-scoring)",
    )
    g.add_argument("--dry-run", action="store_true", help="Print count only; do not update")
    g.set_defaults(func=cmd_reset_graph_gate)

    m = sub.add_parser(
        "generate-missing-svgs",
        help="Embed exam-style SVG for graph-flagged questions whose stem has no <svg> yet (Vertex Gemini)",
        epilog="QUALITY_GATE_SVG_PIPELINE: unset or 1 = 4-phase pipeline; 0 = single-shot (prompt_svg_diagram.md). "
        "Use --operator-queue-only to match Streamlit queue (svg_operator_backfill_choice=queue); requires DB migration.",
    )
    m.add_argument("--limit", type=int, default=25, help="Max questions to process")
    m.add_argument(
        "--page-size",
        type=int,
        default=40,
        help="DB page size when scanning graph-candidate rows",
    )
    m.add_argument(
        "--diagram-model",
        default="",
        help="Gemini model for SVG (default MODEL_QUALITY_GATE_SVG or gemini-2.5-pro)",
    )
    m.add_argument(
        "--dry-run",
        action="store_true",
        help="List ids that would be processed; no LLM calls and no DB stem updates",
    )
    m.add_argument(
        "--operator-queue-only",
        action="store_true",
        help="Only process rows with svg_operator_backfill_choice=queue (set in Streamlit queue). "
        "Default: all graph-flagged rows missing <svg> (legacy).",
    )
    m.add_argument(
        "--verbose-llm-trace",
        action="store_true",
        help="After each row, append truncated raw LLM debug concat to stdout log (large).",
    )
    m.set_defaults(func=cmd_generate_missing_svgs)

    ns = p.parse_args()
    return int(ns.func(ns))


if __name__ == "__main__":
    raise SystemExit(main())
