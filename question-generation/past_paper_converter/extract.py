"""Gemini vision/text extraction prompts and API calls."""

from __future__ import annotations

import json
import re
import time
from typing import Any, Dict, List, Optional, Tuple

from google import genai
from google.genai import types

from .config import (
    DEFAULT_FLASH_MODEL,
    DEFAULT_PRO_MODEL,
    GEMINI_REQUEST_TIMEOUT_MS,
    gemini_api_key,
    use_vertex_ai,
    uses_variable_option_count,
    vertex_client_location,
    vertex_config,
)

SYSTEM_PROMPT = """You convert UK admissions exam question screenshots (NSAA, ENGAA, TMUA) into structured JSON for a KaTeX website.

Rules:
- Output ONLY valid JSON matching the schema. No markdown fences.
- stem: question text ONLY (no question number, no option letters A/B/C...)
- options: object mapping letter -> option text (each value is self-contained KaTeX)
- Use $...$ for inline math, $$...$$ for display math
- Escape backslashes in JSON (e.g. \\\\frac not \\frac in the raw JSON string values)
- Do NOT invent visual details.
- has_diagram MUST be explicitly true or false. It covers graphs, circuits, geometry figures, scientific drawings, maps, and graphical answer choices. Tables use the separate has_table/tables workflow and are NOT diagram crops.
- has_table MUST be explicitly true or false. If true, transcribe every header, row label, and cell into tables. Never crop a table as an image.
- diagram_confidence: 0-1 confidence in the has_diagram classification. Use below 0.9 if uncertain.
- diagram_type: one of graph, circuit, geometry, scientific, table, graphical_options, other, none
- has_graphical_options: true if any answer option depends on an image/graph/diagram rather than text alone
- diagram_bbox_norm: bounding box for a single NON-OPTION stem diagram, or null if there is no separate stem diagram. Include every label, axis title, tick label, legend, arrowhead, annotation, and caption.
- stem_diagram_assets: when the stem has two or more spatially separated diagrams/panels (for example before/after arrangements, two spring setups, Graph 1 and Graph 2, or diagrams P and Q), return EXACTLY one entry per complete diagram as {bbox_norm, caption}. Do not merge intervening prose or answer choices into a crop. When this list is non-empty, set diagram_bbox_norm to null. Every bbox is [x, y, WIDTH, HEIGHT].
- graphical_option_assets: when has_graphical_options=true, include EXACTLY one entry for every printed answer choice. Each entry has its letter and a bbox enclosing that choice's complete visual, including axes and labels. Do not combine choices. A–F means six entries. Every bbox is [x, y, WIDTH, HEIGHT], never [x1, y1, x2, y2].
- tables: when has_table=true, include each table as {caption, headers, rows}. Preserve all rows and columns. Put the printed option letter in the first cell when the table contains answer choices.
- detected_question_number: integer shown top-left of screenshot
- confidence: 0-1 how sure you are
- If image is unreadable, set confidence below 0.5 and empty stem/options

Schema:
{
  "detected_question_number": 1,
  "stem": "string",
  "options": {"A": "...", "B": "..."},
  "has_diagram": false,
  "has_table": false,
  "diagram_confidence": 0.99,
  "diagram_type": "none",
  "has_graphical_options": false,
  "diagram_bbox_norm": null,
  "stem_diagram_assets": [{"bbox_norm": [0.2, 0.15, 0.6, 0.25], "caption": "first spring arrangement"}],
  "graphical_option_assets": [{"letter": "A", "bbox_norm": [0.1, 0.4, 0.35, 0.2], "caption": "option A graph"}],
  "tables": [{"caption": "", "headers": ["", "quantity"], "rows": [["A", "value"]]}],
  "diagram_caption": "diagram not to scale",
  "confidence": 0.95,
  "flags": []
}"""


def make_client() -> genai.Client:
    http_options = types.HttpOptions(timeout=GEMINI_REQUEST_TIMEOUT_MS)
    if use_vertex_ai():
        project, location = vertex_config()
        if not project:
            raise RuntimeError("GOOGLE_CLOUD_PROJECT required for Vertex AI mode")
        return genai.Client(
            vertexai=True,
            project=project,
            location=vertex_client_location(location),
            http_options=http_options,
        )
    return genai.Client(api_key=gemini_api_key(), http_options=http_options)


def extract_json_object(text: str) -> Dict[str, Any]:
    text = (text or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("No JSON object in model response")
    blob = text[start : end + 1]
    try:
        return json.loads(blob)
    except json.JSONDecodeError:
        repaired = _repair_json_blob(blob)
        return json.loads(repaired)


def _repair_json_blob(blob: str) -> str:
    """Best-effort fixes for common Gemini JSON slips before giving up."""
    repaired = blob
    # Trailing commas before } or ]
    repaired = re.sub(r",(\s*[}\]])", r"\1", repaired)
    # Raw control characters inside strings break strict JSON
    repaired = repaired.replace("\r\n", "\\n").replace("\r", "\\n")
    repaired = re.sub(r"(?<!\\)\t", r"\\t", repaired)
    return repaired


def _is_transient_transport_error(exc: Exception) -> bool:
    message = f"{exc.__class__.__name__}: {exc}".lower()
    return any(
        marker in message
        for marker in (
            "transporterror",
            "connectionerror",
            "connection reset",
            "connection aborted",
            "temporarily unavailable",
            "server disconnected",
            "timed out",
            "timeout",
            "getaddrinfo failed",
            "winerror 10054",
            "502",
            "503",
            "504",
        )
    )


def build_user_text(
    job_meta: Dict[str, Any],
    pdf_hint: Optional[str] = None,
    *,
    options_retry: Optional[Dict[str, Any]] = None,
) -> str:
    exam = job_meta.get("exam_name") or ""
    paper = job_meta.get("paper_name") or ""
    expected = [str(letter) for letter in (job_meta.get("expected_letters") or [])]
    if uses_variable_option_count(exam, paper):
        option_hint = (
            "Option letters: variable per question (often A–F, A–G, or A–H). "
            "Extract ONLY the option letters actually printed — do not invent G/H if not shown."
        )
    else:
        option_hint = (
            f"This exam ALWAYS has exactly these option letters: {', '.join(expected)}. "
            f"Return every letter in options (exactly {len(expected)} entries). "
            "Do not stop early at F or G when H is printed."
        )

    parts = [
        f"Exam: {exam} {job_meta.get('exam_year')} {paper}",
        f"Expected question number in DB: {job_meta.get('question_number')}",
        option_hint,
        f"Part: {job_meta.get('part_letter')} — {job_meta.get('part_name')}",
        "Extract stem and options from the attached question screenshot.",
    ]
    if options_retry:
        found = sorted(str(letter) for letter in (options_retry.get("found_letters") or []))
        missing = [letter for letter in expected if letter not in found]
        parts.append(
            "CRITICAL RETRY: the previous extraction missed answer options. "
            f"Found only {', '.join(found) or '(none)'}. "
            f"Missing letters that must appear in the screenshot: {', '.join(missing) or '(unknown)'}. "
            "Re-read the full image from top to bottom and return ALL options."
        )
    if pdf_hint:
        parts.append(f"PDF text hint (may be messy, image is authoritative):\n{pdf_hint[:2000]}")
    return "\n".join(parts)


def extract_from_image(
    image_bytes: bytes,
    job_meta: Dict[str, Any],
    *,
    model: Optional[str] = None,
    pdf_hint: Optional[str] = None,
    mime_type: str = "image/png",
    options_retry: Optional[Dict[str, Any]] = None,
) -> Tuple[Dict[str, Any], str, Dict[str, Any]]:
    client = make_client()
    m = model or DEFAULT_FLASH_MODEL
    user_text = build_user_text(job_meta, pdf_hint, options_retry=options_retry)

    last_err: Optional[Exception] = None
    raw = ""
    response = None
    for attempt in range(4):
        try:
            response = client.models.generate_content(
                model=m,
                contents=[
                    types.Content(
                        role="user",
                        parts=[
                            types.Part.from_text(text=user_text),
                            types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                        ],
                    )
                ],
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    temperature=0.0 if options_retry or attempt else 0.1,
                    response_mime_type="application/json",
                ),
            )
            raw = response.text or ""
            parsed = extract_json_object(raw)
            break
        except json.JSONDecodeError as exc:
            # Malformed model JSON is retryable generation noise, not a network outage.
            last_err = exc
            if attempt < 3:
                time.sleep(1 + attempt)
                continue
            raise
        except Exception as exc:
            last_err = exc
            if ("429" in str(exc) or _is_transient_transport_error(exc)) and attempt < 3:
                time.sleep(2 ** attempt * 5)
                continue
            raise
    else:
        raise last_err or RuntimeError("generate_content failed")

    usage = {}
    if response is not None and response.usage_metadata:
        usage = {
            "prompt_token_count": getattr(response.usage_metadata, "prompt_token_count", None),
            "candidates_token_count": getattr(response.usage_metadata, "candidates_token_count", None),
            "total_token_count": getattr(response.usage_metadata, "total_token_count", None),
        }
    return parsed, raw, usage


def fix_katex_with_text(
    stem: str,
    options: Dict[str, str],
    katex_errors: List[Dict[str, str]],
    *,
    model: Optional[str] = None,
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """Text-only retry when local KaTeX validation fails."""
    client = make_client()
    m = model or DEFAULT_FLASH_MODEL
    prompt = json.dumps(
        {
            "stem": stem,
            "options": options,
            "katex_errors": katex_errors,
            "instruction": "Fix KaTeX syntax errors. Return JSON {stem, options} only. Use $...$ delimiters.",
        },
        ensure_ascii=False,
    )
    response = client.models.generate_content(
        model=m,
        contents=[prompt],
        config=types.GenerateContentConfig(
            temperature=0.0,
            response_mime_type="application/json",
        ),
    )
    raw = response.text or ""
    parsed = extract_json_object(raw)
    usage = {}
    if response.usage_metadata:
        usage = {
            "total_token_count": getattr(response.usage_metadata, "total_token_count", None),
        }
    return parsed, usage


def should_escalate_to_pro(parsed: Dict[str, Any], stem: str) -> bool:
    if float(parsed.get("confidence") or 0) < 0.85:
        return True
    hard_patterns = [r"\\int", r"\\sum", r"\\oint", r"\\iint", r"\\lim"]
    combined = stem + json.dumps(parsed.get("options") or {})
    return any(re.search(p, combined) for p in hard_patterns)


def escalate_model() -> str:
    return DEFAULT_PRO_MODEL
