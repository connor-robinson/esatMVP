"""Tests for stem block splitting and placement validation."""

from __future__ import annotations

import unittest

from past_paper_converter.stem_blocks import (
    apply_placements_preview,
    split_stem_blocks,
    stem_diagram_assets,
    strip_figures,
    validate_placements,
)


class StemBlocksTests(unittest.TestCase):
    def test_strip_figures(self) -> None:
        stem = "Hello\n\n<figure class='qg-diagram'><img src='x'/></figure>\n\nWorld"
        cleaned = strip_figures(stem)
        self.assertNotIn("<figure", cleaned)
        self.assertIn("Hello", cleaned)
        self.assertIn("World", cleaned)

    def test_split_paragraphs(self) -> None:
        stem = "First paragraph.\n\nSecond paragraph.\n\nThird."
        blocks = split_stem_blocks(stem)
        self.assertEqual(blocks, ["First paragraph.", "Second paragraph.", "Third."])

    def test_split_keeps_table_as_one_block(self) -> None:
        stem = (
            "Intro text.\n\n"
            "| A | B |\n"
            "| --- | --- |\n"
            "| 1 | 2 |\n\n"
            "After table."
        )
        blocks = split_stem_blocks(stem)
        self.assertEqual(len(blocks), 3)
        self.assertTrue(blocks[1].startswith("| A | B |"))
        self.assertIn("| 1 | 2 |", blocks[1])
        self.assertEqual(blocks[2], "After table.")

    def test_split_strips_figures_first(self) -> None:
        stem = "Alpha\n\n<figure><img src='d1'/></figure>\n\nBeta"
        blocks = split_stem_blocks(stem)
        self.assertEqual(blocks, ["Alpha", "Beta"])


class StemDiagramAssetsTests(unittest.TestCase):
    def test_filters_graphical_options(self) -> None:
        assets = [
            {"id": "d1", "role": "stem_diagram"},
            {"id": "d2", "role": "graphical_option", "option_letter": "A"},
            {"id": "d3", "option_letter": "B"},
            {"id": "d4", "position": "option"},
            {"id": "", "role": "stem_diagram"},
        ]
        kept = stem_diagram_assets(assets)
        self.assertEqual([a["id"] for a in kept], ["d1"])


class ValidatePlacementsTests(unittest.TestCase):
    def test_ok(self) -> None:
        placements, error = validate_placements(
            [
                {"asset_id": "d1", "insert_after_block": 0, "confidence": 0.9},
                {"assetId": "d2", "insertAfterBlock": 2, "confidence": 0.5},
            ],
            asset_ids=["d1", "d2"],
            block_count=2,
        )
        self.assertIsNone(error)
        self.assertEqual(
            placements,
            [
                {"assetId": "d1", "insertAfterBlock": 0, "confidence": 0.9},
                {"assetId": "d2", "insertAfterBlock": 2, "confidence": 0.5},
            ],
        )

    def test_unknown_asset(self) -> None:
        _, error = validate_placements(
            [{"assetId": "dx", "insertAfterBlock": 0}],
            asset_ids=["d1"],
            block_count=1,
        )
        self.assertIn("unknown", error or "")

    def test_oob_index(self) -> None:
        _, error = validate_placements(
            [{"assetId": "d1", "insertAfterBlock": 3}],
            asset_ids=["d1"],
            block_count=2,
        )
        self.assertIn("out of range", error or "")

    def test_missing_asset(self) -> None:
        _, error = validate_placements(
            [{"assetId": "d1", "insertAfterBlock": 0}],
            asset_ids=["d1", "d2"],
            block_count=1,
        )
        self.assertIn("missing", error or "")

    def test_duplicate_asset(self) -> None:
        _, error = validate_placements(
            [
                {"assetId": "d1", "insertAfterBlock": 0},
                {"assetId": "d1", "insertAfterBlock": 1},
            ],
            asset_ids=["d1"],
            block_count=1,
        )
        self.assertIn("duplicate", error or "")

    def test_preview_markers(self) -> None:
        preview = apply_placements_preview(
            ["A", "B"],
            [
                {"assetId": "d1", "insertAfterBlock": 0},
                {"assetId": "d2", "insertAfterBlock": 2},
            ],
        )
        self.assertEqual(preview, "{{diagram:d1}}\n\nA\n\nB\n\n{{diagram:d2}}")


if __name__ == "__main__":
    unittest.main()
