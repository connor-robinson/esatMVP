"""Anthropic Claude client for the quality gate (sync scoring only)."""

from __future__ import annotations

import os
import time
from typing import Optional


def _qg_console(msg: str, *, error_excerpt: str = "") -> None:
    try:
        line = f"[Quality gate / Claude] {msg}"
        if error_excerpt:
            ex = error_excerpt.strip().replace("\n", " ")
            if len(ex) > 600:
                ex = ex[:600] + "…"
            line += f" | {ex}"
        print(line, flush=True)
    except OSError:
        pass


class ClaudePurgeClient:
    """Drop-in shape for ``assess_question`` (same ``generate`` signature as ``LLMClient``)."""

    def __init__(self, *, api_key: Optional[str] = None, max_tokens: int = 8192) -> None:
        key = (api_key or os.environ.get("ANTHROPIC_API_KEY") or "").strip()
        if not key:
            raise RuntimeError(
                "Anthropic API key missing. Set ANTHROPIC_API_KEY in the environment (e.g. .env.local)."
            )
        try:
            from anthropic import Anthropic
        except ImportError as e:
            raise RuntimeError(
                "Install the Anthropic SDK for the quality gate: pip install anthropic"
            ) from e
        self._client = Anthropic(api_key=key)
        self._max_tokens = max(256, int(max_tokens))

    def generate(
        self,
        model: str,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.6,
        max_retries: int = 3,
        trace_label: Optional[str] = None,
    ) -> str:
        last: Optional[Exception] = None
        for attempt in range(max_retries):
            try:
                msg = self._client.messages.create(
                    model=model,
                    max_tokens=self._max_tokens,
                    temperature=float(temperature),
                    system=system_prompt,
                    messages=[{"role": "user", "content": user_prompt}],
                )
                parts: list[str] = []
                for block in msg.content:
                    if hasattr(block, "text") and block.text:
                        parts.append(block.text)
                return "".join(parts).strip()
            except Exception as e:
                last = e
                err = str(e)
                is_rl = (
                    "429" in err
                    or "rate_limit" in err.lower()
                    or "overloaded" in err.lower()
                    or "503" in err
                )
                if is_rl and attempt < max_retries - 1:
                    wait = max(5.0, 2.0**attempt)
                    _qg_console(
                        f"rate limit / transient — attempt {attempt + 1}/{max_retries}, "
                        f"waiting {wait:.1f}s (trace={trace_label or '—'})",
                        error_excerpt=err,
                    )
                    time.sleep(wait)
                    continue
                raise
        if last:
            raise last
        raise RuntimeError("Claude generate: no attempts")
