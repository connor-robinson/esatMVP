#!/usr/bin/env python3
"""
Phase 1: remediate approved questions that mention / expect a diagram but lack one.

1. Collect high-confidence missing-diagram rows
2. Collect loose-scan rows and ask the LLM which truly need a figure
3. Queue confirmed IDs, run image/SVG diagram backfill (with built-in verify QC)
4. Re-run quality gate assessment on those IDs only (not full bank)
5. Set presentation_type when a diagram was merged

Usage (from esat_question_generator/):
  set PYTHONPATH=.
  python scripts/remediate_missing_diagrams.py --dry-run
  python scripts/remediate_missing_diagrams.py
  python scripts/remediate_missing_diagrams.py --skip-backfill --skip-qg  # classify + queue only
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

REPORT_PATH = Path(__file__).resolve().parent / "remediate_missing_diagrams_report.json"

HIGH_CONFIDENCE_SQL_HINTS = (
    r"\[DIAGRAM\]",
    r"(the graph shows|graph shows|velocity-time graph|displacement-time graph)",
    r"\b(diagram|figure)\b",
    r"(the diagram|this diagram|following diagram|see the diagram|as shown in the figure)",
)

LOOSE_HINTS = (
    r"\b(diagram|figure|graph|sketch|plot)\b",
    r"(shown below|see the (diagram|figure|graph)|the (diagram|figure|graph) (shows|below|above)|"
    r"following (diagram|figure|graph)|accompanying (diagram|figure|graph)|"
    r"refer to the (diagram|figure|graph)|as shown in the (diagram|figure|graph))",
)


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _has_any_diagram(row: Dict[str, Any]) -> bool:
    stem = str(row.get("question_stem") or "")
    has_visual = row.get("has_visual") is True
    visual_type = str(row.get("visual_type") or "")
    if has_visual and visual_type not in ("none", "concept_image_prompt"):
        return True
    if re.search(r'<figure[^>]*class="[^"]*qg-diagram', stem, re.I):
        return True
    if re.search(r"<svg[\s>]", stem, re.I):
        return True
    if re.search(r"<img[\s>]", stem, re.I):
        return True
    if "\\includegraphics" in stem:
        return True
    graphs = row.get("graphs")
    if graphs and graphs not in ({}, "null", "{}", '"{}"'):
        if isinstance(graphs, dict) and graphs:
            return True
        if isinstance(graphs, str) and graphs.strip() not in ("", "{}", "null"):
            return True
    if row.get("quality_gate_diagram_backfill_kind"):
        return True
    return False


def _matches_any(stem: str, patterns: Tuple[str, ...]) -> bool:
    for pat in patterns:
        if re.search(pat, stem, re.I):
            return True
    return False


def fetch_approved_candidates(client: Any) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    cols = (
        "id, subjects, status, question_stem, options, correct_option, solution_reasoning, "
        "has_visual, visual_type, graphs, presentation_type, "
        "quality_gate_graph_mode, quality_gate_graph_candidate, quality_gate_graph_notes, "
        "quality_gate_diagram_backfill_kind, answer_depends_on_visual, "
        "primary_tag, secondary_tags, difficulty, test_type, schema_id"
    )
    rows: List[Dict[str, Any]] = []
    page = 1000
    start = 0
    while True:
        resp = (
            client.table("ai_generated_questions")
            .select(cols)
            .eq("status", "approved")
            .range(start, start + page - 1)
            .execute()
        )
        batch = list(resp.data or [])
        if not batch:
            break
        rows.extend(batch)
        if len(batch) < page:
            break
        start += page

    high: List[Dict[str, Any]] = []
    loose: List[Dict[str, Any]] = []
    for row in rows:
        if _has_any_diagram(row):
            continue
        stem = str(row.get("question_stem") or "")
        mode = str(row.get("quality_gate_graph_mode") or "")
        is_high = mode == "missing_expected" or _matches_any(stem, HIGH_CONFIDENCE_SQL_HINTS)
        if is_high:
            high.append(row)
            continue
        if _matches_any(stem, LOOSE_HINTS):
            loose.append(row)
    return high, loose


def _plain_stem(stem: str, limit: int = 900) -> str:
    text = re.sub(r"<[^>]+>", " ", stem or "")
    text = re.sub(r"\s+", " ", text).strip()
    return text[:limit]


def classify_loose_needs_diagram(
    llm: Any,
    rows: List[Dict[str, Any]],
    *,
    model: str,
) -> Dict[str, Dict[str, Any]]:
    """Return id -> {needs_diagram: bool, reason: str, presentation: str}."""
    out: Dict[str, Dict[str, Any]] = {}
    system = (
        "You classify whether an ESAT/TMUA multiple-choice question stem REQUIRES a diagram "
        "or graph to be fair and answerable. Reply with JSON only."
    )
    for row in rows:
        qid = str(row["id"])
        stem = _plain_stem(str(row.get("question_stem") or ""))
        user = (
            "Decide if this question needs an actual figure/graph/diagram image embedded in the stem.\n"
            "needs_diagram=true ONLY if the student cannot fairly answer without seeing a figure "
            "(e.g. 'the graph shows…', '[DIAGRAM]', 'as shown in the diagram', circuit diagram, "
            "velocity-time graph that must be read, labelled species map).\n"
            "needs_diagram=false if the stem only uses the word graph/diagram metaphorically "
            "(e.g. 'the graph of y against x is a straight line through (0,0) and (2,8)' with enough "
            "numbers given), or 'shown below' refers to a markdown table / equations already in text.\n\n"
            f"Subject: {row.get('subjects')}\n"
            f"Stem:\n{stem}\n\n"
            'Return JSON: {"needs_diagram": true|false, "presentation": "diagram"|"graph"|"table"|"text", '
            '"reason": "short reason"}'
        )
        try:
            raw = llm.generate(
                model,
                system,
                user,
                temperature=0.1,
                trace_label="diagram_need_classify",
            )
            from quality_gate.assess import extract_json_object

            data = extract_json_object(raw) or {}
            needs = bool(data.get("needs_diagram"))
            presentation = str(data.get("presentation") or ("diagram" if needs else "text")).lower()
            if presentation not in ("diagram", "graph", "table", "text"):
                presentation = "diagram" if needs else "text"
            out[qid] = {
                "needs_diagram": needs,
                "presentation": presentation,
                "reason": str(data.get("reason") or "")[:400],
            }
        except Exception as ex:
            # Fail closed for loose: do not generate unless we are sure
            out[qid] = {
                "needs_diagram": False,
                "presentation": "text",
                "reason": f"classify_failed: {ex}",
            }
        print(
            f"[classify] {qid[:8]}… {row.get('subjects')}: "
            f"needs={out[qid]['needs_diagram']} ({out[qid]['reason'][:80]})",
            flush=True,
        )
    return out


def queue_for_backfill(client: Any, rows: List[Dict[str, Any]], *, dry_run: bool) -> int:
    n = 0
    for row in rows:
        qid = str(row["id"])
        patch = {
            "quality_gate_graph_mode": "missing_expected",
            "quality_gate_graph_candidate": True,
            "svg_operator_backfill_choice": "queue",
            "quality_gate_graph_notes": (
                (row.get("quality_gate_graph_notes") or "").strip()
                or "Queued by remediate_missing_diagrams.py for expected but missing diagram."
            )[:4000],
        }
        if dry_run:
            print(f"[queue:dry] {qid}", flush=True)
        else:
            from quality_gate.supabase_io import update_question_assessment

            update_question_assessment(client, qid, patch)
            print(f"[queue] {qid}", flush=True)
        n += 1
    return n


def run_backfill_queued(*, dry_run: bool, limit: int) -> Dict[str, Any]:
    from quality_gate.image_backfill import run_missing_image_backfill

    log: List[str] = []
    stats = run_missing_image_backfill(
        limit=max(1, limit),
        dry_run=dry_run,
        require_operator_queue=True,
        allow_high_precision_image=True,
        replace_existing_diagram=False,
        diagram_mode="auto",
        route_graphs_to_svg=True,
        max_retries=1,
        log_lines=log,
        progress_callback=lambda m: print(m, flush=True),
    )
    return stats


def post_backfill_presentation_and_status(
    client: Any,
    confirmed_ids: List[str],
    *,
    dry_run: bool,
    keep_approved: bool = True,
) -> Dict[str, Any]:
    """Set presentation_type and restore approved after a successful diagram merge."""
    from quality_gate.supabase_io import update_question_assessment

    updated = 0
    for qid in confirmed_ids:
        row = _fetch_full_row(client, qid)
        if not row:
            continue
        stem = str(row.get("question_stem") or "")
        has_diag = (
            _has_any_diagram(row)
            or "<img" in stem.lower()
            or "<svg" in stem.lower()
            or bool(row.get("quality_gate_diagram_backfill_kind"))
        )
        if not has_diag:
            # Clear queue flag if backfill skipped/failed
            if not dry_run:
                update_question_assessment(
                    client,
                    qid,
                    {"svg_operator_backfill_choice": None},
                )
            continue
        presentation = "diagram"
        if re.search(r"\b(graph|plot)\b", stem, re.I) or "graph" in str(
            row.get("visual_type") or ""
        ).lower():
            presentation = "graph"
        patch: Dict[str, Any] = {
            "presentation_type": presentation,
            "has_visual": True,
            "svg_operator_backfill_choice": None,
        }
        if keep_approved and (row.get("status") or "").lower() == "pending":
            patch["status"] = "approved"
        if dry_run:
            print(f"[post:dry] {qid} presentation={presentation}", flush=True)
        else:
            update_question_assessment(client, qid, patch)
            print(
                f"[post] {qid} presentation={presentation} "
                f"status={patch.get('status', row.get('status'))}",
                flush=True,
            )
        updated += 1
    return {"updated": updated}


def _fetch_full_row(client: Any, qid: str) -> Optional[Dict[str, Any]]:
    resp = (
        client.table("ai_generated_questions")
        .select("*")
        .eq("id", qid)
        .limit(1)
        .execute()
    )
    rows = list(resp.data or [])
    return rows[0] if rows else None


def quality_gate_ids(
    client: Any,
    ids: List[str],
    *,
    dry_run: bool,
    model: str,
    job_id: str,
) -> Dict[str, Any]:
    from project import LLMClient
    from quality_gate.assess import assess_question
    from quality_gate.schemas import build_graph_notes_for_db
    from quality_gate.supabase_io import update_question_assessment

    llm = LLMClient()
    stats: Dict[str, Any] = {"assessed": 0, "failed": 0, "by_id": {}}
    for qid in ids:
        row = _fetch_full_row(client, qid)
        if not row:
            stats["failed"] += 1
            stats["by_id"][qid] = {"error": "not_found"}
            continue
        print(f"[qg] assess {qid}…", flush=True)
        try:
            result, _raw, used_model = assess_question(llm, row, model=model)
        except Exception as ex:
            stats["failed"] += 1
            stats["by_id"][qid] = {"error": str(ex)}
            print(f"[qg] FAIL {qid}: {ex}", flush=True)
            continue

        stats["assessed"] += 1
        stats["by_id"][qid] = {
            "verdict": result.verdict,
            "action": result.recommended_action,
            "graph_mode": result.graph_mode,
            "model": used_model,
        }
        if dry_run:
            print(
                f"[qg:dry] {qid} verdict={result.verdict} action={result.recommended_action} "
                f"graph={result.graph_mode}",
                flush=True,
            )
            continue

        patch = {
            "quality_gate_assessed_at": _iso_now(),
            "quality_gate_verdict": result.verdict,
            "quality_gate_action": result.recommended_action,
            "quality_gate_reason": (result.reasoning or "")[:8000],
            "quality_gate_payload": result.to_payload(),
            "quality_gate_job_id": job_id,
            "quality_gate_model": used_model,
            "quality_gate_graph_candidate": bool(result.graph_candidate),
            "quality_gate_graph_mode": result.graph_mode,
            "quality_gate_graph_notes": build_graph_notes_for_db(result),
        }
        if result.verdict == "Pass" and result.recommended_action == "approve":
            patch["status"] = "approved"
        update_question_assessment(client, qid, patch)
        print(
            f"[qg] {qid} verdict={result.verdict} action={result.recommended_action}",
            flush=True,
        )
    return stats


def main() -> int:
    parser = argparse.ArgumentParser(description="Remediate missing-diagram questions")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--skip-classify", action="store_true", help="Treat all loose as no-diagram")
    parser.add_argument("--skip-backfill", action="store_true")
    parser.add_argument("--skip-qg", action="store_true")
    parser.add_argument(
        "--resume-queue",
        action="store_true",
        help="Skip classify; process remaining svg_operator_backfill_choice=queue rows only",
    )
    parser.add_argument("--limit-loose", type=int, default=0, help="Optional cap on loose classify")
    parser.add_argument("--model", default="", help="Override QG / classify model")
    args = parser.parse_args()

    from quality_gate.defaults import default_sync_model
    from quality_gate.runner import init_env
    from quality_gate.supabase_io import get_supabase
    from project import LLMClient

    init_env()
    client = get_supabase()
    model = (args.model or "").strip() or default_sync_model()
    job_id = f"remediate-diagrams-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}"

    high: List[Dict[str, Any]] = []
    loose: List[Dict[str, Any]] = []
    classify: Dict[str, Dict[str, Any]] = {}
    loose_needed: List[Dict[str, Any]] = []
    confirmed: List[Dict[str, Any]] = []
    qg_id_list: List[str] = []

    if args.resume_queue:
        print("[resume] Loading remaining operator-queue rows…", flush=True)
        resp = (
            client.table("ai_generated_questions")
            .select("*")
            .eq("svg_operator_backfill_choice", "queue")
            .neq("status", "deleted")
            .limit(200)
            .execute()
        )
        queued_all = list(resp.data or [])
        confirmed = [r for r in queued_all if not _has_any_diagram(r)]
        print(f"  queued missing diagram: {len(confirmed)} / {len(queued_all)} queued", flush=True)
        qg_id_list = [str(r["id"]) for r in queued_all]
        if not confirmed and queued_all:
            confirmed = queued_all
    else:
        print("[1] Fetching approved candidates…", flush=True)
        high, loose = fetch_approved_candidates(client)
        print(f"  high-confidence: {len(high)}", flush=True)
        print(f"  loose-scan: {len(loose)}", flush=True)

        if loose and not args.skip_classify:
            print("[2] AI-classifying loose-scan for diagram need…", flush=True)
            llm = LLMClient()
            loose_work = loose[: args.limit_loose] if args.limit_loose > 0 else loose
            classify = classify_loose_needs_diagram(llm, loose_work, model=model)
        else:
            print("[2] Skipping loose classify", flush=True)

        loose_needed = [
            r for r in loose if classify.get(str(r["id"]), {}).get("needs_diagram")
        ]
        print(f"  loose needing diagram: {len(loose_needed)}", flush=True)

        seen: Set[str] = set()
        for r in high + loose_needed:
            qid = str(r["id"])
            if qid in seen:
                continue
            seen.add(qid)
            confirmed.append(r)

        print(f"[3] Confirmed remediation set: {len(confirmed)}", flush=True)
        print("[3b] Queuing for diagram backfill…", flush=True)
        queue_for_backfill(client, confirmed, dry_run=args.dry_run)
        qg_id_list = [str(r["id"]) for r in confirmed]

    backfill_stats: Dict[str, Any] = {"merged": 0, "skipped": 0, "failed": 0, "rounds": []}
    post_stats: Dict[str, Any] = {}
    if not args.skip_backfill and confirmed:
        print("[4] Running diagram backfill + verify QC (operator queue)…", flush=True)
        # Retry rounds so a transient Vertex disconnect does not abort the whole batch.
        for round_i in range(1, 4):
            remaining = (
                client.table("ai_generated_questions")
                .select("id, question_stem, has_visual, visual_type, quality_gate_diagram_backfill_kind, graphs")
                .eq("svg_operator_backfill_choice", "queue")
                .neq("status", "deleted")
                .limit(200)
                .execute()
            )
            still = [r for r in list(remaining.data or []) if not _has_any_diagram(r)]
            if not still:
                print(f"[4] No remaining queue rows without diagrams (round {round_i})", flush=True)
                break
            print(f"[4] Backfill round {round_i}: {len(still)} remaining…", flush=True)
            try:
                round_stats = run_backfill_queued(
                    dry_run=args.dry_run,
                    limit=len(still) + 5,
                )
                backfill_stats["rounds"].append(
                    {k: v for k, v in round_stats.items() if k != "row_audits"}
                )
                backfill_stats["merged"] += int(round_stats.get("merged") or 0)
                backfill_stats["skipped"] += int(round_stats.get("skipped") or 0)
                backfill_stats["failed"] += int(round_stats.get("failed") or 0)
            except Exception as ex:
                print(f"[4] Backfill round {round_i} crashed: {ex}", flush=True)
                backfill_stats["rounds"].append({"error": str(ex)})
                continue
        print(
            f"  totals merged={backfill_stats.get('merged')} skipped={backfill_stats.get('skipped')} "
            f"failed={backfill_stats.get('failed')}",
            flush=True,
        )
        print("[4b] Setting presentation_type / restoring approved after QC…", flush=True)
        # Use original confirmed ids + anything still/was queued
        id_set = {str(r["id"]) for r in confirmed}
        qresp = (
            client.table("ai_generated_questions")
            .select("id")
            .eq("svg_operator_backfill_choice", "queue")
            .limit(200)
            .execute()
        )
        for r in list(qresp.data or []):
            id_set.add(str(r["id"]))
        # Also include recently backfilled from this job's confirmed list
        post_stats = post_backfill_presentation_and_status(
            client,
            sorted(id_set),
            dry_run=args.dry_run,
            keep_approved=True,
        )
    else:
        print("[4] Skipping backfill", flush=True)

    qg_stats: Dict[str, Any] = {}
    if not args.skip_qg and qg_id_list:
        print("[5] Quality-gating remediated IDs only…", flush=True)
        qg_stats = quality_gate_ids(
            client,
            qg_id_list,
            dry_run=args.dry_run,
            model=model,
            job_id=job_id,
        )
    else:
        print("[5] Skipping quality gate", flush=True)

    report = {
        "job_id": job_id,
        "dry_run": args.dry_run,
        "resume_queue": bool(args.resume_queue),
        "generated_at": _iso_now(),
        "high_count": len(high),
        "loose_count": len(loose),
        "loose_needed_count": len(loose_needed),
        "confirmed_ids": [str(r["id"]) for r in confirmed],
        "high_ids": [str(r["id"]) for r in high],
        "loose_classifications": classify,
        "loose_needed_ids": [str(r["id"]) for r in loose_needed],
        "backfill": backfill_stats,
        "post_backfill": post_stats,
        "quality_gate": qg_stats,
    }
    REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"[done] Wrote {REPORT_PATH}", flush=True)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print("Interrupted", file=sys.stderr)
        raise SystemExit(130)
