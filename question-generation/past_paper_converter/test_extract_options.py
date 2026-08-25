"""Tests for JSON repair and option-count retry prompts."""

from __future__ import annotations

import json
import unittest

from .extract import build_user_text, extract_json_object
from .run_with_progress import is_transient_network_error


class ExtractJsonTests(unittest.TestCase):
    def test_trailing_comma_is_repaired(self) -> None:
        raw = '{\n  "stem": "hello",\n  "options": {"A": "1",},\n}'
        parsed = extract_json_object(raw)
        self.assertEqual(parsed["stem"], "hello")
        self.assertEqual(parsed["options"]["A"], "1")

    def test_fenced_json(self) -> None:
        raw = '```json\n{"stem": "x", "options": {"A": "1"}}\n```'
        parsed = extract_json_object(raw)
        self.assertEqual(parsed["stem"], "x")


class OptionPromptTests(unittest.TestCase):
    def test_tmua_prompt_requires_all_letters(self) -> None:
        text = build_user_text(
            {
                "exam_name": "TMUA",
                "exam_year": 2022,
                "paper_name": "Paper 2",
                "question_number": 14,
                "expected_letters": list("ABCDEFGH"),
                "part_letter": "",
                "part_name": "",
            }
        )
        self.assertIn("exactly these option letters: A, B, C, D, E, F, G, H", text)
        self.assertIn("exactly 8 entries", text)

    def test_options_retry_lists_missing_letters(self) -> None:
        text = build_user_text(
            {
                "exam_name": "TMUA",
                "exam_year": 2022,
                "paper_name": "Paper 2",
                "question_number": 14,
                "expected_letters": list("ABCDEFGH"),
                "part_letter": "",
                "part_name": "",
            },
            options_retry={"found_letters": ["A", "B", "C", "D", "E", "F", "G"]},
        )
        self.assertIn("CRITICAL RETRY", text)
        self.assertIn("Missing letters", text)
        self.assertIn("H", text)


class RetryClassificationTests(unittest.TestCase):
    def test_empty_storage_response_json_error_is_transient(self) -> None:
        with self.assertRaises(json.JSONDecodeError) as caught:
            json.loads("")
        self.assertTrue(is_transient_network_error(caught.exception))

    def test_model_json_delimiter_error_is_not_network(self) -> None:
        with self.assertRaises(json.JSONDecodeError) as caught:
            json.loads('{"a": 1 "b": 2}')
        self.assertFalse(is_transient_network_error(caught.exception))

    def test_regular_validation_error_is_not_transient(self) -> None:
        self.assertFalse(is_transient_network_error(ValueError("invalid bbox")))


if __name__ == "__main__":
    unittest.main()
