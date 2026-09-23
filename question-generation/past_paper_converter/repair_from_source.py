"""Repair one question from a visually verified authoritative source image."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from .db import mark_conversion_source_recovered, replace_question_image_source
from .diagram import upload_recovered_source
from .export_questions import export_jobs, sha256_bytes
from .runner import process_single_job


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--id", required=True, type=int, dest="question_id")
    parser.add_argument("--image", required=True, type=Path)
    parser.add_argument(
        "--source-reference",
        required=True,
        help="Permanent citation/reference for the authoritative source document",
    )
    args = parser.parse_args()

    image_bytes = args.image.read_bytes()
    jobs = export_jobs(question_id=args.question_id, download=False)
    if not jobs:
        raise LookupError(f"question {args.question_id} not found")

    recovered_url = upload_recovered_source(args.question_id, image_bytes)
    if not recovered_url:
        raise RuntimeError("failed to upload recovered source image")

    job = jobs[0]
    original_source_image_url = job.question_image_url
    job.image_bytes = image_bytes
    job.image_hash = sha256_bytes(image_bytes)
    job.question_image_url = recovered_url
    job.pdf_text_hint = f"Authoritative source: {args.source_reference}"

    result = process_single_job(job, force=True)
    source_promoted = False
    recovery_marked = False
    if result.get("status") == "auto_approved":
        recovery_marked = mark_conversion_source_recovered(
            args.question_id,
            job.image_hash,
            source_reference=args.source_reference,
            original_source_image_url=original_source_image_url,
        )
        source_promoted = replace_question_image_source(
            args.question_id, recovered_url
        )

    print(
        json.dumps(
            {
                **result,
                "recovered_source_url": recovered_url,
                "recovered_source_hash": job.image_hash,
                "question_image_updated": source_promoted,
                "authoritative_recovery_marked": recovery_marked,
                "source_reference": args.source_reference,
            },
            indent=2,
        )
    )
    return 0 if result.get("status") == "auto_approved" and recovery_marked else 1


if __name__ == "__main__":
    raise SystemExit(main())
