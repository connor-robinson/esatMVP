from __future__ import annotations

import ast
import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from project import _gemini_console

from .answer_key import build_answer_key_precheck
from .curriculum import get_curriculum_for_row, get_math2_relocation_context, normalize_subject
from .curriculum_flags import detect_curriculum_flags
from .formatting import build_formatting_report, detect_formatting_issues
from .defaults import deterministic_prechecks_enabled, quality_gate_model_try_order
from .schemas import CurriculumFlag, QualityGateResult, parse_quality_gate_json

_DIR = Path(__file__).resolve().parent


def load_rubric_markdown() -> str:
    from .defaults import use_full_rubric

    name = "prompt.md" if use_full_rubric() else "prompt_compact.md"
    p = _DIR / name
    if not p.is_file():
        p = _DIR / "prompt.md"
    return p.read_text(encoding="utf-8")


def _strip_json_fences(text: str) -> str:
    s = text.strip()
    if s.startswith("```"):
        lines = s.splitlines()
        if lines and lines[0].strip().startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        s = "\n".join(lines).strip()
    return s


def extract_json_object(text: str) -> Dict[str, Any]:
    s = _strip_json_fences(text)

    def _try_parse(candidate: str) -> Optional[Dict[str, Any]]:
        chunk = candidate.strip()
        if not chunk:
            return None
        for parser in (json.loads, ast.literal_eval):
            try:
                parsed = parser(chunk)
                if isinstance(parsed, dict):
                    return parsed
            except (json.JSONDecodeError, SyntaxError, ValueError, TypeError):
                continue
        return None

    hit = _try_parse(s)
    if hit is not None:
        return hit

    start = s.find("{")
    end = s.rfind("}")
    if start >= 0 and end > start:
        hit = _try_parse(s[start : end + 1])
        if hit is not None:
            return hit

    raise ValueError("no JSON object found in model output")


def _subject_for_payload(row: Dict[str, Any]) -> Any:
    raw = row.get("subjects")
    if raw is None:
        return None
    if isinstance(raw, str):
        s = raw.strip()
        return s or None
    if isinstance(raw, list):
        parts = [str(x).strip() for x in raw if x is not None and str(x).strip()]
        return ", ".join(parts) if parts else None
    s = str(raw).strip()
    return s or None


def _secondary_tags_for_payload(row: Dict[str, Any]) -> List[str]:
    raw = row.get("secondary_tags")
    if isinstance(raw, list):
        return [str(x).strip() for x in raw if x is not None and str(x).strip()]
    if isinstance(raw, str) and raw.strip():
        return [raw.strip()]
    return []


def run_curriculum_precheck(row: Dict[str, Any]) -> List[CurriculumFlag]:
    if not deterministic_prechecks_enabled():
        return []
    return [CurriculumFlag.from_dict(f) for f in detect_curriculum_flags(row)]


def build_question_payload(
    row: Dict[str, Any],
    *,
    pre_flags: Optional[List[CurriculumFlag]] = None,
    answer_key_row: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Fields sent to the quality-gate judge, including official curriculum snapshot."""

    def _trim(s: Any, n: int) -> Any:
        if not isinstance(s, str):
            return s
        return s if len(s) <= n else s[:n] + "\n…[truncated]"

    subject = _subject_for_payload(row)
    curriculum = get_curriculum_for_row(row)
    payload: Dict[str, Any] = {
        "subject": subject,
        "difficulty": row.get("difficulty"),
        "primary_tag": row.get("primary_tag"),
        "secondary_tags": _secondary_tags_for_payload(row),
        "question_stem": _trim(row.get("question_stem"), 16000),
        "options": row.get("options"),
        "correct_option": row.get("correct_option"),
        "solution_reasoning": _trim(row.get("solution_reasoning"), 12000),
        "solution_key_insight": _trim(row.get("solution_key_insight"), 12000),
        "distractor_map": row.get("distractor_map"),
        "curriculum_source": curriculum["curriculum_source"],
        "curriculum_allowed_codes": curriculum["curriculum_allowed_codes"],
        "curriculum_snapshot": curriculum["curriculum_snapshot"],
        "primary_tag_allowed_for_subject": curriculum["primary_tag_allowed"],
    }
    if deterministic_prechecks_enabled():
        payload["answer_key_precheck"] = build_answer_key_precheck(answer_key_row or row)
        if pre_flags:
            payload["deterministic_curriculum_flags"] = [f.to_dict() for f in pre_flags]
        fmt_report = build_formatting_report(row)
        payload["formatting_precheck"] = fmt_report
        fmt_issues = detect_formatting_issues(row)
        if fmt_issues:
            payload["deterministic_formatting_flags"] = fmt_report.get("deterministic_formatting_flags")
    payload.update(get_math2_relocation_context(row))
    return payload


def build_assessment_system_user_prompts(
    row: Dict[str, Any],
    *,
    pre_flags: Optional[List[CurriculumFlag]] = None,
    answer_key_row: Optional[Dict[str, Any]] = None,
) -> Tuple[str, str]:
    rubric = load_rubric_markdown()
    system_prompt = (
        "You are an expert ESAT item reviewer. Follow the rubric exactly. "
        "The question is a standalone exam item — do NOT use or infer any generation schema; "
        "judge only the stem, options, solution, tags, and official curriculum snapshot. "
        "Solve each item independently before trusting the stored key, solution, or tags. "
        "Judge syllabus fit ONLY against the provided `curriculum_snapshot` and "
        "`curriculum_allowed_codes` — map the actual solve-path concepts to explicit codes. "
        "If the stored correct_option is wrong, set apply_fix true but recommended_action must be human_review "
        "(never auto-approve wrong-key items). "
        "Always label review_disposition.labels. "
        "When multiple issues exist, fill auto_fix_triage with auto-fixable vs human-blocking issues and "
        "recommended_action_after_auto_fix (approve only when no human-blocking issues remain). "
        "Do not auto-approve borderline or out-of-syllabus items. "
        "curriculum_validation.curriculum_match must be exactly one string: "
        "in_syllabus, borderline, or out_of_syllabus — never a Boolean or explanatory sentence. "
        "For Mathematics 1 rows with curriculum_math2_snapshot, check whether a sound question "
        "belongs on Math 2 (move_to_math2) before regenerate.\n\n"
        + rubric
        + "\n\nAlways respond with a single JSON object only."
    )
    payload = build_question_payload(row, pre_flags=pre_flags, answer_key_row=answer_key_row)
    user_prompt = (
        "Grade this question. Input JSON:\n"
        + json.dumps(payload, ensure_ascii=False, indent=2)
    )
    return system_prompt, user_prompt


def _vertex_model_not_found(exc: BaseException) -> bool:
    s = str(exc)
    if "404" in s and "NOT_FOUND" in s:
        return True
    if "Publisher Model" in s and "not found" in s.lower():
        return True
    return False


CURRICULUM_PARSE_MAX_RETRIES = 2


def _curriculum_retry_user_suffix(attempt: int) -> str:
    return (
        f"\n\n[Retry {attempt}/{CURRICULUM_PARSE_MAX_RETRIES}] "
        "Your previous response had an invalid curriculum_validation.curriculum_match. "
        "Return exactly one of: in_syllabus, borderline, out_of_syllabus (lowercase string only)."
    )


def assess_question(
    llm: Any,
    row: Dict[str, Any],
    *,
    model: str,
    temperature: float = 0.25,
    vertex_not_found_fallbacks: bool = True,
    pre_flags: Optional[List[CurriculumFlag]] = None,
    answer_key_source_row: Optional[Dict[str, Any]] = None,
) -> Tuple[QualityGateResult, str, str]:
    """
    Returns (parsed result, raw model text, model id actually used for the API call).
    """
    flags: List[CurriculumFlag] = []
    if deterministic_prechecks_enabled():
        flags = pre_flags if pre_flags is not None else run_curriculum_precheck(row)
    ak_src = answer_key_source_row or row
    system_prompt, user_prompt = build_assessment_system_user_prompts(
        row, pre_flags=flags, answer_key_row=ak_src
    )
    primary = (model or "").strip()
    last_exc: Optional[BaseException] = None
    for m in quality_gate_model_try_order(primary, vertex_not_found_fallbacks=vertex_not_found_fallbacks):
        try:
            last_raw = ""
            result: Optional[QualityGateResult] = None
            for attempt in range(1 + CURRICULUM_PARSE_MAX_RETRIES):
                user_extra = _curriculum_retry_user_suffix(attempt) if attempt > 0 else ""
                raw = llm.generate(
                    m,
                    system_prompt,
                    user_prompt + user_extra,
                    temperature=temperature,
                    trace_label="quality_gate",
                )
                last_raw = raw
                data = extract_json_object(raw)
                result = parse_quality_gate_json(
                    data,
                    pre_flags=flags if deterministic_prechecks_enabled() else [],
                )
                if (
                    result.curriculum_validation_status == "valid"
                    and result.curriculum_match is not None
                    and not result.curriculum_inconsistency_reason
                ):
                    break
                if attempt < CURRICULUM_PARSE_MAX_RETRIES:
                    _gemini_console(
                        f"Quality gate: invalid curriculum_match on attempt {attempt + 1}; retrying…"
                    )
            assert result is not None
            raw = last_raw
            if m != primary:
                _gemini_console(
                    f"Quality gate: primary model {primary!r} was not available; used {m!r} for this question."
                )
            if result.curriculum_validation_status != "valid" or result.curriculum_match is None:
                result.curriculum_validation_status = "invalid_model_output"
                if result.recommended_action == "approve":
                    result.recommended_action = "human_review"
            if deterministic_prechecks_enabled():
                fmt_issues = detect_formatting_issues(row)
                if fmt_issues and not result.formatting_issues:
                    result.formatting_issues = [
                        i.get("detail", i.get("issue_id", "")) for i in fmt_issues[:8]
                    ]
                if fmt_report := build_formatting_report(row):
                    if fmt_report.get("formatting_fixable") and not result.formatting_apply_fix:
                        if result.formatting_score >= 4:
                            result.formatting_apply_fix = True
                if not result.curriculum_reason and flags:
                    result.curriculum_reason = "; ".join(f.reason for f in flags[:3])[:4000]
                subj = normalize_subject(row.get("subjects")).casefold()
                if subj in ("math 1", "mathematics 1") and result.verdict == "Pass":
                    if any(f.severity == "hard_fail" for f in flags):
                        result.verdict = "Major"
                        if result.recommended_action == "approve":
                            result.recommended_action = "delete"
            return result, raw, m
        except Exception as e:
            if not _vertex_model_not_found(e):
                raise
            last_exc = e
            _gemini_console(
                f"Quality gate: model {m!r} not found for this project/region; trying next…",
                error_excerpt=str(e),
            )
    if last_exc is not None:
        raise last_exc
    raise RuntimeError("quality_gate_model_try_order returned no models")
