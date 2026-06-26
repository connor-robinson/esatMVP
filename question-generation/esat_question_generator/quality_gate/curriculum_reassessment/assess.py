"""Blind curriculum-only LLM reassessment."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Tuple

from quality_gate.assess import extract_json_object
from quality_gate.curriculum import get_curriculum_for_row, get_curriculum_snapshot, normalize_subject

from .actions import parse_reassessment_response
from .constants import CURRICULUM_REASSESSMENT_SYSTEM_PROMPT, REASSESS_VERSION


def _trim(text: Any, limit: int) -> str:
    s = str(text or "").strip()
    return s[:limit] if s else ""


def _secondary_tags(row: Dict[str, Any]) -> List[str]:
    raw = row.get("secondary_tags")
    if isinstance(raw, list):
        return [str(x).strip() for x in raw if str(x).strip()]
    if raw:
        return [str(raw).strip()]
    return []


def build_curriculum_reassessment_payload(row: Dict[str, Any]) -> Dict[str, Any]:
    """Blind payload — no prior curriculum assessment."""
    subject = normalize_subject(row.get("subjects"))
    curriculum = get_curriculum_for_row(row)
    return {
        "subject": subject,
        "primary_tag": row.get("primary_tag"),
        "secondary_tags": _secondary_tags(row),
        "question_stem": _trim(row.get("question_stem"), 16000),
        "options": row.get("options"),
        "correct_option": row.get("correct_option"),
        "solution_reasoning": _trim(row.get("solution_reasoning"), 12000),
        "curriculum_source": curriculum["curriculum_source"],
        "curriculum_allowed_codes": curriculum["curriculum_allowed_codes"],
        "curriculum_snapshot": curriculum["curriculum_snapshot"],
        "math1_assumed_knowledge_rules": get_curriculum_snapshot("Math 1", max_chars=6000),
        "supplied_in_question": [],
    }


def build_curriculum_reassessment_prompts(row: Dict[str, Any]) -> Tuple[str, str]:
    payload = build_curriculum_reassessment_payload(row)
    user_prompt = (
        "Assess curriculum fit only for this ESAT question.\n\n"
        "Input JSON:\n"
        + json.dumps(payload, ensure_ascii=False, indent=2)
    )
    return CURRICULUM_REASSESSMENT_SYSTEM_PROMPT, user_prompt


def enrich_curriculum_validation(
    parsed: Dict[str, Any],
    *,
    model: str,
) -> Dict[str, Any]:
    now = datetime.now(timezone.utc).isoformat()
    return {
        **parsed,
        "curriculum_validation_status": "valid",
        "curriculum_validator_version": REASSESS_VERSION,
        "curriculum_reassessed_at": now,
        "curriculum_reassessment_model": model,
        "curriculum_reason": parsed.get("reason", ""),
        "suspicious_topics": list(parsed.get("borderline_or_external_knowledge") or [])[:12],
        "curriculum_flags": [],
    }


def reassess_curriculum(
    llm: Any,
    row: Dict[str, Any],
    *,
    model: str,
    temperature: float = 0.2,
    max_retries: int = 3,
) -> Tuple[Dict[str, Any], str, str]:
    """
    Call the LLM for blind curriculum reassessment.

    Returns (enriched curriculum_validation dict, raw model text, model used).
    """
    system_prompt, user_prompt = build_curriculum_reassessment_prompts(row)
    last_exc: Exception | None = None
    for attempt in range(max_retries):
        try:
            raw = llm.generate(
                model,
                system_prompt,
                user_prompt,
                temperature=temperature,
                trace_label="curriculum_reassessment",
            )
            data = extract_json_object(raw)
            parsed = parse_reassessment_response(data)
            enriched = enrich_curriculum_validation(parsed, model=model)
            return enriched, raw, model
        except Exception as e:
            last_exc = e
            err = str(e).lower()
            transient = any(
                tok in err
                for tok in ("429", "rate", "overloaded", "503", "timeout", "temporarily")
            )
            if transient and attempt < max_retries - 1:
                continue
            raise
    if last_exc:
        raise last_exc
    raise RuntimeError("reassess_curriculum failed without exception")
