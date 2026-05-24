from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from project import _gemini_console

from .curriculum import get_curriculum_for_row, normalize_subject
from .formatting import build_formatting_report, detect_formatting_issues
from .defaults import quality_gate_model_try_order
from .schemas import CurriculumFlag, QualityGateResult, parse_quality_gate_json

_DIR = Path(__file__).resolve().parent


def load_rubric_markdown() -> str:
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
    try:
        return json.loads(s)
    except json.JSONDecodeError:
        pass
    start = s.find("{")
    end = s.rfind("}")
    if start >= 0 and end > start:
        return json.loads(s[start : end + 1])
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
    return [CurriculumFlag.from_dict(f) for f in detect_curriculum_flags(row)]


def build_question_payload(
    row: Dict[str, Any],
    *,
    pre_flags: Optional[List[CurriculumFlag]] = None,
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
        "schema_id": row.get("schema_id"),
        "primary_tag": row.get("primary_tag"),
        "secondary_tags": _secondary_tags_for_payload(row),
        "question_stem": _trim(row.get("question_stem"), 16000),
        "options": row.get("options"),
        "correct_option": row.get("correct_option"),
        "solution_reasoning": _trim(row.get("solution_reasoning"), 12000),
        "distractor_map": row.get("distractor_map"),
        "curriculum_source": curriculum["curriculum_source"],
        "curriculum_allowed_codes": curriculum["curriculum_allowed_codes"],
        "curriculum_snapshot": curriculum["curriculum_snapshot"],
        "primary_tag_allowed_for_subject": curriculum["primary_tag_allowed"],
    }
    if pre_flags:
        payload["deterministic_curriculum_flags"] = [f.to_dict() for f in pre_flags]
    fmt_report = build_formatting_report(row)
    payload["formatting_precheck"] = fmt_report
    fmt_issues = detect_formatting_issues(row)
    if fmt_issues:
        payload["deterministic_formatting_flags"] = fmt_report.get("deterministic_formatting_flags")
    return payload


def build_assessment_system_user_prompts(
    row: Dict[str, Any],
    *,
    pre_flags: Optional[List[CurriculumFlag]] = None,
) -> Tuple[str, str]:
    rubric = load_rubric_markdown()
    system_prompt = (
        "You are an expert ESAT item reviewer. Follow the rubric exactly. "
        "Judge syllabus fit ONLY against the provided `curriculum_snapshot` and "
        "`curriculum_allowed_codes` — do not rely on memory of ESAT. "
        "Treat deterministic_curriculum_flags as strong evidence; explain if you disagree. "
        "Check stem/options/solution for inappropriate line breaks, double spaces, and awkward wrapping; "
        "set formatting_validation.apply_fix true when deterministic whitespace normalization would help. "
        "Treat **overlong stems**, **bloated options**, and **solutions that take too many steps "
        "or too much clock time** for one MCQ as serious defects.\n\n"
        + rubric
        + "\n\nAlways respond with a single JSON object only."
    )
    payload = build_question_payload(row, pre_flags=pre_flags)
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


def assess_question(
    llm: Any,
    row: Dict[str, Any],
    *,
    model: str,
    temperature: float = 0.25,
    vertex_not_found_fallbacks: bool = True,
    pre_flags: Optional[List[CurriculumFlag]] = None,
) -> Tuple[QualityGateResult, str, str]:
    """
    Returns (parsed result, raw model text, model id actually used for the API call).
    """
    flags = pre_flags if pre_flags is not None else run_curriculum_precheck(row)
    system_prompt, user_prompt = build_assessment_system_user_prompts(row, pre_flags=flags)
    primary = (model or "").strip()
    last_exc: Optional[BaseException] = None
    for m in quality_gate_model_try_order(primary, vertex_not_found_fallbacks=vertex_not_found_fallbacks):
        try:
            raw = llm.generate(
                m,
                system_prompt,
                user_prompt,
                temperature=temperature,
                trace_label="quality_gate",
            )
            if m != primary:
                _gemini_console(
                    f"Quality gate: primary model {primary!r} was not available; used {m!r} for this question."
                )
            data = extract_json_object(raw)
            result = parse_quality_gate_json(data, pre_flags=flags)
            fmt_issues = detect_formatting_issues(row)
            if fmt_issues and not result.formatting_issues:
                result.formatting_issues = [i.get("detail", i.get("issue_id", "")) for i in fmt_issues[:8]]
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
