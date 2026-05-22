from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

from .defaults import (
    default_diagram_model,
    default_image_brief_model,
    default_image_integrate_model,
    default_image_model,
    default_image_verify_model,
)
from .diagram_backfill_review import (
    BACKFILL_KIND_IMAGE,
    BACKFILL_KIND_SVG,
    build_backfill_human_review_patch,
)
from .image_diagram import run_auto_image_diagram_for_row
from .supabase_io import (
    fetch_graph_candidates_for_diagram_backfill,
    fetch_question_stem_fields,
    get_supabase,
    update_question_assessment,
)

_DIR = Path(__file__).resolve().parent
IMAGE_BACKFILL_HISTORY = _DIR / "image_backfill_history.jsonl"

_STEM_PATCH_KEYS = ("question_stem", "question_stem_before_auto_diagram")
_REVIEW_PATCH_KEYS = (
    "quality_gate_diagram_backfill_kind",
    "quality_gate_diagram_backfill_at",
    "quality_gate_action",
    "quality_gate_reason",
    "status",
)
_IMAGE_META_KEYS = (
    "quality_gate_diagram_image_url",
    "quality_gate_diagram_image_model",
    "quality_gate_diagram_image_verified_at",
    "quality_gate_diagram_image_payload",
)


def _patch_subset(patch: Dict[str, Any], keys: tuple[str, ...]) -> Dict[str, Any]:
    return {k: patch[k] for k in keys if k in patch}


def _apply_merged_image_patch(
    client: Any,
    qid: str,
    patch: Dict[str, Any],
    *,
    log: Callable[[str], None],
) -> None:
    """Persist stem + review flags; optional image metadata may fail on older DBs."""
    try:
        update_question_assessment(client, qid, patch)
        return
    except Exception as ex:
        log(f"[image-backfill] full patch failed {qid}: {ex}")

    stem_review = {
        **_patch_subset(patch, _STEM_PATCH_KEYS),
        **_patch_subset(patch, _REVIEW_PATCH_KEYS),
    }
    try:
        update_question_assessment(client, qid, stem_review)
        log(f"[image-backfill] saved stem + review flags for {qid} (image metadata skipped)")
        return
    except Exception as ex2:
        log(f"[image-backfill] stem+review patch failed {qid}: {ex2}")

    minimal = _patch_subset(patch, _STEM_PATCH_KEYS)
    update_question_assessment(client, qid, minimal)
    log(f"[image-backfill] WARNING: saved stem only for {qid} — review tag may be missing")


def append_image_backfill_history(record: Dict[str, Any]) -> None:
    rec = {**record, "ts": record.get("ts") or datetime.now(timezone.utc).isoformat()}
    IMAGE_BACKFILL_HISTORY.parent.mkdir(parents=True, exist_ok=True)
    with IMAGE_BACKFILL_HISTORY.open("a", encoding="utf-8") as f:
        f.write(json.dumps(rec, ensure_ascii=False) + "\n")


def read_image_backfill_history(*, max_lines: int = 100) -> List[Dict[str, Any]]:
    if not IMAGE_BACKFILL_HISTORY.is_file():
        return []
    lines = IMAGE_BACKFILL_HISTORY.read_text(encoding="utf-8").splitlines()
    tail = lines[-max(1, min(max_lines, 500)) :]
    out: List[Dict[str, Any]] = []
    for ln in reversed(tail):
        ln = ln.strip()
        if not ln:
            continue
        try:
            out.append(json.loads(ln))
        except json.JSONDecodeError:
            continue
    return out


def _history_record(audit: Dict[str, Any]) -> Dict[str, Any]:
    return {
        k: audit.get(k)
        for k in (
            "question_id",
            "graph_mode",
            "should_generate",
            "diagram_need",
            "visual_kind",
            "renderer",
            "svg_model",
            "spoiler_risk",
            "precision_risk",
            "image_model",
            "image_model_used",
            "brief_model",
            "verify_model",
            "integrate_model",
            "verification_verdict",
            "verification_issues",
            "retry_attempted",
            "uploaded_url",
            "final_status",
            "reason",
            "dry_run",
        )
        if k in audit
    }


def run_missing_image_backfill(
    *,
    limit: int,
    image_model: str = "",
    brief_model: str = "",
    verify_model: str = "",
    integrate_model: str = "",
    dry_run: bool = False,
    page_size: int = 40,
    log_lines: Optional[List[str]] = None,
    require_operator_queue: bool = False,
    write_history: bool = True,
    progress_callback: Optional[Callable[[str], None]] = None,
    max_retries: int = 1,
    allow_high_precision_image: bool = False,
    replace_existing_diagram: bool = False,
    diagram_mode: str = "image",
    route_graphs_to_svg: bool = True,
    svg_diagram_model: str = "",
) -> Dict[str, Any]:
    """
    Image backfill for graph-flagged rows.

    ``diagram_mode``: ``image`` | ``svg`` | ``auto``
    """
    dm = (diagram_mode or "image").strip().lower()
    im = (image_model or "").strip() or default_image_model()
    bm = (brief_model or "").strip() or default_image_brief_model()
    vm = (verify_model or "").strip() or default_image_verify_model()
    intm = (integrate_model or "").strip() or default_image_integrate_model()

    client = get_supabase()
    rows = fetch_graph_candidates_for_diagram_backfill(
        client,
        limit=limit,
        page_size=page_size,
        require_operator_queue=require_operator_queue,
        diagram_kind="image",
        replace_existing=replace_existing_diagram,
    )

    svg_dm = (svg_diagram_model or "").strip() or default_diagram_model()

    stats = {
        "candidates": len(rows),
        "merged": 0,
        "merged_imagen": 0,
        "merged_svg": 0,
        "skipped": 0,
        "failed": 0,
        "svg_recommended": 0,
        "dry_run": dry_run,
        "route_graphs_to_svg": route_graphs_to_svg,
        "svg_diagram_model": svg_dm,
        "diagram_mode": dm,
        "image_model": im,
        "brief_model": bm,
        "verify_model": vm,
        "integrate_model": intm,
        "require_operator_queue": require_operator_queue,
    }
    processed_ids: List[str] = []
    row_audits: List[Dict[str, Any]] = []

    def _log(msg: str) -> None:
        if progress_callback is not None:
            try:
                progress_callback(msg)
            except Exception:
                pass
        if log_lines is not None:
            log_lines.append(msg)
        print(msg, flush=True)

    if dm == "svg":
        _log("[image-backfill] diagram_mode=svg — use generate-missing-svgs instead.")
        return stats

    if not rows:
        _log("[image-backfill] No rows match (graph-flagged, operator queue, missing image diagram).")
        return stats

    _log(
        f"[image-backfill] Found {len(rows)} row(s) (limit={limit}, mode={dm!r}, "
        f"model={im!r}, dry_run={dry_run})."
    )

    for row in rows:
        qid = str(row.get("id") or "")
        if not qid:
            continue
        processed_ids.append(qid)

        audit = run_auto_image_diagram_for_row(
            row,
            image_model=im,
            brief_model=bm,
            verify_model=vm,
            integrate_model=intm,
            dry_run=dry_run,
            max_retries=max_retries,
            allow_high_precision_image=allow_high_precision_image,
            replace_existing_diagram=replace_existing_diagram,
            route_graphs_to_svg=route_graphs_to_svg and dm in ("image", "auto"),
            svg_diagram_model=svg_dm,
            trace=_log,
            supabase_client=None if dry_run else client,
        )
        row_audits.append(audit)
        status = str(audit.get("final_status") or "failed")

        if status == "merged" and not dry_run:
            merged = audit.get("merged_stem")
            if merged:
                prev_stem = str(row.get("question_stem") or "")
                stem_backup = (
                    prev_stem
                    if prev_stem != merged and not row.get("question_stem_before_auto_diagram")
                    else row.get("question_stem_before_auto_diagram")
                )
                is_svg = audit.get("renderer") == "svg" or audit.get("reason") == "graph_svg_ok"
                if is_svg:
                    patch = {
                        "question_stem": merged,
                        "question_stem_before_auto_diagram": stem_backup,
                        **(
                            audit.get("human_review_patch")
                            or build_backfill_human_review_patch(row, kind=BACKFILL_KIND_SVG)
                        ),
                    }
                else:
                    patch = {
                        "question_stem": merged,
                        "question_stem_before_auto_diagram": stem_backup,
                        "quality_gate_diagram_image_url": audit.get("uploaded_url"),
                        "quality_gate_diagram_image_model": audit.get("image_model_used") or im,
                        "quality_gate_diagram_image_verified_at": audit.get("verified_at"),
                        "quality_gate_diagram_image_payload": {
                            "brief": audit.get("brief_payload"),
                            "verification": audit.get("verification_payload"),
                        },
                        **build_backfill_human_review_patch(row, kind=BACKFILL_KIND_IMAGE),
                    }
                try:
                    _apply_merged_image_patch(client, qid, patch, log=_log)
                    snap = fetch_question_stem_fields(client, qid)
                    st = snap.get("question_stem") or ""
                    _log(
                        f"[image-backfill] read-after-write id={qid} stem_len={len(st)} "
                        f"has_<img={'<img' in st.lower()} has_<svg={'<svg' in st.lower()} "
                        f"renderer={audit.get('renderer') or ('svg' if is_svg else 'imagen')}"
                    )
                except Exception as ex2:
                    _log(f"[image-backfill] DB patch failed {qid}: {ex2}")
                    audit["final_status"] = "failed"
                    audit["reason"] = f"db_patch_failed: {ex2}"
                    status = "failed"

        if status == "merged":
            stats["merged"] += 1
            if audit.get("renderer") == "svg" or audit.get("reason") == "graph_svg_ok":
                stats["merged_svg"] += 1
            else:
                stats["merged_imagen"] += 1
        elif status in ("skipped", "dry_run_pass"):
            stats["skipped"] += 1
        else:
            stats["failed"] += 1

        if write_history:
            try:
                append_image_backfill_history(_history_record(audit))
            except OSError:
                pass

    stats["processed_ids"] = processed_ids[:500]
    stats["row_audits"] = row_audits
    _log(
        f"[image-backfill] Done: merged={stats['merged']} "
        f"(imagen={stats['merged_imagen']}, svg={stats['merged_svg']}), "
        f"skipped={stats['skipped']}, failed={stats['failed']}"
    )
    return stats
