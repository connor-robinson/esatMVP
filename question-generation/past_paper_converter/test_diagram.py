"""Regression tests for cutoff-safe diagram cropping."""

from __future__ import annotations

import io
import unittest

from PIL import Image, ImageDraw

from .diagram import (
    _graphical_grid_boxes,
    crop_diagram_with_diagnostics,
    process_diagrams,
)


def _image_bytes() -> bytes:
    image = Image.new("RGB", (1000, 800), "white")
    draw = ImageDraw.Draw(image)
    # Diagram ink deliberately extends beyond the model's proposed bbox.
    draw.rectangle((250, 180, 750, 590), outline="black", width=5)
    draw.line((200, 385, 800, 385), fill="black", width=5)
    draw.text((185, 370), "left label", fill="black")
    draw.text((755, 370), "right label", fill="black")
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    return buf.getvalue()


def _image_with_nearby_text() -> bytes:
    image = Image.new("RGB", (1000, 800), "white")
    draw = ImageDraw.Draw(image)
    draw.rectangle((250, 150, 750, 430), outline="black", width=5)
    draw.text((180, 555), "This prose belongs to the question, not the diagram.", fill="black")
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    return buf.getvalue()


def _image_with_detached_dimension_label() -> bytes:
    image = Image.new("RGB", (1000, 800), "white")
    draw = ImageDraw.Draw(image)
    draw.rectangle((250, 150, 750, 420), outline="black", width=5)
    draw.line((300, 440, 700, 440), fill="black", width=3)
    draw.text((470, 460), "4.0 m", fill="black")
    draw.text((180, 620), "Question prose below the diagram.", fill="black")
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    return buf.getvalue()


def _image_with_two_graph_panels() -> bytes:
    image = Image.new("RGB", (1000, 1000), "white")
    draw = ImageDraw.Draw(image)
    draw.rectangle((200, 130, 800, 360), outline="black", width=5)
    draw.text((210, 140), "Graph 1", fill="black")
    draw.rectangle((200, 520, 800, 750), outline="black", width=5)
    draw.text((210, 530), "Graph 2", fill="black")
    draw.text((180, 900), "Question prose below both panels.", fill="black")
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    return buf.getvalue()


class DiagramCropTests(unittest.TestCase):
    def test_expands_when_ink_touches_crop_edges(self) -> None:
        cropped, diagnostics = crop_diagram_with_diagnostics(
            _image_bytes(), [0.25, 0.18, 0.50, 0.52]
        )
        self.assertIsNotNone(cropped)
        self.assertFalse(diagnostics["cutoff_risk"])
        self.assertLess(diagnostics["bbox_norm_final"][0], 0.20)
        self.assertGreater(
            diagnostics["bbox_norm_final"][0] + diagnostics["bbox_norm_final"][2],
            0.80,
        )

    def test_rejects_invalid_bbox(self) -> None:
        cropped, diagnostics = crop_diagram_with_diagnostics(_image_bytes(), [0, 0, 0, 1])
        self.assertIsNone(cropped)
        self.assertTrue(diagnostics["cutoff_risk"])

    def test_does_not_trim_at_whitespace_seam(self) -> None:
        cropped, diagnostics = crop_diagram_with_diagnostics(
            _image_with_nearby_text(), [0.25, 0.18, 0.50, 0.55]
        )
        self.assertIsNotNone(cropped)
        self.assertFalse(diagnostics["vertical_trim_applied"])
        self.assertTrue(diagnostics["vertical_trim_disabled"])

    def test_table_extends_to_page_bottom(self) -> None:
        cropped, diagnostics = crop_diagram_with_diagnostics(
            _image_with_nearby_text(),
            [0.25, 0.18, 0.50, 0.30],
            diagram_type="table",
        )
        self.assertIsNotNone(cropped)
        bottom = diagnostics["bbox_norm_final"][1] + diagnostics["bbox_norm_final"][3]
        self.assertAlmostEqual(bottom, 1.0)
        self.assertEqual(diagnostics["conservative_mode"], "table_to_page_bottom")

    def test_graphical_options_keep_full_width_and_page_bottom(self) -> None:
        cropped, diagnostics = crop_diagram_with_diagnostics(
            _image_bytes(),
            [0.25, 0.18, 0.50, 0.30],
            has_graphical_options=True,
        )
        self.assertIsNotNone(cropped)
        self.assertEqual(diagnostics["bbox_norm_final"][0], 0.0)
        self.assertEqual(diagnostics["bbox_norm_final"][2], 1.0)
        bottom = diagnostics["bbox_norm_final"][1] + diagnostics["bbox_norm_final"][3]
        self.assertAlmostEqual(bottom, 1.0)
        self.assertEqual(
            diagnostics["conservative_mode"], "graphical_options_to_page_bottom"
        )

    def test_keeps_detached_dimension_label(self) -> None:
        cropped, diagnostics = crop_diagram_with_diagnostics(
            _image_with_detached_dimension_label(), [0.25, 0.18, 0.50, 0.34]
        )
        self.assertIsNotNone(cropped)
        bottom = diagnostics["bbox_norm_final"][1] + diagnostics["bbox_norm_final"][3]
        self.assertGreater(bottom, 0.59)
        self.assertLess(bottom, 0.75)

    def test_graph_trim_excludes_prose_below_full_page_graph(self) -> None:
        _, diagnostics = crop_diagram_with_diagnostics(
            _image_with_nearby_text(),
            [0.25, 0.18, 0.50, 0.36],
            diagram_type="graph",
        )
        self.assertTrue(diagnostics["vertical_trim_applied"])
        self.assertFalse(diagnostics["vertical_trim_disabled"])
        bottom = diagnostics["bbox_norm_final"][1] + diagnostics["bbox_norm_final"][3]
        self.assertLess(bottom, 0.68)

    def test_scientific_trim_excludes_prose_below_full_page_diagram(self) -> None:
        _, diagnostics = crop_diagram_with_diagnostics(
            _image_with_nearby_text(),
            [0.25, 0.18, 0.50, 0.36],
            diagram_type="scientific",
        )
        self.assertTrue(diagnostics["vertical_trim_applied"])
        self.assertFalse(diagnostics["vertical_trim_disabled"])

    def test_circuit_trim_excludes_answer_table_below_diagram(self) -> None:
        _, diagnostics = crop_diagram_with_diagnostics(
            _image_with_nearby_text(),
            [0.25, 0.18, 0.50, 0.36],
            diagram_type="circuit",
        )
        self.assertTrue(diagnostics["vertical_trim_applied"])
        self.assertFalse(diagnostics["vertical_trim_disabled"])

    def test_graph_trim_preserves_all_panels_inside_raw_bbox(self) -> None:
        _, diagnostics = crop_diagram_with_diagnostics(
            _image_with_two_graph_panels(),
            [0.20, 0.12, 0.60, 0.65],
            diagram_type="graph",
        )
        self.assertTrue(diagnostics["vertical_trim_applied"])
        top = diagnostics["bbox_norm_final"][1]
        bottom = top + diagnostics["bbox_norm_final"][3]
        self.assertLess(top, 0.13)
        self.assertGreater(bottom, 0.75)
        self.assertLess(bottom, 0.86)

    def test_dry_run_builds_asset_without_upload(self) -> None:
        stem, assets, failed = process_diagrams(
            123,
            _image_bytes(),
            {
                "stem": "Question stem",
                "has_diagram": True,
                "diagram_bbox_norm": [0.20, 0.15, 0.60, 0.60],
                "diagram_caption": "test diagram",
            },
            upload=False,
        )
        self.assertFalse(failed)
        self.assertTrue(assets[0]["url"].startswith("dry-run://past-papers/123/diagram_1_"))
        self.assertTrue(assets[0]["url"].endswith(".png"))
        self.assertIn("dry-run://", stem)

    def test_separated_stem_diagrams_become_independent_assets(self) -> None:
        stem, assets, failed = process_diagrams(
            124,
            _image_with_two_graph_panels(),
            {
                "stem": "Compare the two arrangements.",
                "has_diagram": True,
                "diagram_type": "scientific",
                "diagram_bbox_norm": None,
                "stem_diagram_assets": [
                    {"bbox_norm": [0.20, 0.10, 0.60, 0.25], "caption": "first"},
                    {"bbox_norm": [0.20, 0.55, 0.60, 0.25], "caption": "second"},
                ],
            },
            upload=False,
        )
        self.assertFalse(failed)
        self.assertEqual(len(assets), 2)
        self.assertEqual([asset["role"] for asset in assets], ["stem_diagram", "stem_diagram"])
        self.assertEqual(stem.count("<figure"), 2)
        first_bottom = assets[0]["bbox_norm"][1] + assets[0]["bbox_norm"][3]
        second_top = assets[1]["bbox_norm"][1]
        self.assertLess(first_bottom, second_top)

    def test_graphical_options_are_independent_assets(self) -> None:
        _, assets, failed = process_diagrams(
            456,
            _image_bytes(),
            {
                "stem": "Choose a graph.",
                "has_diagram": True,
                "has_graphical_options": True,
                "diagram_bbox_norm": None,
                "graphical_option_assets": [
                    {"letter": "A", "bbox_norm": [0.10, 0.10, 0.80, 0.70]},
                    {"letter": "B", "bbox_norm": [0.10, 0.10, 0.80, 0.70]},
                ],
            },
            upload=False,
        )
        self.assertFalse(failed)
        self.assertEqual([asset["option_letter"] for asset in assets], ["A", "B"])
        self.assertEqual([asset["position"] for asset in assets], ["option", "option"])
        self.assertNotEqual(assets[0]["url"], assets[1]["url"])

    def test_process_diagrams_extends_numbered_multi_panel_graph(self) -> None:
        parsed = {
            "stem": "Graph 1 shows time. Graph 2 shows distance.",
            "has_diagram": True,
            "diagram_type": "graph",
            "diagram_bbox_norm": [0.20, 0.12, 0.60, 0.25],
        }
        _, assets, failed = process_diagrams(
            789, _image_with_two_graph_panels(), parsed, upload=False
        )
        self.assertFalse(failed)
        self.assertTrue(parsed["multi_panel_bbox_extended"])
        top = assets[0]["bbox_norm"][1]
        bottom = top + assets[0]["bbox_norm"][3]
        self.assertGreater(bottom, 0.75)

    def test_graphical_grid_keeps_labels_left_of_each_model_box(self) -> None:
        boxes = _graphical_grid_boxes(
            [
                {"letter": "A", "bbox_norm": [0.18, 0.20, 0.24, 0.20]},
                {"letter": "B", "bbox_norm": [0.48, 0.20, 0.24, 0.20]},
                {"letter": "C", "bbox_norm": [0.78, 0.20, 0.20, 0.20]},
            ],
            xyxy=False,
        )
        self.assertLessEqual(boxes["A"][0], 0.08)
        self.assertLessEqual(boxes["B"][0], 0.38)
        self.assertLessEqual(boxes["C"][0], 0.68)

    def test_graphical_grid_ignores_bad_right_column_widths(self) -> None:
        boxes = _graphical_grid_boxes(
            [
                {"letter": "A", "bbox_norm": [0.151, 0.295, 0.466, 0.213]},
                {"letter": "B", "bbox_norm": [0.616, 0.295, 0.040, 0.213]},
                {"letter": "C", "bbox_norm": [0.151, 0.409, 0.466, 0.266]},
                {"letter": "D", "bbox_norm": [0.616, 0.409, 0.040, 0.266]},
                {"letter": "E", "bbox_norm": [0.151, 0.575, 0.466, 0.333]},
                {"letter": "F", "bbox_norm": [0.616, 0.575, 0.040, 0.333]},
            ],
            xyxy=False,
        )
        self.assertGreater(boxes["A"][2], 0.40)
        self.assertGreater(boxes["A"][1] + boxes["A"][3], 0.50)
        self.assertGreater(boxes["C"][1], boxes["A"][1])
        self.assertGreater(boxes["B"][2], 0.45)
        self.assertGreater(boxes["D"][2], 0.45)
        self.assertGreater(boxes["F"][2], 0.45)

    def test_geometry_adds_extra_lower_margin(self) -> None:
        _, diagnostics = crop_diagram_with_diagnostics(
            _image_bytes(),
            [0.25, 0.18, 0.50, 0.20],
            diagram_type="geometry",
        )
        padded_bottom = (
            diagnostics["bbox_norm_padded"][1]
            + diagnostics["bbox_norm_padded"][3]
        )
        self.assertGreaterEqual(padded_bottom, 0.54)


if __name__ == "__main__":
    unittest.main()
