"""Tests for Phase 2 eval harness (mocked, no live Gemini)."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import patch

import pytest

from visual_engine.eval.report import AttemptRecord, EvalReport


def test_eval_report_summarize_rates():
    report = EvalReport(run_id="test_run", total_cases=2)
    report.records = [
        AttemptRecord(
            question_id=1,
            variation_mode="sibling",
            exam_name="ENGAA",
            attempt=1,
            spec_valid=False,
            render_ok=False,
            collision_failure=False,
            spec_error="missing objects",
        ),
        AttemptRecord(
            question_id=1,
            variation_mode="sibling",
            exam_name="ENGAA",
            attempt=2,
            spec_valid=True,
            render_ok=True,
            collision_failure=False,
            verifier_verdict="PASS",
        ),
        AttemptRecord(
            question_id=2,
            variation_mode="far",
            exam_name="NSAA",
            attempt=1,
            spec_valid=True,
            render_ok=False,
            collision_failure=True,
            render_error="label collision",
        ),
    ]
    summary = report.summarize()
    assert summary["total_cases"] == 2
    assert summary["spec_validation_success_rate"] == 1.0
    assert summary["render_success_rate"] == 0.5
    assert summary["collision_failure_rate"] == 0.5
    assert summary["verifier_pass_rate"] == 0.5


def test_eval_report_write(tmp_path: Path):
    report = EvalReport(run_id="test_run", total_cases=1)
    report.records = [
        AttemptRecord(
            question_id=10,
            variation_mode="sibling",
            exam_name="ENGAA",
            attempt=1,
            spec_valid=True,
            render_ok=True,
            collision_failure=False,
            verifier_verdict="PASS",
        ),
    ]
    json_path, md_path = report.write(tmp_path)
    assert json_path.is_file()
    assert md_path.is_file()
    assert "Spec validation success" in md_path.read_text(encoding="utf-8")


@patch("visual_engine.eval.question_selector.load_place_candidates")
def test_select_eval_questions_by_ids(mock_load):
    mock_load.return_value = [
        {
            "questionId": 1797,
            "examName": "ENGAA",
            "examYear": 2016,
            "paperName": "Section 1",
            "questionNumber": 4,
            "questionStem": "Find the area.\n\n<figure>...</figure>",
            "diagramAssets": [{"id": "diagram_0", "url": "https://example.com/d.png"}],
            "sourceImageUrl": "https://example.com/q.png",
        }
    ]
    from visual_engine.eval.question_selector import select_eval_questions

    selected = select_eval_questions(question_ids=[1797])
    assert len(selected) == 1
    assert selected[0].question_id == 1797
    assert "<figure>" not in selected[0].reference_question
