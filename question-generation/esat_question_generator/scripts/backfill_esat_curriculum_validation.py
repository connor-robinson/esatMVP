#!/usr/bin/env python3
"""
Backfill ESAT curriculum validation (validator v2).

Re-parses stored payloads, applies manual audit overrides, optionally re-runs the
LLM for inconsistent/malformed curriculum_match values, and updates active QG fields
with audit trail preserved in quality_gate_payload.

Examples (from ``esat_question_generator/``):

  python scripts/backfill_esat_curriculum_validation.py --dry-run --only-human-review
  python scripts/backfill_esat_curriculum_validation.py --dry-run --job-id 20260626-152707-323da66e
  python scripts/backfill_esat_curriculum_validation.py --apply --use-manual-overrides --limit 100
  python scripts/backfill_esat_curriculum_validation.py --apply --only-human-review --rerun-invalid
"""

from __future__ import annotations

import argparse
import json
import sys
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

_BASE = Path(__file__).resolve().parent.parent
_REPO = _BASE.parent.parent
if str(_BASE) not in sys.path:
    sys.path.insert(0, str(_BASE))

MANUAL_DEFAULT = _REPO / "esat_manual_curriculum_backfill_100.json"

SELECT_COLS = (
    "id, schema_id, subjects, difficulty, status, primary_tag, secondary_tags, test_type, "
    "question_stem, options, correct_option, solution_reasoning, solution_key_insight, "
    "distractor_map, quality_gate_assessed_at, quality_gate_payload, quality_gate_action, "
    "quality_gate_verdict, quality_gate_job_id"
)


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_payload(raw: Any) -> Dict[str, Any]:
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str) and raw.strip():
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return {}
    return {}


def load_manual_overrides(path: Path) -> Dict[str, Dict[str, Any]]:
    if not path.is_file():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    items = data.get("decisions") or data.get("questions") or data
    if isinstance(items, dict):
        items = items.get("items") or []
    out: Dict[str, Dict[str, Any]] = {}
    if not isinstance(items, list):
        return out
    for item in items:
        if not isinstance(item, dict):
            continue
        qid = str(item.get("id") or "").strip()
        if qid:
            out[qid] = item
    return out


def fetch_rows(
    client: Any,
    *,
    job_id: Optional[str],
    question_id: Optional[str],
    limit: int,
    only_human_review: bool,
    test_type_esat: bool = True,
) -> List[Dict[str, Any]]:
    if question_id:
        resp = (
            client.table("ai_generated_questions")
            .select(SELECT_COLS)
            .eq("id", question_id.strip())
            .neq("status", "deleted")
            .execute()
        )
        return list(resp.data or [])

    out: List[Dict[str, Any]] = []
    offset = 0
    page = 200
    while len(out) < limit:
        q = (
            client.table("ai_generated_questions")
            .select(SELECT_COLS)
            .neq("status", "deleted")
            .not_.is_("quality_gate_assessed_at", "null")
            .order("created_at", desc=True)
            .range(offset, offset + page - 1)
        )
        if test_type_esat:
            q = q.or_("test_type.eq.ESAT,test_type.is.null")
        if job_id:
            q = q.eq("quality_gate_job_id", job_id.strip())
        if only_human_review:
            q = q.neq("quality_gate_action", "approve")
        resp = q.execute()
        batch = list(resp.data or [])
        if not batch:
            break
        out.extend(batch)
        if len(batch) < page:
            break
        offset += page
    return out[:limit]


def fetch_rows_by_ids(client: Any, ids: List[str]) -> List[Dict[str, Any]]:
    """Fetch specific question rows by UUID (batched)."""
    out: List[Dict[str, Any]] = []
    unique = [i.strip() for i in ids if (i or "").strip()]
    for i in range(0, len(unique), 50):
        chunk = unique[i : i + 50]
        resp = (
            client.table("ai_generated_questions")
            .select(SELECT_COLS)
            .in_("id", chunk)
            .neq("status", "deleted")
            .execute()
        )
        out.extend(list(resp.data or []))
    return out


def _apply_manual(
    manual: Dict[str, Any],
) -> Tuple[str, str, str]:
    """Returns (curriculum_match, effective_action, reason)."""
    from quality_gate.schemas import normalize_recommended_action

    decision = str(manual.get("decision") or "").strip().lower()
    rec = normalize_recommended_action(manual.get("recommended_action")) or "human_review"
    reason = str(manual.get("reason") or "manual_audit")[:2000]
    if decision == "accept":
        return "in_syllabus", "approve", reason
    if decision == "borderline":
        return "borderline", "human_review", reason
    if decision == "reject":
        return "out_of_syllabus", rec, reason
    raise ValueError(f"unknown manual decision: {decision!r}")


def analyze_row(
    row: Dict[str, Any],
    *,
    manual: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    from quality_gate.curriculum_match_parse import (
        CURRICULUM_VALIDATOR_VERSION,
        detect_curriculum_inconsistency,
        parse_curriculum_match,
    )
    from quality_gate.schemas import (
        QualityGateResult,
        effective_action,
        effective_action_with_graph_queue,
        parse_quality_gate_json,
    )

    qid = str(row.get("id") or "")
    old_payload = _parse_payload(row.get("quality_gate_payload"))
    old_cv = old_payload.get("curriculum_validation") or {}
    old_match_raw = old_cv.get("curriculum_match")
    old_match = parse_curriculum_match(old_match_raw)
    old_eff = row.get("quality_gate_action") or old_payload.get("effective_recommended_action")
    old_status = (row.get("status") or "").lower()

    out: Dict[str, Any] = {
        "id": qid,
        "old_match_raw": old_match_raw,
        "old_match": old_match,
        "old_action": old_eff,
        "old_status": old_status,
        "bucket": "unchanged",
        "needs_rerun": False,
        "invalid_parse": old_match is None and old_match_raw is not None,
    }

    if manual:
        match, eff, reason = _apply_manual(manual)
        out.update(
            {
                "new_match": match,
                "new_action": eff,
                "new_status": "approved" if eff == "approve" else row.get("status"),
                "bucket": "manual_audit",
                "decision_source": "manual_audit",
                "manual_audit_version": manual.get("manual_audit_version") or "esat_100_v1",
                "reason": reason,
            }
        )
        if eff != old_eff or match != old_match:
            out["bucket"] = "manual_audit"
        else:
            out["bucket"] = "unchanged"
        return out

    # Strict re-parse of stored LLM payload
    raw_data = old_payload.get("raw") if isinstance(old_payload.get("raw"), dict) else old_payload
    try:
        if isinstance(raw_data, dict) and raw_data.get("verdict"):
            result = parse_quality_gate_json(deepcopy(raw_data))
        else:
            # Reconstruct minimal from stored curriculum_validation
            cv = old_cv
            stub = {
                "verdict": row.get("quality_gate_verdict") or "Pass",
                "scores": old_payload.get("scores") or {"syllabus_fit": cv.get("syllabus_fit_score", 3)},
                "recommended_action": old_payload.get("recommended_action") or row.get("quality_gate_action") or "human_review",
                "reasoning": old_payload.get("reasoning") or row.get("quality_gate_reason") or "backfill",
                "confidence": old_payload.get("confidence") or "medium",
                "curriculum_validation": cv,
            }
            result = parse_quality_gate_json(stub)
    except Exception as e:
        out["bucket"] = "invalid_model_output"
        out["error"] = str(e)
        out["needs_rerun"] = True
        out["new_action"] = "human_review"
        return out

    inc = result.curriculum_inconsistency_reason or detect_curriculum_inconsistency(
        curriculum_match=result.curriculum_match,
        syllabus_fit_score=result.syllabus_fit_score,
        curriculum_flags=[f.to_dict() for f in result.curriculum_flags],
        suspicious_topics=result.suspicious_topics,
        recommended_action=result.recommended_action,
        curriculum_reason=result.curriculum_reason,
    )
    if result.curriculum_validation_status != "valid" or result.curriculum_match is None:
        out["bucket"] = "invalid_model_output"
        out["needs_rerun"] = True
        out["new_action"] = "human_review"
        return out

    if inc:
        out["inconsistency"] = inc
        out["needs_rerun"] = True
        if out.get("bucket") == "unchanged":
            out["bucket"] = "would_reassess"

    base_eff = effective_action(result, row=row)
    new_eff = effective_action_with_graph_queue(result, base_eff)
    new_match = result.curriculum_match
    new_status = old_status
    if new_eff == "approve" and old_status != "approved":
        new_status = "approved"
    elif new_eff != "approve" and old_status == "approved":
        new_status = "pending_review"

    out["new_match"] = new_match
    out["new_action"] = new_eff
    out["new_status"] = new_status
    out["validator_version"] = CURRICULUM_VALIDATOR_VERSION

    if new_eff == old_eff and new_match == old_match and new_status == old_status:
        out["bucket"] = "unchanged"
    elif new_eff == "approve":
        out["bucket"] = "would_approve"
    elif new_eff == "human_review":
        out["bucket"] = "would_human_review"
    elif new_eff in ("regenerate", "delete"):
        out["bucket"] = "would_regenerate"
    elif new_eff == "move_to_math2":
        out["bucket"] = "would_move_module"
    else:
        out["bucket"] = "would_human_review"

    return out


def apply_update(
    client: Any,
    row: Dict[str, Any],
    analysis: Dict[str, Any],
    *,
    job_suffix: str,
    rerun_result: Optional[Any] = None,
    rerun_raw: str = "",
    rerun_model: str = "",
) -> None:
    from quality_gate.runner import build_graph_notes_for_db
    from quality_gate.supabase_io import update_question_assessment

    old_payload = _parse_payload(row.get("quality_gate_payload"))
    preserved = deepcopy(old_payload)
    preserved["preserved_at"] = _iso_now()
    preserved["preserved_reason"] = "curriculum_validator_v2_backfill"

    if rerun_result is not None:
        from quality_gate.schemas import effective_action, effective_action_with_graph_queue

        result = rerun_result
        base_eff = effective_action(result, row=row)
        eff = effective_action_with_graph_queue(result, base_eff)
        payload = result.to_payload()
        payload["effective_recommended_action"] = eff
        payload["raw_model_excerpt"] = (rerun_raw or "")[:4000]
        payload["quality_gate_payload_v1"] = preserved
        payload["curriculum_audit_v2"] = {
            "validator_version": "v2",
            "old_match": analysis.get("old_match"),
            "new_match": result.curriculum_match,
            "old_action": analysis.get("old_action"),
            "new_action": eff,
            "reason": analysis.get("inconsistency") or analysis.get("reason") or "v2_rerun",
            "timestamp": _iso_now(),
            "decision_source": analysis.get("decision_source") or "v2_rerun",
        }
        verdict = result.verdict
        reason = result.reasoning
        model = rerun_model
    else:
        eff = analysis["new_action"]
        match = analysis.get("new_match")
        payload = deepcopy(old_payload)
        cv = payload.get("curriculum_validation") or {}
        if not isinstance(cv, dict):
            cv = {}
        cv["curriculum_match"] = match
        cv["curriculum_validation_status"] = "valid" if match else "invalid_model_output"
        cv["curriculum_validator_version"] = "v2"
        payload["curriculum_validation"] = cv
        payload["effective_recommended_action"] = eff
        payload["quality_gate_payload_v1"] = preserved
        payload["curriculum_audit_v2"] = {
            "validator_version": "v2",
            "old_match": analysis.get("old_match"),
            "new_match": match,
            "old_action": analysis.get("old_action"),
            "new_action": eff,
            "reason": analysis.get("reason") or analysis.get("inconsistency") or "v2_reparse",
            "timestamp": _iso_now(),
            "decision_source": analysis.get("decision_source") or "v2_reparse",
        }
        if analysis.get("manual_audit_version"):
            payload["manual_audit_version"] = analysis["manual_audit_version"]
        verdict = row.get("quality_gate_verdict")
        reason = (cv.get("curriculum_reason") or row.get("quality_gate_reason") or "")[:8000]
        model = (old_payload.get("quality_gate_model") or row.get("quality_gate_model") or "v2-backfill")

    patch: Dict[str, Any] = {
        "quality_gate_assessed_at": _iso_now(),
        "quality_gate_verdict": verdict,
        "quality_gate_action": eff,
        "quality_gate_reason": reason[:8000] if isinstance(reason, str) else "",
        "quality_gate_payload": payload,
        "quality_gate_job_id": f"{job_suffix}-curriculum-v2",
        "quality_gate_model": model,
        "quality_gate_graph_notes": build_graph_notes_for_db(rerun_result) if rerun_result else row.get("quality_gate_graph_notes"),
    }
    new_status = analysis.get("new_status")
    if new_status and new_status != row.get("status"):
        patch["status"] = new_status

    update_question_assessment(client, str(row["id"]), patch)


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Backfill ESAT curriculum validation (v2).")
    parser.add_argument("--dry-run", action="store_true", help="Report only (default)")
    parser.add_argument("--apply", action="store_true", help="Write updates to Supabase")
    parser.add_argument("--job-id", default="", help="Limit to quality_gate_job_id")
    parser.add_argument("--question-id", default="", help="Single question UUID")
    parser.add_argument("--limit", type=int, default=5000)
    parser.add_argument("--only-human-review", action="store_true")
    parser.add_argument("--use-manual-overrides", action="store_true")
    parser.add_argument("--manual-file", default=str(MANUAL_DEFAULT))
    parser.add_argument("--rerun-invalid", action="store_true", help="Re-call LLM for invalid/inconsistent rows (apply only)")
    parser.add_argument("--model", default="", help="Override QG model for --rerun-invalid")
    ns = parser.parse_args(argv)
    dry_run = not ns.apply

    from quality_gate.runner import init_env
    from quality_gate.supabase_io import get_supabase

    init_env()
    client = get_supabase()

    manual_map: Dict[str, Dict[str, Any]] = {}
    if ns.use_manual_overrides:
        manual_map = load_manual_overrides(Path(ns.manual_file))
        print(f"Loaded {len(manual_map)} manual override(s) from {ns.manual_file}")

    rows = fetch_rows(
        client,
        job_id=(ns.job_id or "").strip() or None,
        question_id=(ns.question_id or "").strip() or None,
        limit=max(1, int(ns.limit)),
        only_human_review=bool(ns.only_human_review),
    )
    if manual_map and not (ns.question_id or "").strip():
        manual_ids = list(manual_map.keys())[: max(1, int(ns.limit))]
        rows = fetch_rows_by_ids(client, manual_ids)
    print(f"Loaded {len(rows)} row(s) dry_run={dry_run}")

    stats: Dict[str, int] = {
        "total_scanned": 0,
        "would_approve": 0,
        "would_human_review": 0,
        "would_regenerate": 0,
        "would_move_module": 0,
        "invalid_model_output": 0,
        "manual_audit": 0,
        "unchanged": 0,
        "would_reassess": 0,
        "errors": 0,
        "applied": 0,
    }

    llm = None
    model = (ns.model or "").strip()
    if ns.apply and ns.rerun_invalid:
        from project import LLMClient
        from quality_gate.assess import assess_question
        from quality_gate.defaults import default_sync_model

        llm = LLMClient()
        model = model or default_sync_model()

    job_suffix = (ns.job_id or "all").strip() or "all"

    for row in rows:
        qid = str(row.get("id") or "")
        if not qid:
            continue
        stats["total_scanned"] += 1
        manual = manual_map.get(qid) if qid in manual_map else None
        try:
            analysis = analyze_row(row, manual=manual)
            bucket = analysis.get("bucket") or "unchanged"
            if bucket in stats:
                stats[bucket] += 1
            elif bucket == "would_regenerate":
                stats["would_regenerate"] += 1
            elif bucket == "invalid_model_output":
                stats["invalid_model_output"] += 1

            if dry_run:
                if bucket != "unchanged":
                    print(
                        f"[dry] {qid[:8]} {bucket} match {analysis.get('old_match')} -> "
                        f"{analysis.get('new_match')} action {analysis.get('old_action')} -> "
                        f"{analysis.get('new_action')} rerun={analysis.get('needs_rerun')}"
                    )
                continue

            if bucket == "unchanged" and not manual:
                continue

            rerun_result = None
            rerun_raw = ""
            if analysis.get("needs_rerun") and ns.rerun_invalid and llm is not None and not manual:
                rerun_result, rerun_raw, used_model = assess_question(llm, row, model=model)
                model = used_model
                analysis["new_match"] = rerun_result.curriculum_match
                analysis["decision_source"] = "v2_rerun"

            apply_update(
                client,
                row,
                analysis,
                job_suffix=job_suffix,
                rerun_result=rerun_result,
                rerun_raw=rerun_raw,
                rerun_model=model,
            )
            stats["applied"] += 1
            print(f"[ok] {qid[:8]} {analysis.get('new_match')} -> {analysis.get('new_action')}")
        except Exception as e:
            stats["errors"] += 1
            print(f"[err] {qid}: {e}", file=sys.stderr)

    print("\n=== Summary ===")
    for k, v in stats.items():
        print(f"  {k}: {v}")
    if dry_run:
        print("\nNo changes written. Pass --apply to update production data.")
    return 0 if stats["errors"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
