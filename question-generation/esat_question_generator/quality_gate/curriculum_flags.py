"""Deterministic curriculum pre-checks before Quality Gate LLM assessment."""

from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional, TypedDict

from .curriculum import get_allowed_topic_codes, is_mm_tag, normalize_subject, primary_tag_allowed_for_subject

_DIR = Path(__file__).resolve().parent

CurriculumSeverity = Literal["hard_fail", "warning"]
SuggestedAction = Literal["delete", "human_review"]


class CurriculumFlag(TypedDict, total=False):
    severity: CurriculumSeverity
    reason: str
    matched_pattern: str
    suggested_action: SuggestedAction
    flag_id: str


@lru_cache(maxsize=1)
def _suspicious_config() -> Dict[str, Any]:
    path = _DIR / "esat_suspicious_topics.json"
    return json.loads(path.read_text(encoding="utf-8"))


def _row_text(row: Dict[str, Any]) -> str:
    parts: List[str] = []
    for key in ("question_stem", "solution_reasoning", "solution_key_insight"):
        v = row.get(key)
        if isinstance(v, str) and v.strip():
            parts.append(v)
    opts = row.get("options")
    if isinstance(opts, dict):
        for v in opts.values():
            if isinstance(v, str) and v.strip():
                parts.append(v)
    return "\n".join(parts)


def _match_rule_group(
    text: str,
    rules: List[Dict[str, Any]],
    *,
    default_severity: CurriculumSeverity,
    default_action: SuggestedAction,
) -> List[CurriculumFlag]:
    flags: List[CurriculumFlag] = []
    lower = text.casefold()
    for rule in rules:
        rid = str(rule.get("id") or "pattern")
        reason = str(rule.get("reason") or rid.replace("_", " "))
        for pat in rule.get("patterns") or []:
            try:
                if re.search(pat, text, re.IGNORECASE | re.MULTILINE):
                    flags.append(
                        {
                            "severity": default_severity,
                            "reason": reason,
                            "matched_pattern": pat,
                            "suggested_action": default_action,
                            "flag_id": rid,
                        }
                    )
                    break
            except re.error:
                if pat.casefold() in lower:
                    flags.append(
                        {
                            "severity": default_severity,
                            "reason": reason,
                            "matched_pattern": pat,
                            "suggested_action": default_action,
                            "flag_id": rid,
                        }
                    )
                    break
    return flags


def _tag_flags(row: Dict[str, Any]) -> List[CurriculumFlag]:
    flags: List[CurriculumFlag] = []
    subject = normalize_subject(row.get("subjects"))
    primary = (row.get("primary_tag") or "").strip()
    subj_key = subject.casefold()

    if not primary:
        flags.append(
            {
                "severity": "warning",
                "reason": "Missing primary_tag — curriculum alignment cannot be verified from stored tags.",
                "matched_pattern": "missing_primary_tag",
                "suggested_action": "human_review",
                "flag_id": "missing_primary_tag",
            }
        )
        return flags

    if not primary_tag_allowed_for_subject(primary, subject):
        flags.append(
            {
                "severity": "hard_fail",
                "reason": f"primary_tag {primary!r} is not in the allowed curriculum for {subject!r}.",
                "matched_pattern": primary,
                "suggested_action": "delete",
                "flag_id": "primary_tag_not_allowed",
            }
        )

    if subj_key in ("math 1", "mathematics 1") and is_mm_tag(primary):
        flags.append(
            {
                "severity": "hard_fail",
                "reason": "Mathematics 1 row tagged with Mathematics 2 (MM) curriculum code.",
                "matched_pattern": primary,
                "suggested_action": "delete",
                "flag_id": "math1_mm_primary_tag",
            }
        )

    secondary = row.get("secondary_tags")
    sec_list: List[str] = []
    if isinstance(secondary, list):
        sec_list = [str(x).strip() for x in secondary if str(x).strip()]
    elif isinstance(secondary, str) and secondary.strip():
        sec_list = [secondary.strip()]

    if subj_key in ("math 1", "mathematics 1"):
        for tag in sec_list:
            if is_mm_tag(tag) or not primary_tag_allowed_for_subject(tag, subject):
                flags.append(
                    {
                        "severity": "hard_fail",
                        "reason": f"Mathematics 1 secondary tag {tag!r} is outside allowed M-only curriculum.",
                        "matched_pattern": tag,
                        "suggested_action": "delete",
                        "flag_id": "math1_mm_secondary_tag",
                    }
                )
    return flags


def detect_curriculum_flags(row: Dict[str, Any]) -> List[CurriculumFlag]:
    """Run lightweight rule-based syllabus detectors on a DB row."""
    cfg = _suspicious_config()
    text = _row_text(row)
    subject = normalize_subject(row.get("subjects"))
    subj_key = subject.casefold()
    flags: List[CurriculumFlag] = []

    flags.extend(_tag_flags(row))

    if subj_key in ("math 1", "mathematics 1"):
        flags.extend(
            _match_rule_group(
                text,
                cfg.get("math1_hard_fail") or [],
                default_severity="hard_fail",
                default_action="delete",
            )
        )
        flags.extend(
            _match_rule_group(
                text,
                cfg.get("math1_warning") or [],
                default_severity="warning",
                default_action="human_review",
            )
        )
    elif subj_key in ("math 2", "mathematics 2"):
        for topic in cfg.get("math2_pacing_sensitive") or []:
            if topic.casefold() in text.casefold():
                flags.append(
                    {
                        "severity": "warning",
                        "reason": f"Mathematics 2 pacing-sensitive topic detected: {topic}.",
                        "matched_pattern": topic,
                        "suggested_action": "human_review",
                        "flag_id": "math2_pacing",
                    }
                )
                break
        if re.search(r"further\s+math|olympiad|step\s+exam", text, re.IGNORECASE):
            flags.append(
                {
                    "severity": "hard_fail",
                    "reason": "Further Maths / olympiad style content detected.",
                    "matched_pattern": "further_math_olympiad",
                    "suggested_action": "delete",
                    "flag_id": "further_math",
                }
            )

    seen: set[tuple[str, str]] = set()
    deduped: List[CurriculumFlag] = []
    for f in flags:
        key = (str(f.get("flag_id") or ""), str(f.get("matched_pattern") or ""))
        if key in seen:
            continue
        seen.add(key)
        deduped.append(f)
    return deduped


def flags_summary(flags: List[CurriculumFlag]) -> Dict[str, Any]:
    hard = [f for f in flags if f.get("severity") == "hard_fail"]
    warn = [f for f in flags if f.get("severity") == "warning"]
    return {
        "curriculum_flags": flags,
        "hard_fail_count": len(hard),
        "warning_count": len(warn),
        "has_hard_fail": bool(hard),
    }


def infer_curriculum_match_from_flags(
    flags: List[CurriculumFlag],
    *,
    llm_match: Optional[str] = None,
) -> str:
    if llm_match in ("in_syllabus", "borderline", "off_syllabus"):
        if llm_match == "in_syllabus" and any(f.get("severity") == "hard_fail" for f in flags):
            return "off_syllabus"
        return llm_match
    if any(f.get("severity") == "hard_fail" for f in flags):
        return "off_syllabus"
    if flags:
        return "borderline"
    return "in_syllabus"


def required_codes_outside_allowed(required: List[str], subject: Any) -> List[str]:
    allowed = set(get_allowed_topic_codes(subject))
    bad: List[str] = []
    for code in required:
        c = (code or "").strip()
        if not c:
            continue
        if c in allowed:
            continue
        if any(a.endswith(f"-{c}") for a in allowed):
            continue
        bad.append(c)
    return bad
