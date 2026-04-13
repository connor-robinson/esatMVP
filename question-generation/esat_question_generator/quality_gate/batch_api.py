"""
Gemini **Developer API** batch inference (inline requests).

Vertex AI batch jobs require GCS/BigQuery inputs; this path uses ``GEMINI_API_KEY``
(or ``GOOGLE_API_KEY``) with ``google.genai.Client(api_key=...)`` and
``client.batches.create`` — see https://ai.google.dev/gemini-api/docs/batch-api

Default model: ``gemini-2.5-flash`` (override with ``MODEL_QUALITY_GATE_BATCH``).
"""

from __future__ import annotations

import os
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from google import genai
from google.genai import types

from .assess import build_assessment_system_user_prompts, extract_json_object
from .defaults import DEFAULT_QUALITY_GATE_BATCH_MODEL
from .schemas import QualityGateResult, parse_quality_gate_json


def batch_api_key() -> str:
    k = (os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY") or "").strip()
    if not k:
        raise RuntimeError(
            "Gemini Batch API (Developer) requires GEMINI_API_KEY or GOOGLE_API_KEY in the "
            "environment. Vertex-only setups should omit --batch-api or set an API key for batch."
        )
    return k


def make_mldev_client() -> genai.Client:
    return genai.Client(api_key=batch_api_key())


def default_batch_model() -> str:
    return (os.environ.get("MODEL_QUALITY_GATE_BATCH") or DEFAULT_QUALITY_GATE_BATCH_MODEL).strip()


def _build_inline_request(
    row: Dict[str, Any],
    *,
    temperature: float,
) -> Dict[str, Any]:
    system_prompt, user_prompt = build_assessment_system_user_prompts(row)
    qid = str(row.get("id") or "")
    return {
        "metadata": {"key": qid},
        "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
        "config": {
            "system_instruction": {"parts": [{"text": system_prompt}]},
            "temperature": temperature,
        },
    }


@dataclass
class BatchAssessOutcome:
    question_id: str
    result: Optional[QualityGateResult] = None
    raw_text: str = ""
    error: Optional[str] = None


def run_inline_batch_assessments(
    rows: List[Dict[str, Any]],
    *,
    model: Optional[str] = None,
    temperature: float = 0.25,
    display_name: str = "quality_gate_batch",
    poll_interval_s: float = 15.0,
    timeout_s: float = 86400.0,
    log: Optional[List[str]] = None,
) -> List[BatchAssessOutcome]:
    """
    Submit one batch job for all ``rows`` (same order preserved in outcomes).

    Raises if the batch job ends in FAILED/CANCELLED/EXPIRED or on timeout.
    """
    if not rows:
        return []

    m = (model or "").strip() or default_batch_model()
    client = make_mldev_client()
    inline_requests = [_build_inline_request(r, temperature=temperature) for r in rows]
    expected_ids = [str(r.get("id") or "") for r in rows]

    def _log(msg: str) -> None:
        if log is not None:
            log.append(msg)

    _log(f"[batch-api] submitting {len(inline_requests)} request(s) model={m}")
    job = client.batches.create(
        model=m,
        src=inline_requests,
        config={"display_name": display_name[:120]},
    )
    name = job.name or ""
    if not name:
        raise RuntimeError("batch job missing name in create response")

    deadline = time.monotonic() + timeout_s
    state = job.state
    while time.monotonic() < deadline:
        job = client.batches.get(name=name)
        state = job.state
        if state is None:
            time.sleep(poll_interval_s)
            continue
        sn = state.name if hasattr(state, "name") else str(state)
        _log(f"[batch-api] state={sn}")
        if job.done:
            break
        time.sleep(poll_interval_s)

    if not job.done:
        raise TimeoutError(f"batch job {name} not finished within {timeout_s}s")

    if job.state != types.JobState.JOB_STATE_SUCCEEDED:
        err = job.error.message if job.error and job.error.message else str(job.error or "")
        raise RuntimeError(f"batch job ended with state={job.state!r} error={err!r}")

    inlined = job.dest.inlined_responses if job.dest else None
    if not inlined:
        raise RuntimeError("batch job succeeded but dest.inlined_responses is empty")

    if len(inlined) != len(rows):
        _log(
            f"[batch-api] warning: response count {len(inlined)} != row count {len(rows)}; "
            "zipping by index."
        )

    outcomes: List[BatchAssessOutcome] = []
    for i, row in enumerate(rows):
        qid = expected_ids[i] if i < len(expected_ids) else str(row.get("id") or "")
        ir = inlined[i] if i < len(inlined) else None
        if ir is None:
            outcomes.append(BatchAssessOutcome(question_id=qid, error="missing inline response slot"))
            continue
        if ir.error is not None:
            em = ir.error.message or str(ir.error)
            outcomes.append(BatchAssessOutcome(question_id=qid, error=em))
            continue
        if ir.response is None:
            outcomes.append(BatchAssessOutcome(question_id=qid, error="empty response"))
            continue
        raw = (ir.response.text or "").strip()
        if not raw:
            outcomes.append(BatchAssessOutcome(question_id=qid, error="empty response text"))
            continue
        try:
            data = extract_json_object(raw)
            result = parse_quality_gate_json(data)
            outcomes.append(BatchAssessOutcome(question_id=qid, result=result, raw_text=raw))
        except Exception as e:
            outcomes.append(BatchAssessOutcome(question_id=qid, raw_text=raw, error=str(e)))

    return outcomes
