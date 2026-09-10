"""Low-level geometry drawing helpers."""

from __future__ import annotations

import math
from typing import TYPE_CHECKING

from matplotlib.patches import Arc, Circle, Polygon, Wedge

from ..style import ExamStyle
from ..collision.obstacles import ObstacleSet
from ..collision.geometry import perpendicular, unit_vector

if TYPE_CHECKING:
    from matplotlib.axes import Axes


def _lw(obj: dict, style: ExamStyle) -> float:
    return float(obj.get("linewidth") or style.stroke_width)


def _stroke_color(obj: dict, style: ExamStyle, *, default: str | None = None) -> str:
    for key in ("edgecolor", "color", "stroke"):
        raw = obj.get(key)
        if raw is not None and str(raw).strip():
            return str(raw).strip()
    return default if default is not None else style.stroke


def _face_color(obj: dict, *, filled: bool, default_fill: str = "#dddddd") -> str:
    if not filled:
        return "none"
    raw = obj.get("facecolor")
    if raw is not None and str(raw).strip():
        return str(raw).strip()
    return default_fill


def draw_polygon(ax: Axes, obj: dict, style: ExamStyle, obstacles: ObstacleSet) -> None:
    points = [tuple(float(v) for v in pt[:2]) for pt in obj["points"]]
    fill = bool(obj.get("fill", False))
    patch = Polygon(
        points,
        closed=True,
        fill=fill,
        facecolor=_face_color(obj, filled=fill),
        edgecolor=_stroke_color(obj, style),
        linewidth=_lw(obj, style),
    )
    ax.add_patch(patch)
    obstacles.add_polyline(points + [points[0]], kind="polygon")
    for pt in points:
        obstacles.add_point(pt[0], pt[1], style.vertex_marker_radius_pt / 200.0, kind="vertex")


def draw_line(ax: Axes, obj: dict, style: ExamStyle, obstacles: ObstacleSet) -> None:
    x1, y1 = float(obj["start"][0]), float(obj["start"][1])
    x2, y2 = float(obj["end"][0]), float(obj["end"][1])
    ls_name = str(obj.get("style") or "solid").lower()
    role = str(obj.get("role") or obj.get("kind") or "").strip().lower()
    is_leader = ls_name == "leader" or role in {"leader", "callout", "label_leader"}
    color = _stroke_color(obj, style, default=style.leader_stroke if is_leader else style.stroke)
    lw = _lw(obj, style)
    if is_leader:
        lw = max(lw * 0.7, 0.7)
    if ls_name == "dashed":
        ax.plot(
            [x1, x2],
            [y1, y2],
            color=color,
            linewidth=lw,
            linestyle="--",
            dashes=style.dash_pattern,
        )
    else:
        ax.plot([x1, x2], [y1, y2], color=color, linewidth=lw, linestyle="solid")
    if not is_leader:
        obstacles.add_segment(x1, y1, x2, y2, kind="line")
    else:
        obstacles.add_segment(x1, y1, x2, y2, kind="dimension")


def draw_circle(ax: Axes, obj: dict, style: ExamStyle, obstacles: ObstacleSet) -> None:
    cx, cy = float(obj["center"][0]), float(obj["center"][1])
    radius = float(obj["radius"])
    fill = bool(obj.get("fill", False))
    patch = Circle(
        (cx, cy),
        radius,
        fill=fill,
        facecolor=_face_color(obj, filled=fill),
        edgecolor=_stroke_color(obj, style),
        linewidth=_lw(obj, style),
    )
    ax.add_patch(patch)
    obstacles.add_circle(cx, cy, radius, kind="circle")


def draw_sector(ax: Axes, obj: dict, style: ExamStyle, obstacles: ObstacleSet) -> None:
    """Draw a circular sector (wedge) from theta1 to theta2 in degrees."""
    cx, cy = float(obj["center"][0]), float(obj["center"][1])
    radius = float(obj["radius"])
    theta1 = float(obj["theta1"])
    theta2 = float(obj["theta2"])
    fill = bool(obj.get("fill", True))
    patch = Wedge(
        (cx, cy),
        radius,
        theta1,
        theta2,
        facecolor=_face_color(obj, filled=fill, default_fill="#dddddd"),
        edgecolor=_stroke_color(obj, style),
        linewidth=_lw(obj, style),
    )
    ax.add_patch(patch)
    obstacles.add_arc(cx, cy, radius, theta1, theta2, kind="sector")
    # Radial edges
    for theta in (theta1, theta2):
        rad = math.radians(theta)
        obstacles.add_segment(
            cx,
            cy,
            cx + radius * math.cos(rad),
            cy + radius * math.sin(rad),
            kind="sector",
        )


def draw_arc(ax: Axes, obj: dict, style: ExamStyle, obstacles: ObstacleSet) -> None:
    cx, cy = float(obj["center"][0]), float(obj["center"][1])
    radius = float(obj["radius"])
    theta1 = float(obj["theta1"])
    theta2 = float(obj["theta2"])
    patch = Arc(
        (cx, cy),
        width=2 * radius,
        height=2 * radius,
        angle=0,
        theta1=theta1,
        theta2=theta2,
        color=_stroke_color(obj, style),
        linewidth=_lw(obj, style),
    )
    ax.add_patch(patch)
    obstacles.add_arc(cx, cy, radius, theta1, theta2, kind="arc")


def draw_point(ax: Axes, obj: dict, style: ExamStyle, obstacles: ObstacleSet) -> None:
    x, y = float(obj["at"][0]), float(obj["at"][1])
    marker_size = float(obj.get("size") or 4.0)
    ax.plot([x], [y], marker="o", color=style.stroke, markersize=marker_size, linestyle="none")
    obstacles.add_point(x, y, marker_size / 150.0, kind="point")


def draw_arrow(ax: Axes, obj: dict, style: ExamStyle, obstacles: ObstacleSet) -> None:
    x1, y1 = float(obj["start"][0]), float(obj["start"][1])
    x2, y2 = float(obj["end"][0]), float(obj["end"][1])
    ax.annotate(
        "",
        xy=(x2, y2),
        xytext=(x1, y1),
        arrowprops=dict(arrowstyle="->", color=style.stroke, lw=_lw(obj, style)),
    )
    obstacles.add_segment(x1, y1, x2, y2, kind="arrow")


def draw_right_angle_marker(ax: Axes, obj: dict, style: ExamStyle, obstacles: ObstacleSet, cs_span: float) -> None:
    vx, vy = float(obj["vertex"][0]), float(obj["vertex"][1])
    l1x, l1y = float(obj["leg1"][0]), float(obj["leg1"][1])
    l2x, l2y = float(obj["leg2"][0]), float(obj["leg2"][1])
    u1 = unit_vector(vx, vy, l1x, l1y)
    u2 = unit_vector(vx, vy, l2x, l2y)
    size = cs_span * style.right_angle_size_factor
    p1 = (vx + u1[0] * size, vy + u1[1] * size)
    p2 = (vx + u1[0] * size + u2[0] * size, vy + u1[1] * size + u2[1] * size)
    p3 = (vx + u2[0] * size, vy + u2[1] * size)
    xs = [p1[0], p2[0], p3[0]]
    ys = [p1[1], p2[1], p3[1]]
    ax.plot(xs, ys, color=_stroke_color(obj, style), linewidth=_lw(obj, style))
    obstacles.add_polyline([p1, p2, p3], kind="right_angle")


def draw_angle_arc(ax: Axes, obj: dict, style: ExamStyle, obstacles: ObstacleSet, cs_span: float) -> None:
    vx, vy = float(obj["vertex"][0]), float(obj["vertex"][1])
    p1x, p1y = float(obj["point1"][0]), float(obj["point1"][1])
    p2x, p2y = float(obj["point2"][0]), float(obj["point2"][1])
    radius = float(obj.get("radius") or cs_span * style.angle_arc_radius_factor)
    a1 = math.degrees(math.atan2(p1y - vy, p1x - vx))
    a2 = math.degrees(math.atan2(p2y - vy, p2x - vx))
    patch = Arc(
        (vx, vy),
        width=2 * radius,
        height=2 * radius,
        angle=0,
        theta1=min(a1, a2),
        theta2=max(a1, a2),
        color=_stroke_color(obj, style),
        linewidth=_lw(obj, style),
    )
    ax.add_patch(patch)
    obstacles.add_arc(vx, vy, radius, min(a1, a2), max(a1, a2), kind="angle_arc")


def draw_dimension_line(ax: Axes, obj: dict, style: ExamStyle, obstacles: ObstacleSet, cs_span: float) -> None:
    """Draw an exam-style dimension callout with arrowheads and gapped extensions.

    Extension lines stop short of the measured edge so they do not form a closed
    rectangle with the object boundary. End ticks are omitted in favour of arrows.
    """
    x1, y1 = float(obj["start"][0]), float(obj["start"][1])
    x2, y2 = float(obj["end"][0]), float(obj["end"][1])
    offset = float(obj.get("offset") or cs_span * 0.08)
    direction = str(obj.get("direction") or "auto").lower()

    ux, uy = unit_vector(x1, y1, x2, y2)
    nx, ny = perpendicular((ux, uy))
    if direction == "below":
        nx, ny = -nx, -ny
    elif direction == "left" and nx > 0:
        nx, ny = -nx, -ny
    elif direction == "right" and nx < 0:
        nx, ny = -nx, -ny

    # Gap between object edge and start of extension (avoids "shelf" / closed boxes).
    gap = max(cs_span * 0.012, abs(offset) * 0.15)
    sx, sy = x1 + nx * offset, y1 + ny * offset
    ex, ey = x2 + nx * offset, y2 + ny * offset
    e1x, e1y = x1 + nx * gap, y1 + ny * gap
    e2x, e2y = x2 + nx * gap, y2 + ny * gap

    lw = max(_lw(obj, style) * 0.9, 0.8)
    ext_lw = max(lw * 0.7, 0.6)
    color = _stroke_color(obj, style)

    ax.annotate(
        "",
        xy=(ex, ey),
        xytext=(sx, sy),
        arrowprops=dict(
            arrowstyle="<->",
            color=color,
            lw=lw,
            shrinkA=0,
            shrinkB=0,
        ),
        annotation_clip=False,
    )
    ax.plot([e1x, sx], [e1y, sy], color=color, linewidth=ext_lw, solid_capstyle="butt")
    ax.plot([e2x, ex], [e2y, ey], color=color, linewidth=ext_lw, solid_capstyle="butt")

    obstacles.add_segment(sx, sy, ex, ey, kind="dimension")
    obstacles.add_segment(e1x, e1y, sx, sy, kind="dimension_ext")
    obstacles.add_segment(e2x, e2y, ex, ey, kind="dimension_ext")


def draw_equal_length_ticks(ax: Axes, obj: dict, style: ExamStyle, obstacles: ObstacleSet, cs_span: float) -> None:
    tick_len = cs_span * style.equal_tick_length_factor
    for key_start, key_end in (("seg1_start", "seg1_end"), ("seg2_start", "seg2_end")):
        x1, y1 = float(obj[key_start][0]), float(obj[key_start][1])
        x2, y2 = float(obj[key_end][0]), float(obj[key_end][1])
        mx, my = 0.5 * (x1 + x2), 0.5 * (y1 + y2)
        ux, uy = unit_vector(x1, y1, x2, y2)
        px, py = perpendicular((ux, uy))
        ax.plot(
            [mx - px * tick_len, mx + px * tick_len],
            [my - py * tick_len, my + py * tick_len],
            color=style.stroke,
            linewidth=_lw(obj, style),
        )
        obstacles.add_segment(mx - px * tick_len, my - py * tick_len, mx + px * tick_len, my + py * tick_len, kind="equal_tick")
