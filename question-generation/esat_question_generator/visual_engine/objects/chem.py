"""Simple displayed chemical structures (atoms + bonds)."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from ..style import ExamStyle
from ..collision.obstacles import ObstacleSet

if TYPE_CHECKING:
    from matplotlib.axes import Axes


def _atom_map(obj: dict[str, Any]) -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    for atom in obj.get("atoms") or []:
        if not isinstance(atom, dict):
            continue
        aid = str(atom.get("id") or "").strip()
        if not aid:
            continue
        out[aid] = atom
    return out


def _xy(atom: dict[str, Any]) -> tuple[float, float]:
    return float(atom.get("x") or 0), float(atom.get("y") or 0)


def _draw_bond(ax: Axes, x1: float, y1: float, x2: float, y2: float, order: int, style: ExamStyle, dashed: bool) -> None:
    import math

    lw = style.stroke_width
    dx, dy = x2 - x1, y2 - y1
    length = math.hypot(dx, dy) or 1.0
    nx, ny = -dy / length, dx / length
    offset = 0.06
    orders = max(1, min(int(order or 1), 3))
    shifts = [0.0] if orders == 1 else ([-offset / 2, offset / 2] if orders == 2 else [-offset, 0.0, offset])
    kwargs: dict[str, Any] = {
        "color": style.stroke,
        "linewidth": lw,
        "linestyle": "--" if dashed else "solid",
    }
    if dashed:
        kwargs["dashes"] = (2.0, 1.6)
    for shift in shifts:
        ax.plot(
            [x1 + nx * shift, x2 + nx * shift],
            [y1 + ny * shift, y2 + ny * shift],
            **kwargs,
        )


def draw_chem_structure(ax: Axes, obj: dict[str, Any], style: ExamStyle, obstacles: ObstacleSet) -> None:
    atoms = _atom_map(obj)
    for bond in obj.get("bonds") or []:
        if not isinstance(bond, dict):
            continue
        a = atoms.get(str(bond.get("from") or ""))
        b = atoms.get(str(bond.get("to") or ""))
        if not a or not b:
            continue
        x1, y1 = _xy(a)
        x2, y2 = _xy(b)
        dashed = str(bond.get("style") or "").lower() in {"dashed", "continuation"}
        _draw_bond(ax, x1, y1, x2, y2, int(bond.get("order") or 1), style, dashed)
        obstacles.add_segment(x1, y1, x2, y2, kind="bond")
    for atom in atoms.values():
        x, y = _xy(atom)
        label = str(atom.get("label") or "").strip()
        if not label:
            continue
        ax.text(
            x,
            y,
            label,
            color=style.stroke,
            fontsize=style.font_size,
            ha="center",
            va="center",
            zorder=5,
        )
        obstacles.add_point(x, y, 0.12, kind="atom")
