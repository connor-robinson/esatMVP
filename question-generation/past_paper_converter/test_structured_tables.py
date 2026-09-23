"""Tests for the non-image table workflow."""

from __future__ import annotations

import unittest

from .structured_tables import process_tables


class StructuredTableTests(unittest.TestCase):
    def test_complete_table_becomes_markdown(self) -> None:
        parsed = {
            "has_table": True,
            "tables": [
                {
                    "caption": "Results",
                    "headers": ["option", "value"],
                    "rows": [["A", "$2$"], ["B", "$3$"]],
                }
            ],
        }
        stem, failed = process_tables(parsed, "Choose a value.")
        self.assertFalse(failed)
        self.assertIn("| option | value |", stem)
        self.assertIn("| B | $3$ |", stem)
        self.assertEqual(parsed["structured_tables_processed"], 1)
        self.assertEqual(parsed["structured_table_options"]["B"], "value: $3$")

    def test_ragged_table_fails_closed(self) -> None:
        parsed = {
            "has_table": True,
            "tables": [{"headers": ["a", "b"], "rows": [["only one"]]}],
        }
        _, failed = process_tables(parsed, "Stem")
        self.assertTrue(failed)


if __name__ == "__main__":
    unittest.main()
