"""V4 LLM Verifier (correctness gate). Always runs *after* the deterministic
validator; it should never see broken JSON.
"""

from __future__ import annotations

from typing import Any, Dict, Optional

from ..llm_client import V4LLMClient
from ..prompt_loader import PhysicsV4Prompts
from ..schemas import StageResult
from ._common import call_stage_json, prompt_json_dumps


def run_verifier(
    *,
    llm: V4LLMClient,
    prompts: PhysicsV4Prompts,
    model: str,
    designer_plan: Dict[str, Any],
    implemented: Dict[str, Any],
    graph_spec: Optional[Dict[str, Any]] = None,
    schematic_spec: Optional[Dict[str, Any]] = None,
    reference_question: Optional[str] = None,
    reference_solution: Optional[str] = None,
    temperature: float = 0.2,
) -> StageResult:
    payload: Dict[str, Any] = {
        "designer_plan_json": designer_plan,
        "implemented_question_json": implemented,
        "graph_spec": graph_spec,
        "schematic_spec": schematic_spec,
        "reference_question": reference_question or "",
        "reference_solution": reference_solution or "",
        "instructions": (
            "Solve the question independently. Ignore the claimed answer and "
            "compare. Return raw JSON only with verdict PASS or FAIL."
        ),
    }
    return call_stage_json(
        llm=llm,
        stage="verifier",
        model=model,
        system_prompt=prompts.verifier,
        user_prompt=prompt_json_dumps(payload),
        temperature=temperature,
        required_top_keys=("verdict",),
    )
