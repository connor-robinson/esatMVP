"""Multimodal Gemini client for diagram spec generation."""

from __future__ import annotations

import json
import os
import re
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from google import genai
from google.genai import types

from .errors import VisualSpecError

DEFAULT_DIAGRAM_DESIGNER_MODEL = os.environ.get("MODEL_DIAGRAM_DESIGNER", "gemini-3.7-flash")
GEMINI_REQUEST_TIMEOUT_MS = int(float(os.environ.get("DIAGRAM_GEMINI_TIMEOUT_S", "180")) * 1000)


@dataclass
class MultimodalCallResult:
    parsed: dict[str, Any]
    raw_text: str
    model: str
    usage: dict[str, Any]


def _load_env() -> None:
    env_path = Path(__file__).resolve().parents[2] / ".env.local"
    if env_path.exists():
        try:
            from dotenv import load_dotenv

            load_dotenv(env_path)
        except ImportError:
            pass


def make_client() -> genai.Client:
    _load_env()
    project = (os.environ.get("GOOGLE_CLOUD_PROJECT") or os.environ.get("VERTEX_PROJECT") or "").strip()
    location = (
        os.environ.get("GOOGLE_CLOUD_LOCATION")
        or os.environ.get("VERTEX_GENAI_LOCATION")
        or "us-central1"
    ).strip()
    if location.lower() == "global" and not os.environ.get("VERTEX_GENAI_NO_GLOBAL_REMAP"):
        location = "us-central1"
    if not project:
        raise RuntimeError("GOOGLE_CLOUD_PROJECT is required for Diagram Designer (Vertex AI)")
    return genai.Client(
        vertexai=True,
        project=project,
        location=location,
        http_options=types.HttpOptions(timeout=GEMINI_REQUEST_TIMEOUT_MS),
    )


def _strip_json_fences(text: str) -> str:
    s = (text or "").strip()
    if s.startswith("```"):
        s = re.sub(r"^```(?:json)?\s*", "", s)
        s = re.sub(r"\s*```$", "", s)
    return s.strip()


def extract_json_object(text: str) -> dict[str, Any]:
    s = _strip_json_fences(text)
    try:
        obj = json.loads(s)
        if isinstance(obj, dict):
            return obj
    except json.JSONDecodeError:
        pass
    start = s.find("{")
    end = s.rfind("}")
    if start < 0 or end <= start:
        raise VisualSpecError("Diagram Designer response contained no JSON object")
    return json.loads(s[start : end + 1])


def _mime_for_path(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix in {".jpg", ".jpeg"}:
        return "image/jpeg"
    if suffix == ".webp":
        return "image/webp"
    return "image/png"


def call_json_multimodal(
    *,
    system_prompt: str,
    user_payload: dict[str, Any],
    image_bytes: bytes,
    mime_type: str = "image/png",
    extra_images: list[tuple[bytes, str]] | None = None,
    model: str | None = None,
    thinking_level: str = "high",
    temperature: float = 0.2,
    max_retries: int = 3,
) -> MultimodalCallResult:
    """Call Gemini with image(s) + JSON instructions; return parsed JSON."""
    client = make_client()
    m = model or DEFAULT_DIAGRAM_DESIGNER_MODEL
    user_text = json.dumps(user_payload, ensure_ascii=False, indent=2)
    thinking = (thinking_level or "high").strip().lower()

    config = types.GenerateContentConfig(
        system_instruction=system_prompt,
        temperature=temperature,
        response_mime_type="application/json",
        thinking_config=types.ThinkingConfig(thinking_level=thinking),
    )

    parts: list[types.Part] = [types.Part.from_text(text=user_text)]
    parts.append(types.Part.from_bytes(data=image_bytes, mime_type=mime_type))
    for extra_bytes, extra_mime in extra_images or []:
        parts.append(types.Part.from_bytes(data=extra_bytes, mime_type=extra_mime))

    last_err: Exception | None = None
    raw = ""
    response = None
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model=m,
                contents=[types.Content(role="user", parts=parts)],
                config=config,
            )
            raw = (response.text or "").strip()
            parsed = extract_json_object(raw)
            usage: dict[str, Any] = {}
            if response.usage_metadata:
                usage = {
                    "prompt_token_count": getattr(response.usage_metadata, "prompt_token_count", None),
                    "candidates_token_count": getattr(response.usage_metadata, "candidates_token_count", None),
                    "total_token_count": getattr(response.usage_metadata, "total_token_count", None),
                }
            return MultimodalCallResult(parsed=parsed, raw_text=raw, model=m, usage=usage)
        except Exception as exc:
            last_err = exc
            msg = str(exc)
            if ("429" in msg or "503" in msg or "RESOURCE_EXHAUSTED" in msg) and attempt < max_retries - 1:
                time.sleep(2 ** attempt * 5)
                continue
            raise
    raise last_err or RuntimeError("Diagram Designer multimodal call failed")
