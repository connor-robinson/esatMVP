"""Load detailed ESAT curriculum rules for validator prompts."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List

from .curriculum import get_curriculum_for_row, normalize_subject, subject_paper_ids

_RULES_PATH = Path(__file__).resolve().parent.parent / "curriculum" / "ESAT_CURRICULUM_RULES.json"


@lru_cache(maxsize=1)
def _load_rules() -> Dict[str, Any]:
    return json.loads(_RULES_PATH.read_text(encoding="utf-8"))


def _module_key(subject: str) -> str:
    s = normalize_subject(subject).casefold()
    if s in ("math 1", "mathematics 1"):
        return "math1"
    if s in ("math 2", "mathematics 2"):
        return "math2"
    return s.split()[0] if s else ""


def get_curriculum_rules_for_subject(subject: Any) -> Dict[str, Any]:
    rules = _load_rules()
    key = _module_key(subject)
    out: Dict[str, Any] = {"module_key": key, "decision_procedure": rules.get("decision_procedure", [])}
    if key in rules:
        out["module_rules"] = rules[key]
    papers = subject_paper_ids(subject)
    if "math1" in papers and key != "math1":
        out["mathematics_1_assumed"] = rules.get("math1", {})
    return out


def get_curriculum_context_for_row(row: Dict[str, Any]) -> Dict[str, Any]:
    """Extended curriculum context for blind validator (no prior assessment)."""
    base = get_curriculum_for_row(row)
    subject = normalize_subject(row.get("subjects"))
    rules = get_curriculum_rules_for_subject(subject)
    return {
        **base,
        "curriculum_rules": rules,
        "curriculum_rules_source": _load_rules().get("source", ""),
    }


def format_rules_for_prompt(rules: Dict[str, Any], *, max_chars: int = 12000) -> str:
    text = json.dumps(rules, ensure_ascii=False, indent=2)
    if len(text) > max_chars:
        return text[: max_chars - 20] + "\n…[truncated]"
    return text
