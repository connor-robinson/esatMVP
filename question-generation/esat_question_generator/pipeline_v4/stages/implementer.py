"""V4 Implementer + Implementer-regen (driven by Retry_controller)."""

from __future__ import annotations

from typing import Any, Dict, Optional

from ..llm_client import V4LLMClient
from ..prompt_loader import PhysicsV4Prompts
from ..schemas import StageResult
from ._common import call_stage_json, prompt_json_dumps


_IMPLEMENTER_REQUIRED_KEYS = (
    "metadata",
    "question",
    "visual_requirements",
    "solution",
    "distractor_map",
)


def run_implementer(
    *,
    llm: V4LLMClient,
    prompts: PhysicsV4Prompts,
    model: str,
    designer_plan: Dict[str, Any],
    difficulty: str,
    schema_block: str = "",
    reference_question: Optional[str] = None,
    reference_solution: Optional[str] = None,
    temperature: float = 0.6,
) -> StageResult:
    user_payload: Dict[str, Any] = {
        "designer_plan": designer_plan,
        "target_difficulty": difficulty,
        "schema_block": schema_block,
        "reference_question": reference_question or "",
        "reference_solution": reference_solution or "",
        "instructions": (
            "Return ONE raw JSON object exactly matching the Implementer V4 contract. "
            "Include all six top-level keys: metadata, question, visual_requirements, "
            "solution, distractor_map, quality_self_check. "
            "Default to six options A-F unless the schema demands otherwise."
        ),
    }
    return call_stage_json(
        llm=llm,
        stage="implementer",
        model=model,
        system_prompt=prompts.implementer,
        user_prompt=prompt_json_dumps(user_payload),
        temperature=temperature,
        required_top_keys=_IMPLEMENTER_REQUIRED_KEYS,
    )


def run_implementer_regen(
    *,
    llm: V4LLMClient,
    prompts: PhysicsV4Prompts,
    model: str,
    designer_plan: Dict[str, Any],
    previous_attempt: Dict[str, Any],
    fail_report: Dict[str, Any],
    difficulty: str,
    schema_block: str = "",
    temperature: float = 0.7,
) -> StageResult:
    """Combine Retry_controller (system) + regen header + fail report (user)."""
    header = (prompts.regen_header or "").replace("<FAIL_JSON>", prompt_json_dumps(fail_report))
    user_payload: Dict[str, Any] = {
        "designer_plan_json": designer_plan,
        "previous_implemented_json": previous_attempt,
        "fail_report_json": fail_report,
        "target_difficulty": difficulty,
        "schema_block": schema_block,
        "instructions": (
            "Follow the Retry Controller V2 routing rules. Return ONE raw JSON "
            "object in the standard Implementer V4 shape."
        ),
    }
    user = header + "\n\n" + prompt_json_dumps(user_payload)
    return call_stage_json(
        llm=llm,
        stage="implementer_regen",
        model=model,
        system_prompt=prompts.retry_controller,
        user_prompt=user,
        temperature=temperature,
        required_top_keys=_IMPLEMENTER_REQUIRED_KEYS,
    )
