"""Apply mid-stem placement sidecars to live question rows.

Reads ``_cache/stem_placements/q{id}.json`` (from ``place-stems``), inserts
inline figure embeds at the chosen block slots, normalizes display width from
existing crops (no recrop), and publishes to ``questions`` + ``question_conversions``.
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set

from .db import approve_question_text, make_client
from .display_size import attach_display_widths
from .export_questions import download_image
from .place_stems import (
    PLACEMENTS_DIR,
    load_place_candidates,
    load_sidecar,
    write_sidecar_record,
)
from .stem_blocks import apply_placements_to_stem, validate_placements

APPLY_STATUS_FILE = PLACEMENTS_DIR / ".apply_status.json"
PAGE_SIZE = 1000


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _write_json(path, payload: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def write_apply_status(payload: Dict[str, Any]) -> None:
    _write_json(APPLY_STATUS_FILE, payload)


def _is_applied(sidecar: Dict[str, Any]) -> bool:
    return bool(sidecar.get("applyStatus") == "ok")


def _paginate(build_query) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    offset = 0
    while True:
        page = build_query().range(offset, offset + PAGE_SIZE - 1).execute().data or []
        rows.extend(page)
        if len(page) < PAGE_SIZE:
            return rows
        offset += PAGE_SIZE


def _fetch_live_question(question_id: int) -> Optional[Dict[str, Any]]:
    client = make_client()
    resp = (
        client.table("questions")
        .select("id, question_stem, options, diagram_assets, content_format")
        .eq("id", question_id)
        .limit(1)
        .execute()
    )
    rows = resp.data or []
    return rows[0] if rows else None


def _fetch_latest_conversion(question_id: int) -> Optional[Dict[str, Any]]:
    client = make_client()
    resp = (
        client.table("question_conversions")
        .select("id, question_stem, options, diagram_assets, conversion_report, status")
        .eq("question_id", question_id)
        .neq("status", "superseded")
        .order("updated_at", desc=True)
        .limit(1)
        .execute()
    )
    rows = resp.data or []
    return rows[0] if rows else None


def _update_conversion_row(
    conversion_id: int,
    *,
    question_stem: str,
    diagram_assets: List[Dict[str, Any]],
    report_patch: Dict[str, Any],
) -> None:
    client = make_client()
    row = (
        client.table("question_conversions")
        .select("conversion_report")
        .eq("id", conversion_id)
        .limit(1)
        .execute()
        .data
        or [{}]
    )[0]
    report = dict(row.get("conversion_report") or {})
    report.update(report_patch)
    client.table("question_conversions").update(
        {
            "question_stem": question_stem,
            "diagram_assets": diagram_assets,
            "conversion_report": report,
        }
    ).eq("id", conversion_id).execute()


def apply_one_sidecar(
    sidecar: Dict[str, Any],
    *,
    dry_run: bool = False,
) -> Dict[str, Any]:
    """Apply a single ok sidecar. Returns result metadata."""
    qid = int(sidecar["questionId"])
    if sidecar.get("status") != "ok":
        return {
            "questionId": qid,
            "status": "skipped",
            "reason": f"sidecar status={sidecar.get('status')}",
        }

    placements = sidecar.get("placements") or []
    blocks = sidecar.get("stemBlocks") or []
    sidecar_assets = sidecar.get("assets") or []
    asset_ids = [str(a["id"]) for a in sidecar_assets]
    normalized, error = validate_placements(
        placements,
        asset_ids=asset_ids,
        block_count=len(blocks),
    )
    if error:
        return {"questionId": qid, "status": "failed", "error": error}

    live = _fetch_live_question(qid) or {}
    conversion = _fetch_latest_conversion(qid) or {}
    live_assets = list(live.get("diagram_assets") or conversion.get("diagram_assets") or [])
    assets_by_id = {str(a.get("id")): dict(a) for a in live_assets if a.get("id")}

    missing = [aid for aid in asset_ids if aid not in assets_by_id]
    if missing:
        return {
            "questionId": qid,
            "status": "failed",
            "error": f"missing live assets: {', '.join(missing)}",
        }

    crop_bytes_by_id: Dict[str, bytes] = {}
    fetch_errors: Dict[str, str] = {}
    for asset_id in asset_ids:
        url = str(assets_by_id[asset_id].get("url") or "")
        if not url:
            fetch_errors[asset_id] = "missing url"
            continue
        try:
            crop_bytes_by_id[asset_id] = download_image(url)
        except Exception as exc:
            fetch_errors[asset_id] = str(exc)

    sized_assets = attach_display_widths(
        [assets_by_id[aid] for aid in asset_ids],
        crop_bytes_by_id=crop_bytes_by_id,
    )
    for asset in sized_assets:
        assets_by_id[str(asset["id"])] = asset

    placements_with_size: List[Dict[str, Any]] = []
    for row in normalized:
        asset = assets_by_id[str(row["assetId"])]
        placements_with_size.append(
            {
                **row,
                "displayWidthPct": asset.get("display_width_pct"),
            }
        )

    stem_text = apply_placements_to_stem(blocks, placements_with_size, assets_by_id)
    options = dict(conversion.get("options") or live.get("options") or {})

    # Preserve graphical options and any non-stem assets on the live row.
    stem_ids: Set[str] = set(asset_ids)
    merged_assets: List[Dict[str, Any]] = []
    for asset in live_assets:
        if str(asset.get("id")) not in stem_ids:
            merged_assets.append(dict(asset))
    for asset_id in asset_ids:
        merged_assets.append(dict(assets_by_id[asset_id]))

    result = {
        "questionId": qid,
        "status": "ok",
        "blockCount": len(blocks),
        "placementCount": len(placements_with_size),
        "displayWidths": {
            str(a["id"]): a.get("display_width_pct") for a in sized_assets
        },
        "fetchErrors": fetch_errors,
        "stemPreview": stem_text[:240] + ("..." if len(stem_text) > 240 else ""),
    }

    if dry_run:
        result["status"] = "dry_run"
        return result

    published = approve_question_text(
        qid,
        {
            "question_stem": stem_text,
            "options": options,
            "diagram_assets": merged_assets,
            "content_format": live.get("content_format") or "text",
        },
    )
    if not published:
        result["status"] = "failed"
        result["error"] = "questions table blocked publish (protected trigger?)"
        return result

    report_patch = {
        "stem_placements_applied": True,
        "stem_placements_applied_at": _now_iso(),
        "stem_placement_model": sidecar.get("model"),
    }
    conversion_id = conversion.get("id")
    if conversion_id:
        _update_conversion_row(
            int(conversion_id),
            question_stem=stem_text,
            diagram_assets=merged_assets,
            report_patch=report_patch,
        )

    sidecar_out = dict(sidecar)
    sidecar_out["placements"] = placements_with_size
    sidecar_out["appliedStem"] = stem_text
    sidecar_out["applyStatus"] = "ok"
    sidecar_out["appliedAt"] = _now_iso()
    sidecar_out["displayWidths"] = result["displayWidths"]
    write_sidecar_record(sidecar_out)

    return result


def apply_stems(
    *,
    all_questions: bool = False,
    question_id: Optional[int] = None,
    exam_name: Optional[str] = None,
    limit: Optional[int] = None,
    dry_run: bool = False,
    resume: bool = False,
    force: bool = False,
) -> Dict[str, Any]:
    """Apply all matching placement sidecars."""
    if not all_questions and question_id is None and not exam_name:
        raise ValueError("Pass --all, --question-id, or --exam")

    candidates = load_place_candidates(
        question_id=question_id,
        exam_name=exam_name,
        limit=limit,
    )
    candidate_ids = [int(c["questionId"]) for c in candidates]
    if question_id is not None and question_id not in candidate_ids:
        candidate_ids = [question_id]

    status: Dict[str, Any] = {
        "status": "running",
        "total": 0,
        "completed": 0,
        "successful": 0,
        "failed": 0,
        "skippedResume": 0,
        "skippedNoSidecar": 0,
        "skippedNotOk": 0,
        "dryRun": dry_run,
        "startedAt": _now_iso(),
        "perId": {},
    }

    to_apply: List[Dict[str, Any]] = []
    for qid in candidate_ids:
        sidecar = load_sidecar(qid)
        if not sidecar:
            status["skippedNoSidecar"] += 1
            continue
        if sidecar.get("status") != "ok":
            status["skippedNotOk"] += 1
            continue
        if resume and not force and _is_applied(sidecar):
            status["skippedResume"] += 1
            continue
        to_apply.append(sidecar)

    status["total"] = len(to_apply)
    status["message"] = f"Applying {len(to_apply)} placement sidecar(s)"
    write_apply_status(status)

    for sidecar in to_apply:
        qid = str(sidecar["questionId"])
        try:
            result = apply_one_sidecar(sidecar, dry_run=dry_run)
        except Exception as exc:
            result = {
                "questionId": int(sidecar["questionId"]),
                "status": "failed",
                "error": str(exc),
            }

        status["completed"] += 1
        outcome = str(result.get("status") or "failed")
        if outcome in ("ok", "dry_run"):
            status["successful"] += 1
        elif outcome != "skipped":
            status["failed"] += 1
        status["perId"][qid] = outcome
        status["message"] = f"{status['completed']}/{status['total']}: q{qid} {outcome}"
        write_apply_status(status)
        print(status["message"], file=sys.stderr, flush=True)

    status["status"] = "completed"
    status["finishedAt"] = _now_iso()
    status["message"] = (
        f"Done: {status['successful']} ok, {status['failed']} failed, "
        f"{status['skippedResume']} resume-skipped, "
        f"{status['skippedNoSidecar']} no sidecar"
    )
    write_apply_status(status)
    return status
