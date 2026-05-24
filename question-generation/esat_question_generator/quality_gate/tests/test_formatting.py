"""Tests for formatting detection and normalization."""

from __future__ import annotations

import unittest

from quality_gate.formatting import build_formatting_patch, detect_formatting_issues


class TestFormatting(unittest.TestCase):
    def test_detects_excessive_line_breaks(self):
        row = {
            "question_stem": "A car\n\n\n\n travels at 20 m/s.\nWhat is its speed?",
            "options": {"A": "10", "B": "20"},
        }
        issues = detect_formatting_issues(row)
        self.assertTrue(any(i.get("issue_id") == "excessive_blank_lines" for i in issues))

    def test_normalizes_stem(self):
        row = {
            "question_stem": "A particle moves\nin a straight line\nat constant speed.\n\nWhat is the distance?",
            "options": {"A": "1 m", "B": "2 m"},
        }
        patch = build_formatting_patch(row)
        self.assertIn("question_stem", patch)
        self.assertNotIn("\n\n\n", patch["question_stem"])


if __name__ == "__main__":
    unittest.main()
