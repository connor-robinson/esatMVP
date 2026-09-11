#!/usr/bin/env python3
"""Render deterministic black-and-white reference diagrams for the final calibration."""

from __future__ import annotations

import math
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Arc, Circle, FancyArrowPatch, Polygon, Rectangle


OUT = Path(__file__).resolve().parent / "diagram_previews"
INK = "#111111"
MID = "#666666"
LIGHT = "#D9D9D9"
DARK = "#858585"
LW = 1.55

# Match site KaTeX / MathJax look: Computer Modern via matplotlib mathtext.
plt.rcParams.update(
    {
        "font.family": "serif",
        "font.serif": ["STIXGeneral", "cmr10", "DejaVu Serif", "Times New Roman"],
        "mathtext.fontset": "cm",
        "mathtext.default": "it",
        "font.size": 11,
        "text.color": INK,
        "axes.edgecolor": INK,
        "lines.solid_capstyle": "round",
    }
)


def canvas(xlim, ylim, aspect="equal", figsize=(7.0, 4.5)):
    fig, ax = plt.subplots(figsize=figsize, dpi=200, facecolor="white")
    ax.set_xlim(*xlim)
    ax.set_ylim(*ylim)
    ax.set_aspect(aspect)
    ax.axis("off")
    return fig, ax


def math_label(ax, x, y, text, *, fontsize=11, color=INK, ha="center", va="center", rotation=0):
    """Render a label in Computer Modern (KaTeX-style) mathtext."""
    ax.text(
        x,
        y,
        text,
        ha=ha,
        va=va,
        fontsize=fontsize,
        color=color,
        rotation=rotation,
    )


def caption(ax, x, y):
    ax.text(
        x,
        y,
        r"$\mathrm{[diagram\ not\ to\ scale]}$",
        ha="center",
        va="top",
        fontsize=8.5,
        color=MID,
    )


def save(fig, filename):
    OUT.mkdir(parents=True, exist_ok=True)
    fig.savefig(OUT / filename, dpi=400, bbox_inches="tight", pad_inches=0.12, facecolor="white")
    plt.close(fig)


def q01():
    # Extra bottom room so the not-to-scale caption sits clearly below "12 cm".
    fig, ax = canvas((-1.8, 13.8), (-3.2, 13.5))
    outer = [(0, 0), (12, 0), (12, 12), (0, 12)]
    inner = [(6, 0), (12, 6), (6, 12), (0, 6)]
    ax.add_patch(Polygon(outer, closed=True, fill=False, ec=INK, lw=LW))
    ax.add_patch(Polygon(inner, closed=True, fill=False, ec=MID, lw=LW))
    ax.add_patch(Circle((6, 6), 3 * math.sqrt(2), fill=False, ec=INK, lw=LW))
    labels = {
        "A": (-0.45, -0.4), "B": (12.25, -0.4), "C": (12.25, 12.15), "D": (-0.45, 12.15),
        "E": (6, -0.45), "F": (12.35, 6), "G": (6, 12.35), "H": (-0.4, 6),
    }
    for label, (x, y) in labels.items():
        math_label(ax, x, y, rf"${label}$")
    y = -0.92
    ax.plot([0, 12], [y, y], color=MID, lw=1.0)
    ax.plot([0, 0], [y - 0.25, y + 0.25], color=MID, lw=1.0)
    ax.plot([12, 12], [y - 0.25, y + 0.25], color=MID, lw=1.0)
    math_label(ax, 6, y - 0.15, r"$12\,\mathrm{cm}$", va="top")
    caption(ax, 6, -2.75)
    save(fig, "q01-midpoint-incircle.png")


def q05():
    # Keep letter labels only; ratios live in the stem, not on the figure.
    fig, ax = canvas((-0.35, 1.4), (-0.38, 1.28), figsize=(6.1, 5.2))
    A, B, C, D = (0, 0), (1, 0), (1, 1), (0, 1)
    P, Q, R = (1 / 3, 0), (1, 1 / 4), (1 / 2, 1)
    ax.add_patch(Rectangle(A, 1, 1, fill=False, ec=INK, lw=LW))
    ax.add_patch(Polygon([P, Q, R], closed=True, fc=DARK, ec=INK, lw=LW))
    for label, (x, y), dx, dy in [
        ("A", A, -0.08, -0.08), ("B", B, 0.08, -0.08), ("C", C, 0.08, 0.08),
        ("D", D, -0.08, 0.08), ("P", P, 0, -0.09), ("Q", Q, 0.09, 0), ("R", R, 0, 0.09),
    ]:
        math_label(ax, x + dx, y + dy, rf"${label}$")
    caption(ax, 0.5, -0.32)
    save(fig, "q05-square-points.png")


def spiral_positions(nmax=25):
    positions = {1: (0, 0)}
    x = y = 0
    n = 1
    step = 1
    while n < nmax:
        for dx, dy in ((1, 0), (0, 1)):
            for _ in range(step):
                if n >= nmax:
                    return positions
                x += dx
                y += dy
                n += 1
                positions[n] = (x, y)
        step += 1
        for dx, dy in ((-1, 0), (0, -1)):
            for _ in range(step):
                if n >= nmax:
                    return positions
                x += dx
                y += dy
                n += 1
                positions[n] = (x, y)
        step += 1
    return positions


def q07():
    fig, ax = canvas((-3.0, 3.6), (-3.0, 3.25), figsize=(6.0, 5.5))
    positions = spiral_positions(25)
    for n, (x, y) in positions.items():
        if n in {1, 9, 25}:
            math_label(ax, x, y, rf"$\mathbf{{{n}}}$", fontsize=12)
        else:
            math_label(ax, x, y, rf"$\mathrm{{{n}}}$", fontsize=12)
    ax.add_patch(Rectangle((-2.45, -2.45), 4.9, 4.9, fill=False, ec=LIGHT, lw=0.8))
    math_label(ax, 3.0, 0, r"$\ldots$", fontsize=18, color=MID)
    math_label(ax, 0, 2.85, r"$\mathrm{pattern\ continues}$", fontsize=9, color=MID)
    caption(ax, 0, -2.72)
    save(fig, "q07-number-spiral.png")


def q09():
    fig, ax = canvas((-1.15, 1.6), (-0.42, 1.72), figsize=(6.8, 5.2))
    A = (0.0, 0.0)
    T = (1.0, 0.0)
    B = (math.cos(math.radians(40)), math.sin(math.radians(40)))
    centre = (0.0, 1 / (2 * B[1]))
    radius = centre[1]
    C = (-0.5, 1.3737387097)
    ax.add_patch(Circle(centre, radius, fill=False, ec=INK, lw=LW))
    ax.plot([-0.45, 1.42], [0, 0], color=INK, lw=LW)
    for U, V, colour in [(A, B, INK), (B, T, INK), (A, C, MID), (B, C, MID)]:
        ax.plot([U[0], V[0]], [U[1], V[1]], color=colour, lw=LW)
    for label, pt, offset in [
        ("A", A, (-0.08, -0.13)), ("B", B, (0.09, 0.03)), ("C", C, (-0.08, 0.08)), ("T", T, (0.08, -0.12))
    ]:
        math_label(ax, pt[0] + offset[0], pt[1] + offset[1], rf"${label}$")
    # Matching length ticks on AB and AT.
    ax.plot([0.47, 0.51], [0.36, 0.29], color=INK, lw=LW)
    ax.plot([0.50, 0.50], [-0.045, 0.045], color=INK, lw=LW)
    ax.add_patch(Arc(T, 0.46, 0.46, angle=0, theta1=110, theta2=180, color=MID, lw=1.1))
    math_label(ax, 0.79, 0.18, r"$70^\circ$", fontsize=10)
    caption(ax, 0.25, -0.31)
    save(fig, "q09-circle-tangent.png")


def draw_gear(ax, centre, radius, teeth):
    cx, cy = centre
    ax.add_patch(Circle(centre, radius, fill=False, ec=INK, lw=LW))
    ax.add_patch(Circle(centre, radius * 0.14, fill=False, ec=INK, lw=1.1))
    for k in range(teeth):
        angle = 2 * math.pi * k / teeth
        r1, r2 = radius, radius + 0.12
        ax.plot(
            [cx + r1 * math.cos(angle), cx + r2 * math.cos(angle)],
            [cy + r1 * math.sin(angle), cy + r2 * math.sin(angle)],
            color=INK,
            lw=0.8,
        )


def q10():
    fig, ax = canvas((-0.2, 8.6), (-0.7, 5.8), figsize=(7.2, 5.1))
    small = (2.0, 2.5)
    large = (5.6, 2.5)
    draw_gear(ax, small, 1.35, 18)
    draw_gear(ax, large, 2.25, 30)
    math_label(ax, 2.0, 2.5, r"$\mathrm{18}$", fontsize=12)
    math_label(ax, 5.6, 2.5, r"$\mathrm{30}$", fontsize=12)
    math_label(ax, 2.0, 0.75, r"$\mathrm{18\ teeth}$", va="top")
    math_label(ax, 5.6, -0.05, r"$\mathrm{30\ teeth}$", va="top")
    arrow = FancyArrowPatch(
        (1.1, 3.55), (2.85, 3.65), connectionstyle="arc3,rad=-0.45", arrowstyle="-|>",
        mutation_scale=12, color=MID, lw=1.2
    )
    ax.add_patch(arrow)
    math_label(ax, 1.9, 4.65, r"$\mathrm{25\ revolutions\ in\ 12\ s}$", fontsize=10)
    caption(ax, 4.2, -0.52)
    save(fig, "q10-gears.png")


def token(ax, x, y, label):
    ax.add_patch(Circle((x, y), 0.35, fc="white", ec=INK, lw=1.2))
    math_label(ax, x, y, rf"$\mathrm{{{label}}}$", fontsize=10)


def q11():
    fig, ax = canvas((-0.4, 10.6), (-0.8, 4.8), figsize=(7.4, 4.7))
    ax.add_patch(Rectangle((0.3, 0.4), 3.7, 2.8, fill=False, ec=INK, lw=LW))
    ax.add_patch(Rectangle((6.2, 0.4), 3.7, 2.8, fill=False, ec=INK, lw=LW))
    math_label(ax, 2.15, 3.55, r"$\mathrm{Bag\ A}$")
    math_label(ax, 8.05, 3.55, r"$\mathrm{Bag\ B}$")
    for x, label in zip((1.2, 2.15, 3.1), ("R", "R", "B")):
        token(ax, x, 1.75, label)
    for x, label in zip((7.1, 8.05, 9.0), ("R", "B", "B")):
        token(ax, x, 1.75, label)
    ax.add_patch(FancyArrowPatch((4.25, 2.3), (5.95, 2.3), arrowstyle="-|>", mutation_scale=13, color=INK, lw=1.2))
    math_label(ax, 5.1, 2.62, r"$\mathrm{one\ counter}$", fontsize=9, va="bottom")
    math_label(ax, 5.1, 0.0, r"$\mathrm{R\ =\ red\qquad B\ =\ blue}$", fontsize=9, color=MID)
    caption(ax, 5.1, -0.45)
    save(fig, "q11-counter-transfer.png")


def q12():
    fig, ax = canvas((-0.2, 10.2), (-0.6, 5.3), figsize=(7.5, 4.8))
    centres = [(2.5, 2.3), (7.5, 2.3)]
    r = 1.75
    for centre in centres:
        ax.add_patch(Circle(centre, r, fill=False, ec=INK, lw=LW))
        ax.plot([centre[0], centre[0]], [centre[1], centre[1] + r], color=MID, lw=1.0, ls="--")
        math_label(ax, centre[0] + 0.1, centre[1] + 0.85, r"$r$", fontsize=10, ha="left")
        ax.plot(centre[0], centre[1], marker="o", ms=2.8, color=INK)
    square = [(2.5 + r * math.cos(math.radians(a)), 2.3 + r * math.sin(math.radians(a))) for a in (45, 135, 225, 315)]
    hexagon = [(7.5 + r * math.cos(math.radians(a)), 2.3 + r * math.sin(math.radians(a))) for a in range(0, 360, 60)]
    ax.add_patch(Polygon(square, closed=True, fill=False, ec=INK, lw=LW))
    ax.add_patch(Polygon(hexagon, closed=True, fill=False, ec=INK, lw=LW))
    math_label(ax, 2.5, 4.45, r"$\mathrm{square}$")
    math_label(ax, 7.5, 4.45, r"$\mathrm{regular\ hexagon}$")
    caption(ax, 5.0, -0.35)
    save(fig, "q12-inscribed-polygons.png")


def q15():
    fig, ax = canvas((-2.1, 26.3), (-1.8, 19.4), figsize=(8.2, 6.0))
    radii = [1, 4, 9]
    xs = [0, 4, 16]
    for x, r in zip(xs, radii):
        ax.add_patch(Circle((x, r), r, fill=False, ec=INK, lw=LW))
        ax.plot([x, x], [0, r], color=MID, lw=1.0, ls="--")
        if r == 1:
            math_label(ax, x, 2.35, r"$1\,\mathrm{cm}$", fontsize=9.5, va="bottom")
        else:
            math_label(ax, x + 0.35, r / 2, rf"${r}\,\mathrm{{cm}}$", fontsize=9.5, ha="left")
        ax.plot(x, r, marker="o", ms=2.8, color=INK)
    ax.plot([-1.8, 25.7], [0, 0], color=INK, lw=LW)
    for x, label in zip(xs, ("P", "Q", "R")):
        ax.plot([x, x], [-0.14, 0.14], color=INK, lw=1.0)
        math_label(ax, x, -0.55, rf"${label}$", va="top")
    caption(ax, 12.0, -1.35)
    save(fig, "q15-tangent-circles.png")


def main():
    for renderer in (q01, q05, q07, q09, q10, q11, q12, q15):
        renderer()
    print(f"Rendered 8 diagrams to {OUT}")


if __name__ == "__main__":
    main()
