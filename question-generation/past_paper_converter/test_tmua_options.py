"""Tests for exam option-count rules."""

from __future__ import annotations

import unittest

from .config import expected_option_letters, uses_variable_option_count
from .export_questions import QuestionJob
from .validate import normalize_options, validate_extraction


def _job(**kwargs) -> QuestionJob:
    base = {
        "question_id": 1,
        "paper_id": 1,
        "exam_name": "TMUA",
        "exam_year": 2022,
        "paper_name": "Paper 2",
        "part_letter": "",
        "part_name": "",
        "exam_type": "TMUA",
        "question_number": 1,
        "answer_letter": "C",
        "question_image_url": "",
        "expected_letters": list("ABCDEFGH"),
    }
    base.update(kwargs)
    return QuestionJob(**base)


class TmuaOptionCountTests(unittest.TestCase):
    def test_tmua_is_variable(self) -> None:
        self.assertTrue(uses_variable_option_count("TMUA", "Paper 1"))
        self.assertTrue(uses_variable_option_count("TMUA", "Paper 2"))

    def test_tmua_allows_up_to_h(self) -> None:
        self.assertEqual(expected_option_letters("TMUA", "Paper 1"), list("ABCDEFGH"))

    def test_five_options_do_not_hard_fail(self) -> None:
        job = _job(answer_letter="E")
        options = normalize_options(
            {letter: f"opt {letter}" for letter in list("ABCDE")}
        )
        report, hard_fail = validate_extraction(
            job,
            {
                "detected_question_number": 1,
                "confidence": 0.99,
                "has_diagram": False,
                "has_table": False,
                "diagram_confidence": 0.99,
                "diagram_type": "none",
            },
            "Stem text",
            options,
        )
        self.assertFalse(report["missing_options"])
        self.assertFalse(hard_fail)

    def test_seven_options_with_answer_g_pass(self) -> None:
        job = _job(answer_letter="G")
        options = normalize_options(
            {letter: f"opt {letter}" for letter in list("ABCDEFG")}
        )
        report, hard_fail = validate_extraction(
            job,
            {
                "detected_question_number": 1,
                "confidence": 0.99,
                "has_diagram": False,
                "has_table": False,
                "diagram_confidence": 0.99,
                "diagram_type": "none",
            },
            "Stem text",
            options,
        )
        self.assertFalse(report["missing_options"])
        self.assertFalse(hard_fail)

    def test_too_few_options_still_fail(self) -> None:
        job = _job(answer_letter="A")
        options = normalize_options({"A": "1", "B": "2", "C": "3"})
        report, hard_fail = validate_extraction(
            job,
            {
                "detected_question_number": 1,
                "confidence": 0.99,
                "has_diagram": False,
                "has_table": False,
                "diagram_confidence": 0.99,
                "diagram_type": "none",
            },
            "Stem text",
            options,
        )
        self.assertTrue(report["missing_options"])
        self.assertTrue(hard_fail)


if __name__ == "__main__":
    unittest.main()
