"""Gemini Batch API integration for bulk extraction."""

from __future__ import annotations

import json
import time
from typing import Any, Dict, List, Optional

from google import genai
from google.genai import types

from .config import DEFAULT_BATCH_MODEL, gemini_api_key, use_vertex_ai, vertex_client_location, vertex_config
from .extract import SYSTEM_PROMPT, build_user_text, extract_json_object, make_client
from .export_questions import QuestionJob


def build_batch_request(job: QuestionJob) -> Dict[str, Any]:
    meta = {
        "exam_name": job.exam_name,
        "exam_year": job.exam_year,
        "paper_name": job.paper_name,
        "question_number": job.question_number,
        "expected_letters": job.expected_letters,
        "part_letter": job.part_letter,
        "part_name": job.part_name,
    }
    user_text = build_user_text(meta, job.pdf_text_hint)
    parts: List[Any] = [{"text": user_text}]
    if job.image_bytes:
        import base64
        parts.append(
            {
                "inline_data": {
                    "mime_type": "image/png",
                    "data": base64.b64encode(job.image_bytes).decode("ascii"),
                }
            }
        )
    return {
        "metadata": {"key": str(job.question_id)},
        "contents": [{"role": "user", "parts": parts}],
        "config": {
            "system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
            "temperature": 0.1,
            "response_mime_type": "application/json",
        },
    }


def run_batch_extract(
    jobs: List[QuestionJob],
    *,
    model: Optional[str] = None,
    poll_interval_s: float = 15.0,
    timeout_s: float = 86400.0,
) -> Dict[str, Dict[str, Any]]:
    """Submit batch job; return {question_id: parsed_json}."""
    if not jobs:
        return {}

    client = make_client()
    m = model or DEFAULT_BATCH_MODEL
    inline_requests = [build_batch_request(j) for j in jobs if j.image_bytes]
    if not inline_requests:
        return {}

    job = client.batches.create(model=m, src=inline_requests, config={"display_name": "past_paper_convert"})
    job_name = job.name
    deadline = time.time() + timeout_s

    while time.time() < deadline:
        status = client.batches.get(name=job_name)
        state = (status.state or "").upper()
        if state in ("JOB_STATE_SUCCEEDED", "SUCCEEDED"):
            break
        if state in ("JOB_STATE_FAILED", "FAILED", "JOB_STATE_CANCELLED", "CANCELLED", "JOB_STATE_EXPIRED", "EXPIRED"):
            raise RuntimeError(f"Batch job failed: {state}")
        time.sleep(poll_interval_s)
    else:
        raise TimeoutError(f"Batch job timed out: {job_name}")

    results: Dict[str, Dict[str, Any]] = {}
    dest = status.dest
    if dest and dest.inlined_responses:
        for item in dest.inlined_responses:
            key = str(item.metadata.get("key", "")) if item.metadata else ""
            if not key:
                continue
            try:
                text = item.response.candidates[0].content.parts[0].text
                results[key] = extract_json_object(text)
            except Exception as exc:
                results[key] = {"confidence": 0, "flags": [f"batch_parse_error:{exc}"]}
    return results
