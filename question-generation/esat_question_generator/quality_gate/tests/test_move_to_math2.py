"""Tests for move_to_math2 recommended action."""

from __future__ import annotations

from quality_gate.schemas import effective_action, parse_quality_gate_json


def _math1_row() -> dict:
    return {"subjects": "Math 1"}


def test_parse_move_to_math2_action():
    data = parse_quality_gate_json(
        {
            "verdict": "Major",
            "scores": {"syllabus_fit": 2, "solution_quality": 4, "esat_realism_pacing": 4},
            "recommended_action": "move_to_math2",
            "reasoning": "Solve path needs MM7; belongs on Math 2 paper.",
            "exam_timing_notes": "ok",
            "confidence": "high",
            "calibration_tier": None,
            "calibration_notes": None,
            "graph_enrichment": {
                "mode": "none",
                "is_candidate": False,
                "suggested_stem_edits": "",
                "insertion_placeholders": [],
                "notes_for_human": "",
            },
            "curriculum_validation": {
                "syllabus_fit_score": 2,
                "curriculum_match": "off_syllabus",
                "required_topic_codes": ["M2-MM7"],
                "suspicious_topics": ["differentiation"],
                "curriculum_reason": "MM topic on Math 1 row.",
                "curriculum_flags": [],
            },
            "formatting_validation": {
                "formatting_score": 5,
                "formatting_issues": [],
                "apply_fix": False,
                "formatting_reason": "ok",
            },
            "answer_key_validation": {
                "stored_option": "B",
                "true_option": "B",
                "was_wrong": False,
                "apply_fix": False,
                "reason": "ok",
            },
            "review_disposition": {
                "outcome": "move_paper",
                "labels": ["wrong_paper", "math2_content_on_math1"],
                "notes": "Move to Math 2.",
            },
            "auto_fix_triage": {
                "auto_fixable_issues": [],
                "human_blocking_issues": ["wrong paper — move to Math 2"],
                "recommended_action_after_auto_fix": "move_to_math2",
                "reason": "Paper mismatch only.",
            },
        }
    )
    assert data.recommended_action == "move_to_math2"
    eff = effective_action(data, row=_math1_row())
    assert eff == "move_to_math2"


def test_regenerate_upgrades_to_move_on_salvageable_math1_mm():
    data = parse_quality_gate_json(
        {
            "verdict": "Major",
            "scores": {"syllabus_fit": 2, "solution_quality": 4, "esat_realism_pacing": 4},
            "recommended_action": "regenerate",
            "reasoning": "Needs differentiation.",
            "exam_timing_notes": "ok",
            "confidence": "medium",
            "calibration_tier": None,
            "calibration_notes": None,
            "graph_enrichment": {
                "mode": "none",
                "is_candidate": False,
                "suggested_stem_edits": "",
                "insertion_placeholders": [],
                "notes_for_human": "",
            },
            "curriculum_validation": {
                "syllabus_fit_score": 2,
                "curriculum_match": "off_syllabus",
                "required_topic_codes": ["M2-MM7"],
                "suspicious_topics": [],
                "curriculum_reason": "MM on Math 1.",
                "curriculum_flags": [],
            },
            "formatting_validation": {
                "formatting_score": 5,
                "formatting_issues": [],
                "apply_fix": False,
                "formatting_reason": "ok",
            },
            "answer_key_validation": {
                "stored_option": "A",
                "true_option": "A",
                "was_wrong": False,
                "apply_fix": False,
                "reason": "ok",
            },
            "review_disposition": {"outcome": "regenerate", "labels": ["off_syllabus"], "notes": ""},
            "auto_fix_triage": {
                "auto_fixable_issues": [],
                "human_blocking_issues": [],
                "recommended_action_after_auto_fix": "regenerate",
                "reason": "",
            },
        }
    )
    eff = effective_action(data, row=_math1_row())
    assert eff == "move_to_math2"
