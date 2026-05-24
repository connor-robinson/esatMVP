"""Tests for quality-gate export flattening."""

from __future__ import annotations

from quality_gate.export_report import (
    export_csv_bytes,
    export_html_bytes,
    flatten_assessed_question_row,
    stem_for_html_embed,
    strip_html,
)


def test_strip_html_preserves_diagram_placeholder():
    html = "<p>Hello</p><figure class=\"qg-diagram\"><svg><circle/></svg></figure><p>End</p>"
    plain = strip_html(html)
    assert "Hello" in plain
    assert "End" in plain
    assert "[diagram]" in plain


def test_stem_for_html_embed_keeps_figure():
    stem = "<p>What is \\(2+2\\)?</p><figure class=\"qg-diagram\"><svg xmlns=\"http://www.w3.org/2000/svg\"></svg></figure>"
    out = stem_for_html_embed(stem)
    assert "<figure" in out
    assert "<svg" in out


def test_stem_for_html_embed_plain_text_paragraphs():
    stem = "Line one\n\nLine two with $x^2$"
    out = stem_for_html_embed(stem)
    assert "<p" in out
    assert "$x^2$" in out


def test_flatten_includes_stem_html():
    row = {
        "id": "q-1",
        "question_stem": "<p>Test</p>",
        "quality_gate_payload": {},
    }
    flat = flatten_assessed_question_row(row)
    assert flat["question_stem_html"] == "<p>Test</p>"
    assert "Test" in flat["question_stem_plain"]


def test_csv_includes_quoted_html_column():
    row = {
        "id": "q-1",
        "question_stem": "<p>Comma, inside \"quotes\"</p>",
        "quality_gate_payload": {},
    }
    csv = export_csv_bytes([row], review_base="").decode("utf-8-sig")
    assert "question_stem_html" in csv
    assert "<p>" in csv


def test_html_export_contains_stem_and_katex():
    row = {
        "id": "q-1",
        "subjects": "Math 1",
        "difficulty": "Medium",
        "question_stem": "<p>Find $x$ when $x^2=4$.</p>",
        "quality_gate_verdict": "Pass",
        "quality_gate_action": "approve",
        "quality_gate_payload": {"reasoning": "ok"},
    }
    doc = export_html_bytes([row], title="Test").decode("utf-8")
    assert "<!DOCTYPE html>" in doc
    assert "Find $x$" in doc or "x^2=4" in doc
    assert "katex" in doc.lower()
