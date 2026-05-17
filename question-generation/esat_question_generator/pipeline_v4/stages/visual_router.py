"""V4 Visual Router — decides which downstream visual file (if any) to run."""

from __future__ import annotations

from typing import Any, Dict, Optional

from ..llm_client import V4LLMClient
from ..prompt_loader import PhysicsV4Prompts
from ..schemas import StageResult
from ._common import call_stage_json, prompt_json_dumps


_VALID_ROUTES = {
    "none",
    "accurate_graph_json",
    "accurate_schematic_json",
    "concept_image_prompt",
    "unsupported_visual_dependency",
}


def run_visual_router(
    *,
    llm: V4LLMClient,
    prompts: PhysicsV4Prompts,
    model: str,
    designer_plan: Dict[str, Any],
    implemented: Dict[str, Any],
    temperature: float = 0.1,
) -> StageResult:
    payload: Dict[str, Any] = {
        "designer_plan_json": designer_plan,
        "implemented_question_json": implemented,
        "instructions": (
            "Choose exactly one visual_route. Return raw JSON only."
        ),
    }
    result = call_stage_json(
        llm=llm,
        stage="visual_router",
        model=model,
        system_prompt=prompts.diagram_graph_router,
        user_prompt=prompt_json_dumps(payload),
        temperature=temperature,
        required_top_keys=("visual_route",),
    )

    # Defensive normalisation: snap router output to allowed enum.
    if result.payload is not None:
        route = str(result.payload.get("visual_route", "")).strip().lower()
        if route not in _VALID_ROUTES:
            result.notes.append(
                f"visual_route {route!r} not recognised; defaulting to 'none'."
            )
            result.payload["visual_route"] = "none"
        else:
            result.payload["visual_route"] = route
    return result


def route_of(stage_result: StageResult) -> str:
    """Cheap accessor: returns the chosen route string, or 'none' as default."""
    if not stage_result or not stage_result.payload:
        return "none"
    return str(stage_result.payload.get("visual_route", "none") or "none").lower()
