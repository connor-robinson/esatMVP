"""Unit tests for render_quality_acceptor deterministic path."""

from __future__ import annotations

from pathlib import Path

from visual_engine.render_quality_acceptor import evaluate_render_quality


def test_rejects_empty_stem_without_vision():
    result = evaluate_render_quality(
        stem="",
        choices={"A": "1", "B": "2", "C": "3", "D": "4", "E": "5"},
        correct_answer="A",
        diagram_required=False,
        skip_vision=True,
    )
    assert result.decision == "REJECT"
    assert result.skipped_vision is True
    assert "stem_empty" in result.reject_reasons


def test_accepts_text_only_when_complete():
    result = evaluate_render_quality(
        stem="A particle moves with constant acceleration. Which statement is correct?",
        choices={"A": "1", "B": "2", "C": "3", "D": "4", "E": "5"},
        correct_answer="B",
        diagram_required=False,
        skip_vision=True,
    )
    assert result.decision == "ACCEPT"
    assert result.source == "deterministic"


def test_rejects_missing_png_when_diagram_required(tmp_path: Path):
    result = evaluate_render_quality(
        stem="The graph shows velocity against time. What is the displacement?",
        choices={"A": "1", "B": "2", "C": "3", "D": "4", "E": "5"},
        correct_answer="A",
        diagram_required=True,
        png_path=tmp_path / "missing.png",
        skip_vision=True,
    )
    assert result.decision == "REJECT"
    assert "png_missing" in result.reject_reasons
