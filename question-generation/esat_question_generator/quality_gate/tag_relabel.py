"""Re-label curriculum tags when stored tags are missing or invalid."""

from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

_BASE = Path(__file__).resolve().parent.parent
if str(_BASE) not in sys.path:
    sys.path.insert(0, str(_BASE))

from curriculum_parser import CurriculumParser, coerce_classifier_topic_code
from project import LLMClient, ModelsConfig, classifier_call, load_prompts

from .curriculum import primary_tag_allowed_for_subject
from .schemas import CurriculumFlag, QualityGateResult


def _needs_relabel(row: Dict[str, Any], result: QualityGateResult) -> bool:
    flag_ids: Set[str] = {f.flag_id for f in result.curriculum_flags if f.flag_id}
    if flag_ids & {"missing_primary_tag", "primary_tag_not_allowed", "math1_mm_primary_tag", "math1_mm_secondary_tag"}:
        return True
    primary = (row.get("primary_tag") or "").strip()
    if not primary:
        return True
    if not primary_tag_allowed_for_subject(primary, row.get("subjects")):
        return True
    return False


def maybe_relabel_tags(
    row: Dict[str, Any],
    result: QualityGateResult,
    *,
    llm: LLMClient,
    model: str,
) -> Optional[Dict[str, Any]]:
    """
    Run the legacy classifier to assign primary/secondary tags when flags say tags are wrong.

    Returns a Supabase patch dict, or None if relabel skipped / failed.
    """
    if not _needs_relabel(row, result):
        return None

    schema_id = (row.get("schema_id") or "").strip()
    if not schema_id:
        return None

    cur_path = _BASE / "curriculum" / "ESAT_CURRICULUM.json"
    parser = CurriculumParser(str(cur_path)) if cur_path.is_file() else CurriculumParser()

    question_package = {
        "question": {
            "stem": row.get("question_stem", ""),
            "options": row.get("options", {}) or {},
            "correct_option": row.get("correct_option", ""),
        },
        "solution": {
            "reasoning": row.get("solution_reasoning", ""),
            "key_insight": row.get("solution_key_insight", ""),
        },
        "distractor_map": row.get("distractor_map", {}) or {},
    }

    prompts = load_prompts(str(_BASE))
    models = ModelsConfig(
        designer=model,
        implementer=model,
        verifier=model,
        style_judge=model,
        classifier=model,
    )

    tag_result = classifier_call(
        llm,
        prompts,
        models,
        question_package,
        schema_id,
        parser,
    )

    primary_tag = tag_result.get("primary_tag", "") or ""
    secondary_tags = tag_result.get("secondary_tags", []) or []
    tags_confidence = tag_result.get("primary_confidence", 0.0)

    if primary_tag:
        coerced = coerce_classifier_topic_code(schema_id, primary_tag)
        normalized_primary = parser.normalize_topic_code(coerced)
        primary_tag = normalized_primary or coerced

    normalized_secondary: List[str] = []
    for tag in secondary_tags:
        tag_code = tag.get("code", "") if isinstance(tag, dict) else str(tag)
        if not tag_code:
            continue
        coerced = coerce_classifier_topic_code(schema_id, tag_code)
        normalized_tag = parser.normalize_topic_code(coerced)
        if normalized_tag:
            normalized_secondary.append(normalized_tag)

    if not primary_tag:
        return None

    if not primary_tag_allowed_for_subject(primary_tag, row.get("subjects")):
        return None

    patch: Dict[str, Any] = {
        "primary_tag": primary_tag,
        "secondary_tags": normalized_secondary,
        "tags_confidence": {"primary": tags_confidence},
        "tags_labeled_at": datetime.now(timezone.utc).isoformat(),
        "tags_labeled_by": "quality_gate_relabel",
    }

    if schema_id[0].upper() == "M" and tag_result.get("paper") in ("Math 1", "Math 2"):
        patch["subjects"] = tag_result["paper"]

    return patch
