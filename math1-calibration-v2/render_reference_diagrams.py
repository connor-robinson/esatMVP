#!/usr/bin/env python3
"""Render reference previews for the eight visual questions.

These functions are intentionally deterministic. Cursor should map the semantic
visualSpec objects in questions.json onto the project's existing visual_engine,
using these previews as the visual acceptance target.
"""

from __future__ import annotations

import math
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.patches import Arc, Circle, FancyBboxPatch, Polygon, Rectangle, Wedge


OUT = Path(__file__).resolve().parent / "diagram_previews"
OUT.mkdir(exist_ok=True)

FG = "#1F2937"
SECONDARY = "#64748B"
CONSTRUCTION = "#CBD5E1"
LIGHT = "#F1F5F9"
HIGHLIGHT = "#DCE6F0"
WHITE = "#FFFFFF"

plt.rcParams.update(
    {
        "font.family": "DejaVu Sans",
        "font.size": 14,
        "axes.edgecolor": FG,
        "axes.labelcolor": FG,
        "xtick.color": SECONDARY,
        "ytick.color": SECONDARY,
        "mathtext.fontset": "dejavusans",
    }
)


def new_figure(width: float = 11.5, height: float = 6.8):
    fig, ax = plt.subplots(figsize=(width, height), facecolor=WHITE)
    ax.set_facecolor(WHITE)
    return fig, ax


def finish(fig, ax, filename: str, xlim, ylim, equal: bool = True) -> None:
    ax.set_xlim(*xlim)
    ax.set_ylim(*ylim)
    if equal:
        ax.set_aspect("equal", adjustable="box")
    ax.axis("off")
    fig.savefig(OUT / filename, dpi=240, bbox_inches="tight", pad_inches=0.22, facecolor=WHITE)
    plt.close(fig)


def point(ax, xy, label: str, offset=(0.12, 0.12), marker_size=5.5, zorder=10) -> None:
    ax.plot(*xy, "o", color=FG, markersize=marker_size, zorder=zorder)
    ax.annotate(
        label,
        xy=xy,
        xytext=offset,
        textcoords="offset points" if max(abs(offset[0]), abs(offset[1])) > 3 else "data",
        color=FG,
        fontsize=15,
        fontweight="semibold",
        zorder=zorder + 1,
    )


def segment_tick(ax, p, q, length=0.07, color=FG) -> None:
    p = np.asarray(p, dtype=float)
    q = np.asarray(q, dtype=float)
    midpoint = (p + q) / 2
    direction = q - p
    normal = np.array([-direction[1], direction[0]])
    normal /= np.linalg.norm(normal)
    a, b = midpoint - length * normal, midpoint + length * normal
    ax.plot([a[0], b[0]], [a[1], b[1]], color=color, lw=2.4, solid_capstyle="round", zorder=12)


def dimension(ax, p, q, label: str, label_offset=(0, -0.32), color=SECONDARY) -> None:
    ax.annotate("", xy=q, xytext=p, arrowprops=dict(arrowstyle="|-|", color=color, lw=1.7))
    midpoint = ((p[0] + q[0]) / 2 + label_offset[0], (p[1] + q[1]) / 2 + label_offset[1])
    ax.text(*midpoint, label, ha="center", va="center", color=FG, fontsize=14)


def render_q01() -> None:
    fig, ax = new_figure(9.2, 7.0)
    outer = np.array([[0, 0], [12, 0], [12, 12], [0, 12]])
    inner = np.array([[6, 0], [12, 6], [6, 12], [0, 6]])
    ax.add_patch(Polygon(outer, closed=True, facecolor=LIGHT, edgecolor=FG, lw=3.0, joinstyle="round"))
    ax.add_patch(Polygon(inner, closed=True, facecolor=WHITE, edgecolor=SECONDARY, lw=2.5, joinstyle="round"))
    ax.add_patch(Circle((6, 6), 3 * math.sqrt(2), facecolor=HIGHLIGHT, edgecolor=FG, lw=3.0))
    labels = {
        "A": ((0, 0), (-0.52, -0.42)),
        "B": ((12, 0), (0.22, -0.42)),
        "C": ((12, 12), (0.22, 0.18)),
        "D": ((0, 12), (-0.55, 0.18)),
        "E": ((6, 0), (-0.12, -0.62)),
        "F": ((12, 6), (0.30, -0.06)),
        "G": ((6, 12), (-0.12, 0.34)),
        "H": ((0, 6), (-0.58, -0.06)),
    }
    for label, (xy, delta) in labels.items():
        ax.text(xy[0] + delta[0], xy[1] + delta[1], label, fontsize=15, fontweight="semibold", color=FG)
    for xy in outer:
        ax.plot(*xy, "o", color=FG, ms=4)
    for xy in inner:
        ax.plot(*xy, "o", color=FG, ms=4)
    ax.plot(6, 6, "+", color=SECONDARY, ms=9, mew=1.5)
    dimension(ax, (0, -0.85), (12, -0.85), r"$12\ \mathrm{cm}$", (0, -0.38))
    ax.plot([0, 0], [-1.02, -0.62], color=CONSTRUCTION, lw=1.4)
    ax.plot([12, 12], [-1.02, -0.62], color=CONSTRUCTION, lw=1.4)
    finish(fig, ax, "q01-midpoint-incircle.png", (-1.5, 13.5), (-1.6, 13.25))


def render_q03() -> None:
    fig, ax = new_figure(11.0, 6.8)
    x = np.linspace(0, 8, 600)
    y = x * (8 - x)
    ax.fill_between(x, 0, y, color=LIGHT, zorder=1)
    ax.plot(x, y, color=FG, lw=3.4, solid_capstyle="round", zorder=4)
    ax.annotate("", xy=(8.65, 0), xytext=(-0.45, 0), arrowprops=dict(arrowstyle="->", lw=1.8, color=FG))
    ax.annotate("", xy=(0, 17.0), xytext=(0, -0.7), arrowprops=dict(arrowstyle="->", lw=1.8, color=FG))
    ax.text(8.45, -0.82, r"$x\,/\,\mathrm{m}$", color=FG, ha="right", fontsize=14)
    ax.text(-0.48, 16.55, r"$y\,/\,\mathrm{m}$", color=FG, rotation=90, va="top", fontsize=14)
    ax.plot([-0.15, 8.25], [9, 9], color=SECONDARY, lw=2.7, ls=(0, (7, 5)), zorder=5)
    ax.text(8.30, 9.18, r"$y=9$", color=SECONDARY, ha="left", va="bottom", fontsize=14)
    p = 4 - math.sqrt(7)
    q = 4 + math.sqrt(7)
    ax.plot([p, q], [9, 9], "o", color=FG, ms=7, zorder=8)
    ax.text(p - 0.10, 8.15, r"$P$", ha="right", va="top", fontsize=15, fontweight="semibold", color=FG)
    ax.text(q + 0.10, 8.15, r"$Q$", ha="left", va="top", fontsize=15, fontweight="semibold", color=FG)
    ax.plot(2, 12, "o", color=FG, ms=7, zorder=8)
    ax.annotate(r"$(2,12)$", xy=(2, 12), xytext=(1.0, 13.4), arrowprops=dict(arrowstyle="-", color=SECONDARY, lw=1.3), fontsize=14, color=FG)
    for value in (0, 8):
        ax.plot([value, value], [-0.18, 0.18], color=FG, lw=1.4)
        ax.text(value, -0.58, rf"${value}$", ha="center", va="top", fontsize=13, color=SECONDARY)
    finish(fig, ax, "q03-parabolic-arch.png", (-0.65, 8.85), (-1.05, 17.3), equal=False)


def render_spinner(ax, centre, labels, title) -> None:
    cx, cy = centre
    radius = 2.08
    for index in range(4):
        start = 90 - 90 * (index + 1)
        end = 90 - 90 * index
        fill = LIGHT if index % 2 == 0 else WHITE
        ax.add_patch(Wedge(centre, radius, start, end, facecolor=fill, edgecolor=FG, lw=2.1))
    for angle_deg, label in zip((45, -45, -135, 135), labels):
        angle = math.radians(angle_deg)
        ax.text(cx + 1.23 * math.cos(angle), cy + 1.23 * math.sin(angle), str(label), ha="center", va="center", fontsize=21, color=FG)
    ax.add_patch(Circle(centre, 0.15, facecolor=SECONDARY, edgecolor=FG, lw=1.2, zorder=5))
    ax.add_patch(Polygon([[cx - 0.20, cy + radius + 0.22], [cx + 0.20, cy + radius + 0.22], [cx, cy + radius - 0.10]], facecolor=SECONDARY, edgecolor=FG, lw=1.0))
    ax.text(cx, cy - radius - 0.72, title, ha="center", va="center", fontsize=15, fontweight="semibold", color=FG)


def render_q05() -> None:
    fig, ax = new_figure(11.2, 5.7)
    render_spinner(ax, (3.0, 3.0), [1, 3, 2, 2], "Spinner X")
    render_spinner(ax, (9.0, 3.0), [1, 2, 3, 4], "Spinner Y")
    finish(fig, ax, "q05-paired-spinners.png", (0.15, 11.85), (-0.25, 6.15))


def render_q09() -> None:
    fig, ax = new_figure(10.4, 7.2)
    A = np.array([0.0, 0.0])
    T = np.array([1.0, 0.0])
    B = np.array([0.7660444431, 0.6427876097])
    C = np.array([-0.5, 1.3737387097])
    O = np.array([0.0, 0.7778619134])
    radius = 0.7778619134
    ax.add_patch(Circle(O, radius, facecolor=LIGHT, edgecolor=FG, lw=3.0, zorder=1))
    ax.plot([-0.28, 1.28], [0, 0], color=FG, lw=3.0, solid_capstyle="round", zorder=4)
    ax.plot([A[0], B[0]], [A[1], B[1]], color=FG, lw=3.0, zorder=5)
    ax.plot([B[0], T[0]], [B[1], T[1]], color=FG, lw=2.6, zorder=5)
    ax.plot([A[0], C[0]], [A[1], C[1]], color=SECONDARY, lw=2.0, zorder=3)
    ax.plot([B[0], C[0]], [B[1], C[1]], color=SECONDARY, lw=2.0, zorder=3)
    segment_tick(ax, A, T, 0.036)
    segment_tick(ax, A, B, 0.036)
    ax.add_patch(Arc(T, 0.44, 0.44, theta1=110, theta2=180, color=SECONDARY, lw=2.0, zorder=8))
    label_angle = math.radians(144)
    ax.text(T[0] + 0.34 * math.cos(label_angle), T[1] + 0.34 * math.sin(label_angle), r"$70^\circ$", ha="center", va="center", fontsize=13, color=FG)
    for xy, label, delta in ((A, "A", (-0.10, -0.17)), (B, "B", (0.06, 0.06)), (C, "C", (-0.14, 0.09)), (T, "T", (0.06, -0.16))):
        ax.plot(*xy, "o", color=FG, ms=5, zorder=10)
        ax.text(xy[0] + delta[0], xy[1] + delta[1], label, fontsize=15, fontweight="semibold", color=FG, zorder=11)
    finish(fig, ax, "q09-circle-tangent.png", (-0.95, 1.48), (-0.30, 1.75))


def render_q12() -> None:
    fig, ax = new_figure(12.5, 5.2)
    stages = [
        (1, 0.8, 1.25, 2, 4),
        (2, 6.1, 1.00, 3, 5),
        (3, 12.1, 0.75, 4, 6),
    ]
    spacing = 0.68
    for stage, ox, oy, rows, cols in stages:
        width = (cols - 1) * spacing + 1.10
        height = (rows - 1) * spacing + 1.10
        ax.add_patch(FancyBboxPatch((ox - 0.55, oy - 0.55), width, height, boxstyle="round,pad=0.08,rounding_size=0.15", facecolor=LIGHT, edgecolor=CONSTRUCTION, lw=1.5))
        for row in range(rows):
            for col in range(cols):
                ax.add_patch(Circle((ox + col * spacing, oy + row * spacing), 0.115, facecolor=FG, edgecolor=FG))
        centre_x = ox + (cols - 1) * spacing / 2
        ax.text(centre_x, oy - 1.15, f"Stage {stage}", ha="center", va="top", fontsize=15, fontweight="semibold", color=FG)
    ax.text(17.2, 2.45, "⋯", fontsize=35, color=SECONDARY, ha="center", va="center")
    finish(fig, ax, "q12-growing-light-wall.png", (-0.25, 18.0), (-0.60, 5.4))


def render_q13() -> None:
    fig, ax = new_figure(11.8, 5.3)
    boxes = [
        (0.7, 1.0, 5.0, 3.5, "Box A", [(2.0, 2.65, "G"), (3.05, 2.65, "G"), (4.10, 2.65, "B")]),
        (6.9, 1.0, 5.3, 3.5, "Box B", [(8.05, 2.65, "G"), (9.05, 2.65, "B"), (10.05, 2.65, "B"), (11.05, 2.65, "B")]),
    ]
    for x, y, width, height, title, tokens in boxes:
        ax.add_patch(FancyBboxPatch((x, y), width, height, boxstyle="round,pad=0.08,rounding_size=0.22", facecolor=LIGHT, edgecolor=FG, lw=2.3))
        ax.text(x + width / 2, y + height + 0.38, title, ha="center", va="center", fontsize=16, fontweight="semibold", color=FG)
        for tx, ty, label in tokens:
            fill = WHITE if label == "G" else SECONDARY
            text_color = FG if label == "G" else WHITE
            ax.add_patch(Circle((tx, ty), 0.40, facecolor=fill, edgecolor=FG, lw=2.0, zorder=4))
            ax.text(tx, ty, label, ha="center", va="center", fontsize=15, fontweight="bold", color=text_color, zorder=5)
    ax.text(6.45, 0.30, "G = gold     B = blue", ha="center", va="center", fontsize=13, color=SECONDARY)
    finish(fig, ax, "q13-counter-boxes.png", (0.15, 12.75), (-0.15, 5.25))


def right_angle_marker(ax, vertex, along_a, along_b, size=0.36) -> None:
    v = np.asarray(vertex, dtype=float)
    u1 = np.asarray(along_a, dtype=float)
    u2 = np.asarray(along_b, dtype=float)
    u1 /= np.linalg.norm(u1)
    u2 /= np.linalg.norm(u2)
    p1 = v + size * u1
    corner = p1 + size * u2
    p2 = v + size * u2
    ax.plot([p1[0], corner[0], p2[0]], [p1[1], corner[1], p2[1]], color=SECONDARY, lw=1.8, zorder=8)


def render_q14() -> None:
    fig, ax = new_figure(11.2, 6.8)
    A = np.array([-2.0, 1.0])
    B = np.array([6.0, 5.0])
    P = np.array([4.0, 4.0])
    Q = np.array([6.0, 0.0])
    ax.annotate("", xy=(10.0, 0), xytext=(-3.0, 0), arrowprops=dict(arrowstyle="->", lw=1.8, color=FG))
    ax.annotate("", xy=(0, 7.0), xytext=(0, -1.0), arrowprops=dict(arrowstyle="->", lw=1.8, color=FG))
    ax.text(9.75, -0.42, r"$x$", color=FG, fontsize=15)
    ax.text(-0.38, 6.72, r"$y$", color=FG, fontsize=15)
    ax.plot([A[0], B[0]], [A[1], B[1]], color=FG, lw=3.0, solid_capstyle="round")
    ax.plot([P[0], Q[0]], [P[1], Q[1]], color=SECONDARY, lw=2.8, solid_capstyle="round")
    right_angle_marker(ax, P, A - P, Q - P, 0.38)
    ax.text(1.25, 3.12, r"$AP:PB=3:1$", rotation=26.565, ha="center", va="bottom", fontsize=13, color=SECONDARY)
    for xy, label, delta in (
        (A, r"$A=(-2,1)$", (-1.15, -0.62)),
        (B, r"$B=(6,5)$", (0.18, 0.17)),
        (P, r"$P$", (-0.45, 0.28)),
        (Q, r"$Q$", (0.20, -0.42)),
    ):
        ax.plot(*xy, "o", color=FG, ms=6, zorder=9)
        ax.text(xy[0] + delta[0], xy[1] + delta[1], label, fontsize=14, color=FG, zorder=10)
    finish(fig, ax, "q14-coordinate-perpendicular.png", (-3.25, 10.25), (-1.2, 7.2))


def render_q15() -> None:
    fig, ax = new_figure(10.8, 7.2)
    fbl = np.array([3.0, 1.0])
    fbr = np.array([9.0, 1.0])
    ftr = np.array([9.0, 6.0])
    ftl = np.array([3.0, 6.0])
    shift = np.array([-2.0, 1.5])
    bbl, bbr, btr, btl = (p + shift for p in (fbl, fbr, ftr, ftl))
    ax.add_patch(Polygon([fbl, bbl, btl, ftl], closed=True, facecolor=HIGHLIGHT, edgecolor=FG, lw=2.3, zorder=1))
    ax.add_patch(Polygon([ftl, ftr, btr, btl], closed=True, facecolor=LIGHT, edgecolor=FG, lw=2.3, zorder=2))
    ax.add_patch(Polygon([fbl, fbr, ftr, ftl], closed=True, facecolor=WHITE, edgecolor=FG, lw=2.8, zorder=3))
    # Draw only visible depth edges. Projected hidden edges would cross the
    # front face and make the solid harder to read.
    for front, back in ((fbl, bbl), (ftr, btr), (ftl, btl)):
        ax.plot([front[0], back[0]], [front[1], back[1]], color=FG, lw=2.2, zorder=4)
    A = fbl
    G = btr
    ax.plot(*A, "o", color=FG, ms=9, zorder=10)
    ax.add_patch(Circle(G, 0.11, facecolor=WHITE, edgecolor=FG, lw=2.5, zorder=10))
    ax.text(A[0] - 0.38, A[1] - 0.18, r"$A$", fontsize=17, fontweight="bold", color=FG)
    ax.text(G[0] - 0.05, G[1] + 0.32, r"$G$", fontsize=17, fontweight="bold", color=FG)
    ax.text(A[0] - 0.15, A[1] - 0.64, "start", fontsize=12, color=SECONDARY, ha="center")
    ax.text(G[0] + 0.48, G[1] + 0.10, "finish", fontsize=12, color=SECONDARY, ha="left")
    dimension(ax, (3.0, 0.42), (9.0, 0.42), r"$6\ \mathrm{cm}$", (0, -0.28))
    dimension(ax, (9.58, 1.0), (9.58, 6.0), r"$5\ \mathrm{cm}$", (0.63, 0))
    depth_offset = np.array([-0.28, 0.25])
    depth_from = ftl + depth_offset
    depth_to = btl + depth_offset
    mid_depth = (depth_from + depth_to) / 2
    ax.annotate("", xy=depth_to, xytext=depth_from, arrowprops=dict(arrowstyle="|-|", color=SECONDARY, lw=1.6))
    ax.text(mid_depth[0] - 0.18, mid_depth[1] + 0.28, r"$3\ \mathrm{cm}$", rotation=-36.9, ha="center", va="center", fontsize=13, color=FG)
    finish(fig, ax, "q15-cuboid-surface-route.png", (-0.45, 10.75), (0.0, 8.70))


def main() -> None:
    render_q01()
    render_q03()
    render_q05()
    render_q09()
    render_q12()
    render_q13()
    render_q14()
    render_q15()
    print(f"Rendered 8 diagrams to {OUT}")


if __name__ == "__main__":
    main()
