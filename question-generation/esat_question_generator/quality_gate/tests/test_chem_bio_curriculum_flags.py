"""Tests for Chemistry/Biology deterministic curriculum flags."""

from __future__ import annotations

from quality_gate.curriculum_flags import detect_curriculum_flags


def test_chemistry_vsepr_hard_fail():
    flags = detect_curriculum_flags(
        {
            "subjects": "Chemistry",
            "primary_tag": "",
            "question_stem": "Using VSEPR, predict the bond angle in methane.",
            "options": {"A": "109.5"},
            "solution_reasoning": "",
        }
    )
    assert any(f.get("flag_id") == "vsepr_shapes" and f.get("severity") == "hard_fail" for f in flags)


def test_biology_action_potential_hard_fail():
    flags = detect_curriculum_flags(
        {
            "subjects": "Biology",
            "primary_tag": "",
            "question_stem": "Describe how voltage-gated channels produce an action potential.",
            "options": {"A": "Na+ influx"},
            "solution_reasoning": "",
        }
    )
    assert any(
        f.get("flag_id") == "action_potentials_channels" and f.get("severity") == "hard_fail"
        for f in flags
    )


def test_chemistry_in_syllabus_text_no_hard_fail():
    flags = detect_curriculum_flags(
        {
            "subjects": "Chemistry",
            "primary_tag": "",
            "question_stem": "Balance the equation for the reaction of magnesium with hydrochloric acid.",
            "options": {"A": "Mg + 2HCl -> MgCl2 + H2"},
            "solution_reasoning": "Atom counts balance.",
        }
    )
    assert not any(f.get("severity") == "hard_fail" for f in flags)
