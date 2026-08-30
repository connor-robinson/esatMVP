"""Bounding-box extraction from Matplotlib text artists."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from matplotlib.text import Text


def text_bbox_data(text_artist: Text, renderer) -> tuple[float, float, float, float]:
    bbox = text_artist.get_window_extent(renderer=renderer)
    ax = text_artist.axes
    if ax is None:
        raise RuntimeError("text artist has no axes")
    inv = ax.transData.inverted()
    (x0, y0) = inv.transform((bbox.x0, bbox.y0))
    (x1, y1) = inv.transform((bbox.x1, bbox.y1))
    xmin, xmax = sorted((x0, x1))
    ymin, ymax = sorted((y0, y1))
    return xmin, ymin, xmax, ymax


def pt_to_data(ax, pt: float, axis: str = "y") -> float:
    p0 = ax.transData.transform((0.0, 0.0))
    if axis == "x":
        p1 = ax.transData.transform((1.0, 0.0))
    else:
        p1 = ax.transData.transform((0.0, 1.0))
    px_per_data = abs(p1[0] - p0[0]) if axis == "x" else abs(p1[1] - p0[1])
    if px_per_data <= 1e-12:
        return pt
    return pt / px_per_data
