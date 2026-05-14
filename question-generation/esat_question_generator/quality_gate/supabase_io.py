from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

_BASE = Path(__file__).resolve().parent.parent

from .schemas import CohortFilters


def load_env() -> None:
    try:
        from dotenv import load_dotenv
    except ImportError:
        load_dotenv = None  # type: ignore
    if not load_dotenv:
        return
    for p in (
        _BASE.parent.parent / ".env.local",
        _BASE.parent / ".env.local",
        _BASE / ".env.local",
    ):
        if p.is_file():
            load_dotenv(p, override=False)


def get_supabase():
    load_env()
    try:
        from supabase import create_client
    except ImportError as e:
        raise RuntimeError("Install supabase: pip install supabase") from e

    url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise RuntimeError("Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY")
    return create_client(url, key)


TABLE = "ai_generated_questions"


def _apply_test_type_filter(q: Any, test_type: Optional[str]) -> Any:
    """Match cohort behaviour: ESAT includes null test_type."""
    if test_type == "ESAT":
        return q.or_("test_type.eq.ESAT,test_type.is.null")
    if test_type == "TMUA":
        return q.eq("test_type", "TMUA")
    return q


def _count_pool_rows(
    client: Any,
    *,
    test_type: Optional[str],
    assessed_only: bool,
) -> int:
    """Exact count via PostgREST (falls back to capped fetch if count missing)."""
    q = client.table(TABLE).select("id", count="exact").neq("status", "deleted")
    q = _apply_test_type_filter(q, test_type)
    if assessed_only:
        q = q.not_.is_("quality_gate_assessed_at", "null")
    resp = q.execute()
    c = getattr(resp, "count", None)
    if c is not None:
        return int(c)
    q2 = client.table(TABLE).select("id").neq("status", "deleted")
    q2 = _apply_test_type_filter(q2, test_type)
    if assessed_only:
        q2 = q2.not_.is_("quality_gate_assessed_at", "null")
    n = 0
    offset = 0
    page = 2000
    while n < 200_000:
        r2 = q2.range(offset, offset + page - 1).execute()
        batch = list(r2.data or [])
        if not batch:
            break
        n += len(batch)
        if len(batch) < page:
            break
        offset += page
    return n


def count_questions_gate_overview(
    client: Any,
    *,
    test_type: Optional[str] = "ESAT",
) -> Dict[str, int]:
    """
    Non-deleted question counts for the pool: total vs assessed by the ESAT question checker (quality gate).
    ``test_type`` ``None`` = all exam types.
    """
    total = _count_pool_rows(client, test_type=test_type, assessed_only=False)
    assessed = _count_pool_rows(client, test_type=test_type, assessed_only=True)
    unassessed = max(0, total - assessed)
    pct = round(100.0 * assessed / total, 1) if total else 0.0
    return {
        "total": total,
        "assessed": assessed,
        "unassessed": unassessed,
        "pct_assessed": pct,
    }


def fetch_all_assessed_rows_for_overview(
    client: Any,
    *,
    test_type: Optional[str] = "ESAT",
    max_scan: int = 50_000,
    page_size: int = 500,
) -> List[Dict[str, Any]]:
    """
    All assessed questions in the pool (one row per question id). Paginates until exhausted or ``max_scan``.
    Caller sorts by review priority then slices for display.
    """
    out: List[Dict[str, Any]] = []
    offset = 0
    ps = max(100, min(page_size, 1000))
    cap = max(1, min(max_scan, 200_000))
    while len(out) < cap:
        q = (
            client.table(TABLE)
            .select(
                "id, status, media_upload_code, quality_gate_verdict, quality_gate_action, "
                "quality_gate_calibration_tier, quality_gate_graph_candidate, quality_gate_graph_mode, "
                "quality_gate_assessed_at, quality_gate_job_id"
            )
            .neq("status", "deleted")
            .not_.is_("quality_gate_assessed_at", "null")
        )
        q = _apply_test_type_filter(q, test_type)
        q = q.order("id").range(offset, offset + ps - 1)
        resp = q.execute()
        batch = list(resp.data or [])
        if not batch:
            break
        out.extend(batch)
        if len(batch) < ps:
            break
        offset += ps
    return out


SELECT_ASSESS = (
    "id, schema_id, subjects, difficulty, primary_tag, secondary_tags, test_type, status, "
    "question_stem, options, correct_option, solution_reasoning, solution_key_insight, "
    "distractor_map, schema_block_snapshot, quality_gate_assessed_at"
)


def fetch_cohort_page(
    client: Any,
    *,
    filters: CohortFilters,
    limit: int,
    offset: int,
    order: str = "id",
) -> List[Dict[str, Any]]:
    q = client.table(TABLE).select(SELECT_ASSESS)

    if filters.exclude_deleted:
        q = q.neq("status", "deleted")

    if filters.statuses:
        q = q.in_("status", filters.statuses)

    if filters.test_type == "ESAT":
        q = q.or_("test_type.eq.ESAT,test_type.is.null")
    elif filters.test_type == "TMUA":
        q = q.eq("test_type", "TMUA")
    # None = no test_type filter

    if filters.subjects:
        q = q.in_("subjects", filters.subjects)

    if filters.difficulties:
        q = q.in_("difficulty", filters.difficulties)

    if filters.schema_id_prefix:
        pref = filters.schema_id_prefix.strip()
        if pref:
            q = q.like("schema_id", f"{pref}%")

    if filters.only_unassessed:
        q = q.is_("quality_gate_assessed_at", "null")

    asc = not order.startswith("-")
    col = order[1:] if order.startswith("-") else order
    q = q.order(col, desc=not asc)
    q = q.range(offset, offset + max(0, limit) - 1)
    resp = q.execute()
    return list(resp.data or [])


def update_question_assessment(
    client: Any,
    question_id: str,
    fields: Dict[str, Any],
) -> None:
    resp = client.table(TABLE).update(fields).eq("id", question_id).execute()
    if resp.data is None and hasattr(resp, "error") and resp.error:
        raise RuntimeError(str(resp.error))


def fetch_question_stem_fields(client: Any, question_id: str) -> Dict[str, Any]:
    """
    Read-after-write helper for SVG backfill / debugging.

    Returns ``found``, ``question_stem``, ``question_stem_before_auto_diagram``, ``updated_at``.
    """
    resp = (
        client.table(TABLE)
        .select("question_stem,question_stem_before_auto_diagram,updated_at")
        .eq("id", question_id)
        .limit(1)
        .execute()
    )
    rows = list(resp.data or [])
    if not rows:
        return {
            "found": False,
            "question_stem": "",
            "question_stem_before_auto_diagram": None,
            "updated_at": "",
        }
    r = rows[0]
    return {
        "found": True,
        "question_stem": str(r.get("question_stem") or ""),
        "question_stem_before_auto_diagram": r.get("question_stem_before_auto_diagram"),
        "updated_at": str(r.get("updated_at") or ""),
    }


def soft_delete_questions(client: Any, ids: List[str]) -> int:
    if not ids:
        return 0
    client.table(TABLE).update({"status": "deleted"}).in_("id", ids).execute()
    return len(ids)


def fetch_quality_gate_job_result_rows(
    client: Any,
    job_id: str,
    *,
    page_size: int = 500,
    max_rows: int = 10_000,
) -> List[Dict[str, Any]]:
    """
    Rows from one quality-gate run for operator tables (walkthrough code, actions, flags).

    Paginates until ``max_rows`` or no more data. Excludes deleted questions.
    """
    out: List[Dict[str, Any]] = []
    offset = 0
    while len(out) < max_rows:
        take = min(page_size, max_rows - len(out))
        resp = (
            client.table(TABLE)
            .select(
                "id, status, media_upload_code, quality_gate_verdict, quality_gate_action, "
                "quality_gate_calibration_tier, quality_gate_graph_candidate, quality_gate_graph_mode"
            )
            .eq("quality_gate_job_id", job_id)
            .neq("status", "deleted")
            .order("id")
            .range(offset, offset + take - 1)
            .execute()
        )
        batch = list(resp.data or [])
        out.extend(batch)
        if len(batch) < take:
            break
        offset += take
    return out


def summarize_quality_gate_job(client: Any, job_id: str) -> Dict[str, Any]:
    """Histogram of actions plus calibration and graph-mode counts (paginated)."""
    page = 500
    offset = 0
    by_action: Dict[str, int] = {}
    calibration_gold = 0
    graph_candidates = 0
    graph_missing_expected = 0
    while True:
        resp = (
            client.table(TABLE)
            .select(
                "quality_gate_action,quality_gate_calibration_tier,quality_gate_graph_candidate,quality_gate_graph_mode"
            )
            .eq("quality_gate_job_id", job_id)
            .neq("status", "deleted")
            .range(offset, offset + page - 1)
            .execute()
        )
        rows = resp.data or []
        for r in rows:
            a = r.get("quality_gate_action") or "unknown"
            by_action[a] = by_action.get(a, 0) + 1
            if r.get("quality_gate_calibration_tier") == "gold":
                calibration_gold += 1
            if r.get("quality_gate_graph_candidate") is True:
                graph_candidates += 1
            if (r.get("quality_gate_graph_mode") or "") == "missing_expected":
                graph_missing_expected += 1
        if len(rows) < page:
            break
        offset += page
    return {
        "by_action": by_action,
        "calibration_gold": calibration_gold,
        "graph_candidates": graph_candidates,
        "graph_missing_expected": graph_missing_expected,
    }


def count_job_actions(client: Any, job_id: str) -> Dict[str, int]:
    """Count non-deleted rows per quality_gate_action for a job."""
    resp = (
        client.table(TABLE)
        .select("quality_gate_action")
        .eq("quality_gate_job_id", job_id)
        .neq("status", "deleted")
        .execute()
    )
    rows = resp.data or []
    counts: Dict[str, int] = {}
    for r in rows:
        a = r.get("quality_gate_action") or "unknown"
        counts[a] = counts.get(a, 0) + 1
    return counts


def fetch_ids_for_job_action(client: Any, job_id: str, action: str) -> List[str]:
    resp = (
        client.table(TABLE)
        .select("id")
        .eq("quality_gate_job_id", job_id)
        .eq("quality_gate_action", action)
        .neq("status", "deleted")
        .execute()
    )
    rows = resp.data or []
    return [str(r["id"]) for r in rows if r.get("id")]


def upsert_job_row(client: Any, job_id: str, filters: Dict[str, Any], stats: Optional[Dict[str, Any]] = None) -> None:
    row = {
        "id": job_id,
        "filters": filters,
        "stats": stats or {},
    }
    client.table("quality_gate_jobs").upsert(row, on_conflict="id").execute()


def patch_job_stats(client: Any, job_id: str, stats: Dict[str, Any], stopped: bool = False) -> None:
    patch: Dict[str, Any] = {"stats": stats}
    if stopped:
        from datetime import datetime, timezone

        patch["stopped_at"] = datetime.now(timezone.utc).isoformat()
    client.table("quality_gate_jobs").update(patch).eq("id", job_id).execute()


def list_quality_gate_jobs_recent(client: Any, *, limit: int = 50) -> List[Dict[str, Any]]:
    """Rows from ``quality_gate_jobs`` (newest first)."""
    resp = (
        client.table("quality_gate_jobs")
        .select("id, started_at, stopped_at, stats, filters")
        .order("started_at", desc=True)
        .limit(max(1, min(limit, 200)))
        .execute()
    )
    return list(resp.data or [])


def list_distinct_job_ids_from_questions(
    client: Any,
    *,
    limit: int = 80,
    exclude_ids: Optional[Set[str]] = None,
) -> List[str]:
    """
    Recent ``quality_gate_job_id`` values on questions (fallback when ``quality_gate_jobs`` is empty).
    """
    exclude_ids = exclude_ids or set()
    resp = (
        client.table(TABLE)
        .select("quality_gate_job_id, quality_gate_assessed_at")
        .neq("status", "deleted")
        .order("quality_gate_assessed_at", desc=True)
        .limit(800)
        .execute()
    )
    rows = list(resp.data or [])
    out: List[str] = []
    seen: set = set()
    for r in rows:
        jid = (r.get("quality_gate_job_id") or "").strip()
        if not jid or jid in seen or jid in exclude_ids:
            continue
        seen.add(jid)
        out.append(jid)
        if len(out) >= limit:
            break
    return out


def count_graph_flagged_rows(client: Any) -> int:
    """Non-deleted rows currently graph-flagged (candidate or missing_expected)."""
    resp = (
        client.table(TABLE)
        .select("id")
        .or_("quality_gate_graph_candidate.eq.true,quality_gate_graph_mode.eq.missing_expected")
        .neq("status", "deleted")
        .limit(10_001)
        .execute()
    )
    return len(list(resp.data or []))


def list_quality_gate_run_choices(client: Any, *, limit_jobs: int = 50) -> List[Dict[str, Any]]:
    """
    Recent runs: ``quality_gate_jobs`` first, then distinct ``quality_gate_job_id`` from questions
    not already listed.
    """
    jobs = list_quality_gate_jobs_recent(client, limit=limit_jobs)
    seen: set = {str(j.get("id") or "").strip() for j in jobs}
    seen.discard("")
    extra_ids = list_distinct_job_ids_from_questions(client, limit=40, exclude_ids=seen)
    out: List[Dict[str, Any]] = []
    for j in jobs:
        out.append(
            {
                "id": str(j.get("id") or "").strip(),
                "started_at": j.get("started_at"),
                "stopped_at": j.get("stopped_at"),
                "stats": j.get("stats") or {},
                "filters": j.get("filters"),
                "source": "jobs",
            }
        )
    for jid in extra_ids:
        out.append(
            {
                "id": jid,
                "started_at": None,
                "stopped_at": None,
                "stats": {},
                "filters": None,
                "source": "questions_only",
            }
        )
    return [x for x in out if x.get("id")]


def fetch_graph_candidates_missing_embedded_svg(
    client: Any,
    *,
    limit: int,
    page_size: int = 40,
    require_operator_queue: bool = False,
) -> List[Dict[str, Any]]:
    """
    Rows graph-flagged (candidate or missing_expected) whose ``question_stem`` does not yet contain ``<svg``.

    When ``require_operator_queue`` is True, only rows with ``svg_operator_backfill_choice`` = ``queue``
    (operator marked for regeneration in the Streamlit queue).

    Non-deleted only. Paginates until ``limit`` matches or the table is exhausted.
    """
    out: List[Dict[str, Any]] = []
    offset = 0
    lim = max(1, min(limit, 50_000))
    ps = max(10, min(page_size, 500))
    select_cols = (
        "id, media_upload_code, question_stem, quality_gate_graph_notes, quality_gate_payload, "
        "quality_gate_verdict, quality_gate_graph_candidate, svg_operator_backfill_choice, updated_at"
    )
    while len(out) < lim:
        q = (
            client.table(TABLE)
            .select(select_cols)
            .or_("quality_gate_graph_candidate.eq.true,quality_gate_graph_mode.eq.missing_expected")
            .neq("status", "deleted")
        )
        if require_operator_queue:
            q = q.eq("svg_operator_backfill_choice", "queue")
        resp = q.order("id").range(offset, offset + ps - 1).execute()
        batch = list(resp.data or [])
        if not batch:
            break
        for row in batch:
            stem = str(row.get("question_stem") or "")
            if "<svg" in stem.lower():
                continue
            out.append(row)
            if len(out) >= lim:
                break
        if len(batch) < ps:
            break
        offset += ps
    return out[:lim]


def count_graph_candidates_missing_embedded_svg(client: Any, *, max_scan: int = 2000) -> int:
    """How many graph-flagged rows have no ``<svg>`` in the stem (bounded scan)."""
    return len(
        fetch_graph_candidates_missing_embedded_svg(
            client, limit=max(1, min(max_scan, 20_000)), page_size=80
        )
    )


def clear_quality_gate_for_graph_flagged_rows(client: Any) -> int:
    """
    Clear quality-gate columns **only** for rows graph-flagged (candidate or missing_expected),
    so they can be re-scored. Other questions are unchanged.
    """
    n = count_graph_flagged_rows(client)
    if n == 0:
        return 0
    patch: Dict[str, Any] = {
        "quality_gate_assessed_at": None,
        "quality_gate_verdict": None,
        "quality_gate_action": None,
        "quality_gate_reason": None,
        "quality_gate_payload": None,
        "quality_gate_job_id": None,
        "quality_gate_model": None,
        "quality_gate_calibration_tier": None,
        "quality_gate_calibration_notes": None,
        "quality_gate_graph_candidate": False,
        "quality_gate_graph_mode": None,
        "quality_gate_graph_notes": None,
        "svg_operator_backfill_choice": None,
    }
    client.table(TABLE).update(patch).or_(
        "quality_gate_graph_candidate.eq.true,quality_gate_graph_mode.eq.missing_expected"
    ).neq("status", "deleted").execute()
    return n
