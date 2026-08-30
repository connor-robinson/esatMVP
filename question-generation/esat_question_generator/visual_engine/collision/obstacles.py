"""Obstacle primitives for collision detection."""

from __future__ import annotations

import math
from dataclasses import dataclass, field


@dataclass
class LineSegment:
    x1: float
    y1: float
    x2: float
    y2: float
    kind: str = "line"

    def sample_points(self, n: int = 8) -> list[tuple[float, float]]:
        if n < 2:
            n = 2
        pts: list[tuple[float, float]] = []
        for i in range(n):
            t = i / (n - 1)
            pts.append((self.x1 + t * (self.x2 - self.x1), self.y1 + t * (self.y2 - self.y1)))
        return pts


@dataclass
class PointObstacle:
    x: float
    y: float
    radius: float
    kind: str = "point"


@dataclass
class ObstacleSet:
    segments: list[LineSegment] = field(default_factory=list)
    points: list[PointObstacle] = field(default_factory=list)

    def add_segment(self, x1: float, y1: float, x2: float, y2: float, *, kind: str = "line") -> None:
        if math.isclose(x1, x2) and math.isclose(y1, y2):
            return
        self.segments.append(LineSegment(x1, y1, x2, y2, kind=kind))

    def add_polyline(self, points: list[tuple[float, float]], *, kind: str = "line") -> None:
        for i in range(len(points) - 1):
            x1, y1 = points[i]
            x2, y2 = points[i + 1]
            self.add_segment(x1, y1, x2, y2, kind=kind)

    def add_point(self, x: float, y: float, radius: float, *, kind: str = "point") -> None:
        self.points.append(PointObstacle(x, y, radius, kind=kind))

    def add_circle(self, cx: float, cy: float, radius: float, *, samples: int = 48, kind: str = "circle") -> None:
        if radius <= 0:
            return
        pts: list[tuple[float, float]] = []
        for i in range(samples):
            theta = 2 * math.pi * i / samples
            pts.append((cx + radius * math.cos(theta), cy + radius * math.sin(theta)))
        pts.append(pts[0])
        self.add_polyline(pts, kind=kind)

    def add_arc(
        self,
        cx: float,
        cy: float,
        radius: float,
        theta1_deg: float,
        theta2_deg: float,
        *,
        samples: int = 24,
        kind: str = "arc",
    ) -> None:
        if radius <= 0:
            return
        t1 = math.radians(theta1_deg)
        t2 = math.radians(theta2_deg)
        if t2 < t1:
            t1, t2 = t2, t1
        if samples < 2:
            samples = 2
        pts: list[tuple[float, float]] = []
        for i in range(samples):
            t = t1 + (t2 - t1) * i / (samples - 1)
            pts.append((cx + radius * math.cos(t), cy + radius * math.sin(t)))
        self.add_polyline(pts, kind=kind)

    def merge(self, other: ObstacleSet) -> None:
        self.segments.extend(other.segments)
        self.points.extend(other.points)
