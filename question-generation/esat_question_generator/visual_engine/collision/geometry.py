"""Geometry helpers for collision testing."""

from __future__ import annotations

import math


def inflate_rect(rect: tuple[float, float, float, float], margin: float) -> tuple[float, float, float, float]:
    xmin, ymin, xmax, ymax = rect
    return xmin - margin, ymin - margin, xmax + margin, ymax + margin


def rects_overlap(a: tuple[float, float, float, float], b: tuple[float, float, float, float]) -> bool:
    ax0, ay0, ax1, ay1 = a
    bx0, by0, bx1, by1 = b
    return not (ax1 < bx0 or bx1 < ax0 or ay1 < by0 or by1 < ay0)


def point_in_rect(x: float, y: float, rect: tuple[float, float, float, float]) -> bool:
    xmin, ymin, xmax, ymax = rect
    return xmin <= x <= xmax and ymin <= y <= ymax


def _cross(ax: float, ay: float, bx: float, by: float) -> float:
    return ax * by - ay * bx


def segment_intersects_rect(
    x1: float,
    y1: float,
    x2: float,
    y2: float,
    rect: tuple[float, float, float, float],
) -> bool:
    if point_in_rect(x1, y1, rect) or point_in_rect(x2, y2, rect):
        return True

    xmin, ymin, xmax, ymax = rect
    edges = (
        (xmin, ymin, xmax, ymin),
        (xmax, ymin, xmax, ymax),
        (xmax, ymax, xmin, ymax),
        (xmin, ymax, xmin, ymin),
    )
    for ex1, ey1, ex2, ey2 in edges:
        if _segments_intersect(x1, y1, x2, y2, ex1, ey1, ex2, ey2):
            return True
    return False


def _segments_intersect(x1: float, y1: float, x2: float, y2: float, x3: float, y3: float, x4: float, y4: float) -> bool:
    d1 = _cross(x2 - x1, y2 - y1, x3 - x1, y3 - y1)
    d2 = _cross(x2 - x1, y2 - y1, x4 - x1, y4 - y1)
    d3 = _cross(x4 - x3, y4 - y3, x1 - x3, y1 - y3)
    d4 = _cross(x4 - x3, y4 - y3, x2 - x3, y2 - y3)

    if ((d1 > 0 and d2 < 0) or (d1 < 0 and d2 > 0)) and ((d3 > 0 and d4 < 0) or (d3 < 0 and d4 > 0)):
        return True

    def on_segment(px: float, py: float, qx: float, qy: float, rx: float, ry: float) -> bool:
        return (
            min(px, rx) - 1e-9 <= qx <= max(px, rx) + 1e-9
            and min(py, ry) - 1e-9 <= qy <= max(py, ry) + 1e-9
        )

    if math.isclose(d1, 0.0) and on_segment(x1, y1, x3, y3, x2, y2):
        return True
    if math.isclose(d2, 0.0) and on_segment(x1, y1, x4, y4, x2, y2):
        return True
    if math.isclose(d3, 0.0) and on_segment(x3, y3, x1, y1, x4, y4):
        return True
    if math.isclose(d4, 0.0) and on_segment(x3, y3, x2, y2, x4, y4):
        return True
    return False


def point_segment_distance(px: float, py: float, x1: float, y1: float, x2: float, y2: float) -> float:
    dx = x2 - x1
    dy = y2 - y1
    if math.isclose(dx, 0.0) and math.isclose(dy, 0.0):
        return math.hypot(px - x1, py - y1)
    t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    proj_x = x1 + t * dx
    proj_y = y1 + t * dy
    return math.hypot(px - proj_x, py - proj_y)


def rect_segment_clearance(rect: tuple[float, float, float, float], x1: float, y1: float, x2: float, y2: float) -> float:
    if segment_intersects_rect(x1, y1, x2, y2, rect):
        return 0.0
    cx = 0.5 * (rect[0] + rect[2])
    cy = 0.5 * (rect[1] + rect[3])
    return point_segment_distance(cx, cy, x1, y2 if False else y1, x2, y2)


def unit_vector(x1: float, y1: float, x2: float, y2: float) -> tuple[float, float]:
    dx = x2 - x1
    dy = y2 - y1
    length = math.hypot(dx, dy)
    if length <= 1e-12:
        return 1.0, 0.0
    return dx / length, dy / length


def perpendicular(u: tuple[float, float]) -> tuple[float, float]:
    return -u[1], u[0]
