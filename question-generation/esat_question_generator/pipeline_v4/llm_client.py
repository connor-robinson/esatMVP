"""Thin wrapper around ``project.LLMClient`` with JSON parsing helpers.

Why wrap? V4 stages need:
- a single ``call_json(stage, model, system_prompt, user_prompt)`` entry point,
- consistent fence-stripping and JSON parse error reporting,
- optional retry on transient transport errors (delegated to the inner client),
- a uniform place to plug in a prompt-trace callback for debugging.
"""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from typing import Any, Callable, Dict, Optional, Tuple

# Re-use the heavy-lift Gemini client and helpers from the legacy module so
# V4 inherits Vertex auth, rate-limit pacing, and quota-rotation behaviour.
from project import LLMClient as _BaseLLMClient  # type: ignore
from project import GeminiQuotaExhaustedError  # type: ignore
from project import strip_code_fences  # type: ignore


class V4LLMError(RuntimeError):
    """Raised when a V4 stage cannot produce parseable structured output."""

    def __init__(self, stage: str, message: str, raw_text: str = ""):
        super().__init__(f"[{stage}] {message}")
        self.stage = stage
        self.raw_text = raw_text


@dataclass
class CallResult:
    text: str
    parsed: Optional[Dict[str, Any]]
    parse_error: Optional[str]
    model: str
    stage: str


def _extract_first_json_object(text: str) -> Optional[Dict[str, Any]]:
    """Best-effort JSON extraction. Handles ```json fences and leading prose."""
    if not text:
        return None
    cleaned = strip_code_fences(text).strip()
    try:
        return json.loads(cleaned)
    except Exception:
        pass

    # Fallback: scan for the first balanced { ... }
    start = cleaned.find("{")
    if start < 0:
        return None
    depth = 0
    in_str = False
    esc = False
    for i in range(start, len(cleaned)):
        ch = cleaned[i]
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                candidate = cleaned[start : i + 1]
                try:
                    return json.loads(candidate)
                except Exception:
                    return None
    return None


class V4LLMClient:
    """High-level structured-JSON helper used by all V4 stages."""

    def __init__(
        self,
        prompt_trace: Optional[Callable[[str, str, str, str, float], None]] = None,
        min_delay: Optional[float] = None,
        rate_limit_delay: Optional[float] = None,
    ):
        # Inner client owns Vertex auth and global pacing.
        md = float(os.environ.get("API_MIN_DELAY", "5.0")) if min_delay is None else float(min_delay)
        rd = (
            float(os.environ.get("API_RATE_LIMIT_DELAY", "35.0"))
            if rate_limit_delay is None
            else float(rate_limit_delay)
        )
        self._inner = _BaseLLMClient(
            api_key="",
            min_delay=md,
            rate_limit_delay=rd,
            prompt_trace_callback=prompt_trace,
        )

    @property
    def total_usage(self) -> Dict[str, int]:
        return dict(self._inner.total_usage or {})

    def call_text(
        self,
        *,
        stage: str,
        model: str,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.4,
        max_retries: int = 5,
    ) -> str:
        return self._inner.generate(
            model=model,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=temperature,
            max_retries=max_retries,
            trace_label=stage,
        )

    def call_json(
        self,
        *,
        stage: str,
        model: str,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.4,
        max_retries: int = 5,
        required_top_keys: Tuple[str, ...] = (),
    ) -> CallResult:
        text = self.call_text(
            stage=stage,
            model=model,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=temperature,
            max_retries=max_retries,
        )
        parsed = _extract_first_json_object(text)
        if parsed is None:
            return CallResult(
                text=text,
                parsed=None,
                parse_error="No parseable JSON object in model output.",
                model=model,
                stage=stage,
            )
        if required_top_keys:
            missing = [k for k in required_top_keys if k not in parsed]
            if missing:
                return CallResult(
                    text=text,
                    parsed=parsed,
                    parse_error=f"Missing required keys: {missing}",
                    model=model,
                    stage=stage,
                )
        return CallResult(text=text, parsed=parsed, parse_error=None, model=model, stage=stage)


__all__ = [
    "V4LLMClient",
    "V4LLMError",
    "CallResult",
    "GeminiQuotaExhaustedError",
]
