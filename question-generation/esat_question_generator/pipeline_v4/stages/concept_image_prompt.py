"""V4 Concept Image Prompt generator (Gemini image prompt).

We attach the TMUA / ENGAA style guide as additional context — see
``Physics Concept_Image_Prompt.md`` V4 + ``Physics TMUA_ENGAA_Visual_Style_Guide.md``.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from ..llm_client import V4LLMClient
from ..prompt_loader import PhysicsV4Prompts
from ..schemas import StageResult
from ._common import call_stage_json, prompt_json_dumps


_REQUIRED = ("image_id", "prompt", "negative_prompt")


def _augmented_system(prompts: PhysicsV4Prompts) -> str:
    parts = [prompts.concept_image_prompt]
    if prompts.visual_style_guide:
        parts.append("\n\n---\n\n# Visual Style Guide Reference\n\n")
        parts.append(prompts.visual_style_guide)
    return "".join(parts)


def run_concept_image_prompt(
    *,
    llm: V4LLMClient,
    prompts: PhysicsV4Prompts,
    model: str,
    implemented: Dict[str, Any],
    designer_plan: Dict[str, Any],
    visual_brief: Optional[str] = None,
    required_labels: Optional[List[str]] = None,
    forbidden_labels: Optional[List[str]] = None,
    temperature: float = 0.4,
) -> StageResult:
    payload: Dict[str, Any] = {
        "implemented_question_json": implemented,
        "designer_plan_json": designer_plan,
        "visual_brief_json": {"visual_brief": visual_brief or ""},
        "required_labels": required_labels or [],
        "forbidden_labels": forbidden_labels or [],
        "instructions": (
            "Generate a high-fidelity TMUA / ENGAA exam-diagram style image "
            "prompt. The image must be illustrative only and must not become "
            "answer-bearing. Return raw JSON only."
        ),
    }
    return call_stage_json(
        llm=llm,
        stage="concept_image_prompt",
        model=model,
        system_prompt=_augmented_system(prompts),
        user_prompt=prompt_json_dumps(payload),
        temperature=temperature,
        required_top_keys=_REQUIRED,
    )
