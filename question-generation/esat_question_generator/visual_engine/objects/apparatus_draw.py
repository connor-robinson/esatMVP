"""Draw apparatus from composed component plans onto a Matplotlib axes."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from ..apparatus import compose_svg, default_layout_plan
from ..collision.obstacles import ObstacleSet
from ..style import ExamStyle

if TYPE_CHECKING:
    from matplotlib.axes import Axes


def draw_apparatus(ax: Axes, obj: dict[str, Any], style: ExamStyle, obstacles: ObstacleSet) -> None:
    """Draw reusable lab pieces. AI chooses components; this draws them."""
    import matplotlib.patches as patches

    components = default_layout_plan(obj)
    width = float(obj.get("canvas_width") or 420)
    height = float(obj.get("canvas_height") or 300)
    ax.set_xlim(0, width)
    ax.set_ylim(height, 0)
    ax.set_aspect("equal")
    stroke = style.stroke
    lw = style.stroke_width

    for raw in components:
        kind = str(raw.get("type") or "").lower()
        x = float(raw.get("x") or 0)
        y = float(raw.get("y") or 0)
        w = float(raw.get("w") or raw.get("width") or 60)
        h = float(raw.get("h") or raw.get("height") or 80)
        if kind == "beaker":
            lip = h * 0.08
            verts = [
                (x + w * 0.08, y + lip),
                (x + w * 0.08, y + h),
                (x + w * 0.92, y + h),
                (x + w * 0.92, y + lip),
            ]
            ax.add_patch(patches.Polygon(verts, fill=False, edgecolor=stroke, linewidth=lw))
            ax.plot([x, x + w], [y + lip, y + lip], color=stroke, linewidth=lw)
            ax.plot(
                [x + w * 0.2, x + w * 0.8],
                [y + h * 0.55, y + h * 0.55],
                color=stroke,
                linewidth=lw * 0.8,
                linestyle="--",
            )
            obstacles.add_segment(x + w * 0.08, y + lip, x + w * 0.08, y + h, kind="apparatus")
        elif kind == "conical_flask":
            neck_w = w * 0.22
            neck_h = h * 0.28
            verts = [
                (x + (w - neck_w) / 2, y),
                (x + (w + neck_w) / 2, y),
                (x + (w + neck_w) / 2, y + neck_h),
                (x + w, y + h),
                (x, y + h),
                (x + (w - neck_w) / 2, y + neck_h),
            ]
            ax.add_patch(patches.Polygon(verts, fill=False, edgecolor=stroke, linewidth=lw))
        elif kind == "test_tube":
            ax.plot([x, x], [y, y + h - w / 2], color=stroke, linewidth=lw)
            ax.plot([x + w, x + w], [y, y + h - w / 2], color=stroke, linewidth=lw)
            ax.add_patch(
                patches.Arc(
                    (x + w / 2, y + h - w / 2),
                    w,
                    w,
                    theta1=0,
                    theta2=180,
                    edgecolor=stroke,
                    linewidth=lw,
                    fill=False,
                )
            )
        elif kind == "gas_jar":
            ax.add_patch(
                patches.FancyBboxPatch(
                    (x, y),
                    w,
                    h,
                    boxstyle="round,pad=0.5",
                    fill=False,
                    edgecolor=stroke,
                    linewidth=lw,
                )
            )
        elif kind == "delivery_tube":
            x2 = float(raw.get("x2") or x + w)
            y2 = float(raw.get("y2") or y)
            ax.plot([x, x2, x2], [y, y, y2], color=stroke, linewidth=lw)
            obstacles.add_segment(x, y, x2, y, kind="apparatus")
        elif kind == "bunsen":
            ax.add_patch(
                patches.Rectangle(
                    (x + w * 0.35, y + h * 0.35),
                    w * 0.3,
                    h * 0.65,
                    fill=False,
                    edgecolor=stroke,
                    linewidth=lw,
                )
            )
            flame = [
                (x + w * 0.5, y + h * 0.35),
                (x + w * 0.35, y + h * 0.05),
                (x + w * 0.65, y + h * 0.05),
            ]
            ax.add_patch(patches.Polygon(flame, fill=False, edgecolor=stroke, linewidth=lw * 0.9))
        elif kind == "stand":
            ax.plot([x + w * 0.2, x + w * 0.8], [y + h, y + h], color=stroke, linewidth=lw)
            ax.plot([x + w * 0.5, x + w * 0.5], [y, y + h], color=stroke, linewidth=lw)
        elif kind == "label":
            ax.text(
                x,
                y,
                str(raw.get("label") or ""),
                color=stroke,
                fontsize=style.font_size,
                fontfamily=style.font_family,
                ha="left",
                va="center",
            )
        label = str(raw.get("label") or "").strip()
        if label and kind != "label":
            ax.text(
                x + w / 2,
                y + h + 12,
                label,
                color=stroke,
                fontsize=max(style.font_size - 1, 8),
                fontfamily=style.font_family,
                ha="center",
                va="top",
            )


def apparatus_svg_string(obj: dict[str, Any]) -> str:
    components = default_layout_plan(obj)
    return compose_svg(
        components,
        width=float(obj.get("canvas_width") or 420),
        height=float(obj.get("canvas_height") or 300),
        title=str(obj.get("title") or ""),
    )
