"""Exam-style rendering constants for ESAT / NSAA / ENGAA diagrams."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ExamStyle:
    background: str = "white"
    stroke: str = "#111111"
    stroke_width: float = 1.2
    dash_pattern: tuple[float, float] = (4.0, 3.0)
    font_size: float = 11.0
    font_family: str = "serif"
    dpi: int = 220
    pad_inches: float = 0.15
    figsize: tuple[float, float] = (6.0, 4.2)
    tick_length: float = 0.08
    angle_arc_radius_factor: float = 0.18
    right_angle_size_factor: float = 0.045
    equal_tick_length_factor: float = 0.05
    min_label_clearance_pt: float = 3.5
    min_label_gap_pt: float = 3.5
    bounds_margin_pt: float = 4.0
    max_placement_iterations: int = 18
    vertex_marker_radius_pt: float = 2.0


DEFAULT_STYLE = ExamStyle()
