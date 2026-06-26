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
- Do NOT invent diagram details — if a diagram/graph is present, set has_diagram=true and provide diagram_bbox_norm
- diagram_bbox_norm: [x, y, w, h] normalized 0-1 relative to full image. Include the ENTIRE diagram/graph with all labels, axes, and arrows — add ~5% margin beyond the ink; do not crop tightly to lines
- detected_question_number: integer shown top-left of screenshot
- confidence: 0-1 how sure you are
- If image is unreadable, set confidence below 0.5 and empty stem/options

Schema:
{
  "detected_question_number": 1,
  "stem": "string",
  "options": {"A": "...", "B": "..."},
  "has_diagram": false,
  "diagram_bbox_norm": [0.1, 0.05, 0.8, 0.3],
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
    return json.loads(text[start : end + 1])


def build_user_text(job_meta: Dict[str, Any], pdf_hint: Optional[str] = None) -> str:
    exam = job_meta.get("exam_name") or ""
    paper = job_meta.get("paper_name") or ""
    if uses_variable_option_count(exam, paper):
        option_hint = (
            "Option letters: variable per question (often A–F, A–G, or A–H). "
            "Extract ONLY the option letters actually printed — do not invent G/H if not shown."
        )
    else:
        option_hint = f"Expected option letters: {', '.join(job_meta.get('expected_letters', []))}"

    parts = [
        f"Exam: {exam} {job_meta.get('exam_year')} {paper}",
        f"Expected question number in DB: {job_meta.get('question_number')}",
        option_hint,
        f"Part: {job_meta.get('part_letter')} — {job_meta.get('part_name')}",
        "Extract stem and options from the attached question screenshot.",
    ]
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
) -> Tuple[Dict[str, Any], str, Dict[str, Any]]:
    client = make_client()
    m = model or DEFAULT_FLASH_MODEL
    user_text = build_user_text(job_meta, pdf_hint)

    last_err: Optional[Exception] = None
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
                    temperature=0.1,
                    response_mime_type="application/json",
                ),
            )
            break
        except Exception as exc:
            last_err = exc
            if "429" in str(exc) and attempt < 3:
                time.sleep(2 ** attempt * 5)
                continue
            raise
    else:
        raise last_err or RuntimeError("generate_content failed")

    raw = response.text or ""
    parsed = extract_json_object(raw)
    usage = {}
    if response.usage_metadata:
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
