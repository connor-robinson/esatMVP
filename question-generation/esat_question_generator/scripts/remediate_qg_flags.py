#!/usr/bin/env python3
"""
Remediate quality-gate flags on the live question bank.

1. Soft-delete all Major-verdict questions (take off bank)
2. Soft-delete questions that expect a diagram but have none
3. AI-rewrite Minor + human_review rows (stem/options/answer/solution allowed)
4. Re-run quality gate on rewritten rows; approve Pass; delete if still Major
   or still missing a required diagram

Usage (from esat_question_generator/):
  set PYTHONPATH=.
  python scripts/remediate_qg_flags.py --dry-run
  python scripts/remediate_qg_flags.py --delete-only
  python scripts/remediate_qg_flags.py
  python scripts/remediate_qg_flags.py --fix-only --limit 20
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

REPORT_PATH = Path(__file__).resolve().parent / "remediate_qg_flags_report.json"

EXPECTS_DIAGRAM_RE = re.compile(
    r"\[DIAGRAM\]|"
    r"(?:the|this|following|see the|as shown in the)\s+(?:diagram|figure)|"
    r"(?:the graph shows|graph shows|velocity-time graph|displacement-time graph)",
    re.I,
)


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def has_diagram(row: Dict[str, Any]) -> bool:
    stem = str(row.get("question_stem") or "")
    vt = str(row.get("visual_type") or "").strip().lower()
    if row.get("has_visual") is True and vt not in ("", "none", "concept_image_prompt"):
        return True
    if re.search(r'<figure[^>]*class=["\'][^"\']*qg-diagram', stem, re.I):
        return True
    if re.search(r"<svg[\s>]", stem, re.I):
        return True
    if re.search(r"<img[\s>]", stem, re.I):
        return True
    if "\\includegraphics" in stem:
        return True
    if row.get("quality_gate_diagram_backfill_kind"):
        return True
    graphs = row.get("graphs")
    if isinstance(graphs, dict) and graphs:
        return True
    if isinstance(graphs, str) and graphs.strip() not in ("", "{}", "null"):
        return True
    return False


def expects_diagram(row: Dict[str, Any]) -> bool:
    stem = str(row.get("question_stem") or "")
    mode = str(row.get("quality_gate_graph_mode") or "").strip().lower()
    if mode == "missing_expected":
        return True
    if row.get("answer_depends_on_visual") is True:
        return True
    if EXPECTS_DIAGRAM_RE.search(stem):
        return True
    return False


def fetch_all_active(client: Any) -> List[Dict[str, Any]]:
    cols = (
        "id,status,subjects,test_type,difficulty,primary_tag,secondary_tags,"
        "question_stem,options,correct_option,solution_reasoning,"
        "has_visual,visual_type,graphs,presentation_type,answer_depends_on_visual,"
        "quality_gate_verdict,quality_gate_action,quality_gate_reason,"
        "quality_gate_payload,quality_gate_graph_mode,quality_gate_graph_notes,"
        "quality_gate_diagram_backfill_kind,schema_id"
    )
    rows: List[Dict[str, Any]] = []
    page = 1000
    start = 0
    while True:
        resp = (
            client.table("ai_generated_questions")
            .select(cols)
            .neq("status", "deleted")
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
    return rows


def classify_rows(
    rows: List[Dict[str, Any]],
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
    majors: List[Dict[str, Any]] = []
    missing: List[Dict[str, Any]] = []
    fix: List[Dict[str, Any]] = []
    seen_fix: set[str] = set()

    for row in rows:
        qid = str(row["id"])
        verdict = str(row.get("quality_gate_verdict") or "").strip()
        action = str(row.get("quality_gate_action") or "").strip()

        if expects_diagram(row) and not has_diagram(row):
            missing.append(row)
            continue

        if verdict == "Major":
            majors.append(row)
            continue

        if verdict == "Minor" or action == "human_review":
            if qid not in seen_fix:
                seen_fix.add(qid)
                fix.append(row)

    return majors, missing, fix


def soft_delete_batch(
    client: Any,
    rows: List[Dict[str, Any]],
    *,
    dry_run: bool,
    reason: str,
) -> List[str]:
    from quality_gate.supabase_io import soft_delete_questions, update_question_assessment

    ids = [str(r["id"]) for r in rows]
    if not ids:
        return []
    print(f"[{reason}] soft-delete {len(ids)} rows…", flush=True)
    if dry_run:
        for qid in ids[:10]:
            print(f"  [dry] delete {qid}", flush=True)
        if len(ids) > 10:
            print(f"  [dry] …and {len(ids) - 10} more", flush=True)
        return ids

    for row in rows:
        qid = str(row["id"])
        notes = (row.get("quality_gate_graph_notes") or "")[:3500]
        note = f"{notes}\n[remediate_qg_flags:{_iso_now()}] soft-deleted: {reason}".strip()
        try:
            update_question_assessment(
                client,
                qid,
                {
                    "quality_gate_graph_notes": note[:4000],
                    "quality_gate_action": "delete",
                },
            )
        except Exception as ex:
            print(f"  [warn] note failed {qid[:8]}: {ex}", flush=True)

    for i in range(0, len(ids), 50):
        chunk = ids[i : i + 50]
        soft_delete_questions(client, chunk)
        print(f"  deleted {i + len(chunk)}/{len(ids)}", flush=True)
    return ids


def _options_as_dict(options: Any) -> Dict[str, str]:
    if isinstance(options, dict):
        return {str(k).upper()[:1]: str(v) for k, v in options.items() if str(k).strip()}
    if isinstance(options, list):
        out: Dict[str, str] = {}
        letters = "ABCDEFGH"
        for i, v in enumerate(options):
            if i < len(letters):
                out[letters[i]] = str(v)
        return out
    return {}


def ai_rewrite_row(
    llm: Any,
    row: Dict[str, Any],
    *,
    model: str,
) -> Dict[str, Any]:
    from quality_gate.assess import extract_json_object

    payload = row.get("quality_gate_payload")
    if isinstance(payload, str):
        try:
            payload = json.loads(payload)
        except Exception:
            payload = {}
    if not isinstance(payload, dict):
        payload = {}

    issues = {
        "verdict": row.get("quality_gate_verdict"),
        "action": row.get("quality_gate_action"),
        "reason": (row.get("quality_gate_reason") or "")[:3000],
        "disposition_labels": payload.get("disposition_labels") or [],
        "human_blocking_issues": payload.get("human_blocking_issues") or [],
        "auto_fixable_issues": (payload.get("auto_fix_triage") or {}).get(
            "auto_fixable_issues"
        )
        or [],
        "scores": payload.get("scores") or {},
        "graph_mode": row.get("quality_gate_graph_mode"),
        "graph_notes": (row.get("quality_gate_graph_notes") or "")[:1500],
    }

    system = (
        "You are an ESAT exam-question editor. Fix the multiple-choice question so it is "
        "syllabus-fit, unambiguous, correctly keyed, and has a sound short solution. "
        "You MAY change the stem, options A-E, correct_option, and solution_reasoning. "
        "Preserve any existing <svg> or <img> diagram HTML in the stem unless it is clearly wrong; "
        "do not invent a new diagram. Do not mention that you edited the question. "
        "Return ONLY valid JSON."
    )
    user = {
        "task": "Rewrite this question to clear the quality-gate issues.",
        "subject": row.get("subjects"),
        "primary_tag": row.get("primary_tag"),
        "secondary_tags": row.get("secondary_tags"),
        "difficulty": row.get("difficulty"),
        "test_type": row.get("test_type"),
        "issues": issues,
        "current": {
            "question_stem": row.get("question_stem"),
            "options": row.get("options"),
            "correct_option": row.get("correct_option"),
            "solution_reasoning": row.get("solution_reasoning"),
        },
        "output_schema": {
            "question_stem": "string (HTML/LaTeX ok; keep existing diagram markup if present)",
            "options": {
                "A": "string",
                "B": "string",
                "C": "string",
                "D": "string",
                "E": "string",
            },
            "correct_option": "A|B|C|D|E",
            "solution_reasoning": "string",
            "change_summary": "short note of what you fixed",
            "still_needs_human": False,
        },
    }

    raw = llm.generate(
        model=model,
        system_prompt=system,
        user_prompt=json.dumps(user, ensure_ascii=False, indent=2),
        temperature=0.25,
        trace_label=f"qg_fix:{row.get('id')}",
    )
    return extract_json_object(raw)


def validate_rewrite(parsed: Dict[str, Any], row: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    stem = str(parsed.get("question_stem") or "").strip()
    if len(stem) < 20:
        return None
    opts = _options_as_dict(parsed.get("options"))
    if len(opts) < 4:
        return None
    correct = str(parsed.get("correct_option") or "").strip().upper()[:1]
    if correct not in opts:
        return None
    sol = str(parsed.get("solution_reasoning") or "").strip()
    if len(sol) < 10:
        return None

    old_stem = str(row.get("question_stem") or "")
    if has_diagram(row) and not (
        re.search(r"<svg[\s>]", stem, re.I)
        or re.search(r"<img[\s>]", stem, re.I)
        or re.search(r"qg-diagram", stem, re.I)
    ):
        stem = old_stem

    return {
        "question_stem": stem,
        "options": opts,
        "correct_option": correct,
        "solution_reasoning": sol,
        "change_summary": str(parsed.get("change_summary") or "")[:1000],
        "still_needs_human": bool(parsed.get("still_needs_human")),
    }


def apply_rewrite_and_qg(
    client: Any,
    llm: Any,
    row: Dict[str, Any],
    *,
    model: str,
    dry_run: bool,
    job_id: str,
) -> Dict[str, Any]:
    from quality_gate.assess import assess_question
    from quality_gate.schemas import build_graph_notes_for_db
    from quality_gate.supabase_io import soft_delete_questions, update_question_assessment

    qid = str(row["id"])
    out: Dict[str, Any] = {"id": qid, "status": "failed"}

    try:
        parsed = ai_rewrite_row(llm, row, model=model)
        patch_content = validate_rewrite(parsed, row)
    except Exception as ex:
        out["error"] = f"rewrite_failed: {ex}"
        print(f"[fix] FAIL rewrite {qid[:8]}: {ex}", flush=True)
        return out

    if not patch_content:
        out["error"] = "invalid_rewrite_payload"
        print(f"[fix] FAIL invalid payload {qid[:8]}", flush=True)
        return out

    out["change_summary"] = patch_content.get("change_summary")
    print(
        f"[fix] {qid[:8]} summary={str(patch_content.get('change_summary') or '')[:120]}",
        flush=True,
    )

    if dry_run:
        out["status"] = "dry_run"
        return out

    content_patch = {
        "question_stem": patch_content["question_stem"],
        "options": patch_content["options"],
        "correct_option": patch_content["correct_option"],
        "solution_reasoning": patch_content["solution_reasoning"],
    }
    update_question_assessment(client, qid, content_patch)

    resp = (
        client.table("ai_generated_questions")
        .select("*")
        .eq("id", qid)
        .limit(1)
        .execute()
    )
    fresh = (resp.data or [None])[0]
    if not fresh:
        out["error"] = "missing_after_patch"
        return out

    if expects_diagram(fresh) and not has_diagram(fresh):
        soft_delete_questions(client, [qid])
        out["status"] = "deleted_missing_diagram_after_fix"
        print(f"[fix] deleted {qid[:8]} (still missing diagram)", flush=True)
        return out

    try:
        result, _raw, used_model = assess_question(llm, fresh, model=model)
    except Exception as ex:
        out["error"] = f"qg_failed: {ex}"
        out["status"] = "rewritten_qg_failed"
        print(f"[fix] QG FAIL {qid[:8]}: {ex}", flush=True)
        return out

    out["verdict"] = result.verdict
    out["action"] = result.recommended_action
    out["qg_model"] = used_model

    qg_patch: Dict[str, Any] = {
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

    if result.verdict == "Major" or result.recommended_action in ("delete", "regenerate"):
        qg_patch["quality_gate_action"] = "delete"
        update_question_assessment(client, qid, qg_patch)
        soft_delete_questions(client, [qid])
        out["status"] = "deleted_still_major"
        print(
            f"[fix] deleted {qid[:8]} (still Major/{result.recommended_action})",
            flush=True,
        )
        return out

    if result.verdict == "Pass" and result.recommended_action == "approve":
        qg_patch["status"] = "approved"
        update_question_assessment(client, qid, qg_patch)
        out["status"] = "approved"
        print(f"[fix] approved {qid[:8]}", flush=True)
        return out

    # Residual Minor / human_review: keep off student bank.
    if (fresh.get("status") or "").lower() == "approved":
        qg_patch["status"] = "pending"
    update_question_assessment(client, qid, qg_patch)
    out["status"] = "rewritten_needs_review"
    print(
        f"[fix] review {qid[:8]} verdict={result.verdict} action={result.recommended_action}",
        flush=True,
    )
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description="Remediate Major/Minor/human_review QG flags")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--delete-only",
        action="store_true",
        help="Only soft-delete Major + missing diagram",
    )
    parser.add_argument("--fix-only", action="store_true", help="Skip deletes; only AI-fix")
    parser.add_argument("--limit", type=int, default=0, help="Cap AI-fix rows")
    parser.add_argument("--model", default="", help="Override rewrite/QG model")
    parser.add_argument("--sleep", type=float, default=1.5, help="Pause between AI fixes")
    args = parser.parse_args()

    from project import LLMClient
    from quality_gate.defaults import default_sync_model
    from quality_gate.runner import init_env
    from quality_gate.supabase_io import get_supabase

    init_env()
    client = get_supabase()
    model = (args.model or "").strip() or default_sync_model()
    job_id = f"remediate-qg-flags-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}"

    print("[1] Loading active questions…", flush=True)
    rows = fetch_all_active(client)
    majors, missing, fix = classify_rows(rows)
    print(
        f"  active={len(rows)} major={len(majors)} missing_diagram={len(missing)} "
        f"fix_candidates={len(fix)}",
        flush=True,
    )

    report: Dict[str, Any] = {
        "job_id": job_id,
        "dry_run": bool(args.dry_run),
        "generated_at": _iso_now(),
        "counts": {
            "active": len(rows),
            "major": len(majors),
            "missing_diagram": len(missing),
            "fix_candidates": len(fix),
        },
        "deleted_major_ids": [],
        "deleted_missing_diagram_ids": [],
        "fix_results": [],
    }

    if not args.fix_only:
        report["deleted_major_ids"] = soft_delete_batch(
            client, majors, dry_run=args.dry_run, reason="major"
        )
        report["deleted_missing_diagram_ids"] = soft_delete_batch(
            client, missing, dry_run=args.dry_run, reason="missing_diagram"
        )

    if args.delete_only:
        REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(f"[done] Wrote {REPORT_PATH}", flush=True)
        return 0

    targets = fix
    if args.limit and args.limit > 0:
        targets = targets[: args.limit]
    print(f"[2] AI-fixing {len(targets)} rows with model={model!r}…", flush=True)

    llm = LLMClient()
    stats = {
        "approved": 0,
        "rewritten_needs_review": 0,
        "deleted_still_major": 0,
        "deleted_missing_diagram_after_fix": 0,
        "failed": 0,
        "dry_run": 0,
        "rewritten_qg_failed": 0,
    }
    for i, row in enumerate(targets, 1):
        print(f"[fix {i}/{len(targets)}] {row['id']} ({row.get('subjects')})…", flush=True)
        result = apply_rewrite_and_qg(
            client,
            llm,
            row,
            model=model,
            dry_run=args.dry_run,
            job_id=job_id,
        )
        report["fix_results"].append(result)
        st = str(result.get("status") or "failed")
        if st in stats:
            stats[st] += 1
        else:
            stats["failed"] += 1
        if not args.dry_run:
            time.sleep(max(0.0, float(args.sleep)))

    report["fix_stats"] = stats
    REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"[done] fix_stats={stats}", flush=True)
    print(f"[done] Wrote {REPORT_PATH}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
