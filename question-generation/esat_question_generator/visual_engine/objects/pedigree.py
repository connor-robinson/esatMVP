"""Deterministic pedigree layout and drawing."""

from __future__ import annotations

from collections import defaultdict
from typing import TYPE_CHECKING, Any

from matplotlib.patches import Circle, Polygon, Rectangle

from ..style import ExamStyle
from ..collision.obstacles import ObstacleSet

if TYPE_CHECKING:
    from matplotlib.axes import Axes


def _people(obj: dict[str, Any]) -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    for person in obj.get("people") or []:
        if not isinstance(person, dict):
            continue
        pid = str(person.get("id") or person.get("label") or "").strip()
        if not pid:
            continue
        sex = str(person.get("sex") or person.get("gender") or "unknown").strip().lower()
        if sex in {"m", "male", "square"}:
            sex = "male"
        elif sex in {"f", "female", "circle"}:
            sex = "female"
        else:
            sex = "unknown"
        gen = person.get("generation")
        try:
            generation = int(gen)
        except (TypeError, ValueError):
            generation = 1
        out[pid] = {
            "id": pid,
            "sex": sex,
            "affected": person.get("affected"),
            "generation": generation,
            "label": str(person.get("label") or pid),
        }
    return out


def layout_pedigree(obj: dict[str, Any]) -> dict[str, tuple[float, float]]:
    """Place people by generation. Gemini supplies relationships, not pixels."""
    people = _people(obj)
    if not people:
        return {}
    unions = []
    for union in obj.get("unions") or []:
        if not isinstance(union, dict):
            continue
        a, b = str(union.get("a") or ""), str(union.get("b") or "")
        if a in people and b in people:
            unions.append((a, b))
    children_of: dict[tuple[str, str], list[str]] = {}
    for item in obj.get("children") or []:
        if not isinstance(item, dict):
            continue
        parents = item.get("parents") or []
        offspring = item.get("offspring") or item.get("children") or []
        if not isinstance(parents, list) or len(parents) < 2:
            continue
        key = (str(parents[0]), str(parents[1]))
        children_of[key] = [str(c) for c in offspring if str(c) in people]

    by_gen: dict[int, list[str]] = defaultdict(list)
    for pid, person in people.items():
        by_gen[int(person["generation"])].append(pid)
    coords: dict[str, tuple[float, float]] = {}
    x_gap, y_gap = 1.6, 1.8
    for gen in sorted(by_gen):
        ids = by_gen[gen]
        placed: set[str] = set()
        ordered: list[str] = []
        for a, b in unions:
            if people[a]["generation"] == gen and people[b]["generation"] == gen:
                if a not in placed:
                    ordered.append(a)
                    placed.add(a)
                if b not in placed:
                    ordered.append(b)
                    placed.add(b)
        for pid in ids:
            if pid not in placed:
                ordered.append(pid)
        y = - (gen - 1) * y_gap
        for i, pid in enumerate(ordered):
            coords[pid] = (i * x_gap, y)
        # Recentre children under their parents when possible.
        for (a, b), kids in children_of.items():
            if a not in coords or b not in coords:
                continue
            mid_x = (coords[a][0] + coords[b][0]) / 2
            kid_ids = [k for k in kids if k in coords and people[k]["generation"] != people[a]["generation"]]
            if not kid_ids:
                continue
            span = (len(kid_ids) - 1) * x_gap
            start = mid_x - span / 2
            y_child = coords[kid_ids[0]][1]
            for i, kid in enumerate(kid_ids):
                coords[kid] = (start + i * x_gap, y_child)
    return coords


def draw_pedigree(ax: Axes, obj: dict[str, Any], style: ExamStyle, obstacles: ObstacleSet) -> None:
    people = _people(obj)
    coords = layout_pedigree(obj)
    if not coords:
        return
    size = 0.28
    lw = style.stroke_width

    def _fill(person: dict[str, Any]) -> bool:
        return person.get("affected") is True

    # Union and offspring bars.
    for union in obj.get("unions") or []:
        if not isinstance(union, dict):
            continue
        a, b = str(union.get("a") or ""), str(union.get("b") or "")
        if a not in coords or b not in coords:
            continue
        x1, y1 = coords[a]
        x2, y2 = coords[b]
        y = (y1 + y2) / 2
        ax.plot([x1 + size, x2 - size] if x2 > x1 else [x2 + size, x1 - size], [y, y], color=style.stroke, linewidth=lw)
    for item in obj.get("children") or []:
        if not isinstance(item, dict):
            continue
        parents = item.get("parents") or []
        offspring = [str(c) for c in (item.get("offspring") or item.get("children") or []) if str(c) in coords]
        if not isinstance(parents, list) or len(parents) < 2 or not offspring:
            continue
        a, b = str(parents[0]), str(parents[1])
        if a not in coords or b not in coords:
            continue
        mx = (coords[a][0] + coords[b][0]) / 2
        my = (coords[a][1] + coords[b][1]) / 2
        drop = my - 0.55
        ax.plot([mx, mx], [my, drop], color=style.stroke, linewidth=lw)
        xs = [coords[c][0] for c in offspring]
        ax.plot([min(xs), max(xs)], [drop, drop], color=style.stroke, linewidth=lw)
        for child in offspring:
            cx, cy = coords[child]
            ax.plot([cx, cx], [drop, cy + size], color=style.stroke, linewidth=lw)

    for pid, person in people.items():
        if pid not in coords:
            continue
        x, y = coords[pid]
        filled = _fill(person)
        facecolor = style.stroke if filled else "white"
        if person["sex"] == "male":
            patch = Rectangle((x - size, y - size), 2 * size, 2 * size, fill=True, facecolor=facecolor, edgecolor=style.stroke, linewidth=lw)
        elif person["sex"] == "female":
            patch = Circle((x, y), size, fill=True, facecolor=facecolor, edgecolor=style.stroke, linewidth=lw)
        else:
            patch = Polygon([(x, y + size), (x + size, y), (x, y - size), (x - size, y)], closed=True, fill=True, facecolor=facecolor, edgecolor=style.stroke, linewidth=lw)
        ax.add_patch(patch)
        obstacles.add_point(x, y, size, kind="person")
        if person["sex"] == "unknown":
            ax.text(x, y, "?", ha="center", va="center", fontsize=style.font_size * 0.9, color="white" if filled else style.stroke, zorder=6)
        ax.text(x, y - size - 0.18, person["label"], ha="center", va="top", fontsize=style.font_size * 0.85, color=style.stroke)

    if obj.get("key") is not False:
        min_x = min(pt[0] for pt in coords.values())
        min_y = min(pt[1] for pt in coords.values()) - 1.1
        ax.text(min_x, min_y, "filled = affected", ha="left", va="top", fontsize=style.font_size * 0.75, color=style.stroke)
