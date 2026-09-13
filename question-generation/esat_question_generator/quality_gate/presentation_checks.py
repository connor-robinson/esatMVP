"""Deterministic presentation checks for MathJax / markdown tables / syntax.

Used by the review.db quality-gate siphon (and injectable into gate payloads)
so badly rendered tables and broken math are caught even when the LLM misses them.
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, TypedDict

PresentationSeverity = str  # "reject" | "flag"


class PresentationIssue(TypedDict, total=False):
    code: str
    severity: PresentationSeverity
    message: str
    field: str


_MATH_CMD = re.compile(
    r"\\(frac|sqrt|sum|int|lim|cdot|times|leq|geq|neq|approx|alpha|beta|gamma|theta|phi|pi|infty|partial|mathrm|mathbf|text)\b"
)


def _count_unescaped_dollars(text: str) -> int:
    n = 0
    i = 0
    while i < len(text):
        if text[i] == "\\" and i + 1 < len(text):
            i += 2
            continue
        if text[i] == "$":
            n += 1
        i += 1
    return n


def _mathjax_issues(text: str, *, field: str) -> List[PresentationIssue]:
    issues: List[PresentationIssue] = []
    if not text:
        return issues

    # Unclosed display math.
    if text.count("$$") % 2 == 1:
        issues.append(
            {
                "code": "mathjax_unclosed_display",
                "severity": "reject",
                "message": "Unclosed $$ display-math delimiter",
                "field": field,
            }
        )

    # Odd number of $ (rough broken inline math), ignoring $$.
    stripped = text.replace("$$", "")
    if _count_unescaped_dollars(stripped) % 2 == 1:
        issues.append(
            {
                "code": "mathjax_unbalanced_inline",
                "severity": "reject",
                "message": "Unbalanced $ inline-math delimiters",
                "field": field,
            }
        )

    for open_tok, close_tok, code in (
        (r"\(", r"\)", "mathjax_unclosed_inline_paren"),
        (r"\[", r"\]", "mathjax_unclosed_display_bracket"),
    ):
        if text.count(open_tok) != text.count(close_tok):
            issues.append(
                {
                    "code": code,
                    "severity": "reject",
                    "message": f"Unbalanced {open_tok} {close_tok} delimiters",
                    "field": field,
                }
            )

    # Common broken fragments that show up as literal junk in Streamlit.
    # Strip display-math blocks before empty-inline detection so adjacent $$...$$
    # blocks are not mistaken for `$ <whitespace> $`.
    no_display = re.sub(r"\$\$.*?\$\$", " ", text, flags=re.DOTALL)
    broken_patterns = [
        (r"\$\^", "mathjax_broken_caret"),
        (r"dm\$", "mathjax_broken_units"),
        (r"mol\s*dm\$", "mathjax_broken_units"),
        (r"(?<!\$)\$\s+\$(?!\$)", "mathjax_empty_math"),
        (r"\\frac\s*\{[^}]*$", "mathjax_broken_frac"),
    ]
    for pat, code in broken_patterns:
        haystack = no_display if code == "mathjax_empty_math" else text
        if re.search(pat, haystack):
            issues.append(
                {
                    "code": code,
                    "severity": "reject",
                    "message": f"Broken MathJax/syntax pattern ({code})",
                    "field": field,
                }
            )

    # LaTeX commands outside any math delimiters (often render as literal junk).
    # Strip math spans then look for leftover commands.
    no_math = re.sub(r"\$\$.*?\$\$", " ", text, flags=re.DOTALL)
    no_math = re.sub(r"\$.*?\$", " ", no_math, flags=re.DOTALL)
    no_math = re.sub(r"\\\(.*?\\\)", " ", no_math, flags=re.DOTALL)
    no_math = re.sub(r"\\\[.*?\\\]", " ", no_math, flags=re.DOTALL)
    if _MATH_CMD.search(no_math):
        issues.append(
            {
                "code": "latex_outside_math",
                "severity": "reject",
                "message": "LaTeX command appears outside math delimiters",
                "field": field,
            }
        )

    return issues


def _parse_pipe_tables(stem: str) -> List[Dict[str, Any]]:
    """Return parsed markdown pipe tables from stem text."""
    lines = (stem or "").replace("\r\n", "\n").replace("\r", "\n").split("\n")
    tables: List[Dict[str, Any]] = []
    i = 0
    while i < len(lines) - 1:
        line = lines[i].strip()
        nxt = lines[i + 1].strip()
        if "|" not in line:
            i += 1
            continue
        sep_body = nxt.replace("|", "").replace(":", "").replace("-", "").replace(" ", "")
        if nxt.count("|") < 1 or sep_body != "":
            # Not a header+separator pair.
            i += 1
            continue
        header_cells = [c.strip() for c in line.strip("|").split("|")]
        rows: List[List[str]] = []
        j = i + 2
        while j < len(lines):
            row_line = lines[j].strip()
            if "|" not in row_line:
                break
            cells = [c.strip() for c in row_line.strip("|").split("|")]
            rows.append(cells)
            j += 1
        tables.append({"headers": header_cells, "rows": rows, "start_line": i})
        i = j
    return tables


def _table_issues(stem: str, *, visual_type: str) -> List[PresentationIssue]:
    issues: List[PresentationIssue] = []
    vt = (visual_type or "").strip().lower()
    tables = _parse_pipe_tables(stem)

    if vt == "table" and not tables:
        issues.append(
            {
                "code": "table_missing_markdown",
                "severity": "reject",
                "message": "visual_type is table but stem has no usable markdown pipe table",
                "field": "question_stem",
            }
        )
        return issues

    for idx, table in enumerate(tables):
        headers = table["headers"]
        rows = table["rows"]
        width = len(headers)
        if width < 2:
            issues.append(
                {
                    "code": "table_too_narrow",
                    "severity": "reject",
                    "message": f"Table {idx + 1} has fewer than 2 columns",
                    "field": "question_stem",
                }
            )
        if not rows:
            issues.append(
                {
                    "code": "table_empty_body",
                    "severity": "reject",
                    "message": f"Table {idx + 1} has a header but no data rows",
                    "field": "question_stem",
                }
            )
        bad_widths = [r for r in rows if len(r) != width]
        if bad_widths:
            issues.append(
                {
                    "code": "table_shape",
                    "severity": "reject",
                    "message": f"Table {idx + 1} has rows with column count != header ({width})",
                    "field": "question_stem",
                }
            )
        # Many empty cells → likely broken render/copy.
        if rows:
            empty = sum(1 for r in rows for c in r if not str(c).strip())
            total = sum(len(r) for r in rows)
            if total and empty / total >= 0.35:
                issues.append(
                    {
                        "code": "table_sparse",
                        "severity": "flag",
                        "message": f"Table {idx + 1} has many empty cells ({empty}/{total})",
                        "field": "question_stem",
                    }
                )
    return issues


def _syntax_issues(text: str, *, field: str) -> List[PresentationIssue]:
    issues: List[PresentationIssue] = []
    if not text:
        return issues
    # Placeholder / generation garbage.
    junk = [
        (r"\bTODO\b", "syntax_todo"),
        (r"\bTBD\b", "syntax_tbd"),
        (r"\[INSERT[^\]]*\]", "syntax_insert_placeholder"),
        (r"\{\{[^{}]+\}\}", "syntax_template_braces"),
        (r"<\|[^|]+\|>", "syntax_model_token"),
        (r"\bundefined\b", "syntax_undefined"),
        (r"\bnull\b", "syntax_null_literal"),
    ]
    for pat, code in junk:
        if re.search(pat, text, flags=re.IGNORECASE):
            issues.append(
                {
                    "code": code,
                    "severity": "reject",
                    "message": f"Suspicious placeholder/syntax ({code})",
                    "field": field,
                }
            )
    # Unmatched brackets (rough).
    for open_c, close_c, code in (("(", ")", "unbalanced_parens"), ("[", "]", "unbalanced_brackets"), ("{", "}", "unbalanced_braces")):
        # Ignore math-ish dense lines somewhat; still useful for prose.
        if text.count(open_c) != text.count(close_c):
            issues.append(
                {
                    "code": code,
                    "severity": "flag",
                    "message": f"Unbalanced {open_c}{close_c} in {field}",
                    "field": field,
                }
            )
    return issues


def detect_presentation_issues(
    row: Dict[str, Any],
    *,
    visual_type: str = "",
) -> List[PresentationIssue]:
    """Return MathJax / table / syntax issues for a quality-gate-shaped row."""
    issues: List[PresentationIssue] = []
    stem = str(row.get("question_stem") or "")
    opts = row.get("options") if isinstance(row.get("options"), dict) else {}
    expl = str(row.get("solution_reasoning") or "")

    vt = (visual_type or str(row.get("visual_type") or "")).strip().lower()
    issues.extend(_mathjax_issues(stem, field="question_stem"))
    issues.extend(_table_issues(stem, visual_type=vt))
    issues.extend(_syntax_issues(stem, field="question_stem"))

    for key, val in opts.items():
        text = str(val or "")
        issues.extend(_mathjax_issues(text, field=f"options.{key}"))
        issues.extend(_syntax_issues(text, field=f"options.{key}"))

    issues.extend(_mathjax_issues(expl, field="solution_reasoning"))

    # De-dupe by code+field.
    seen: set[tuple[str, str]] = set()
    unique: List[PresentationIssue] = []
    for issue in issues:
        key = (str(issue.get("code") or ""), str(issue.get("field") or ""))
        if key in seen:
            continue
        seen.add(key)
        unique.append(issue)
    return unique


def has_presentation_reject(issues: List[PresentationIssue]) -> bool:
    return any(str(i.get("severity") or "") == "reject" for i in issues)


SIPHON_PRESENTATION_RUBRIC_ADDENDUM = """
## Extra siphon checks (non-diagram / table items)

Also reject (recommended_action `delete` or `regenerate`, verdict Major) when:
- Markdown tables are malformed, misaligned, sparse/empty, or `visual_type=table` with no usable table.
- MathJax/LaTeX is broken: unbalanced `$`/`$$`, commands outside math mode, literal junk units like `dm$`.
- Syntax/placeholders (TODO, template braces, model tokens) appear in stem/options.
- Item is not fit for ESAT: off-syllabus for the stated subject, unrealistic pacing, GCSE drill disguised as ESAT, or unusable presentation.

Prefer reject over approve when presentation is borderline. Leave only clearly clean, ESAT-fit items for human review (`approve` / soft `human_review`).
""".strip()
