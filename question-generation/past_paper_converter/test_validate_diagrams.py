"""Regression tests for exhaustive diagram classification labels."""

from __future__ import annotations

import unittest
from dataclasses import replace

from .export_questions import QuestionJob
from .validate import validate_extraction


def _job() -> QuestionJob:
    return QuestionJob(
        question_id=1,
        paper_id=1,
        exam_name="ENGAA",
        exam_year=2023,
        paper_name="Section 1",
        part_letter="A",
        part_name="Physics",
        exam_type="Official",
        question_number=1,
        answer_letter="A",
        question_image_url="https://example.test/q1.png",
        expected_letters=list("ABCD"),
    )


class DiagramClassificationTests(unittest.TestCase):
    def test_section_two_accepts_variable_choices_and_parent_number(self) -> None:
        job = replace(
            _job(),
            paper_name="Section 2",
            question_number=5,
            expected_letters=list("ABCDEFGH"),
        )
        report, failed = validate_extraction(
            job,
            {
                "detected_question_number": 2,
                "confidence": 0.99,
                "has_diagram": False,
                "diagram_confidence": 0.99,
                "diagram_type": "none",
                "has_graphical_options": False,
            },
            "Which sample is stiffest?",
            {letter: letter for letter in "ABCDE"},
        )
        self.assertFalse(failed)
        self.assertFalse(report["missing_options"])
        self.assertFalse(report["wrong_question_number"])
        self.assertFalse(report["printed_question_number_comparable"])

    def test_labels_original_crop_for_review(self) -> None:
        report, failed = validate_extraction(
            _job(),
            {
                "detected_question_number": 1,
                "confidence": 0.98,
                "has_diagram": True,
                "diagram_confidence": 0.99,
                "diagram_type": "circuit",
                "has_graphical_options": False,
            },
            "A circuit is shown.",
            {"A": "1", "B": "2", "C": "3", "D": "4"},
        )
        self.assertFalse(failed)
        self.assertTrue(report["has_diagram"])
        self.assertEqual(report["diagram_review_status"], "available_for_review")
        self.assertEqual(report["diagram_source"], "cropped_original")
        self.assertFalse(report["diagram_generated"])

    def test_visual_cue_mismatch_approves_when_text_complete(self) -> None:
        report, failed = validate_extraction(
            _job(),
            {
                "detected_question_number": 1,
                "confidence": 0.98,
                "has_diagram": False,
                "diagram_confidence": 0.99,
                "diagram_type": "none",
                "has_graphical_options": False,
            },
            "The graph shown below represents the motion.",
            {"A": "1", "B": "2", "C": "3", "D": "4"},
        )
        self.assertFalse(failed)
        self.assertTrue(report["diagram_detection_mismatch"])
        self.assertEqual(report["diagram_review_status"], "needs_review")
        self.assertTrue(report.get("diagram_text_published_despite_diagram_issue"))

    def test_uncertain_negative_approves_when_text_complete(self) -> None:
        report, failed = validate_extraction(
            _job(),
            {
                "detected_question_number": 1,
                "confidence": 0.98,
                "has_diagram": False,
                "diagram_confidence": 0.70,
                "diagram_type": "none",
                "has_graphical_options": False,
            },
            "Which statement is correct?",
            {"A": "1", "B": "2", "C": "3", "D": "4"},
        )
        self.assertFalse(failed)
        self.assertTrue(report["diagram_classification_uncertain"])
        self.assertEqual(report["diagram_review_status"], "needs_review")

    def test_complete_graphical_options_can_approve(self) -> None:
        report, failed = validate_extraction(
            _job(),
            {
                "detected_question_number": 1,
                "confidence": 0.98,
                "has_diagram": True,
                "diagram_confidence": 0.99,
                "diagram_type": "graphical_options",
                "has_graphical_options": True,
                "graphical_option_letters_processed": list("ABCD"),
            },
            "Which sketch is correct?",
            {"A": "", "B": "", "C": "", "D": ""},
        )
        self.assertFalse(failed)
        self.assertFalse(report["graphical_options_incomplete"])

    def test_incomplete_graphical_options_fail_closed(self) -> None:
        report, failed = validate_extraction(
            _job(),
            {
                "detected_question_number": 1,
                "confidence": 0.98,
                "has_diagram": True,
                "diagram_confidence": 0.99,
                "diagram_type": "graphical_options",
                "has_graphical_options": True,
                "graphical_option_letters_processed": list("ABC"),
            },
            "Which sketch is correct?",
            {"A": "", "B": "", "C": "", "D": ""},
        )
        self.assertTrue(failed)
        self.assertTrue(report["graphical_options_incomplete"])

    def test_structured_table_is_not_a_diagram_mismatch(self) -> None:
        report, failed = validate_extraction(
            _job(),
            {
                "detected_question_number": 1,
                "confidence": 0.98,
                "has_diagram": False,
                "has_table": True,
                "diagram_confidence": 0.99,
                "diagram_type": "table",
                "has_graphical_options": False,
                "structured_tables_processed": 1,
            },
            "Use the table below.\n\n| x | y |\n| --- | --- |\n| 1 | 2 |",
            {"A": "1", "B": "2", "C": "3", "D": "4"},
        )
        self.assertFalse(failed)
        self.assertTrue(report["has_table"])
        self.assertEqual(report["diagram_classification"], "table")


if __name__ == "__main__":
    