from __future__ import annotations

import json
import threading
import time
import uuid
from dataclasses import replace
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

from project import LLMClient, safe_load_dotenv

from .assess import assess_question
from .answer_key import apply_llm_answer_key_patch, build_answer_key_patch
from .defaults import (
    default_llm_provider,
    is_quota_rate_limit_error,
    long_quota_pause_seconds,
    make_vertex_llm_client,
    max_consecutive_quota_errors,
    quota_error_pause_seconds,
)
from .batch_api import BatchAssessOutcome, default_batch_model, run_inline_batch_assessments
from .schemas import (
    CohortFilters,
    QualityGateResult,
    build_graph_notes_for_db,
    effective_action,
    effective_action_with_graph_queue,
)
from .supabase_io import (
    fetch_cohort_page,
    get_supabase,
    patch_job_stats,
    update_question_assessment,
    upsert_job_row,
)

_DIR = Path(__file__).resolve().parent
DEFAULT_STATE_PATH = _DIR / "run_state.json"


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _append_log(log_lines: Optional[List[str]], line: str, max_lines: int = 300) -> None:
    if log_lines is None:
        return
    log_lines.append(line)
    while len(log_lines) > max_lines:
        log_lines.pop(0)


def write_run_state(
    path: Path,
    *,
    job_id: str,
    running: bool,
    stats: Dict[str, Any],
    log_tail: List[str],
    last_error: str = "",
) -> None:
    payload = {
        "job_id": job_id,
        "running": running,
        "last_update": _iso_now(),
        "stats": stats,
        "last_error": last_error,
        "log_tail": log_tail[-80:],
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def _is_move_to_math2_db_constraint_error(exc: BaseException) -> bool:
    msg = str(exc).casefold()
    return (
        "23514" in msg
        and "quality_gate_action_check" in msg
    ) or (
        "move_to_math2" in msg and "check constraint" in msg
    )


def _commit_gate_row(
    *,
    row: Dict[str, Any],
    qid: str,
    result: QualityGateResult,
    raw_text: str,
    dry_run: bool,
    client: Optional[Any],
    job_id: str,
    model: str,
    record_only: bool,
    sp: Path,
    stats: Dict[str, Any],
    log_lines: Optional[List[str]],
    on_row: Optional[Callable[[Dict[str, Any]], None]],
    llm: Optional[Any] = None,
    auto_fix_formatting: bool = True,
    apply_tag_fixes: bool = False,
    answer_key_pre_patch: Optional[Dict[str, Any]] = None,
) -> tuple[str, str]:
    """Apply sanitization, DB patch, counters, logs. Returns ``(last_error, effective_action)``."""
    last_error = ""

    if result.recommended_action == "delete":
        result = replace(
            result,
            calibration_tier=None,
            calibration_notes=None,
            graph_candidate=False,
            graph_mode="none",
            graph_suggested_stem_edits="",
            graph_insertion_placeholders=[],
            graph_notes_for_human="",
        )
    elif result.verdict == "Major":
        result = replace(result, calibration_tier=None, calibration_notes=None)

    content_patch: Dict[str, Any] = {}
    if answer_key_pre_patch:
        content_patch.update(answer_key_pre_patch)
        result = replace(
            result,
            answer_key_fix_applied=True,
            answer_key_was_wrong=True,
            answer_key_stored=result.answer_key_stored
            or (row.get("correct_option") or "").strip().upper()[:1],
            answer_key_true=answer_key_pre_patch.get("correct_option")
            or result.answer_key_true,
            disposition_labels=list(
                dict.fromkeys(
                    list(result.disposition_labels) + ["wrong_answer_key_fixed"]
                )
            ),
        )
        stats["answer_key_fixed"] = stats.get("answer_key_fixed", 0) + 1

    from .defaults import deterministic_prechecks_enabled
    from .formatting import build_formatting_patch, detect_formatting_issues, should_apply_formatting_fix

    if answer_key_pre_patch:
        row = {**row, **answer_key_pre_patch}

    answer_key_will_fix = bool(answer_key_pre_patch)
    akv = result.raw.get("answer_key_validation") if isinstance(result.raw.get("answer_key_validation"), dict) else {}
    if akv.get("apply_fix") and akv.get("true_option"):
        llm_ak = apply_llm_answer_key_patch(row, true_option=str(akv.get("true_option")))
        if llm_ak:
            content_patch.update(llm_ak)
            answer_key_will_fix = True
            result = replace(
                result,
                answer_key_fix_applied=True,
                answer_key_was_wrong=True,
                answer_key_true=llm_ak.get("correct_option"),
                disposition_labels=list(
                    dict.fromkeys(
                        [
                            *(l for l in result.disposition_labels if l != "wrong_answer_key"),
                            "wrong_answer_key_fixed",
                        ]
                    )
                ),
            )
            stats["answer_key_fixed"] = stats.get("answer_key_fixed", 0) + 1

    formatting_will_fix = False
    if auto_fix_formatting:
        if deterministic_prechecks_enabled():
            fmt_issues = detect_formatting_issues(row)
            formatting_will_fix = should_apply_formatting_fix(
                issues=fmt_issues,
                llm_apply_fix=result.formatting_apply_fix,
                eff="human_review",
            )
        else:
            formatting_will_fix = bool(result.formatting_apply_fix)
        if formatting_will_fix:
            fmt_patch_preview = build_formatting_patch(row)
            formatting_will_fix = bool(fmt_patch_preview)

    auto_fixes_planned = answer_key_will_fix or formatting_will_fix
    base_eff = effective_action(
        result,
        row=row,
        downgrade_low_confidence_pass=True,
        auto_fixes_planned=auto_fixes_planned,
        formatting_will_fix=formatting_will_fix,
        answer_key_will_fix=answer_key_will_fix,
    )
    eff = effective_action_with_graph_queue(result, base_eff)
    payload = result.to_payload()
    payload["effective_recommended_action"] = eff
    payload["auto_fixes_planned"] = auto_fixes_planned
    payload["formatting_will_fix"] = formatting_will_fix
    payload["answer_key_will_fix"] = answer_key_will_fix
    payload["raw_model_excerpt"] = (raw_text or "")[:4000]

    auto_applied = False
    if not dry_run and client is not None:
        graph_notes = build_graph_notes_for_db(result)
        patch: Dict[str, Any] = {
            "quality_gate_assessed_at": _iso_now(),
            "quality_gate_verdict": result.verdict,
            "quality_gate_action": eff,
            "quality_gate_reason": result.reasoning[:8000],
            "quality_gate_payload": payload,
            "quality_gate_job_id": job_id,
            "quality_gate_model": model,
            "quality_gate_calibration_tier": result.calibration_tier,
            "quality_gate_calibration_notes": result.calibration_notes,
            "quality_gate_graph_candidate": bool(result.graph_candidate),
            "quality_gate_graph_mode": result.graph_mode,
            "quality_gate_graph_notes": graph_notes,
        }

        if auto_fix_formatting and formatting_will_fix:
            fmt_patch = build_formatting_patch(row)
            if fmt_patch:
                content_patch.update(fmt_patch)
                payload["formatting_fix_applied"] = sorted(fmt_patch.keys())
                stats["formatting_fixed"] = stats.get("formatting_fixed", 0) + 1
                result = replace(
                    result,
                    disposition_labels=list(
                        dict.fromkeys(
                            [
                                *(l for l in result.disposition_labels if l != "formatting"),
                                "formatting_fixed",
                            ]
                        )
                    ),
                )
                payload = result.to_payload()
                payload["effective_recommended_action"] = eff
                payload["auto_fixes_planned"] = auto_fixes_planned
                payload["formatting_will_fix"] = True
                payload["formatting_fix_applied"] = sorted(fmt_patch.keys())
                payload["raw_model_excerpt"] = (raw_text or "")[:4000]

        if apply_tag_fixes and eff != "delete" and llm is not None:
            try:
                from .tag_relabel import maybe_relabel_tags

                tag_patch = maybe_relabel_tags(row, result, llm=llm, model=model)
                if tag_patch:
                    content_patch.update(tag_patch)
                    payload["tag_relabel_applied"] = {
                        "primary_tag": tag_patch.get("primary_tag"),
                        "secondary_tags": tag_patch.get("secondary_tags"),
                    }
                    stats["tags_relabeled"] = stats.get("tags_relabeled", 0) + 1
            except Exception as ex:
                _append_log(log_lines, f"[warn] tag relabel {qid}: {ex}")

        if content_patch:
            patch.update(content_patch)
            patch["quality_gate_payload"] = payload

        if (
            result.verdict == "Pass"
            and eff == "approve"
            and not record_only
            and (row.get("status") or "").lower() != "deleted"
        ):
            patch["status"] = "approved"
            auto_applied = True

        try:
            update_question_assessment(client, qid, patch)
        except Exception as e:
            if eff == "move_to_math2" and _is_move_to_math2_db_constraint_error(e):
                payload["effective_recommended_action"] = "move_to_math2"
                payload["db_action_fallback"] = (
                    "Stored quality_gate_action as human_review until Supabase migration "
                    "add_quality_gate_move_to_math2.sql is applied."
                )
                patch["quality_gate_action"] = "human_review"
                patch["quality_gate_payload"] = payload
                try:
                    update_question_assessment(client, qid, patch)
                    _append_log(
                        log_lines,
                        f"[warn] {qid} move_to_math2 blocked by DB check constraint — "
                        "saved as human_review; run supabase/migrations/"
                        "20260524210000_quality_gate_action_move_to_math2.sql",
                    )
                    eff = "human_review"
                except Exception as e2:
                    stats["errors"] += 1
                    last_error = f"{qid} db: {e2}"
                    _append_log(log_lines, f"[error] {last_error}")
                    return last_error, eff
            else:
                stats["errors"] += 1
                last_error = f"{qid} db: {e}"
                if _is_move_to_math2_db_constraint_error(e):
                    last_error += (
                        " — run supabase/migrations/"
                        "20260524210000_quality_gate_action_move_to_math2.sql on Supabase"
                    )
                _append_log(log_lines, f"[error] {last_error}")
                return last_error, eff

    if dry_run:
        _append_log(
            log_lines,
            f"[dry] {qid} verdict={result.verdict} eff={eff} gold={result.calibration_tier!r} "
            f"graph={result.graph_candidate} graph_mode={result.graph_mode} {result.reasoning[:100]}",
        )
    else:
        if result.calibration_tier == "gold":
            stats["calibration_gold"] += 1
        if result.graph_mode == "candidate":
            stats["graph_candidates"] += 1
        if result.graph_mode == "missing_expected":
            stats["graph_missing_expected"] += 1
        if auto_applied:
            stats["auto_approved"] += 1
        else:
            stats["pending_operator"] += 1

        _append_log(
            log_lines,
            f"[ok] {qid} verdict={result.verdict} eff={eff} auto_approve={auto_applied} "
            f"curriculum={result.curriculum_match} syllabus={result.syllabus_fit_score} "
            f"gold={result.calibration_tier!r} graph={result.graph_candidate} graph_mode={result.graph_mode}",
        )

    if on_row is not None:
        on_row(
            {
                "id": qid,
                "verdict": result.verdict,
                "effective_action": eff,
                "auto_applied": auto_applied,
                "payload": payload,
            }
        )

    return last_error, eff


def run_quality_gate_job(
    *,
    job_id: str,
    cohort: CohortFilters,
    limit: int,
    model: str,
    dry_run: bool = False,
    record_only: bool = False,
    force_reassess: bool = False,
    page_size: int = 25,
    state_path: Optional[Path] = None,
    log_lines: Optional[List[str]] = None,
    stop_event: Optional[threading.Event] = None,
    on_row: Optional[Callable[[Dict[str, Any]], None]] = None,
    use_batch_api: bool = False,
    batch_poll_interval_s: float = 15.0,
    batch_timeout_s: float = 86400.0,
    auto_svg_diagrams: bool = False,
    diagram_model: str = "",
    auto_fix_formatting: bool = True,
    apply_tag_fixes: bool = False,
) -> Dict[str, Any]:
    """
    Process up to ``limit`` questions matching ``cohort``.

    - ``dry_run``: call LLM but do not write Supabase.
    - ``record_only``: write gate columns but never set ``status`` to approved.
    - ``force_reassess``: include rows that already have ``quality_gate_assessed_at``.
    - ``use_batch_api``: use Gemini Developer Batch API (inline). Requires ``GEMINI_API_KEY``
      or ``GOOGLE_API_KEY``. Default batch model ``gemini-2.5-flash`` (``MODEL_QUALITY_GATE_BATCH``).
    - Default **sync** backend is Vertex Gemini (``gemini-2.5-flash`` via ``LLMClient`` + ADC). Set
      ``QUALITY_GATE_LLM=anthropic`` (or ``--llm anthropic``) to use Claude with ``ANTHROPIC_API_KEY``.
    - ``auto_svg_diagrams``: after a successful gate write, for rows flagged ``graph_enrichment``,
      call Vertex Gemini (``diagram_model`` / ``MODEL_QUALITY_GATE_SVG``) to generate an exam-style SVG
      and merge it into ``question_stem`` (requires ADC; uses ``LLMClient`` even when scoring on Claude).
    """
    sp = state_path or DEFAULT_STATE_PATH
    if force_reassess:
        cohort.only_unassessed = False

    from .schemas import _ALL_RECOMMENDED_ACTIONS

    _append_log(
        log_lines,
        "[qg] scorer code: "
        + str(Path(__file__).resolve().parent / "schemas.py"),
    )
    _append_log(
        log_lines,
        "[qg] supported recommended_action: "
        + ", ".join(sorted(_ALL_RECOMMENDED_ACTIONS)),
    )

    client = None if dry_run else get_supabase()

    if not dry_run and client is not None:
        try:
            upsert_job_row(client, job_id, cohort.to_dict(), stats={"phase": "starting"})
        except Exception as e:
            _append_log(log_lines, f"[warn] quality_gate_jobs upsert: {e}")

    provider = default_llm_provider()
    llm: Any = None
    if not use_batch_api:
        if provider == "anthropic":
            from .claude_client import ClaudePurgeClient

            llm = ClaudePurgeClient()
        else:
            llm = make_vertex_llm_client()
    stats = {
        "processed": 0,
        "errors": 0,
        "auto_approved": 0,
        "pending_operator": 0,
        "skipped_deleted": 0,
        "calibration_gold": 0,
        "graph_candidates": 0,
        "graph_missing_expected": 0,
        "batch_api_jobs": 0,
        "diagrams_inserted": 0,
        "diagram_errors": 0,
        "formatting_fixed": 0,
        "tags_relabeled": 0,
    }
    last_error = ""

    _append_log(
        log_lines,
        f"Job {job_id} started (dry_run={dry_run}, record_only={record_only}, batch_api={use_batch_api}, "
        f"auto_svg={auto_svg_diagrams}, llm={provider if not use_batch_api else 'gemini-batch'}, model={model})",
    )
    write_run_state(sp, job_id=job_id, running=True, stats=stats, log_tail=log_lines or [], last_error="")

    offset = 0
    total_done = 0
    consecutive_quota_errors = 0

    try:
        while total_done < limit:
            if stop_event is not None and stop_event.is_set():
                _append_log(log_lines, "Stop requested — finishing after current batch page.")
                break

            page_limit = min(page_size, limit - total_done)
            if page_limit <= 0:
                break

            if dry_run:
                rows = fetch_cohort_page(
                    get_supabase(),
                    filters=cohort,
                    limit=page_limit,
                    offset=offset,
                )
            else:
                assert client is not None
                rows = fetch_cohort_page(client, filters=cohort, limit=page_limit, offset=offset)

            if not rows:
                _append_log(log_lines, "No more rows in cohort.")
                write_run_state(
                    sp,
                    job_id=job_id,
                    running=True,
                    stats=dict(stats),
                    log_tail=log_lines or [],
                    last_error=last_error,
                )
                break

            pending: List[Dict[str, Any]] = []
            for row in rows:
                if total_done + len(pending) >= limit:
                    break
                if stop_event is not None and stop_event.is_set():
                    break
                qid = str(row.get("id") or "")
                if not qid:
                    continue
                if (row.get("status") or "").lower() == "deleted":
                    stats["skipped_deleted"] += 1
                    continue
                if not dry_run and row.get("quality_gate_assessed_at") and cohort.only_unassessed:
                    continue
                pending.append(row)

            _append_log(
                log_lines,
                f"Page offset={offset}: fetched {len(rows)} row(s), scoring {len(pending)}…",
            )
            write_run_state(
                sp,
                job_id=job_id,
                running=True,
                stats=dict(stats),
                log_tail=log_lines or [],
                last_error=last_error,
            )

            outcomes_by_id: Dict[str, BatchAssessOutcome] = {}
            if use_batch_api and pending:
                batch_model = (model or "").strip() or default_batch_model()
                try:
                    outs = run_inline_batch_assessments(
                        pending,
                        model=batch_model,
                        temperature=0.25,
                        display_name=f"qg-{job_id}"[:120],
                        poll_interval_s=batch_poll_interval_s,
                        timeout_s=batch_timeout_s,
                        log=log_lines,
                    )
                    stats["batch_api_jobs"] += 1
                    for r, o in zip(pending, outs):
                        outcomes_by_id[str(r.get("id") or "")] = o
                except Exception as e:
                    stats["errors"] += len(pending)
                    last_error = f"batch job: {e}"
                    _append_log(log_lines, f"[error] {last_error}")
                    for _ in pending:
                        total_done += 1
                        stats["processed"] += 1
                    write_run_state(
                        sp,
                        job_id=job_id,
                        running=True,
                        stats=dict(stats),
                        log_tail=log_lines or [],
                        last_error=last_error,
                    )
                    offset += len(rows)
                    if len(rows) < page_limit:
                        break
                    continue

            record_model = ((model or "").strip() or default_batch_model()) if use_batch_api else model

            for row in pending:
                if total_done >= limit:
                    break
                if stop_event is not None and stop_event.is_set():
                    break
                qid = str(row.get("id") or "")
                result: Optional[QualityGateResult] = None
                raw_text = ""
                db_model = record_model
                row_orig = row
                ak_pre_patch: Optional[Dict[str, Any]] = None

                if use_batch_api:
                    oc = outcomes_by_id.get(qid)
                    if oc is None or oc.error:
                        stats["errors"] += 1
                        em = oc.error if oc else "missing batch outcome"
                        last_error = f"{qid}: {em}"
                        _append_log(log_lines, f"[error] {last_error}")
                        total_done += 1
                        stats["processed"] += 1
                        write_run_state(
                            sp,
                            job_id=job_id,
                            running=True,
                            stats=dict(stats),
                            log_tail=log_lines or [],
                            last_error=last_error,
                        )
                        continue
                    assert oc.result is not None
                    result, raw_text = oc.result, oc.raw_text
                else:
                    assert llm is not None
                    row_orig = row
                    from .defaults import deterministic_prechecks_enabled

                    ak_pre_patch: Optional[Dict[str, Any]] = None
                    if deterministic_prechecks_enabled():
                        ak_pre_patch, _ak_reason = build_answer_key_patch(row_orig)
                    row_assess = {**row_orig, **ak_pre_patch} if ak_pre_patch else row_orig
                    try:
                        result, raw_text, db_model = assess_question(
                            llm,
                            row_assess,
                            model=model,
                            vertex_not_found_fallbacks=(provider == "vertex"),
                            answer_key_source_row=row_orig,
                        )
                    except Exception as e:
                        stats["errors"] += 1
                        last_error = f"{qid}: {e}"
                        _append_log(log_lines, f"[error] {last_error}")
                        if is_quota_rate_limit_error(e):
                            consecutive_quota_errors += 1
                            pause_s = quota_error_pause_seconds()
                            if consecutive_quota_errors >= max_consecutive_quota_errors():
                                pause_s = max(pause_s, long_quota_pause_seconds())
                            _append_log(
                                log_lines,
                                f"[pause] quota/rate-limit ({consecutive_quota_errors} in a row) — "
                                f"waiting {pause_s:.0f}s before next question",
                            )
                            write_run_state(
                                sp,
                                job_id=job_id,
                                running=True,
                                stats=dict(stats),
                                log_tail=log_lines or [],
                                last_error=last_error,
                            )
                            time.sleep(pause_s)
                        write_run_state(
                            sp,
                            job_id=job_id,
                            running=True,
                            stats=dict(stats),
                            log_tail=log_lines or [],
                            last_error=last_error,
                        )
                        total_done += 1
                        stats["processed"] += 1
                        continue

                assert result is not None
                consecutive_quota_errors = 0
                row_err, eff = _commit_gate_row(
                    row=row_orig,
                    qid=qid,
                    result=result,
                    raw_text=raw_text,
                    dry_run=dry_run,
                    client=client,
                    job_id=job_id,
                    model=db_model,
                    record_only=record_only,
                    sp=sp,
                    stats=stats,
                    log_lines=log_lines,
                    on_row=on_row,
                    llm=llm,
                    auto_fix_formatting=auto_fix_formatting,
                    apply_tag_fixes=apply_tag_fixes,
                    answer_key_pre_patch=ak_pre_patch,
                )
                if row_err:
                    last_error = row_err

                if (
                    auto_svg_diagrams
                    and not dry_run
                    and client is not None
                    and result.graph_mode == "candidate"
                    and result.verdict != "Major"
                    and eff != "delete"
                    and not row_err
                ):
                    try:
                        from .defaults import default_diagram_model
                        from .svg_diagram import run_auto_diagram_for_row

                        dm = (diagram_model or "").strip() or default_diagram_model()
                        brief_parts = [
                            (result.graph_notes_for_human or "").strip(),
                            (result.graph_suggested_stem_edits or "").strip(),
                        ]
                        diagram_brief = "\n\n".join(p for p in brief_parts if p)
                        if not diagram_brief:
                            diagram_brief = (
                                "Produce a minimal monochrome exam-style diagram implied by the question stem."
                            )
                        reqs = list(result.graph_insertion_placeholders or [])
                        if not reqs:
                            reqs = ["Figure consistent with the stem and brief"]

                        if provider == "vertex" and llm is not None and not use_batch_api:
                            diagram_llm: Any = llm
                        else:
                            diagram_llm = make_vertex_llm_client()

                        new_stem, how, _raw = run_auto_diagram_for_row(
                            diagram_llm,
                            diagram_model=dm,
                            question_stem=str(row.get("question_stem") or ""),
                            diagram_brief=diagram_brief,
                            required_elements=reqs,
                            trace=lambda m: _append_log(log_lines, m),
                        )
                        if new_stem:
                            prev_stem = str(row.get("question_stem") or "")
                            _append_log(
                                log_lines,
                                f"[svg] about to PATCH {qid} new_stem_chars={len(new_stem)} "
                                f"new_has_<svg={'<svg' in new_stem.lower()} same_as_prev={new_stem == prev_stem}",
                            )
                            from .diagram_backfill_review import (
                                BACKFILL_KIND_SVG,
                                build_backfill_human_review_patch,
                            )

                            update_question_assessment(
                                client,
                                qid,
                                {
                                    "question_stem": new_stem,
                                    "question_stem_before_auto_diagram": prev_stem
                                    if prev_stem != new_stem
                                    else None,
                                    **build_backfill_human_review_patch(
                                        row, kind=BACKFILL_KIND_SVG
                                    ),
                                },
                            )
                            try:
                                from .supabase_io import fetch_question_stem_fields

                                snap = fetch_question_stem_fields(client, qid)
                                st = snap.get("question_stem") or ""
                                _append_log(
                                    log_lines,
                                    f"[svg] read-after-write {qid} found={snap.get('found')} "
                                    f"stem_len={len(st)} stem_has_<svg={'<svg' in st.lower()}",
                                )
                            except Exception as ex:
                                _append_log(log_lines, f"[svg] read-after-write failed {qid}: {ex}")
                            stats["diagrams_inserted"] += 1
                            _append_log(log_lines, f"[svg] {qid} diagram_model={dm!r} merge={how}")
                        else:
                            stats["diagram_errors"] += 1
                            _append_log(log_lines, f"[svg warn] {qid} no stem update ({how})")
                    except Exception as ex:
                        stats["diagram_errors"] += 1
                        _append_log(log_lines, f"[svg error] {qid}: {ex}")

                total_done += 1
                stats["processed"] += 1
                write_run_state(
                    sp,
                    job_id=job_id,
                    running=True,
                    stats=dict(stats),
                    log_tail=log_lines or [],
                    last_error=last_error,
                )

            offset += len(rows)
            if len(rows) < page_limit:
                break

    finally:
        write_run_state(
            sp,
            job_id=job_id,
            running=False,
            stats=dict(stats),
            log_tail=log_lines or [],
            last_error=last_error,
        )
        if client is not None:
            try:
                patch_job_stats(client, job_id, dict(stats), stopped=True)
            except Exception as e:
                _append_log(log_lines, f"[warn] job patch: {e}")
        _append_log(log_lines, f"Job {job_id} finished.")

    return dict(stats)


def default_job_id() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S") + "-" + uuid.uuid4().hex[:8]


def init_env() -> None:
    base = _DIR.parent
    for p in (
        base.parent.parent / ".env.local",
        base.parent / ".env.local",
        base / ".env.local",
    ):
        if p.is_file():
            safe_load_dotenv(str(p))
