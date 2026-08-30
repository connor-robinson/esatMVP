"""Label placement candidates and scoring."""

from __future__ import annotations

import math
from dataclasses import dataclass

from ..style import ExamStyle
from .geometry import inflate_rect, point_segment_distance, rects_overlap, segment_intersects_rect
from .obstacles import ObstacleSet


@dataclass(frozen=True)
class PlacementCandidate:
    name: str
    ha: str
    va: str
    offset_factor: tuple[float, float]


CANDIDATES: tuple[PlacementCandidate, ...] = (
    PlacementCandidate("above", "center", "bottom", (0.0, 1.0)),
    PlacementCandidate("below", "center", "top", (0.0, -1.0)),
    PlacementCandidate("left", "right", "center", (-1.0, 0.0)),
    PlacementCandidate("right", "left", "center", (1.0, 0.0)),
    PlacementCandidate("upper_left", "right", "bottom", (-0.7, 0.7)),
    PlacementCandidate("upper_right", "left", "bottom", (0.7, 0.7)),
    PlacementCandidate("lower_left", "right", "top", (-0.7, -0.7)),
    PlacementCandidate("lower_right", "left", "top", (0.7, -0.7)),
    PlacementCandidate("center", "center", "center", (0.0, 0.0)),
)


def candidate_order(preferred: str) -> list[PlacementCandidate]:
    pref = (preferred or "center").strip().lower()
    ordered: list[PlacementCandidate] = []
    for cand in CANDIDATES:
        if cand.name == pref:
            ordered.insert(0, cand)
        else:
            ordered.append(cand)
    return ordered


def offset_distance(ax, style: ExamStyle) -> float:
    span_x = abs(ax.get_xlim()[1] - ax.get_xlim()[0])
    span_y = abs(ax.get_ylim()[1] - ax.get_ylim()[0])
    span = max(span_x, span_y)
    return max(span * 0.035, 0.12)


def apply_candidate(
    *,
    anchor: tuple[float, float],
    candidate: PlacementCandidate,
    offset_dist: float,
) -> tuple[tuple[float, float], str, str]:
    ox = candidate.offset_factor[0] * offset_dist
    oy = candidate.offset_factor[1] * offset_dist
    return (anchor[0] + ox, anchor[1] + oy), candidate.ha, candidate.va


def bounds_rect(ax, margin_data: float) -> tuple[float, float, float, float]:
    xmin, xmax = ax.get_xlim()
    ymin, ymax = ax.get_ylim()
    return xmin + margin_data, ymin + margin_data, xmax - margin_data, ymax - margin_data


def label_collides(
    rect: tuple[float, float, float, float],
    *,
    obstacles: ObstacleSet,
    other_label_rects: list[tuple[float, float, float, float]],
    bounds: tuple[float, float, float, float],
    label_gap: float,
    segment_clearance: float,
    role: str = "label",
) -> list[str]:
    issues: list[str] = []
    inflated = inflate_rect(rect, label_gap)
    is_caption = role == "caption"

    bx0, by0, bx1, by1 = bounds
    if rect[0] < bx0 or rect[1] < by0 or rect[2] > bx1 or rect[3] > by1:
        issues.append("bounds")

    for other in other_label_rects:
        if rects_overlap(inflated, inflate_rect(other, label_gap)):
            issues.append("label")

    if is_caption:
        return issues

    if role == "axis":
        for seg in obstacles.segments:
            if seg.kind == "axis":
                continue
            if segment_intersects_rect(seg.x1, seg.y1, seg.x2, seg.y2, inflated):
                issues.append(f"segment:{seg.kind}")
        return issues

    for seg in obstacles.segments:
        if segment_intersects_rect(seg.x1, seg.y1, seg.x2, seg.y2, inflated):
            issues.append(f"segment:{seg.kind}")
            continue
        if seg.kind in {"function", "circle", "arc", "angle_arc", "axis"}:
            continue
        clearance = point_segment_distance(
            0.5 * (rect[0] + rect[2]),
            0.5 * (rect[1] + rect[3]),
            seg.x1,
            seg.y1,
            seg.x2,
            seg.y2,
        )
        half_diag = 0.5 * math.hypot(rect[2] - rect[0], rect[3] - rect[1])
        if clearance - half_diag < segment_clearance:
            issues.append(f"segment_near:{seg.kind}")

    for pt in obstacles.points:
            cx = 0.5 * (rect[0] + rect[2])
            cy = 0.5 * (rect[1] + rect[3])
            dist = math.hypot(cx - pt.x, cy - pt.y)
            half_diag = 0.5 * math.hypot(rect[2] - rect[0], rect[3] - rect[1])
            if dist - half_diag < pt.radius + label_gap:
                issues.append(f"point:{pt.kind}")

    return issues


def score_candidate(
    rect: tuple[float, float, float, float],
    anchor: tuple[float, float],
    issues: list[str],
) -> float:
    if issues:
        return -1e6 + float(len(issues))
    cx = 0.5 * (rect[0] + rect[2])
    cy = 0.5 * (rect[1] + rect[3])
    dist = math.hypot(cx - anchor[0], cy - anchor[1])
    return 1000.0 - dist
