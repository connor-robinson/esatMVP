"""Detect and fix inappropriate line breaks / whitespace in question text fields."""

from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, TypedDict

_BASE = Path(__file__).resolve().parent.parent
if str(_BASE) not in sys.path:
    sys.path.insert(0, str(_BASE))

from pipeline_v4.stem_whitespace import normalize_stem_whitespace

FormattingSeverity = str  # "warning" | "fixable"


class FormattingIssue(TypedDict, total=False):
    field: str
    severity: FormattingSeverity
    issue_id: str
    detail: str


def _normalize_plain_text(text: str) -> str:
    if not isinstance(text, str) or not text.strip():
        return text if isinstance(text, str) else ""
    t = text.replace("\r\n", "\n").replace("\r", "\n")
    t = re.sub(r"[ \t]+\n", "\n", t)
    t = re.sub(r"\n[ \t]+", "\n", t)
    t = re.sub(r"  +", " ", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t.strip()


def _count_prose_line_breaks(text: str) -> int:
    """Lines that look like mid-sentence hard wraps (not list givens, not blank)."""
    if not text or re.search(r"\$\$|<figure\b|<svg\b", text, re.IGNORECASE):
        return 0
    lines = [ln.strip() for ln in text.split("\n") if ln.strip()]
    if len(lines) <= 1:
        return 0
    bad = 0
    for i, ln in enumerate(lines[:-1]):
        if ln.endswith((".", "?", "!", ":", ";")):
            continue
        nxt = lines[i + 1]
        if nxt and nxt[0].islower():
            bad += 1
        elif len(ln) < 80 and not re.search(r"\d{2,}", ln):
            bad += 1
    return bad


def detect_formatting_issues(row: Dict[str, Any]) -> List[FormattingIssue]:
    issues: List[FormattingIssue] = []
    stem = str(row.get("question_stem") or "")
    if stem:
        if re.search(r"\n{3,}", stem):
            issues.append(
                {
                    "field": "question_stem",
                    "severity": "fixable",
                    "issue_id": "excessive_blank_lines",
                    "detail": "Stem has 3+ consecutive line breaks.",
                }
            )
        if _count_prose_line_breaks(stem) >= 2:
            issues.append(
                {
                    "field": "question_stem",
                    "severity": "fixable",
                    "issue_id": "mid_sentence_line_breaks",
                    "detail": "Stem breaks prose across many short lines.",
                }
            )
        if re.search(r"  +", stem):
            issues.append(
                {
                    "field": "question_stem",
                    "severity": "fixable",
                    "issue_id": "double_spaces",
                    "detail": "Stem contains repeated spaces.",
                }
            )

    opts = row.get("options")
    if isinstance(opts, dict):
        for key, val in opts.items():
            if not isinstance(val, str):
                continue
            if "\n" in val and not re.search(r"\$\$", val):
                issues.append(
                    {
                        "field": f"options.{key}",
                        "severity": "fixable",
                        "issue_id": "option_line_breaks",
                        "detail": f"Option {key} contains line breaks.",
                    }
                )
            if re.search(r"  +", val):
                issues.append(
                    {
                        "field": f"options.{key}",
                        "severity": "fixable",
                        "issue_id": "option_double_spaces",
                        "detail": f"Option {key} has repeated spaces.",
                    }
                )

    for field in ("solution_reasoning", "solution_key_insight"):
        txt = str(row.get(field) or "")
        if not txt:
            continue
        if re.search(r"\n{3,}", txt):
            issues.append(
                {
                    "field": field,
                    "severity": "fixable",
                    "issue_id": "excessive_blank_lines",
                    "detail": f"{field} has excessive blank lines.",
                }
            )
        if _count_prose_line_breaks(txt) >= 3:
            issues.append(
                {
                    "field": field,
                    "severity": "warning",
                    "issue_id": "solution_line_breaks",
                    "detail": f"{field} has awkward line wrapping.",
                }
            )

    return issues


def build_formatting_report(row: Dict[str, Any]) -> Dict[str, Any]:
    issues = detect_formatting_issues(row)
    fixable = [i for i in issues if i.get("severity") == "fixable"]
    return {
        "formatting_issues": issues,
        "formatting_issue_count": len(issues),
        "formatting_fixable": bool(fixable),
        "deterministic_formatting_flags": [i.get("issue_id") for i in issues if i.get("issue_id")],
    }


def build_formatting_patch(row: Dict[str, Any]) -> Dict[str, Any]:
    """Return DB patch keys only where normalization changes content."""
    patch: Dict[str, Any] = {}
    stem = row.get("question_stem")
    if isinstance(stem, str) and stem.strip():
        new_stem = normalize_stem_whitespace(stem)
        if new_stem != stem:
            patch["question_stem"] = new_stem

    opts = row.get("options")
    if isinstance(opts, dict):
        new_opts: Dict[str, Any] = {}
        changed = False
        for k, v in opts.items():
            if isinstance(v, str):
                nv = _normalize_plain_text(v)
                new_opts[k] = nv
                if nv != v:
                    changed = True
            else:
                new_opts[k] = v
        if changed:
            patch["options"] = new_opts

    for field in ("solution_reasoning", "solution_key_insight"):
        txt = row.get(field)
        if isinstance(txt, str) and txt.strip():
            new_txt = _normalize_plain_text(txt)
            if new_txt != txt:
                patch[field] = new_txt

    return patch


def should_apply_formatting_fix(
    *,
    issues: List[FormattingIssue],
    llm_apply_fix: bool,
    eff: str,
) -> bool:
    if eff in ("delete", "regenerate"):
        return False
    if llm_apply_fix:
        return True
    return any(i.get("severity") == "fixable" for i in issues)
