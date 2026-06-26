"""Main conversion orchestrator."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from .batch import run_batch_extract
from .config import CACHE_DIR
from .db import (
    approve_question_text,
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


def process_single_job(
    job: QuestionJob,
    *,
    dry_run: bool = False,
    force: bool = False,
) -> Dict[str, Any]:
    existing = None
    if job.image_hash and not force:
        existing = fetch_existing_conversion(job.question_id, job.image_hash)

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
    parsed, raw, usage = extract_from_image(job.image_bytes, job_meta(job), pdf_hint=job.pdf_text_hint)

    if should_escalate_to_pro(parsed, str(parsed.get("stem") or "")):
        parsed, raw, usage = extract_from_image(
            job.image_bytes,
            job_meta(job),
            model=escalate_model(),
            pdf_hint=job.pdf_text_hint,
        )

    stem = normalize_latex_delimiters(str(parsed.get("stem") or ""))
    options = normalize_options(parsed.get("options") or {})
    stem, diagram_assets, diagram_crop_failed = process_diagrams(
        job.question_id, job.image_bytes, parsed
    )

    report, hard_fail = validate_extraction(
        job,
        parsed,
        stem,
        options,
        preflight_blur_score=preflight.blur_score,
        preflight_blurry=preflight.blurry,
        diagram_crop_failed=diagram_crop_failed,
    )

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
            )
            usage = {**(usage or {}), "fix_usage": fix_usage}
        except Exception as exc:
            report.setdefault("katex_fix_error", str(exc))

    status = "failed" if hard_fail else "auto_approved"
    model_used = escalate_model() if should_escalate_to_pro(parsed, stem) else None

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
            approve_question_text(
                job.question_id,
                {
                    "question_stem": stem,
                    "options": options,
                    "diagram_assets": diagram_assets or None,
                    "content_format": "text",
                },
            )

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
            stem = normalize_latex_delimiters(str(parsed.get("stem") or ""))
            options = normalize_options(parsed.get("options") or {})
            assert job.image_bytes
            stem, diagram_assets, diagram_crop_failed = process_diagrams(
                job.question_id, job.image_bytes, parsed
            )
            pf = run_preflight(job)
            report, hard_fail = validate_extraction(
                job, parsed, stem, options,
                preflight_blur_score=pf.blur_score,
                preflight_blurry=pf.blurry,
                diagram_crop_failed=diagram_crop_failed,
            )
            status = "failed" if hard_fail else "auto_approved"
            row = _build_conversion_row(job, parsed, stem, options, report, status, None, diagram_assets=diagram_assets)
            if not dry_run:
                if force:
                    supersede_conversions(job.question_id)
                upsert_conversion(row)
                if status == "auto_approved":
                    approve_question_text(job.question_id, {
                        "question_stem": stem,
                        "options": options,
                        "diagram_assets": diagram_assets or None,
                        "content_format": "text",
                    })
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
