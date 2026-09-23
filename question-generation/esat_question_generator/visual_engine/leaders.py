"""Post-placement gray leader lines from object anchors to label text."""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any

from matplotlib.axes import Axes
from matplotlib.figure import Figure

from .collision.bbox import text_bbox_data
from .collision.loop import LabelArtist
from .style import ExamStyle


@dataclass(frozen=True)
class LeaderBinding:
    label_id: str
    object_xy: tuple[float, float]
    line_index: int


def _dist(a: tuple[float, float], b: tuple[float, float]) -> float:
    return math.hypot(a[0] - b[0], a[1] - b[1])


def _line_endpoints(obj: dict[str, Any]) -> tuple[tuple[float, float], tuple[float, float]] | None:
    if str(obj.get("type") or "").lower() != "line":
        return None
    try:
        start = (float(obj["start"][0]), float(obj["start"][1]))
        end = (float(obj["end"][0]), float(obj["end"][1]))
    except (KeyError, TypeError, ValueError, IndexError):
        return None
    return start, end


def extract_leader_bindings(
    objects: list[dict[str, Any]],
    label_specs: list[dict[str, Any]],
    *,
    span: float,
) -> list[LeaderBinding]:
    """Match short callout lines to nearby label anchors.

    Designer specs often emit a ``line`` whose one end sits near the label
    anchor and the other on the object. Those must be redrawn after collision
    placement so they still meet the text.
    """
    # Must be close to the label anchor (not merely somewhere in the figure).
    thresh = min(max(0.06 * max(span, 1e-6), 0.35), 0.75)
    max_leader_len = min(0.22 * max(span, 1e-6), 2.8)

    anchors: list[tuple[str, tuple[float, float]]] = []
    for lbl in label_specs:
        try:
            aid = str(lbl.get("id") or "")
            ax_ = float(lbl["anchor"][0])
            ay_ = float(lbl["anchor"][1])
        except (KeyError, TypeError, ValueError, IndexError):
            continue
        if not aid:
            continue
        anchors.append((aid, (ax_, ay_)))

    # label_id -> (score, binding)  lower score is better
    best_for_label: dict[str, tuple[float, LeaderBinding]] = {}
    used_lines: set[int] = set()

    for idx, obj in enumerate(objects):
        role = str(obj.get("role") or obj.get("kind") or "").strip().lower()
        style_name = str(obj.get("style") or "").strip().lower()
        explicit = role in {"leader", "callout", "label_leader"} or style_name == "leader"

        ends = _line_endpoints(obj)
        if ends is None:
            continue
        start, end = ends
        length = _dist(start, end)
        if not explicit and length > max_leader_len:
            continue
        if length < 1e-6:
            continue

        for lid, anchor in anchors:
            d0 = _dist(start, anchor)
            d1 = _dist(end, anchor)
            near = min(d0, d1)
            far = max(d0, d1)
            if not explicit and near > thresh:
                continue
            # Near end hugs the label; far end is the object attachment.
            if far < near + 0.05 and not explicit:
                continue
            if d0 <= d1:
                obj_xy = end
            else:
                obj_xy = start
            # Prefer closer anchor match, then shorter callouts.
            score = near + 0.15 * length
            cand = LeaderBinding(label_id=lid, object_xy=obj_xy, line_index=idx)
            prev = best_for_label.get(lid)
            if prev is None or score < prev[0]:
                best_for_label[lid] = (score, cand)

    # Resolve line conflicts: one line can only bind one label.
    ranked = sorted(best_for_label.values(), key=lambda item: item[0])
    bindings: list[LeaderBinding] = []
    claimed_labels: set[str] = set()
    for _score, cand in ranked:
        if cand.line_index in used_lines or cand.label_id in claimed_labels:
            continue
        used_lines.add(cand.line_index)
        claimed_labels.add(cand.label_id)
        bindings.append(cand)
    return bindings


def strip_leader_line_objects(
    objects: list[dict[str, Any]],
    bindings: list[LeaderBinding],
) -> list[dict[str, Any]]:
    drop = {b.line_index for b in bindings}
    return [obj for i, obj in enumerate(objects) if i not in drop]


def _ray_rect_hit(
    origin: tuple[float, float],
    target: tuple[float, float],
    rect: tuple[float, float, float, float],
) -> tuple[float, float]:
    """First intersection of origin→target with the text bbox (near edge)."""
    x0, y0 = origin
    x1, y1 = target
    dx, dy = x1 - x0, y1 - y0
    if abs(dx) < 1e-12 and abs(dy) < 1e-12:
        return target
    xmin, ymin, xmax, ymax = rect
    hits: list[tuple[float, float, float]] = []
    # Parametric x = x0 + t dx, y = y0 + t dy, t in (0, 1]
    for edge_x in (xmin, xmax):
        if abs(dx) < 1e-12:
            continue
        t = (edge_x - x0) / dx
        if 0.0 < t <= 1.0:
            y = y0 + t * dy
            if ymin - 1e-9 <= y <= ymax + 1e-9:
                hits.append((t, edge_x, y))
    for edge_y in (ymin, ymax):
        if abs(dy) < 1e-12:
            continue
        t = (edge_y - y0) / dy
        if 0.0 < t <= 1.0:
            x = x0 + t * dx
            if xmin - 1e-9 <= x <= xmax + 1e-9:
                hits.append((t, x, edge_y))
    if not hits:
        return target
    hits.sort(key=lambda h: h[0])
    return hits[0][1], hits[0][2]


def _should_draw_leader(lbl: LabelArtist) -> bool:
    if lbl.role in {"caption", "axis"}:
        return False
    text = (lbl.text or "").strip()
    # Single-letter vertex marks usually sit tight to the point with no callout.
    if len(text) <= 1:
        return False
    return True


def draw_label_leaders(
    fig: Figure,
    ax: Axes,
    labels: list[LabelArtist],
    bindings: list[LeaderBinding],
    style: ExamStyle,
) -> None:
    if not bindings:
        return
    by_id = {lbl.label_id: lbl for lbl in labels}
    fig.canvas.draw()
    renderer = fig.canvas.get_renderer()
    color = getattr(style, "leader_stroke", None) or "#888888"
    lw = max(float(style.stroke_width) * 0.7, 0.7)

    for binding in bindings:
        lbl = by_id.get(binding.label_id)
        if lbl is None or not _should_draw_leader(lbl):
            continue
        ox, oy = binding.object_xy
        # Fallback attachment: ha/va already put get_position on the near edge.
        tx, ty = float(lbl.artist.get_position()[0]), float(lbl.artist.get_position()[1])
        try:
            rect = text_bbox_data(lbl.artist, renderer)
            cx = 0.5 * (rect[0] + rect[2])
            cy = 0.5 * (rect[1] + rect[3])
            tx, ty = _ray_rect_hit((ox, oy), (cx, cy), rect)
        except Exception:
            pass
        if _dist((ox, oy), (tx, ty)) < 1e-3:
            continue
        ax.plot(
            [ox, tx],
            [oy, ty],
            color=color,
            linewidth=lw,
            solid_capstyle="round",
            zorder=3.5,
            clip_on=False,
        )
