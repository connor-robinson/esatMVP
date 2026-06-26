"""Supabase database access for past paper conversion."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from .config import supabase_service_key, supabase_url

try:
    from supabase import create_client, Client
except ImportError as exc:
    raise RuntimeError("pip install supabase>=2.0.0") from exc


def make_client() -> Client:
    return create_client(supabase_url(), supabase_service_key())


def fetch_questions(
    *,
    paper_id: Optional[int] = None,
    exam_name: Optional[str] = None,
    question_id: Optional[int] = None,
    limit: Optional[int] = None,
) -> List[Dict[str, Any]]:
    client = make_client()
    q = client.table("questions").select("*")
    if question_id is not None:
        q = q.eq("id", question_id)
    if paper_id is not None:
        q = q.eq("paper_id", paper_id)
    if exam_name is not None:
        q = q.eq("exam_name", exam_name.upper())
    q = q.order("paper_id").order("question_number")
    if limit is not None:
        q = q.limit(limit)
    resp = q.execute()
    return resp.data or []


def _is_missing_table_error(exc: Exception) -> bool:
    msg = str(exc)
    return "question_conversions" in msg and ("PGRST205" in msg or "does not exist" in msg)


def fetch_existing_conversion(question_id: int, image_hash: str) -> Optional[Dict[str, Any]]:
    try:
        client = make_client()
        resp = (
            client.table("question_conversions")
            .select("*")
            .eq("question_id", question_id)
            .eq("source_image_hash", image_hash)
            .eq("status", "auto_approved")
            .limit(1)
            .execute()
        )
        rows = resp.data or []
        return rows[0] if rows else None
    except Exception as exc:
        if _is_missing_table_error(exc):
            return None
        raise


def supersede_conversions(question_id: int) -> None:
    client = make_client()
    client.table("question_conversions").update({"status": "superseded"}).eq(
        "question_id", question_id
    ).neq("status", "superseded").execute()


def upsert_conversion(row: Dict[str, Any]) -> Dict[str, Any]:
    try:
        client = make_client()
        resp = client.table("question_conversions").upsert(
            row,
            on_conflict="question_id,source_image_hash",
        ).execute()
        return (resp.data or [row])[0]
    except Exception as exc:
        if _is_missing_table_error(exc):
            raise RuntimeError(
                "question_conversions table missing. Apply migration "
                "supabase/migrations/20260627100000_past_paper_text_conversion.sql"
            ) from exc
        raise


def approve_question_text(question_id: int, payload: Dict[str, Any]) -> None:
    client = make_client()
    update_payload = {
        "question_stem": payload.get("question_stem"),
        "options": payload.get("options"),
        "diagram_assets": payload.get("diagram_assets"),
        "content_format": payload.get("content_format", "text"),
    }
    try:
        client.table("questions").update(update_payload).eq("id", question_id).execute()
    except Exception as exc:
        # content_format column may not exist until migration
        if "content_format" in str(exc) or "question_stem" in str(exc):
            raise RuntimeError(
                "questions text columns missing. Apply migration "
                "supabase/migrations/20260627100000_past_paper_text_conversion.sql"
            ) from exc
        raise


def fetch_conversions_by_paper(paper_id: int) -> List[Dict[str, Any]]:
    client = make_client()
    questions = fetch_questions(paper_id=paper_id)
    qids = [q["id"] for q in questions]
    if not qids:
        return []
    resp = (
        client.table("question_conversions")
        .select("*")
        .in_("question_id", qids)
        .order("question_id")
        .execute()
    )
    return resp.data or []


def fetch_paper_ids() -> List[int]:
    client = make_client()
    resp = client.table("papers").select("id").order("id").execute()
    return [r["id"] for r in (resp.data or [])]
