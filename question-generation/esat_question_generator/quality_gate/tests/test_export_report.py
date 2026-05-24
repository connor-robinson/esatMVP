"""Tests for quality-gate export flattening."""

from __future__ import annotations

from quality_gate.export_report import (
    export_csv_bytes,
    flatten_assessed_question_row,
    strip_html,
)


def test_strip_html():
    assert strip_html("<p>Hello <b>world</b></p>") == "Hello world"


def test_flatten_includes_stem_tags_and_ai_fields():
    row = {
        "id": "q-1",
        "subjects": "Math 1",
        "difficulty": "Medium",
        "primary_tag": "M1-MM1",
        "secondary_tags": ["M1-ALG"],
        "question_stem": "<p>What is \\(2+2\\)?</p>",
        "quality_gate_verdict": "Minor",
        "quality_gate_action": "human_review",
        "quality_gate_reason": "Short summary in DB",
        "quality_gate_payload": {
            "reasoning": "Full AI reasoning here.",
            "scores": {"syllabus_fit": 4, "solution_quality": 3, "esat_realism_pacing": 2},
            "curriculum_validation": {
                "curriculum_match": "borderline",
                "curriculum_flags": [
                    {"flag_id": "missing_primary_tag", "severity": "warning", "reason": "No tag"}
                ],
                "suspicious_topics": ["integration"],
            },
            "formatting_validation": {
                "formatting_score": 3,
                "formatting_issues": ["bad_line_break"],
            },
            "review_disposition": {
                "outcome": "edit",
                "labels": ["too_long"],
                "notes": "Trim stem",
            },
        },
    }
    flat = flatten_assessed_question_row(row, review_base="https://review.example")
    assert flat["question_id"] == "q-1"
    assert flat["subjects"] == "Math 1"
    assert flat["primary_tag"] == "M1-MM1"
    assert "M1-ALG" in flat["secondary_tags"]
    assert "2+2" in flat["question_stem_plain"] or "What is" in flat["question_stem_plain"]
    assert flat["ai_reasoning"] == "Full AI reasoning here."
    assert flat["score_esat_realism_pacing"] == 2
    assert "missing_primary_tag" in flat["curriculum_flags"]
    assert flat["formatting_issues"] == "bad_line_break"
    assert flat["disposition_labels"] == "too_long"
    assert flat["review_url"].endswith("/review?id=q-1")

    csv = export_csv_bytes([row], review_base="").decode("utf-8-sig")
    assert "question_stem_plain" in csv
    assert ",question_stem," not in csv
