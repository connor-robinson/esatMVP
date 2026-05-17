"""V4 Concept Image Regen — rewrite the image prompt after a REGENERATE
verdict."""

from __future__ import annotations

from typing import Any, Dict

from ..llm_client import V4LLMClient
from ..prompt_loader import PhysicsV4Prompts
from ..schemas import StageResult
from ._common import call_stage_json, prompt_json_dumps


def run_concept_image_regen(
    *,
    llm: V4LLMClient,
    prompts: PhysicsV4Prompts,
    model: str,
    concept_image_prompt: Dict[str, Any],
    concept_image_verifier_report: Dict[str, Any],
    temperature: float = 0.4,
) -> StageResult:
    payload: Dict[str, Any] = {
        "concept_image_prompt_json": concept_image_prompt,
        "concept_image_verifier_json": concept_image_verifier_report,
        "instructions": "Return raw JSON only. Strengthen layout_logic and hard_constraints.",
    }
    return call_stage_json(
        llm=llm,
        stage="concept_image_regen",
        model=model,
        system_prompt=prompts.concept_image_regen,
        user_prompt=prompt_json_dumps(payload),
        temperature=temperature,
        required_top_keys=("prompt",),
    )
