"""Main conversion orchestrator."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

from .batch import run_batch_extract
from .config import (
    CACHE_DIR,
    DEFAULT_BATCH_MODEL,
    DEFAULT_FLASH_MODEL,
    promote_to_questions_table,
    use_vertex_ai,
    uses_variable_option_count,
)
from .db import (
    approve_question_text,
    fetch_authoritative_recovered_conversion,
    fetch_existing_conversion,
    fetch_paper_ids,
    supersede_conversions,
    upsert_conversion,
)
from .diagram import process_diagrams
from .export_questions import QuestionJob, export_jobs
from .extract import (
    escalate_model,
    extract_from_image,
    fix_katex_with_text,
    should_escalate_to_pro,
)
from .preflight import run_preflight
from .sequence_audit import audit_all_papers, audit_paper_sequence
from .structured_tables import process_tables
from .validate import normalize_latex_delimiters, normalize_options, validate_extraction


def job_meta(job: QuestionJob) -> Dict[str, Any]:
    return {
        "exam_name": job.exam_name,
        "exam_year": job.exam_year,
        "paper_name": job.paper_name,
        "question_number": job.question_number,
        "expected_letters": job.expected_letters,
        "part_letter": job.part_letter,
        "part_name": job.part_name,
    }


def _maybe_promote_question(
    job: QuestionJob,
    report: Dict[str, Any],
    *,
    stem: str,
    options: Dict[str, str],
    diagram_assets: Optional[List[Dict[str, Any]]],
) -> None:
    if not promote_to_questions_table():
        report["questions_promote_skipped"] = True
        report["questions_promote_reason"] = "PAST_PAPER_PROMOTE_TO_QUESTIONS=0"
        return
    promoted = approve_question_text(
        job.question_id,
        {
            "question_stem": stem,
            "options": options,
            "diagram_assets": diagram_assets or None,
            "content_format": "text",
        },
    )
    if not promoted:
        report["questions_promote_failed"] = True
        report["questions_promote_reason"] = (
            "questions table is protected — run migration "
            "20260627110000_questions_text_conversion_promote.sql in Supabase SQL Editor"
        )


def process_single_job(
    job: QuestionJob,
    *,
    dry_run: bool = False,
    force: bool = False,
) -> Dict[str, Any]:
    existing = None
    if job.image_hash and not force:
        existing = fetch_existing_conversion(job.question_id, job.image_hash)
        if existing is None:
            existing = fetch_authoritative_recovered_conversion(job.question_id)

    preflight = run_preflight(job, existing_conversion=existing)
    if preflight.skip_cached and preflight.cached_conversion:
        return {"question_id": job.question_id, "status": "skipped_cached", "conversion": preflight.cached_conversion}

    if preflight.image_fetch_failed:
        report = {"image_fetch_failed": True, "blurry": False, "blur_score": 0}
        row = _build_conversion_row(job, None, "", {}, report, "failed", None)
        if not dry_run:
            upsert_conversion(row)
        return {"question_id": job.question_id, "status": "failed", "report": report}

    assert job.image_bytes is not None
    model_used = DEFAULT_FLASH_MODEL
    parsed, raw, usage = extract_from_image(job.image_bytes, job_meta(job), pdf_hint=job.pdf_text_hint)

    if should_escalate_to_pro(parsed, str(parsed.get("stem") or "")):
        model_used = escalate_model()
        parsed, raw, usage = extract_from_image(
            job.image_bytes,
            job_meta(job),
            model=model_used,
            pdf_hint=job.pdf_text_hint,
        )

    options = normalize_options(parsed.get("options") or {})
    # Option letters are often dropped on the first pass. Retry before diagrams.
    options_retry_error: Optional[str] = None
    missing_options_recovered = False
    variable_options = uses_variable_option_count(job.exam_name, job.paper_name)
    min_options = 4 if variable_options else len(job.expected_letters or [])
    if len(options) < min_options and min_options > 0 and not dry_run:
        retry_models = [model_used]
        pro = escalate_model()
        if pro not in retry_models:
            retry_models.append(pro)
        for retry_model in retry_models:
            try:
                retried, raw_retry, retry_usage = extract_from_image(
                    job.image_bytes,
                    job_meta(job),
                    model=retry_model,
                    pdf_hint=job.pdf_text_hint,
                    options_retry={
                        "found_letters": sorted(options.keys()),
                        "variable": variable_options,
                        "min_count": min_options,
                    },
                )
            except Exception as exc:
                options_retry_error = str(exc)
                break
            retried_options = normalize_options(retried.get("options") or {})
            if len(retried_options) >= len(options):
                parsed = retried
                options = retried_options
                raw = raw_retry
                model_used = retry_model
                usage = {**(usage or {}), "options_retry_usage": retry_usage}
            if len(options) >= min_options:
                missing_options_recovered = True
                break

    # Zero-option extractions are almost always model misses (choices in a table
    # or at the bottom of the screenshot). Keep retrying with Pro.
    if len(options) == 0 and not dry_run:
        for attempt in range(3):
            try:
                retried, raw_retry, retry_usage = extract_from_image(
                    job.image_bytes,
                    job_meta(job),
                    model=escalate_model(),
                    pdf_hint=job.pdf_text_hint,
                    options_retry={
                        "found_letters": [],
                        "variable": variable_options,
                        "min_count": min_options or 4,
                    },
                )
            except Exception as exc:
                options_retry_error = str(exc)
                break
            retried_options = normalize_options(retried.get("options") or {})
            if retried_options:
                parsed = retried
                options = retried_options
                raw = raw_retry
                model_used = escalate_model()
                usage = {**(usage or {}), f"empty_options_retry_{attempt}": retry_usage}
                missing_options_recovered = True
                break

    if parsed.get("has_graphical_options") is True:
        parsed["has_diagram"] = True
        if str(parsed.get("diagram_type") or "none") == "none":
            parsed["diagram_type"] = "graphical_options"
    table_stem, table_processing_failed = process_tables(
        parsed, str(parsed.get("stem") or "")
    )
    parsed["stem"] = table_stem
    for letter, text in (parsed.get("structured_table_options") or {}).items():
        options.setdefault(str(letter), str(text))
    stem, diagram_assets, diagram_crop_failed = process_diagrams(
        job.question_id, job.image_bytes, parsed, upload=not dry_run
    )
    if parsed.get("has_graphical_options") is True:
        for letter in parsed.get("graphical_option_letters_processed") or []:
            options.setdefault(str(letter), "")
    stem = normalize_latex_delimiters(stem)

    report, hard_fail = validate_extraction(
        job,
        parsed,
        stem,
        options,
        preflight_blur_score=preflight.blur_score,
        preflight_blurry=preflight.blurry,
        diagram_crop_failed=diagram_crop_failed,
        table_processing_failed=table_processing_failed,
    )
    report["ai_provider"] = "vertex_ai" if use_vertex_ai() else "gemini_api"
    if missing_options_recovered:
        report["missing_options_recovered"] = True
    if options_retry_error:
        report["missing_options_retry_error"] = options_retry_error

    # KaTeX fix retry
    if report.get("katex_errors") and not dry_run:
        try:
            fixed, fix_usage = fix_katex_with_text(stem, options, report["katex_errors"])
            stem = normalize_latex_delimiters(str(fixed.get("stem") or stem))
            options = normalize_options(fixed.get("options") or options)
            report, hard_fail = validate_extraction(
                job,
                parsed,
                stem,
                options,
                preflight_blur_score=preflight.blur_score,
                preflight_blurry=preflight.blurry,
                diagram_crop_failed=diagram_crop_failed,
                table_processing_failed=table_processing_failed,
            )
            report["ai_provider"] = "vertex_ai" if use_vertex_ai() else "gemini_api"
            usage = {**(usage or {}), "fix_usage": fix_usage}
        except Exception as exc:
            report.setdefault("katex_fix_error", str(exc))

    # Diagram retry when text is good but diagram classification/crop failed.
    diagram_flags = (
        report.get("diagram_detection_mismatch")
        or report.get("diagram_crop_failed")
        or report.get("diagram_classification_uncertain")
    )
    if hard_fail and diagram_flags and not dry_run:
        try:
            retried, raw_retry, retry_usage = extract_from_image(
                job.image_bytes,
                job_meta(job),
                model=escalate_model(),
                pdf_hint=job.pdf_text_hint,
                diagram_retry=True,
            )
            retried_options = normalize_options(retried.get("options") or {})
            if len(retried_options) >= len(options):
                options = retried_options
            if retried.get("has_graphical_options") is True:
                retried["has_diagram"] = True
            table_stem, table_processing_failed = process_tables(
                retried, str(retried.get("stem") or "")
            )
            retried["stem"] = table_stem
            for letter, text in (retried.get("structured_table_options") or {}).items():
                options.setdefault(str(letter), str(text))
            stem, diagram_assets, diagram_crop_failed = process_diagrams(
                job.question_id, job.image_bytes, retried, upload=True
            )
            if retried.get("has_graphical_options") is True:
                for letter in retried.get("graphical_option_letters_processed") or []:
                    options.setdefault(str(letter), "")
            stem = normalize_latex_delimiters(stem)
            parsed = retried
            report, hard_fail = validate_extraction(
                job,
                parsed,
                stem,
                options,
                preflight_blur_score=preflight.blur_score,
                preflight_blurry=preflight.blurry,
                diagram_crop_failed=diagram_crop_failed,
                table_processing_failed=table_processing_failed,
            )
            report["diagram_retry"] = True
            report["ai_provider"] = "vertex_ai" if use_vertex_ai() else "gemini_api"
            usage = {**(usage or {}), "diagram_retry_usage": retry_usage}
        except Exception as exc:
            report.setdefault("diagram_retry_error", str(exc))

    status = "failed" if hard_fail else "auto_approved"
    row = _build_conversion_row(
        job,
        parsed,
        stem,
        options,
        report,
        status,
        usage,
        diagram_assets=diagram_assets,
        model_used=model_used,
    )

    if not dry_run:
        if force:
            supersede_conversions(job.question_id)
        upsert_conversion(row)
        if status == "auto_approved":
            _maybe_promote_question(
                job, report, stem=stem, options=options, diagram_assets=diagram_assets
            )
            if not dry_run and report.get("questions_promote_failed"):
                upsert_conversion({**row, "conversion_report": report})

    return {
        "question_id": job.question_id,
        "status": status,
        "report": report,
        "stem_preview": stem[:120] if stem else "",
    }


def _build_conversion_row(
    job: QuestionJob,
    parsed: Optional[Dict[str, Any]],
    stem: str,
    options: Dict[str, str],
    report: Dict[str, Any],
    status: str,
    usage: Optional[Dict[str, Any]],
    *,
    diagram_assets: Optional[List[Dict[str, Any]]] = None,
    model_used: Optional[str] = None,
) -> Dict[str, Any]:
    parsed = parsed or {}
    return {
        "question_id": job.question_id,
        "status": status,
        "question_stem": stem or None,
        "options": options or None,
        "diagram_assets": diagram_assets,
        "detected_question_number": parsed.get("detected_question_number"),
        "option_letters": sorted(options.keys()) if options else [],
        "confidence": parsed.get("confidence"),
        "conversion_report": report,
        "source_image_url": job.question_image_url,
        "source_image_hash": job.image_hash,
        "model_used": model_used,
        "token_usage": usage,
    }


def run_conversion(
    *,
    paper_id: Optional[int] = None,
    exam_name: Optional[str] = None,
    question_id: Optional[int] = None,
    limit: Optional[int] = None,
    dry_run: bool = False,
    force: bool = False,
    use_batch: bool = False,
) -> List[Dict[str, Any]]:
    jobs = export_jobs(
        paper_id=paper_id,
        exam_name=exam_name,
        question_id=question_id,
        limit=limit,
        download=True,
    )

    results: List[Dict[str, Any]] = []

    if use_batch and len(jobs) > 1:
        # Filter out cached
        pending: List[QuestionJob] = []
        for job in jobs:
            existing = fetch_existing_conversion(job.question_id, job.image_hash or "") if job.image_hash else None
            pf = run_preflight(job, existing_conversion=existing)
            if pf.skip_cached:
                results.append({"question_id": job.question_id, "status": "skipped_cached"})
            elif pf.image_fetch_failed:
                results.append(process_single_job(job, dry_run=dry_run, force=force))
            else:
                pending.append(job)

        batch_parsed = run_batch_extract(pending) if pending else {}
        for job in pending:
            key = str(job.question_id)
            parsed = batch_parsed.get(key, {"confidence": 0, "stem": "", "options": {}})
            # Reuse single-job post-processing by injecting parsed — simplified inline:
            if parsed.get("has_graphical_options") is True:
                parsed["has_diagram"] = True
                if str(parsed.get("diagram_type") or "none") == "none":
                    parsed["diagram_type"] = "graphical_options"
            options = normalize_options(parsed.get("options") or {})
            table_stem, table_processing_failed = process_tables(
                parsed, str(parsed.get("stem") or "")
            )
            parsed["stem"] = table_stem
            for letter, text in (parsed.get("structured_table_options") or {}).items():
                options.setdefault(str(letter), str(text))
            assert job.image_bytes
            stem, diagram_assets, diagram_crop_failed = process_diagrams(
                job.question_id, job.image_bytes, parsed, upload=not dry_run
            )
            if parsed.get("has_graphical_options") is True:
                for letter in parsed.get("graphical_option_letters_processed") or []:
                    options.setdefault(str(letter), "")
            stem = normalize_latex_delimiters(stem)
            pf = run_preflight(job)
            report, hard_fail = validate_extraction(
                job, parsed, stem, options,
                preflight_blur_score=pf.blur_score,
                preflight_blurry=pf.blurry,
                diagram_crop_failed=diagram_crop_failed,
                table_processing_failed=table_processing_failed,
            )
            report["ai_provider"] = "vertex_ai" if use_vertex_ai() else "gemini_api"
            status = "failed" if hard_fail else "auto_approved"
            row = _build_conversion_row(
                job,
                parsed,
                stem,
                options,
                report,
                status,
                None,
                diagram_assets=diagram_assets,
                model_used=DEFAULT_BATCH_MODEL,
            )
            if not dry_run:
                if force:
                    supersede_conversions(job.question_id)
                upsert_conversion(row)
                if status == "auto_approved":
                    _maybe_promote_question(
                        job, report, stem=stem, options=options, diagram_assets=diagram_assets
                    )
                    if report.get("questions_promote_failed"):
                        upsert_conversion({**row, "conversion_report": report})
            results.append({"question_id": job.question_id, "status": status, "report": report})
    else:
        for job in jobs:
            results.append(process_single_job(job, dry_run=dry_run, force=force))

    # Sequence audit for affected papers
    paper_ids = sorted({j.paper_id for j in jobs})
    audits = audit_all_papers(paper_ids)
    audit_path = CACHE_DIR / "sequence_audits.json"
    audit_path.write_text(json.dumps(audits, indent=2), encoding="utf-8")

    summary_path = CACHE_DIR / "last_run_summary.json"
    summary_path.write_text(json.dumps({"results": results, "audits": audits}, indent=2), encoding="utf-8")

    return results


def requeue_by_flag(flag: str, *, dry_run: bool = False) -> List[Dict[str, Any]]:
    """Re-process questions whose latest conversion has a given report flag."""
    from .db import make_client

    client = make_client()
    resp = client.table("question_conversions").select("question_id, conversion_report").eq("status", "failed").execute()
    rows = resp.data or []
    qids = []
    for row in rows:
        report = row.get("conversion_report") or {}
        if report.get(flag):
            qids.append(int(row["question_id"]))

    results = []
    for qid in qids:
        results.extend(
            run_conversion(question_id=qid, dry_run=dry_run, force=True)
        )
    return results


def revalidate_failed_by_flag(flag: str, *, dry_run: bool = False) -> List[Dict[str, Any]]:
    """Re-check failed conversions without calling the model.

    Used when validation rules change (for example TMUA option count) and an
    existing extraction would now pass.
    """
    from .db import make_client
    from .export_questions import QuestionJob

    client = make_client()
    columns = (
        "id, question_id, status, question_stem, options, diagram_assets, "
        "detected_question_number, confidence, conversion_report, option_letters, "
        "source_image_hash, model_used, updated_at"
    )
    rows: List[Dict[str, Any]] = []
    page_size = 200
    offset = 0
    while True:
        page = (
            client.table("question_conversions")
            .select(columns)
            .eq("status", "failed")
            .order("updated_at", desc=True)
            .range(offset, offset + page_size - 1)
            .execute()
            .data
            or []
        )
        rows.extend(page)
        if len(page) < page_size:
            break
        offset += page_size

    # Keep the newest failed row per question that has the flag.
    latest: Dict[int, Dict[str, Any]] = {}
    for row in rows:
        qid = int(row["question_id"])
        report = row.get("conversion_report") or {}
        if not report.get(flag):
            continue
        if qid not in latest:
            latest[qid] = row

    results: List[Dict[str, Any]] = []
    question_cache: Dict[int, Dict[str, Any]] = {}
    qids = list(latest.keys())
    for i in range(0, len(qids), 50):
        chunk = qids[i : i + 50]
        chunk_rows = (
            client.table("questions")
            .select("*")
            .in_("id", chunk)
            .execute()
            .data
            or []
        )
        for row in chunk_rows:
            question_cache[int(row["id"])] = row

    print(f"revalidate candidates: {len(latest)}", file=sys.stderr, flush=True)
    for index, (qid, conversion) in enumerate(latest.items(), start=1):
        if index == 1 or index % 25 == 0 or index == len(latest):
            print(f"revalidate {index}/{len(latest)} q{qid}", file=sys.stderr, flush=True)
        question_row = question_cache.get(qid)
        if not question_row:
            results.append({"question_id": qid, "status": "skipped", "reason": "question missing"})
            continue
        job = QuestionJob.from_row(question_row)
        stem = str(conversion.get("question_stem") or "")
        options = normalize_options(conversion.get("options") or {})
        old_report = conversion.get("conversion_report") or {}
        parsed = {
            "detected_question_number": conversion.get("detected_question_number"),
            "confidence": conversion.get("confidence") or old_report.get("confidence") or 0.99,
            "has_diagram": old_report.get("has_diagram") is True,
            "has_table": old_report.get("has_table") is True,
            "diagram_confidence": old_report.get("diagram_confidence")
            if old_report.get("diagram_confidence") is not None
            else 0.99,
            "diagram_type": old_report.get("diagram_type") or "none",
            "has_graphical_options": old_report.get("has_graphical_options") is True,
            "graphical_option_letters_processed": old_report.get("graphical_option_letters_processed")
            or [],
            "structured_tables_processed": old_report.get("structured_tables_processed") or 0,
        }
        report, hard_fail = validate_extraction(
            job,
            parsed,
            stem,
            options,
            preflight_blur_score=float(old_report.get("blur_score") or 0),
            preflight_blurry=old_report.get("blurry") is True,
            diagram_crop_failed=old_report.get("diagram_crop_failed") is True,
            table_processing_failed=old_report.get("table_processing_failed") is True,
            skip_katex=True,
        )
        prior_katex = old_report.get("katex_errors") or []
        report["katex_errors"] = prior_katex
        if prior_katex:
            hard_fail = True
        report["ai_provider"] = old_report.get("ai_provider")
        report["revalidated_from_flag"] = flag
        report["previous_missing_options"] = old_report.get("missing_options") is True

        status = "failed" if hard_fail else "auto_approved"

        if not dry_run:
            client.table("question_conversions").update(
                {
                    "status": status,
                    "conversion_report": report,
                    "option_letters": sorted(options.keys()) if options else [],
                    "confidence": float(parsed.get("confidence") or 0),
                }
            ).eq("id", conversion["id"]).execute()
            if status == "auto_approved":
                _maybe_promote_question(
                    job,
                    report,
                    stem=stem,
                    options=options,
                    diagram_assets=conversion.get("diagram_assets"),
                )
                if report.get("questions_promote_failed"):
                    client.table("question_conversions").update(
                        {"conversion_report": report}
                    ).eq("id", conversion["id"]).execute()

        results.append(
            {
                "question_id": qid,
                "status": status,
                "report": {
                    "missing_options": report.get("missing_options"),
                    "option_count": len(options),
                    "expected_count": report.get("expected_count"),
                    "hard_fail_flags": [
                        key
                        for key in (
                            "missing_options",
                            "katex_errors",
                            "diagram_crop_failed",
                            "answer_letter_missing",
                            "diagram_classification_uncertain",
                            "diagram_detection_mismatch",
                        )
                        if report.get(key)
                    ],
                    "revalidated_from_flag": flag,
                },
            }
        )
    return results
