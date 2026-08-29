"""Gemini Batch API requests for mid-stem diagram placement."""

from __future__ import annotations

import base64
import time
from typing import Any, Dict, List, Optional

from .config import DEFAULT_BATCH_MODEL
from .extract import extract_json_object, make_client

PLACE_STEMS_SYSTEM_PROMPT = """You place existing stem diagrams into question text for UK admissions exams (NSAA, ENGAA, TMUA).

You do NOT crop, rewrite, or invent diagrams. You only decide where each listed stem diagram belongs among the numbered text blocks, based on the screenshot layout.

Rules:
- Output ONLY valid JSON matching the schema. No markdown fences.
- placements MUST include every provided asset id exactly once.
- The numbered text blocks in the user message are hints, not ground truth. They are NOT authoritative.
- If the source screenshot shows a diagram between sentences that currently share one block, you MUST treat that as a split boundary: assign insert_after_block for the layout as if the block had been split at the diagram position.
- Never move a clearly mid-stem diagram to the end merely because no current slot exists.
- When splitting is required, return insert_after_block for the corrected block list (as if the block had been split at the diagram boundary).
- When there are multiple stem diagrams (d1, d2, ...), each gets its own placement at the block boundary where that diagram appears in the screenshot. Never stack unrelated diagrams at the same slot unless they truly sit together in the original layout.
- insert_after_block is an integer:
  - 0 = before the first text block
  - N = after text block N (1-based block numbers in the user message map to insert_after_block = N)
  - len(blocks) = after all text (end of stem)
- Match diagram order in the screenshot when two diagrams sit in different parts of the stem.
- If unsure after applying the split rule above, use confidence below 0.7.
- Never invent asset ids. Never omit an asset.
- Ignore answer-choice images; only the listed stem assets matter.
- confidence is 0-1 for that placement.

Schema:
{
  "placements": [
    {"asset_id": "d1", "insert_after_block": 1, "confidence": 0.92}
  ]
}
"""


def build_place_user_text(
    *,
    exam_name: str,
    exam_year: int,
    paper_name: str,
    question_number: int,
    stem_blocks: List[str],
    assets: List[Dict[str, Any]],
) -> str:
    block_lines = []
    for index, block in enumerate(stem_blocks, start=1):
        block_lines.append(f"### Block {index}\n{block}")
    if not block_lines:
        block_lines.append("(no text blocks; place every diagram at insert_after_block = 0)")

    asset_lines = []
    for asset in assets:
        asset_id = str(asset.get("id") or "")
        alt = str(asset.get("alt") or asset.get("caption") or "diagram").strip()
        asset_lines.append(f"- {asset_id}: {alt}")

    n = len(stem_blocks)
    return (
        f"Exam: {exam_name} {exam_year} {paper_name}\n"
        f"Question number: {question_number}\n"
        f"Text block count: {n}\n"
        f"Allowed insert_after_block values: 0 through {n} inclusive.\n\n"
        f"Stem text blocks:\n" + "\n\n".join(block_lines) + "\n\n"
        f"Stem diagram assets to place (every id exactly once):\n"
        + "\n".join(asset_lines)
        + "\n\n"
        "Look at the screenshot and decide where each diagram sits relative to the text. "
        "The numbered text blocks are hints only. If the screenshot shows a diagram between "
        "sentences that share one block, split that block at the diagram position before "
        "choosing insert_after_block."
    )


def build_place_batch_request(
    *,
    question_id: int,
    image_bytes: bytes,
    exam_name: str,
    exam_year: int,
    paper_name: str,
    question_number: int,
    stem_blocks: List[str],
    assets: List[Dict[str, Any]],
    asset_crop_bytes: Optional[Dict[str, bytes]] = None,
) -> Dict[str, Any]:
    user_text = build_place_user_text(
        exam_name=exam_name,
        exam_year=exam_year,
        paper_name=paper_name,
        question_number=question_number,
        stem_blocks=stem_blocks,
        assets=assets,
    )
    parts: List[Any] = [
        {"text": user_text},
        {"text": "Full question screenshot (layout reference):"},
        {
            "inline_data": {
                "mime_type": "image/png",
                "data": base64.b64encode(image_bytes).decode("ascii"),
            }
        },
    ]
    crop_map = asset_crop_bytes or {}
    if crop_map:
        parts.append(
            {
                "text": (
                    "Individual stem diagram crops (match asset ids above; "
                    "use these to tell d1 vs d2 when multiple diagrams exist):"
                )
            }
        )
        for asset in assets:
            asset_id = str(asset.get("id") or "")
            crop = crop_map.get(asset_id)
            if not crop:
                continue
            alt = str(asset.get("alt") or asset.get("caption") or "diagram").strip()
            parts.append({"text": f"Crop for {asset_id} ({alt}):"})
            parts.append(
                {
                    "inline_data": {
                        "mime_type": "image/png",
                        "data": base64.b64encode(crop).decode("ascii"),
                    }
                }
            )
    return {
        "metadata": {"key": str(question_id)},
        "contents": [{"role": "user", "parts": parts}],
        "config": {
            "system_instruction": {"parts": [{"text": PLACE_STEMS_SYSTEM_PROMPT}]},
            "temperature": 0.1,
            "response_mime_type": "application/json",
        },
    }


def run_batch_place(
    requests: List[Dict[str, Any]],
    *,
    model: Optional[str] = None,
    poll_interval_s: float = 15.0,
    timeout_s: float = 86400.0,
    display_name: str = "past_paper_place_stems",
    on_status: Optional[Any] = None,
) -> Dict[str, Dict[str, Any]]:
    """Submit placement batch; return {question_id_str: parsed_json_or_error}."""
    if not requests:
        return {}

    client = make_client()
    m = model or DEFAULT_BATCH_MODEL
    job = client.batches.create(
        model=m,
        src=requests,
        config={"display_name": display_name},
    )
    job_name = job.name
    deadline = time.time() + timeout_s

    while time.time() < deadline:
        status = client.batches.get(name=job_name)
        state = (status.state or "").upper()
        if on_status:
            on_status(job_name, state)
        if state in ("JOB_STATE_SUCCEEDED", "SUCCEEDED"):
            break
        if state in (
            "JOB_STATE_FAILED",
            "FAILED",
            "JOB_STATE_CANCELLED",
            "CANCELLED",
            "JOB_STATE_EXPIRED",
            "EXPIRED",
        ):
            raise RuntimeError(f"Batch job failed: {state} ({job_name})")
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
                if getattr(item, "error", None):
                    results[key] = {
                        "error": str(item.error),
                        "flags": ["batch_item_error"],
                    }
                    continue
                text = item.response.candidates[0].content.parts[0].text
                results[key] = extract_json_object(text)
            except Exception as exc:
                results[key] = {
                    "error": str(exc),
                    "flags": [f"batch_parse_error:{exc}"],
                }
    return results
