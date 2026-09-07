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


def candidate_order(preferred: str, *, role: str = "label") -> list[PlacementCandidate]:
    pref = (preferred or "above").strip().lower()
    # "center" almost always overlaps geometry when Gemini anchors on a vertex/edge.
    if pref == "center":
        pref = "upper_right"

    # Axis ticks/titles must stay outside the plot; never flip into the data area.
    if role == "axis":
        if pref in {"below", "lower_left", "lower_right"}:
            allowed = ("below", "lower_left", "lower_right")
        elif pref in {"left", "upper_left", "lower_left"}:
            allowed = ("left", "upper_left", "lower_left")
        elif pref in {"above", "upper_left", "upper_right"}:
            allowed = ("above", "upper_left", "upper_right")
        elif pref in {"right", "upper_right", "lower_right"}:
            allowed = ("right", "upper_right", "lower_right")
        else:
            allowed = ("below", "left", "lower_left")
        ordered = [c for name in allowed for c in CANDIDATES if c.name == name]
        return ordered

    ordered: list[PlacementCandidate] = []
    for cand in CANDIDATES:
        if cand.name == "center":
            continue
        if cand.name == pref:
            ordered.insert(0, cand)
        else:
            ordered.append(cand)
    # Keep center as a last resort only.
    ordered.append(next(c for c in CANDIDATES if c.name == "center"))
    return ordered


def offset_distance(ax, style: ExamStyle) -> float:
    span_x = abs(ax.get_xlim()[1] - ax.get_xlim()[0])
    span_y = abs(ax.get_ylim()[1] - ax.get_ylim()[0])
    span = max(span_x, span_y)
    # Keep vertex/side labels clear of geometry; Gemini often anchors on the object itself.
    return max(span * 0.055, 0.22)


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

    if role == "axis":
        # Axis ticks/titles may sit just outside the data box; do not bounds-check them.
        for other in other_label_rects:
            if rects_overlap(inflated, inflate_rect(other, label_gap * 0.5)):
                issues.append("label")
        for seg in obstacles.segments:
            if seg.kind in {"axis", "arrow", "function"}:
                continue
            if segment_intersects_rect(seg.x1, seg.y1, seg.x2, seg.y2, inflated):
                issues.append(f"segment:{seg.kind}")
        return issues

    bx0, by0, bx1, by1 = bounds
    # Captions may sit slightly outside the bottom/top plot bounds.
    if is_caption:
        if rect[0] < bx0 or rect[2] > bx1:
            issues.append("bounds")
    else:
        if rect[0] < bx0 or rect[1] < by0 or rect[2] > bx1 or rect[3] > by1:
            issues.append("bounds")

    for other in other_label_rects:
        if rects_overlap(inflated, inflate_rect(other, label_gap)):
            issues.append("label")

    if is_caption:
        return issues

    # Hard intersection for solid geometry. Soft proximity only for thin construction marks.
    soft_proximity_kinds = {"right_angle", "equal_tick", "dimension", "dimension_ext"}
    skip_intersection_kinds = {"function", "circle", "arc", "angle_arc", "axis"}

    for seg in obstacles.segments:
        if seg.kind in skip_intersection_kinds:
            continue
        if segment_intersects_rect(seg.x1, seg.y1, seg.x2, seg.y2, inflated):
            issues.append(f"segment:{seg.kind}")
            continue
        if seg.kind not in soft_proximity_kinds:
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
        if pt.kind == "vertex":
            continue
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
        # Prefer fewer remaining conflicts when no clean placement exists.
        return -1e6 - 100.0 * float(len(issues))
    cx = 0.5 * (rect[0] + rect[2])
    cy = 0.5 * (rect[1] + rect[3])
    dist = math.hypot(cx - anchor[0], cy - anchor[1])
    return 1000.0 - dist
