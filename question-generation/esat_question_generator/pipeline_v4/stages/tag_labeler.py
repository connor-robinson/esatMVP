"""V4 Tag Labeler.

We currently delegate to the existing ``project.tag_labeler_call`` /
``project.classifier_call`` path so curriculum tag mapping behaviour is
preserved (1:1 with the legacy pipeline). The orchestrator picks this up via
``run_tag_labeler``.
"""

from __future__ import annotations

from typing import Any, Dict, Optional

from ..llm_client import V4LLMClient
from ..prompt_loader import PhysicsV4Prompts
from ..schemas import StageResult


def run_tag_labeler(
    *,
    llm: V4LLMClient,
    prompts: PhysicsV4Prompts,  # noqa: ARG001 -- kept for symmetry; legacy uses Prompts
    model: str,
    base_dir: str,
    question_pkg: Dict[str, Any],
    schema_id: str,
) -> StageResult:
    """Run the legacy tag labeler for Physics; returns its JSON output."""
    try:
        from project import (  # type: ignore
            classifier_call,
            load_prompts,
            ModelsConfig,
        )
        from curriculum_parser import CurriculumParser  # type: ignore
    except Exception as e:
        return StageResult(
            stage="tag_labeler",
            status="error",
            error=f"Legacy tag labeler import failed: {e}",
        )

    try:
        legacy_prompts = load_prompts(base_dir)
        models = ModelsConfig(
            designer=model,
            implementer=model,
            verifier=model,
            style_judge=model,
            classifier=model,
        )
        # CurriculumParser path mirrors project.run_once defaults.
        from pathlib import Path
        cur_path = Path(base_dir) / "curriculum" / "ESAT_CURRICULUM.json"
        parser = CurriculumParser(str(cur_path)) if cur_path.is_file() else None

        tag_result = classifier_call(
            llm._inner,  # type: ignore[attr-defined]
            legacy_prompts,
            models,
            question_pkg,
            schema_id,
            parser,
        )

        if not isinstance(tag_result, dict):
            return StageResult(
                stage="tag_labeler",
                status="error",
                error=f"Tag labeler returned {type(tag_result).__name__}",
            )

        return StageResult(
            stage="tag_labeler",
            status="pass",
            payload=tag_result,
            model=model,
        )
    except Exception as e:
        return StageResult(stage="tag_labeler", status="error", error=str(e))
