"""Object drawing dispatch."""

from __future__ import annotations

from typing import TYPE_CHECKING

from ..collision.obstacles import ObstacleSet
from ..schema import VisualSpec
from ..style import ExamStyle
from .geometry import (
    draw_angle_arc,
    draw_arrow,
    draw_arc,
    draw_circle,
    draw_dimension_line,
    draw_equal_length_ticks,
    draw_line,
    draw_point,
    draw_polygon,
    draw_right_angle_marker,
)
from .graph import draw_axes, draw_function

if TYPE_CHECKING:
    from matplotlib.axes import Axes


def draw_objects(ax: Axes, spec: VisualSpec, style: ExamStyle, obstacles: ObstacleSet) -> None:
    cs = spec.coordinate_system
    span = max(cs.x_max - cs.x_min, cs.y_max - cs.y_min)

    if cs.show_axes and not any(str(o.get("type")) == "axes" for o in spec.objects):
        draw_axes(ax, {"x_label": "x", "y_label": "y"}, style, cs, obstacles)

    for obj in spec.objects:
        obj_type = str(obj.get("type") or "").lower()
        if obj_type == "polygon":
            draw_polygon(ax, obj, style, obstacles)
        elif obj_type == "line":
            draw_line(ax, obj, style, obstacles)
        elif obj_type == "circle":
            draw_circle(ax, obj, style, obstacles)
        elif obj_type == "arc":
            draw_arc(ax, obj, style, obstacles)
        elif obj_type == "point":
            draw_point(ax, obj, style, obstacles)
        elif obj_type == "arrow":
            draw_arrow(ax, obj, style, obstacles)
        elif obj_type == "right_angle_marker":
            draw_right_angle_marker(ax, obj, style, obstacles, span)
        elif obj_type == "angle_arc":
            draw_angle_arc(ax, obj, style, obstacles, span)
        elif obj_type == "dimension_line":
            draw_dimension_line(ax, obj, style, obstacles, span)
        elif obj_type == "equal_length_ticks":
            draw_equal_length_ticks(ax, obj, style, obstacles, span)
        elif obj_type == "function":
            draw_function(ax, obj, style, obstacles, y_min=cs.y_min, y_max=cs.y_max)
        elif obj_type == "axes":
            draw_axes(ax, obj, style, cs, obstacles)
