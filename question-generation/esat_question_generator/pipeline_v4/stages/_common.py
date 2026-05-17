"""Shared helpers across V4 stages (kept tiny on purpose)."""

from __future__ import annotations

import json
from typing import Any, Dict, Optional

from ..llm_client import V4LLMClient, CallResult
from ..schemas import StageResult


def prompt_json_dumps(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False, indent=2, default=str)


def call_stage_json(
    *,
    llm: V4LLMClient,
    stage: str,
    model: str,
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.4,
    required_top_keys: tuple = (),
    attempts: int = 1,
) -> StageResult:
    res: CallResult = llm.call_json(
        stage=stage,
        model=model,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        temperature=temperature,
        required_top_keys=required_top_keys,
    )
    if res.parsed is None:
        return StageResult(
            stage=stage,
            status="error",
            verdict=None,
            payload=None,
            raw_text=res.text,
            error=res.parse_error or "Could not parse JSON.",
            model=model,
            attempts=attempts,
        )

    verdict_raw = res.parsed.get("verdict") if isinstance(res.parsed, dict) else None
    verdict = str(verdict_raw).upper() if verdict_raw else None
    status = "pass"
    if verdict in ("FAIL", "DELETE"):
        status = "fail"
    elif verdict == "REGENERATE":
        status = "fail"  # treat as fixable fail
    elif res.parse_error:
        status = "error"

    return StageResult(
        stage=stage,
        status=status,
        verdict=verdict,
        payload=res.parsed,
        raw_text=res.text if res.parse_error else None,
        error=res.parse_error,
        model=model,
        attempts=attempts,
    )
