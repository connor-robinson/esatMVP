"""Tests for deterministic curriculum flags and effective_action overrides."""

from __future__ import annotations

import unittest

from quality_gate.curriculum import get_allowed_topic_codes
from quality_gate.curriculum_flags import detect_curriculum_flags
from quality_gate.schemas import (
    CurriculumFlag,
    QualityGateResult,
    effective_action,
    merge_deterministic_curriculum_flags,
    parse_quality_gate_json,
)


def _math1_row(**kwargs):
    base = {
        "subjects": "Math 1",
        "primary_tag": "M1-M4",
        "secondary_tags": [],
        "schema_id": "M1",
        "difficulty": "Medium",
    }
    base.update(kwargs)
    return base


class TestCurriculumValidation(unittest.TestCase):
    def test_math1_allowed_codes_no_mm(self):
        codes = get_allowed_topic_codes("Math 1")
        self.assertTrue(any(c.startswith("M1-M") for c in codes))
        self.assertFalse(any("MM" in c for c in codes))

    def test_math2_includes_mm(self):
        codes = get_allowed_topic_codes("Math 2")
        self.assertTrue(any("MM" in c for c in codes))

    def test_a_math1_cubic_local_minimum_hard_fail(self):
        row = _math1_row(
            question_stem=(
                "The function f(x)=2x^3+ax^2+b has a local minimum at x=1. "
                "Find the value of a."
            ),
            solution_reasoning="Differentiate: f'(x)=6x^2+2ax, set f'(1)=0...",
        )
        flags = detect_curriculum_flags(row)
        ids = {f.get("flag_id") for f in flags}
        self.assertIn("differentiation", ids)
        self.assertTrue(any(f.get("severity") == "hard_fail" for f in flags))

    def test_b_math1_integration_hard_fail(self):
        row = _math1_row(
            question_stem="Find ∫_0^1 (3x^2+1) dx.",
            solution_reasoning="Integrate to get [x^3+x]...",
        )
        flags = detect_curriculum_flags(row)
        self.assertTrue(any(f.get("flag_id") == "integration" for f in flags))
        eff = self._effective_after_flags(row, flags, curriculum_match="off_syllabus")
        self.assertNotEqual(eff, "approve")

    def test_c_math1_quadratic_in_syllabus(self):
        row = _math1_row(
            question_stem="Solve x^2+5x+6=0.",
            solution_reasoning="Factorise: (x+2)(x+3)=0 so x=-2 or x=-3.",
        )
        flags = detect_curriculum_flags(row)
        hard = [f for f in flags if f.get("severity") == "hard_fail"]
        self.assertEqual(len(hard), 0)

    def test_d_math2_differentiation_allowed_not_auto_fail(self):
        row = {
            "subjects": "Math 2",
            "primary_tag": "M2-MM7",
            "question_stem": "Find the stationary point of f(x)=x^3-3x using calculus.",
            "solution_reasoning": "Differentiate: f prime of x equals 3x squared minus 3, zero at x=1 or -1.",
        }
        flags = detect_curriculum_flags(row)
        hard = [f for f in flags if f.get("severity") == "hard_fail"]
        self.assertEqual(len(hard), 0)

    def test_e_math1_ncr_borderline(self):
        row = _math1_row(
            question_stem="How many ways can 7 letters be arranged if no two vowels are adjacent?",
            solution_reasoning="Use nCr and inclusion-exclusion on vowel positions...",
        )
        flags = detect_curriculum_flags(row)
        self.assertTrue(
            any(f.get("flag_id") in ("binomial_ncr_factorial", "combinatorics_permutation") for f in flags)
        )

    def test_f_physics_half_life_no_math1_hard_fail(self):
        row = {
            "subjects": "Physics",
            "primary_tag": "P-P7",
            "question_stem": "A sample has half-life 5.0 years. What fraction remains after 15 years?",
            "solution_reasoning": "Three half-lives: fraction = (1/2)^3 = 1/8.",
        }
        flags = detect_curriculum_flags(row)
        hard_calc = [f for f in flags if f.get("flag_id") in ("differentiation", "integration")]
        self.assertEqual(len(hard_calc), 0)

    def test_effective_action_math1_mm_required_codes(self):
        result = QualityGateResult(
            verdict="Pass",
            scores={"syllabus_fit": 5, "solution_quality": 5, "esat_realism_pacing": 4},
            recommended_action="approve",
            reasoning="ok",
            confidence="high",
            required_topic_codes=["M2-MM7"],
            curriculum_match="in_syllabus",
        )
        eff = effective_action(result, row=_math1_row())
        self.assertIn(eff, ("delete", "human_review"))
        self.assertNotEqual(eff, "approve")

    def _effective_after_flags(self, row, flags, curriculum_match: str):
        data = {
            "verdict": "Pass",
            "scores": {"syllabus_fit": 4, "solution_quality": 4, "esat_realism_pacing": 4},
            "recommended_action": "approve",
            "reasoning": "test",
            "confidence": "high",
            "calibration_tier": None,
            "graph_enrichment": {
                "mode": "none",
                "is_candidate": False,
                "suggested_stem_edits": "",
                "insertion_placeholders": [],
                "notes_for_human": "",
            },
            "curriculum_validation": {
                "syllabus_fit_score": 4,
                "curriculum_match": curriculum_match,
                "required_topic_codes": [],
                "suspicious_topics": [],
                "curriculum_reason": "test",
                "curriculum_flags": [],
            },
        }
        pre = [CurriculumFlag.from_dict(f) for f in flags]
        result = parse_quality_gate_json(data, pre_flags=pre)
        result = merge_deterministic_curriculum_flags(result, pre)
        return effective_action(result, row=row)


if __name__ == "__main__":
    unittest.main()
