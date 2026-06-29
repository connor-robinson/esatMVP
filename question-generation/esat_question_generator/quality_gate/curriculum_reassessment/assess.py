"""Blind curriculum-only LLM reassessment."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from quality_gate.assess import extract_json_object
from quality_gate.curriculum import get_curriculum_snapshot, normalize_subject
from quality_gate.curriculum_rules import get_curriculum_context_for_row

from .actions import parse_reassessment_response
from .constants import (
    BENCHMARK_VALIDATOR_VERSION,
    CURRICULUM_BENCHMARK_SYSTEM_PROMPT,
    CURRICULUM_REASSESSMENT_SYSTEM_PROMPT,
    REASSESS_VERSION,
)


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


def build_curriculum_reassessment_payload(
    row: Dict[str, Any],
    *,
    use_benchmark_rules: bool = False,
) -> Dict[str, Any]:
    """Blind payload — no prior curriculum assessment."""
    if use_benchmark_rules:
        ctx = get_curriculum_context_for_row(row)
        return {
            "subject": normalize_subject(row.get("subjects")),
            "primary_tag": row.get("primary_tag"),
            "secondary_tags": _secondary_tags(row),
            "question_stem": _trim(row.get("question_stem"), 16000),
            "options": row.get("options"),
            "correct_option": row.get("correct_option"),
            "solution_reasoning": _trim(row.get("solution_reasoning"), 12000),
            "curriculum_source": ctx["curriculum_source"],
            "curriculum_allowed_codes": ctx["curriculum_allowed_codes"],
            "curriculum_snapshot": ctx["curriculum_snapshot"],
            "curriculum_rules": ctx.get("curriculum_rules"),
            "curriculum_rules_source": ctx.get("curriculum_rules_source"),
            "supplied_in_question": [],
        }
    subject = normalize_subject(row.get("subjects"))
    from quality_gate.curriculum import get_curriculum_for_row

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


def build_curriculum_reassessment_prompts(
    row: Dict[str, Any],
    *,
    use_benchmark_rules: bool = False,
) -> Tuple[str, str]:
    payload = build_curriculum_reassessment_payload(row, use_benchmark_rules=use_benchmark_rules)
    system_prompt = (
        CURRICULUM_BENCHMARK_SYSTEM_PROMPT if use_benchmark_rules else CURRICULUM_REASSESSMENT_SYSTEM_PROMPT
    )
    schema_example = {
        "curriculum_match": "in_syllabus",
        "syllabus_fit_score": 5,
        "required_topic_codes": ["M2-MM1"],
        "required_knowledge": ["example concept"],
        "borderline_or_external_knowledge": [],
        "reason": "Brief curriculum justification.",
        "confidence": "high",
    }
    user_prompt = (
        "Assess curriculum fit only for this ESAT question.\n\n"
        "Return a single JSON object with ALL of these keys (no omissions):\n"
        f"{json.dumps(schema_example, indent=2)}\n\n"
        "curriculum_match must be exactly: in_syllabus, borderline, or out_of_syllabus.\n"
        "confidence must be exactly: high, medium, or low.\n"
        "syllabus_fit_score must be an integer from 1 to 5.\n"
        "List every solve-path requirement in required_knowledge before deciding.\n\n"
        "Input JSON:\n"
        + json.dumps(payload, ensure_ascii=False, indent=2)
    )
    return system_prompt, user_prompt


def enrich_curriculum_validation(
    parsed: Dict[str, Any],
    *,
    model: str,
    validator_version: str = REASSESS_VERSION,
) -> Dict[str, Any]:
    now = datetime.now(timezone.utc).isoformat()
    return {
        **parsed,
        "curriculum_validation_status": "valid",
        "curriculum_validator_version": validator_version,
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
    use_benchmark_rules: bool = False,
    validator_version: Optional[str] = None,
) -> Tuple[Dict[str, Any], str, str]:
    """
    Call the LLM for blind curriculum reassessment.

    Returns (enriched curriculum_validation dict, raw model text, model used).
    """
    system_prompt, user_prompt = build_curriculum_reassessment_prompts(
        row, use_benchmark_rules=use_benchmark_rules
    )
    last_exc: Exception | None = None
    retry_suffix = (
        "\n\n[Retry] Your previous response omitted required keys. "
        "Return the full JSON object with curriculum_match, syllabus_fit_score, "
        "required_topic_codes, required_knowledge, borderline_or_external_knowledge, "
        "reason, and confidence."
    )
    for attempt in range(max_retries):
        try:
            raw = llm.generate(
                model,
                system_prompt,
                user_prompt + (retry_suffix if attempt > 0 else ""),
                temperature=temperature,
                trace_label="curriculum_reassessment",
            )
            data = extract_json_object(raw)
            parsed = parse_reassessment_response(data)
            ver = validator_version or (
                BENCHMARK_VALIDATOR_VERSION if use_benchmark_rules else REASSESS_VERSION
            )
            enriched = enrich_curriculum_validation(parsed, model=model, validator_version=ver)
            return enriched, raw, model
        except Exception as e:
            last_exc = e
            err = str(e).lower()
            # Retry on transient API failures, and also on schema/format misses where the
            # retry suffix reliably fixes JSON-only / missing-keys responses.
            transient = any(
                tok in err
                for tok in ("429", "rate", "overloaded", "503", "timeout", "temporarily")
            )
            format_miss = any(
                tok in err
                for tok in (
                    "no json object found",
                    "jsondecodeerror",
                    "missing required key",
                    "omitted required keys",
                )
            )
            if transient and attempt < max_retries - 1:
                continue
            if format_miss and attempt < max_retries - 1:
                continue
            raise
    if last_exc:
        raise last_exc
    raise RuntimeError("reassess_curriculum failed without exception")
