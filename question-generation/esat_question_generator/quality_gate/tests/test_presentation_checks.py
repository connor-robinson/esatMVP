"""Tests for quality_gate presentation checks (MathJax / tables / syntax)."""

from __future__ import annotations

from quality_gate.presentation_checks import detect_presentation_issues, has_presentation_reject


def test_rejects_unbalanced_mathjax():
    issues = detect_presentation_issues(
        {"question_stem": "Find $x when y equals 2.", "options": {"A": "1"}},
        visual_type="none",
    )
    assert has_presentation_reject(issues)
    assert any(i["code"] == "mathjax_unbalanced_inline" for i in issues)


def test_rejects_latex_outside_math():
    issues = detect_presentation_issues(
        {
            "question_stem": "The rate is \\frac{1}{2} without delimiters.",
            "options": {"A": "1", "B": "2"},
        },
        visual_type="none",
    )
    assert has_presentation_reject(issues)
    assert any(i["code"] == "latex_outside_math" for i in issues)


def test_rejects_table_visual_without_markdown_table():
    issues = detect_presentation_issues(
        {
            "question_stem": "Use the data below to answer the question.",
            "options": {"A": "1", "B": "2"},
        },
        visual_type="table",
    )
    assert has_presentation_reject(issues)
    assert any(i["code"] == "table_missing_markdown" for i in issues)


def test_rejects_misaligned_table():
    stem = (
        "| A | B | C |\n"
        "|---|---|---|\n"
        "| 1 | 2 |\n"
        "| 3 | 4 | 5 |\n"
    )
    issues = detect_presentation_issues(
        {"question_stem": stem, "options": {"A": "1"}},
        visual_type="table",
    )
    assert has_presentation_reject(issues)
    assert any(i["code"] == "table_shape" for i in issues)


def test_accepts_clean_text():
    issues = detect_presentation_issues(
        {
            "question_stem": "A particle moves with constant speed $v$. What is true?",
            "options": {"A": "$2v$", "B": "$v/2$", "C": "$v$", "D": "$0$", "E": "$v^2$"},
            "solution_reasoning": "Speed is constant so displacement grows linearly.",
        },
        visual_type="none",
    )
    assert not has_presentation_reject(issues)
