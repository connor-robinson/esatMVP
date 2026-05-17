"""V4 Concept Image Verifier — inspects a rendered image and decides
PASS / REGENERATE / DELETE.

This needs a vision-capable structured model. Until the broader image
generation path is wired in (see ``concept_image_regen.py`` and the TODO in
``orchestrator.py``), we still expose the function so the orchestrator can
stub-call it with the prompt JSON only and get a deterministic SKIP result.
"""

from __future__ import annotations

from typing import Any, Dict, Optional

from ..llm_client import V4LLMClient
from ..prompt_loader import PhysicsV4Prompts
from ..schemas import StageResult
from ._common import call_stage_json, prompt_json_dumps


def run_concept_image_verifier(
    *,
    llm: V4LLMClient,
    prompts: PhysicsV4Prompts,
    model: str,
    implemented: Dict[str, Any],
    concept_image_prompt: Dict[str, Any],
    image_available: bool = False,
    image_description: Optional[str] = None,
    previous_feedback: Optional[Dict[str, Any]] = None,
    temperature: float = 0.2,
) -> StageResult:
    """Run the verifier prompt.

    When ``image_available`` is False (because we haven't generated the image
    yet), we still call the verifier with the *prompt* + *required relations*
    so it can sanity-check the brief and return REGENERATE/PASS based on the
    prompt-side hard constraints. This is a useful safeguard even before image
    generation is wired.
    """
    payload: Dict[str, Any] = {
        "implemented_question_json": implemented,
        "concept_image_prompt_json": concept_image_prompt,
        "image_available": bool(image_available),
        "image_description": image_description or "",
        "previous_feedback": previous_feedback or {},
        "instructions": (
            "Return raw JSON only. Verdict must be PASS, REGENERATE, or DELETE. "
            "If the image is not available, you are auditing the prompt and may "
            "PASS if the prompt is exam-safe and not answer-bearing."
        ),
    }
    return call_stage_json(
        llm=llm,
        stage="concept_image_verifier",
        model=model,
        system_prompt=prompts.concept_image_verifier,
        user_prompt=prompt_json_dumps(payload),
        temperature=temperature,
        required_top_keys=("verdict",),
    )
