from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

from project import LLMClient

from .defaults import default_diagram_model
from .supabase_io import (
    fetch_graph_candidates_missing_embedded_svg,
    fetch_question_stem_fields,
    get_supabase,
    update_question_assessment,
)
from .diagram_backfill_review import BACKFILL_KIND_SVG, build_backfill_human_review_patch
from .svg_diagram import run_auto_diagram_for_row

_DIR = Path(__file__).resolve().parent
DEFAULT_BACKFILL_STATE = _DIR / "svg_backfill_state.json"
SVG_BACKFILL_HISTORY = _DIR / "svg_backfill_history.jsonl"


def append_svg_backfill_history(record: Dict[str, Any]) -> None:
    """Append one JSON line for Streamlit / CLI audit trail."""
    rec = {**record, "ts": record.get("ts") or datetime.now(timezone.utc).isoformat()}
    SVG_BACKFILL_HISTORY.parent.mkdir(parents=True, exist_ok=True)
    with SVG_BACKFILL_HISTORY.open("a", encoding="utf-8") as f:
        f.write(json.dumps(rec, ensure_ascii=False) + "\n")


def read_svg_backfill_history(*, max_lines: int = 100) -> List[Dict[str, Any]]:
    """Newest entries last in file; returned newest-first up to ``max_lines``."""
    if not SVG_BACKFILL_HISTORY.is_file():
        return []
    lines = SVG_BACKFILL_HISTORY.read_text(encoding="utf-8").splitlines()
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


def diagram_context_from_row(row: Dict[str, Any]) -> Tuple[str, List[str], Optional[List[str]]]:
    """
    Build diagram brief and required elements from stored gate payload + graph notes
    (same information the inline auto-SVG path uses).
    """
    payload = row.get("quality_gate_payload")
    if isinstance(payload, str):
        try:
            payload = json.loads(payload)
        except json.JSONDecodeError:
            payload = {}
    elif not isinstance(payload, dict):
        payload = {}
    ge = payload.get("graph_enrichment") if isinstance(payload.get("graph_enrichment"), dict) else {}
    notes = (row.get("quality_gate_graph_notes") or "").strip()
    parts = [
        str(ge.get("notes_for_human") or "").strip(),
        str(ge.get("suggested_stem_edits") or "").strip(),
        notes,
    ]
    brief = "\n\n".join(p for p in parts if p)
    if not brief:
        brief = "Produce a minimal monochrome exam-style diagram implied by the question stem."
    ph = ge.get("insertion_placeholders")
    if isinstance(ph, str):
        ph = [ph] if ph.strip() else []
    elif not isinstance(ph, list):
        ph = []
    reqs = [str(x).strip() for x in ph if str(x).strip()]
    if not reqs:
        reqs = ["Figure consistent with the stem and brief"]
    opt = ge.get("optional_elements")
    optional_list: Optional[List[str]] = None
    if isinstance(opt, list):
        optional_list = [str(x).strip() for x in opt if str(x).strip()]
    elif isinstance(opt, str) and opt.strip():
        optional_list = [opt.strip()]
    return brief, reqs, optional_list


def run_missing_svg_backfill(
    *,
    limit: int,
    diagram_model: str = "",
    dry_run: bool = False,
    page_size: int = 40,
    log_lines: Optional[List[str]] = None,
    require_operator_queue: bool = False,
    write_history: bool = True,
    progress_callback: Optional[Callable[[str], None]] = None,
    verbose_llm_trace: bool = False,
) -> Dict[str, Any]:
    """
    For questions flagged graph-candidate whose stem has no embedded ``<svg``, run the SVG + stem merge pipeline.

    When ``require_operator_queue`` is True, only rows with ``svg_operator_backfill_choice == 'queue'``.

    Uses Vertex ``LLMClient`` (always). Does not re-run the quality gate scorer.

    When ``verbose_llm_trace`` is True, append truncated raw LLM debug text per row to the log
    (can be large; use for one-off diagnosis).
    """
    dm = (diagram_model or "").strip() or default_diagram_model()
    client = get_supabase()
    rows = fetch_graph_candidates_missing_embedded_svg(
        client,
        limit=limit,
        page_size=page_size,
        require_operator_queue=require_operator_queue,
    )

    llm = LLMClient()
    processed_ids: List[str] = []
    stats = {
        "candidates_missing_svg": len(rows),
        "inserted": 0,
        "errors": 0,
        "dry_run": dry_run,
        "diagram_model": dm,
        "require_operator_queue": require_operator_queue,
    }

    def _log(msg: str) -> None:
        if progress_callback is not None:
            try:
                progress_callback(msg)
            except Exception:
                pass
        if log_lines is not None:
            log_lines.append(msg)
        print(msg, flush=True)

    if not rows:
        _log("[svg-backfill] No rows: graph-flagged with no <svg> in stem (or none match).")
        return stats

    _log(f"[svg-backfill] Found {len(rows)} row(s) to process (limit={limit}, model={dm!r}, dry_run={dry_run}).")

    for row in rows:
        qid = str(row.get("id") or "")
        if not qid:
            continue
        brief, reqs, optional_elements = diagram_context_from_row(row)
        try:
            processed_ids.append(qid)
            if dry_run:
                _log(f"[svg-backfill] [dry] would process {qid}")
                continue
            new_stem, how, _raw = run_auto_diagram_for_row(
                llm,
                diagram_model=dm,
                question_stem=str(row.get("question_stem") or ""),
                diagram_brief=brief,
                required_elements=reqs,
                optional_elements=optional_elements,
                trace=_log,
            )
            if new_stem:
                prev_stem = str(row.get("question_stem") or "")
                _log(
                    f"[svg-backfill] about to PATCH id={qid} new_stem_chars={len(new_stem)} "
                    f"new_has_<svg={'<svg' in new_stem.lower()} prev_chars={len(prev_stem)} "
                    f"same_as_prev={new_stem == prev_stem}"
                )
                update_question_assessment(
                    client,
                    qid,
                    {
                        "question_stem": new_stem,
                        "question_stem_before_auto_diagram": prev_stem
                        if prev_stem != new_stem
                        else None,
                        **build_backfill_human_review_patch(row, kind=BACKFILL_KIND_SVG),
                    },
                )
                try:
                    snap = fetch_question_stem_fields(client, qid)
                    st = snap.get("question_stem") or ""
                    _log(
                        f"[svg-backfill] read-after-write id={qid} found={snap.get('found')} "
                        f"stem_len={len(st)} stem_has_<svg={'<svg' in st.lower()} "
                        f"updated_at={snap.get('updated_at')!r}"
                    )
                    if "<svg" not in st.lower():
                        _log(
                            f"[svg-backfill] WARNING: row {qid} still has no <svg in question_stem after "
                            "UPDATE — check Supabase RLS, triggers, or that this client uses SERVICE_ROLE."
                        )
                except Exception as ex:
                    _log(f"[svg-backfill] read-after-write fetch failed for {qid}: {ex}")
                stats["inserted"] += 1
                _log(f"[svg-backfill] ok {qid} merge={how}")
                if verbose_llm_trace and _raw:
                    tail = _raw if len(_raw) <= 16_000 else _raw[-16_000:]
                    _log("[svg-backfill] --- verbose_llm_trace (tail) ---\n" + tail)
            else:
                stats["errors"] += 1
                _log(f"[svg-backfill] warn {qid} no stem update ({how})")
                if verbose_llm_trace and _raw:
                    tail = _raw if len(_raw) <= 16_000 else _raw[-16_000:]
                    _log("[svg-backfill] --- verbose_llm_trace (no stem) ---\n" + tail)
        except Exception as ex:
            stats["errors"] += 1
            _log(f"[svg-backfill] error {qid}: {ex}")

    _log(
        f"[svg-backfill] Done: inserted={stats['inserted']}, errors={stats['errors']}, "
        f"candidates={stats['candidates_missing_svg']}"
    )
    if write_history:
        try:
            append_svg_backfill_history(
                {
                    "kind": "svg_backfill",
                    "inserted": stats["inserted"],
                    "errors": stats["errors"],
                    "candidates_missing_svg": stats["candidates_missing_svg"],
                    "dry_run": dry_run,
                    "diagram_model": dm,
                    "require_operator_queue": require_operator_queue,
                    "processed_ids": processed_ids[:500],
                }
            )
        except OSError:
            pass
    return stats
