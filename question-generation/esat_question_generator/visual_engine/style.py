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
    right_angle_size_factor: float = 0.06
    equal_tick_length_factor: float = 0.05
    min_label_clearance_pt: float = 4.0
    min_label_gap_pt: float = 4.0
    bounds_margin_pt: float = 6.0
    max_placement_iterations: int = 16
    vertex_marker_radius_pt: float = 2.5


DEFAULT_STYLE = ExamStyle()
