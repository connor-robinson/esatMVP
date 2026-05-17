"""V4 Accurate Schematic Spec generator (simple circuit / apparatus / block)."""

from __future__ import annotations

from typing import Any, Dict

from ..llm_client import V4LLMClient
from ..prompt_loader import PhysicsV4Prompts
from ..schemas import StageResult
from ._common import call_stage_json, prompt_json_dumps


_REQUIRED = ("diagram_id", "schematic_type", "components")


def run_schematic_spec(
    *,
    llm: V4LLMClient,
    prompts: PhysicsV4Prompts,
    model: str,
    implemented: Dict[str, Any],
    designer_plan: Dict[str, Any],
    temperature: float = 0.2,
) -> StageResult:
    payload: Dict[str, Any] = {
        "implemented_question_json": implemented,
        "designer_plan_json": designer_plan,
        "instructions": (
            "Return a simple deterministic schematic spec as raw JSON only. "
            "Do NOT use this for exact geometry or precise angles."
        ),
    }
    return call_stage_json(
        llm=llm,
        stage="schematic_spec",
        model=model,
        system_prompt=prompts.accurate_schematic_spec,
        user_prompt=prompt_json_dumps(payload),
        temperature=temperature,
        required_top_keys=_REQUIRED,
    )
