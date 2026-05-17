"""V4 Accurate Graph Spec generator (deterministic JSON for graph rendering).

The actual SVG/PNG rendering is intentionally **out of scope** for this first
pass. We persist the spec JSON and leave a TODO in ``manifest.json`` so a
later renderer pass can materialise the asset deterministically.
"""

from __future__ import annotations

from typing import Any, Dict

from ..llm_client import V4LLMClient
from ..prompt_loader import PhysicsV4Prompts
from ..schemas import StageResult
from ._common import call_stage_json, prompt_json_dumps


_REQUIRED = ("graph_id", "graph_type", "x_axis", "y_axis", "data")


def run_graph_spec(
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
            "Return a deterministic graph spec as raw JSON only. "
            "All answer-bearing values must appear in the JSON."
        ),
    }
    return call_stage_json(
        llm=llm,
        stage="graph_spec",
        model=model,
        system_prompt=prompts.accurate_graph_spec,
        user_prompt=prompt_json_dumps(payload),
        temperature=temperature,
        required_top_keys=_REQUIRED,
    )
