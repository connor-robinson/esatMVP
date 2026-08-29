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

    def build_query():
        q = client.table("questions").select("*")
        if question_id is not None:
            q = q.eq("id", question_id)
        if paper_id is not None:
            q = q.eq("paper_id", paper_id)
        if exam_name is not None:
            q = q.eq("exam_name", exam_name.upper())
        return q.order("paper_id").order("question_number").order("id")

    if limit is not None:
        resp = build_query().limit(limit).execute()
        return resp.data or []

    rows: List[Dict[str, Any]] = []
    page_size = 1000
    offset = 0
    while True:
        page = build_query().range(offset, offset + page_size - 1).execute().data or []
        rows.extend(page)
        if len(page) < page_size:
            break
        offset += page_size
    return rows


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


def mark_conversion_for_human_crop(
    question_id: int,
    *,
    asset_ids: Optional[List[str]] = None,
    note: str = "Crop includes adjacent question or answer-choice content.",
) -> Dict[str, Any]:
    """Keep a complete crop live while placing it in the manual-crop queue."""
    client = make_client()
    rows = (
        client.table("question_conversions")
        .select("id,conversion_report,diagram_assets")
        .eq("question_id", question_id)
        .eq("status", "auto_approved")
        .order("updated_at", desc=True)
        .limit(1)
        .execute()
        .data
        or []
    )
    if not rows:
        raise RuntimeError(f"No active approved conversion for question {question_id}")

    row = rows[0]
    assets = [dict(asset) for asset in (row.get("diagram_assets") or [])]
    selected = set(asset_ids or [str(asset.get("id")) for asset in assets])
    known = {str(asset.get("id")) for asset in assets}
    missing = sorted(selected - known)
    if missing:
        raise ValueError(f"Unknown asset IDs for question {question_id}: {missing}")

    for asset in assets:
        if str(asset.get("id")) in selected:
            asset["crop_review_status"] = "needs_human_crop"
            asset["crop_review_reason"] = "overinclusive_adjacent_content"

    report = dict(row.get("conversion_report") or {})
    report.update(
        {
            "diagram_reviewed": False,
            "diagram_review_status": "needs_review",
            "human_crop_required": True,
            "human_crop_reason": "overinclusive_adjacent_content",
            "human_crop_asset_ids": sorted(selected),
            "human_crop_notes": note,
        }
    )
    updated = (
        client.table("question_conversions")
        .update({"conversion_report": report, "diagram_assets": assets})
        .eq("id", row["id"])
        .execute()
        .data
        or []
    )

    report_reason = (
        f"Human crop required: over-inclusive diagram crop. {note} "
        f"Affected assets: {', '.join(sorted(selected))}."
    )
    existing_reports = (
        client.table("question_conversion_reports")
        .select("id")
        .eq("question_id", question_id)
        .eq("report_reason", report_reason)
        .limit(1)
        .execute()
        .data
        or []
    )
    if not existing_reports:
        client.table("question_conversion_reports").insert(
            {
                "question_id": question_id,
                "user_id": None,
                "report_reason": report_reason,
            }
        ).execute()
    return (updated or [{"conversion_report": report, "diagram_assets": assets}])[0]


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


def _is_protected_questions_error(exc: Exception) -> bool:
    msg = str(exc)
    return "protected data" in msg.lower() or "not allowed on table questions" in msg.lower()


def approve_question_text(question_id: int, payload: Dict[str, Any]) -> bool:
    """Copy approved conversion text into questions. Returns False if blocked."""
    client = make_client()
    update_payload = {
        "question_stem": payload.get("question_stem"),
        "options": payload.get("options"),
        "diagram_assets": payload.get("diagram_assets"),
        "content_format": payload.get("content_format", "text"),
    }
    rpc_args = {
        "p_question_id": question_id,
        "p_question_stem": update_payload["question_stem"],
        "p_options": update_payload["options"],
        "p_diagram_assets": update_payload["diagram_assets"],
        "p_content_format": update_payload["content_format"],
    }

    try:
        client.rpc("approve_question_text_conversion", rpc_args).execute()
        return True
    except Exception as rpc_exc:
        if _is_protected_questions_error(rpc_exc):
            return False
        msg = str(rpc_exc).lower()
        rpc_missing = (
            "approve_question_text_conversion" in msg
            or "pgrst202" in msg
            or "does not exist" in msg
        )
        if not rpc_missing:
            raise

    try:
        client.table("questions").update(update_payload).eq("id", question_id).execute()
        return True
    except Exception as exc:
        if "content_format" in str(exc) or "question_stem" in str(exc):
            if "does not exist" in str(exc) or "PGRST204" in str(exc):
                raise RuntimeError(
                    "questions text columns missing. Apply migration "
                    "supabase/migrations/20260627100000_past_paper_text_conversion.sql"
                ) from exc
        if _is_protected_questions_error(exc):
            return False
        raise


def fetch_authoritative_recovered_conversion(
    question_id: int,
) -> Optional[Dict[str, Any]]:
    """Return a verified recovery that supersedes a known-incomplete legacy image."""
    client = make_client()
    resp = (
        client.table("question_conversions")
        .select("*")
        .eq("question_id", question_id)
        .eq("status", "auto_approved")
        .contains("conversion_report", {"source_recovered": True})
        .order("updated_at", desc=True)
        .limit(1)
        .execute()
    )
    rows = resp.data or []
    return rows[0] if rows else None


def mark_conversion_source_recovered(
    question_id: int,
    image_hash: str,
    *,
    source_reference: str,
    original_source_image_url: str,
) -> bool:
    """Make an approved recovery the idempotent source of truth for future runs."""
    client = make_client()
    rows = (
        client.table("question_conversions")
        .select("conversion_report")
        .eq("question_id", question_id)
        .eq("source_image_hash", image_hash)
        .eq("status", "auto_approved")
        .limit(1)
        .execute()
        .data
        or []
    )
    if not rows:
        return False
    report = dict(rows[0].get("conversion_report") or {})
    report.update(
        {
            "source_recovered": True,
            "source_reference": source_reference,
            "original_source_image_url": original_source_image_url,
        }
    )
    updated = (
        client.table("question_conversions")
        .update({"conversion_report": report})
        .eq("question_id", question_id)
        .eq("source_image_hash", image_hash)
        .eq("status", "auto_approved")
        .execute()
        .data
        or []
    )
    return bool(updated)


def replace_question_image_source(question_id: int, image_url: str) -> bool:
    """Replace a demonstrably incomplete source image; report protected-table blocks."""
    client = make_client()
    try:
        client.rpc(
            "set_question_image",
            {"p_question_id": question_id, "p_question_image": image_url},
        ).execute()
        return True
    except Exception as rpc_exc:
        if _is_protected_questions_error(rpc_exc):
            return False
        msg = str(rpc_exc).lower()
        rpc_missing = (
            "set_question_image" in msg
            or "pgrst202" in msg
            or "does not exist" in msg
        )
        if not rpc_missing:
            raise

    try:
        client.table("questions").update({"question_image": image_url}).eq(
            "id", question_id
        ).execute()
        return True
    except Exception as exc:
        if _is_protected_questions_error(exc):
            return False
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
