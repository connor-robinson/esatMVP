"""V4 Designer stage.

Produces the structured ``designer_plan`` JSON described in
``Physics Designer.md`` V2 (V4 pack).
"""

from __future__ import annotations

import random
from typing import Any, Dict, Optional

from ..llm_client import V4LLMClient
from ..prompt_loader import PhysicsV4Prompts
from ..schemas import StageResult
from ._common import call_stage_json, prompt_json_dumps


_DESIGNER_REQUIRED_KEYS = (
    "schema_id",
    "module",
    "variation_mode",
    "target_difficulty",
    "idea_summary",
    "schema_invariant",
    "discrimination_mechanism",
    "task_signature",
    "intended_wrong_paths",
    "anti_plug_and_chug_check",
)


def _resolve_variation_mode(requested: str) -> str:
    """Resolve a runtime variation mode.

    - ``sibling`` / ``far`` honoured exactly.
    - anything else => 50/50 between sibling and far.
    """
    m = (requested or "").strip().lower()
    if m == "sibling":
        return "SIBLING"
    if m == "far":
        return "FAR"
    return "SIBLING" if random.random() < 0.5 else "FAR"


def _inject_variation_block(designer_system: str, prompts: PhysicsV4Prompts, mode: str) -> str:
    """Replace the ``<INSERT_VARIATION_POLICY>`` placeholder if present.

    The V4 Physics Designer does not strictly require this — the Sibling / Far
    text is also passed in the user message — but we keep parity with the
    legacy pipeline behaviour just in case future V4 Designer revisions add the
    placeholder.
    """
    if "<INSERT_VARIATION_POLICY>" not in designer_system:
        return designer_system
    body = prompts.sibling_mode if mode == "SIBLING" else prompts.far_mode
    return designer_system.replace("<INSERT_VARIATION_POLICY>", body or "")


def run_designer(
    *,
    llm: V4LLMClient,
    prompts: PhysicsV4Prompts,
    model: str,
    schema_id: str,
    schema_block: str,
    difficulty: str,
    variation_mode: str,
    reference_question: Optional[str] = None,
    reference_solution: Optional[str] = None,
    temperature: float = 0.7,
) -> StageResult:
    mode = _resolve_variation_mode(variation_mode)
    system = _inject_variation_block(prompts.designer, prompts, mode)
    variation_policy = prompts.sibling_mode if mode == "SIBLING" else prompts.far_mode

    user_payload: Dict[str, Any] = {
        "schema_id": schema_id,
        "schema_block": schema_block,
        "target_difficulty": difficulty,
        "variation_mode": mode,
        "variation_policy": variation_policy,
        "reference_question": reference_question or "",
        "reference_solution": reference_solution or "",
        "instructions": (
            "Return ONE raw JSON object exactly matching the Designer V2 contract: "
            "preserve the schema invariant, include a named discrimination_mechanism "
            "with a reasoning_hinge, and set anti_plug_and_chug_check.would_formula_substitution_alone_solve_it=false "
            "for Medium/Hard/Extreme."
        ),
    }

    return call_stage_json(
        llm=llm,
        stage="designer",
        model=model,
        system_prompt=system,
        user_prompt=prompt_json_dumps(user_payload),
        temperature=temperature,
        required_top_keys=_DESIGNER_REQUIRED_KEYS,
    )
