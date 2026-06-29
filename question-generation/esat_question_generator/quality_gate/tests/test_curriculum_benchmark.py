"""Unit tests for ESAT 228 curriculum benchmark metrics."""

from __future__ import annotations

import pytest

from quality_gate.curriculum_benchmark.metrics import (
    benchmark_summary,
    build_confusion_matrix,
    gold_label_from_decision,
    is_correct_prediction,
    is_critical_false_positive,
)


@pytest.mark.parametrize(
    "decision,expected",
    [
        ({"decision": "keep"}, "in_syllabus"),
        ({"decision": "reject", "decision_category": "out_of_syllabus"}, "out_of_syllabus"),
        ({"decision": "reject", "decision_category": "invalid_question"}, "invalid_question"),
    ],
)
def test_gold_label_from_decision(decision, expected):
    assert gold_label_from_decision(decision) == expected


def test_critical_false_positive_only_on_rejects():
    assert is_critical_false_positive("out_of_syllabus", "in_syllabus", "high")
    assert not is_critical_false_positive("in_syllabus", "in_syllabus", "high")
    assert not is_critical_false_positive("out_of_syllabus", "borderline", "high")


def test_invalid_question_allows_borderline():
    assert is_correct_prediction("invalid_question", "borderline", "medium")
    assert not is_correct_prediction("invalid_question", "in_syllabus", "high")
    assert is_correct_prediction("invalid_question", "in_syllabus", "low")


def test_confusion_matrix_and_summary():
    rows = [
        {"gold": "in_syllabus", "predicted_match": "in_syllabus", "correct": True, "critical_false_positive": False},
        {
            "gold": "out_of_syllabus",
            "predicted_match": "in_syllabus",
            "correct": False,
            "critical_false_positive": True,
        },
    ]
    matrix = build_confusion_matrix(rows)
    assert matrix["gold=in_syllabus|pred=in_syllabus"] == 1
    assert matrix["gold=out_of_syllabus|pred=in_syllabus"] == 1
    summary = benchmark_summary(rows)
    assert summary["total"] == 2
    assert summary["correct"] == 1
    assert summary["critical_false_positive_count"] == 1
