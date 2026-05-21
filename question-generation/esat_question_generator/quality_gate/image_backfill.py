from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

from .defaults import (
    default_image_brief_model,
    default_image_integrate_model,
    default_image_model,
    default_image_verify_model,
)
from .image_diagram import build_image_brief, resolve_auto_diagram_mode, run_auto_image_diagram_for_row
from .diagram_backfill_review import BACKFILL_KIND_IMAGE, build_backfill_human_review_patch
from .supabase_io import (
    fetch_graph_candidates_for_diagram_backfill,
    fetch_question_stem_fields,
    get_supabase,
    update_question_assessment,
)

_DIR = Path(__file__).resolve().parent
IMAGE_BACKFILL_HISTORY = _DIR / "image_backfill_history.jsonl"


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

    stats = {
        "candidates": len(rows),
        "merged": 0,
        "skipped": 0,
        "failed": 0,
        "svg_recommended": 0,
        "dry_run": dry_run,
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

    from project import LLMClient

    llm = LLMClient()

    for row in rows:
        qid = str(row.get("id") or "")
        if not qid:
            continue
        processed_ids.append(qid)

        if dm == "auto":
            try:
                brief, _ = build_image_brief(llm, model=bm, row=row, trace=_log)
                auto = resolve_auto_diagram_mode(brief)
                if auto == "svg":
                    stats["svg_recommended"] += 1
                    audit = {
                        "question_id": qid,
                        "final_status": "skipped",
                        "reason": "auto_mode_recommends_svg",
                        "diagram_need": brief.get("diagram_need"),
                        "should_generate": brief.get("should_generate"),
                        "spoiler_risk": brief.get("spoiler_risk"),
                        "precision_risk": brief.get("precision_risk"),
                    }
                    row_audits.append(audit)
                    _log(f"[image-backfill] auto skip {qid} → use SVG path")
                    if write_history:
                        append_image_backfill_history(_history_record(audit))
                    continue
                if auto == "skip":
                    stats["skipped"] += 1
                    audit = {
                        "question_id": qid,
                        "final_status": "skipped",
                        "reason": "auto_mode_skip",
                    }
                    row_audits.append(audit)
                    if write_history:
                        append_image_backfill_history(_history_record(audit))
                    continue
            except Exception as ex:
                stats["failed"] += 1
                audit = {"question_id": qid, "final_status": "failed", "reason": f"auto_brief: {ex}"}
                row_audits.append(audit)
                if write_history:
                    append_image_backfill_history(_history_record(audit))
                continue

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
            trace=_log,
            supabase_client=None if dry_run else client,
        )
        row_audits.append(audit)
        status = str(audit.get("final_status") or "failed")

        if status == "merged" and not dry_run:
            merged = audit.get("merged_stem")
            if merged:
                prev_stem = str(row.get("question_stem") or "")
                patch: Dict[str, Any] = {
                    "question_stem": merged,
                    "question_stem_before_auto_diagram": prev_stem
                    if prev_stem != merged and not row.get("question_stem_before_auto_diagram")
                    else row.get("question_stem_before_auto_diagram"),
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
                    update_question_assessment(client, qid, patch)
                    snap = fetch_question_stem_fields(client, qid)
                    st = snap.get("question_stem") or ""
                    _log(
                        f"[image-backfill] read-after-write id={qid} stem_len={len(st)} "
                        f"has_<img={'<img' in st.lower()}"
                    )
                except Exception as ex:
                    _log(f"[image-backfill] full patch failed {qid}, retry stem-only: {ex}")
                    try:
                        minimal = {
                            k: patch[k]
                            for k in ("question_stem", "question_stem_before_auto_diagram")
                            if k in patch
                        }
                        update_question_assessment(client, qid, minimal)
                    except Exception as ex2:
                        _log(f"[image-backfill] DB patch failed {qid}: {ex2}")
                        audit["final_status"] = "failed"
                        audit["reason"] = f"db_patch_failed: {ex2}"
                        status = "failed"

        if status == "merged":
            stats["merged"] += 1
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
        f"[image-backfill] Done: merged={stats['merged']}, skipped={stats['skipped']}, "
        f"failed={stats['failed']}, svg_recommended={stats['svg_recommended']}"
    )
    return stats
