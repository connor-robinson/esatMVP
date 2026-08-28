"""Tests for display width normalization and stem apply."""

from __future__ import annotations

import io
import unittest

import numpy as np
from PIL import Image, ImageDraw

from past_paper_converter.display_size import compute_display_width_pct, ink_content_ratio
from past_paper_converter.stem_blocks import apply_placements_to_stem


def _png_bytes(draw_fn) -> bytes:
    img = Image.new("RGB", (200, 120), "white")
    draw = ImageDraw.Draw(img)
    draw_fn(draw, img.size)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


class DisplaySizeTests(unittest.TestCase):
    def test_tight_crop_uses_page_width(self) -> None:
        crop = _png_bytes(
            lambda draw, size: draw.rectangle((20, 20, 180, 100), fill="black")
        )
        asset = {"bbox_norm": [0.1, 0.1, 0.8, 0.4]}
        pct = compute_display_width_pct(asset, crop)
        self.assertGreater(pct, 55.0)
        self.assertLessEqual(pct, 90.0)

    def test_padded_crop_shrinks_display(self) -> None:
        crop = _png_bytes(
            lambda draw, size: draw.rectangle((70, 40, 130, 80), fill="black")
        )
        asset = {"bbox_norm": [0.0, 0.1, 1.0, 0.4]}
        pct = compute_display_width_pct(asset, crop)
        self.assertLess(pct, 45.0)

    def test_ink_ratio_full_width(self) -> None:
        crop = _png_bytes(
            lambda draw, size: draw.rectangle((0, 0, size[0] - 1, size[1] - 1), fill="black")
        )
        self.assertAlmostEqual(ink_content_ratio(crop), 1.0, places=2)


class ApplyPlacementsTests(unittest.TestCase):
    def test_inline_figures_with_width(self) -> None:
        stem = apply_placements_to_stem(
            ["Intro", "Question?"],
            [
                {"assetId": "d1", "insertAfterBlock": 0, "displayWidthPct": 55.0},
                {"assetId": "d2", "insertAfterBlock": 2, "displayWidthPct": 70.0},
            ],
            {
                "d1": {"id": "d1", "url": "https://x/d1.png", "alt": "first"},
                "d2": {"id": "d2", "url": "https://x/d2.png", "alt": "second"},
            },
        )
        self.assertIn('width:55.0%', stem)
        self.assertIn("Intro", stem)
        self.assertIn("Question?", stem)
        self.assertLess(stem.index("d1.png"), stem.index("Intro"))
        self.assertLess(stem.index("Question?"), stem.index("d2.png"))


if __name__ == "__main__":
    unittest.main()
