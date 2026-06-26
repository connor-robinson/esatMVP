"""Unit tests for strict curriculum_match parsing (validator v2)."""

from __future__ import annotations

import unittest

from quality_gate.curriculum_match_parse import (
    action_from_curriculum,
    detect_curriculum_inconsistency,
    parse_curriculum_match,
)
from quality_gate.schemas import QualityGateResult, effective_action, parse_quality_gate_json


class TestParseCurriculumMatch(unittest.TestCase):
    def test_in_syllabus(self) -> None:
        self.assertEqual(parse_curriculum_match("in_syllabus"), "in_syllabus")

    def test_borderline(self) -> None:
        self.assertEqual(parse_curriculum_match("borderline"), "borderline")

    def test_out_of_syllabus(self) -> None:
        self.assertEqual(parse_curriculum_match("out_of_syllabus"), "out_of_syllabus")

    def test_legacy_off_syllabus_alias(self) -> None:
        self.assertEqual(parse_curriculum_match("off_syllabus"), "out_of_syllabus")

    def test_boolean_true_null(self) -> None:
        self.assertIsNone(parse_curriculum_match(True))

    def test_boolean_false_null(self) -> None:
        self.assertIsNone(parse_curriculum_match(False))

    def test_null(self) -> None:
        self.assertIsNone(parse_curriculum_match(None))

    def test_prose_null(self) -> None:
        self.assertIsNone(
            parse_curriculum_match("All concepts are squarely within the curriculum.")
        )


class TestActionFromCurriculum(unittest.TestCase):
    def test_in_syllabus_approve(self) -> None:
        self.assertEqual(action_from_curriculum("in_syllabus"), "approve")

    def test_borderline_human_review(self) -> None:
        self.assertEqual(action_from_curriculum("borderline"), "human_review")

    def test_out_of_syllabus_regenerate(self) -> None:
        self.assertEqual(action_from_curriculum("out_of_syllabus"), "regenerate")


class TestRegressionFixtures(unittest.TestCase):
    def _payload(self, **cv_overrides):
        cv = {
            "syllabus_fit_score": 5,
            "curriculum_match": "borderline",
            "required_topic_codes": ["M1-M3"],
            "suspicious_topics": [],
            "curriculum_reason": "Explicitly covered under M1-M3.",
            "curriculum_flags": [],
        }
        cv.update(cv_overrides)
        return {
            "verdict": "Pass",
            "scores": {"syllabus_fit": 5, "solution_quality": 5, "esat_realism_pacing": 5},
            "recommended_action": "approve",
            "reasoning": "ok",
            "confidence": "high",
            "curriculum_validation": cv,
        }

    def test_boolean_true_not_borderline(self) -> None:
        result = parse_quality_gate_json(self._payload(curriculum_match=True))
        self.assertEqual(result.curriculum_validation_status, "invalid_model_output")
        self.assertIsNone(result.curriculum_match)

    def test_boolean_false_not_in_syllabus(self) -> None:
        result = parse_quality_gate_json(self._payload(curriculum_match=False))
        self.assertEqual(result.curriculum_validation_status, "invalid_model_output")
        self.assertIsNone(result.curriculum_match)

    def test_prose_not_borderline(self) -> None:
        result = parse_quality_gate_json(
            self._payload(curriculum_match="All concepts are explicitly covered.")
        )
        self.assertEqual(result.curriculum_validation_status, "invalid_model_output")

    def test_valid_in_syllabus_can_approve(self) -> None:
        result = parse_quality_gate_json(
            self._payload(
                curriculum_match="in_syllabus",
                curriculum_reason="Core M1-M3 application.",
            )
        )
        self.assertEqual(result.curriculum_match, "in_syllabus")
        eff = effective_action(result, row={"subjects": "Math 1"})
        self.assertEqual(eff, "approve")

    def test_out_of_syllabus_not_approve(self) -> None:
        result = parse_quality_gate_json(
            self._payload(
                curriculum_match="out_of_syllabus",
                syllabus_fit_score=1,
                recommended_action="approve",
            )
        )
        eff = effective_action(result, row={"subjects": "Math 1"})
        self.assertNotEqual(eff, "approve")

    def test_borderline_inconsistent_detected(self) -> None:
        inc = detect_curriculum_inconsistency(
            curriculum_match="borderline",
            syllabus_fit_score=5,
            curriculum_flags=[],
            suspicious_topics=[],
            recommended_action="approve",
            curriculum_reason="Aligns perfectly with the Math 1 curriculum.",
        )
        self.assertIsNotNone(inc)

    def test_invalid_match_forces_human_review(self) -> None:
        result = parse_quality_gate_json(self._payload(curriculum_match=True))
        self.assertEqual(effective_action(result), "human_review")


if __name__ == "__main__":
    unittest.main()
