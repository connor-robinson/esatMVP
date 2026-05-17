"""V4 Idea Judge — gates the Designer plan before Implementer runs."""

from __future__ import annotations

from typing import Any, Dict, Optional

from ..llm_client import V4LLMClient
from ..prompt_loader import PhysicsV4Prompts
from ..schemas import StageResult
from ._common import call_stage_json, prompt_json_dumps


def run_idea_judge(
    *,
    llm: V4LLMClient,
    prompts: PhysicsV4Prompts,
    model: str,
    designer_plan: Dict[str, Any],
    target_difficulty: str,
    schema_block: str = "",
    reference_question: Optional[str] = None,
    reference_solution: Optional[str] = None,
    temperature: float = 0.2,
) -> StageResult:
    user_payload: Dict[str, Any] = {
        "designer_plan_json": designer_plan,
        "target_difficulty": target_difficulty,
        "schema_block": schema_block,
        "reference_question": reference_question or "",
        "reference_solution": reference_solution or "",
        "instructions": "Return raw JSON only. Set verdict to PASS or FAIL.",
    }
    return call_stage_json(
        llm=llm,
        stage="idea_judge",
        model=model,
        system_prompt=prompts.idea_judge,
        user_prompt=prompt_json_dumps(user_payload),
        temperature=temperature,
        required_top_keys=("verdict",),
    )
