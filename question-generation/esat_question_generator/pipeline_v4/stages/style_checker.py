"""V4 Style Checker (ESAT authenticity + selectivity)."""

from __future__ import annotations

from typing import Any, Dict, Optional

from ..llm_client import V4LLMClient
from ..prompt_loader import PhysicsV4Prompts
from ..schemas import StageResult
from ._common import call_stage_json, prompt_json_dumps


def run_style_checker(
    *,
    llm: V4LLMClient,
    prompts: PhysicsV4Prompts,
    model: str,
    designer_plan: Dict[str, Any],
    implemented: Dict[str, Any],
    verifier_report: Dict[str, Any],
    target_difficulty: str,
    reference_question: Optional[str] = None,
    reference_solution: Optional[str] = None,
    temperature: float = 0.2,
) -> StageResult:
    payload: Dict[str, Any] = {
        "designer_plan_json": designer_plan,
        "implemented_question_json": implemented,
        "verifier_report_json": verifier_report,
        "target_difficulty": target_difficulty,
        "reference_question": reference_question or "",
        "reference_solution": reference_solution or "",
        "instructions": (
            "Judge ESAT authenticity, selectivity, difficulty calibration, and "
            "the presence of a real reasoning hinge. Return raw JSON only."
        ),
    }
    return call_stage_json(
        llm=llm,
        stage="style_checker",
        model=model,
        system_prompt=prompts.style_checker,
        user_prompt=prompt_json_dumps(payload),
        temperature=temperature,
        required_top_keys=("verdict",),
    )
