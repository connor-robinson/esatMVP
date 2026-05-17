"""Deterministic SVG renderer for ``Physics Accurate_Schematic_Spec.md`` output.

Supports the schematic types that the V4 router is allowed to ask for:

- simple_circuit: list of nodes (positions) + edges (components) with
  components in {battery, resistor, lamp, switch, ammeter, voltmeter, wire}.
- simple_block: list of labelled boxes + arrows between them.

We avoid building a full circuit auto-layout. The spec is expected to provide
node positions (in a simple 0..1 grid) per Physics Accurate_Schematic_Spec.md.
Missing fields fall back to safe defaults.
"""

from __future__ import annotations

import html
import math
from typing import Any, Dict, List, Optional, Tuple

W, H = 600, 420
PAD = 40

_BG = "#f7f7f4"
_FG = "#111111"
_GRID = "#d6d6d6"


def _attr_escape(value: Any) -> str:
    return html.escape(str(value), quote=True)


def _safe_number(value: Any, default: float = 0.0) -> float:
    try:
        f = float(value)
        if math.isfinite(f):
            return f
    except (TypeError, ValueError):
        pass
    return default


def _resolve_node(nodes: Dict[str, Tuple[float, float]], key: Any) -> Tuple[float, float]:
    return nodes.get(str(key), (W / 2, H / 2))


def _draw_battery(x1: float, y1: float, x2: float, y2: float, label: str) -> List[str]:
    """Draw a battery symbol at the midpoint perpendicular to the wire."""
    mx, my = (x1 + x2) / 2, (y1 + y2) / 2
    dx, dy = x2 - x1, y2 - y1
    length = math.hypot(dx, dy) or 1.0
    ux, uy = dx / length, dy / length
    px, py = -uy, ux  # perpendicular
    short_h, long_h = 7, 14
    gap = 4
    # short plate (negative)
    sx1, sy1 = mx - ux * gap + px * short_h, my - uy * gap + py * short_h
    sx2, sy2 = mx - ux * gap - px * short_h, my - uy * gap - py * short_h
    # long plate (positive)
    lx1, ly1 = mx + ux * gap + px * long_h, my + uy * gap + py * long_h
    lx2, ly2 = mx + ux * gap - px * long_h, my + uy * gap - py * long_h
    out = [
        f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{mx - ux * gap:.1f}" y2="{my - uy * gap:.1f}" stroke="{_FG}" stroke-width="1.6" />',
        f'<line x1="{mx + ux * gap:.1f}" y1="{my + uy * gap:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{_FG}" stroke-width="1.6" />',
        f'<line x1="{sx1:.1f}" y1="{sy1:.1f}" x2="{sx2:.1f}" y2="{sy2:.1f}" stroke="{_FG}" stroke-width="2" />',
        f'<line x1="{lx1:.1f}" y1="{ly1:.1f}" x2="{lx2:.1f}" y2="{ly2:.1f}" stroke="{_FG}" stroke-width="2" />',
    ]
    if label:
        out.append(
            f'<text x="{mx + px * (long_h + 12):.1f}" y="{my + py * (long_h + 12):.1f}" '
            f'font-family="Times New Roman, serif" font-style="italic" font-size="12" fill="{_FG}" text-anchor="middle">{_attr_escape(label)}</text>'
        )
    return out


def _draw_resistor(x1: float, y1: float, x2: float, y2: float, label: str) -> List[str]:
    """Rectangle resistor centred on the segment."""
    mx, my = (x1 + x2) / 2, (y1 + y2) / 2
    dx, dy = x2 - x1, y2 - y1
    length = math.hypot(dx, dy) or 1.0
    ux, uy = dx / length, dy / length
    px, py = -uy, ux
    body_half_len = 18
    body_half_w = 7
    # End points of the rectangle on the wire axis
    rx1, ry1 = mx - ux * body_half_len, my - uy * body_half_len
    rx2, ry2 = mx + ux * body_half_len, my + uy * body_half_len
    # Four rectangle corners
    c1 = (rx1 + px * body_half_w, ry1 + py * body_half_w)
    c2 = (rx2 + px * body_half_w, ry2 + py * body_half_w)
    c3 = (rx2 - px * body_half_w, ry2 - py * body_half_w)
    c4 = (rx1 - px * body_half_w, ry1 - py * body_half_w)
    pts = " ".join(f"{p[0]:.1f},{p[1]:.1f}" for p in [c1, c2, c3, c4])
    out = [
        f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{rx1:.1f}" y2="{ry1:.1f}" stroke="{_FG}" stroke-width="1.6" />',
        f'<line x1="{rx2:.1f}" y1="{ry2:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{_FG}" stroke-width="1.6" />',
        f'<polygon points="{pts}" fill="none" stroke="{_FG}" stroke-width="1.4" />',
    ]
    if label:
        out.append(
            f'<text x="{mx + px * (body_half_w + 14):.1f}" y="{my + py * (body_half_w + 14):.1f}" '
            f'font-family="Times New Roman, serif" font-style="italic" font-size="12" fill="{_FG}" text-anchor="middle">{_attr_escape(label)}</text>'
        )
    return out


def _draw_circle_component(x1: float, y1: float, x2: float, y2: float, letter: str, label: str) -> List[str]:
    mx, my = (x1 + x2) / 2, (y1 + y2) / 2
    dx, dy = x2 - x1, y2 - y1
    length = math.hypot(dx, dy) or 1.0
    ux, uy = dx / length, dy / length
    px, py = -uy, ux
    r = 12
    return [
        f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{mx - ux * r:.1f}" y2="{my - uy * r:.1f}" stroke="{_FG}" stroke-width="1.6" />',
        f'<line x1="{mx + ux * r:.1f}" y1="{my + uy * r:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{_FG}" stroke-width="1.6" />',
        f'<circle cx="{mx:.1f}" cy="{my:.1f}" r="{r}" fill="none" stroke="{_FG}" stroke-width="1.4" />',
        f'<text x="{mx:.1f}" y="{my + 4:.1f}" font-family="Times New Roman, serif" font-size="13" fill="{_FG}" text-anchor="middle">{_attr_escape(letter)}</text>',
        f'<text x="{mx + px * (r + 14):.1f}" y="{my + py * (r + 14):.1f}" font-family="Times New Roman, serif" font-style="italic" font-size="12" fill="{_FG}" text-anchor="middle">{_attr_escape(label)}</text>' if label else "",
    ]


def _draw_lamp(x1: float, y1: float, x2: float, y2: float, label: str) -> List[str]:
    mx, my = (x1 + x2) / 2, (y1 + y2) / 2
    r = 12
    return [
        f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{mx - r:.1f}" y2="{my:.1f}" stroke="{_FG}" stroke-width="1.6" />',
        f'<line x1="{mx + r:.1f}" y1="{my:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{_FG}" stroke-width="1.6" />',
        f'<circle cx="{mx:.1f}" cy="{my:.1f}" r="{r}" fill="none" stroke="{_FG}" stroke-width="1.4" />',
        f'<line x1="{mx - r * 0.7:.1f}" y1="{my - r * 0.7:.1f}" x2="{mx + r * 0.7:.1f}" y2="{my + r * 0.7:.1f}" stroke="{_FG}" stroke-width="1.2" />',
        f'<line x1="{mx - r * 0.7:.1f}" y1="{my + r * 0.7:.1f}" x2="{mx + r * 0.7:.1f}" y2="{my - r * 0.7:.1f}" stroke="{_FG}" stroke-width="1.2" />',
        (
            f'<text x="{mx:.1f}" y="{my - r - 8:.1f}" font-family="Times New Roman, serif" '
            f'font-style="italic" font-size="12" fill="{_FG}" text-anchor="middle">{_attr_escape(label)}</text>'
            if label
            else ""
        ),
    ]


def _draw_switch(x1: float, y1: float, x2: float, y2: float, label: str, closed: bool) -> List[str]:
    mx, my = (x1 + x2) / 2, (y1 + y2) / 2
    dx, dy = x2 - x1, y2 - y1
    length = math.hypot(dx, dy) or 1.0
    ux, uy = dx / length, dy / length
    half = 12
    a = (mx - ux * half, my - uy * half)
    b = (mx + ux * half, my + uy * half)
    out = [
        f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{a[0]:.1f}" y2="{a[1]:.1f}" stroke="{_FG}" stroke-width="1.6" />',
        f'<line x1="{b[0]:.1f}" y1="{b[1]:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{_FG}" stroke-width="1.6" />',
        f'<circle cx="{a[0]:.1f}" cy="{a[1]:.1f}" r="2.5" fill="{_FG}" />',
        f'<circle cx="{b[0]:.1f}" cy="{b[1]:.1f}" r="2.5" fill="{_FG}" />',
    ]
    if closed:
        out.append(f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" stroke="{_FG}" stroke-width="1.4" />')
    else:
        # Open switch: lever tilted up ~30°
        angle = math.radians(30)
        lx = a[0] + math.cos(angle) * (2 * half) * ux - math.sin(angle) * (2 * half) * (-uy)
        ly = a[1] + math.cos(angle) * (2 * half) * uy - math.sin(angle) * (2 * half) * (ux)
        out.append(f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{lx:.1f}" y2="{ly:.1f}" stroke="{_FG}" stroke-width="1.4" />')
    if label:
        out.append(
            f'<text x="{mx:.1f}" y="{my - 18:.1f}" font-family="Times New Roman, serif" '
            f'font-style="italic" font-size="12" fill="{_FG}" text-anchor="middle">{_attr_escape(label)}</text>'
        )
    return out


def _component(comp: str, x1: float, y1: float, x2: float, y2: float, label: str, props: Dict[str, Any]) -> List[str]:
    comp = (comp or "wire").strip().lower()
    if comp == "battery":
        return _draw_battery(x1, y1, x2, y2, label)
    if comp == "resistor":
        return _draw_resistor(x1, y1, x2, y2, label)
    if comp == "lamp":
        return _draw_lamp(x1, y1, x2, y2, label)
    if comp in ("ammeter",):
        return _draw_circle_component(x1, y1, x2, y2, "A", label)
    if comp in ("voltmeter",):
        return _draw_circle_component(x1, y1, x2, y2, "V", label)
    if comp == "switch":
        return _draw_switch(x1, y1, x2, y2, label, closed=bool(props.get("closed", True)))
    # default: plain wire
    return [
        f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{_FG}" stroke-width="1.6" />'
    ]


def render_schematic_svg(spec: Dict[str, Any]) -> str:
    """Render a circuit/schematic spec into a self-contained SVG string.

    Expected (best-effort) shape:
    ``{
        "schematic_type": "simple_circuit",
        "title": "...",
        "nodes": [{"id": "A", "x": 0.1, "y": 0.5}, ...],
        "edges": [{"from": "A", "to": "B", "component": "battery", "label": "12 V"}, ...]
    }``
    or for ``simple_block``:
    ``{
        "schematic_type": "simple_block",
        "boxes": [{"id": "x", "x": 0.2, "y": 0.4, "w": 0.2, "h": 0.15, "label": "Engine"}, ...],
        "arrows": [{"from": "x", "to": "y", "label": "..."}]
    }``
    """
    if not isinstance(spec, dict):
        spec = {}
    parts: List[str] = []
    parts.append(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" '
        f'role="img" aria-label="{_attr_escape(spec.get("title") or "schematic")}">'
    )
    parts.append(f'<rect width="100%" height="100%" fill="{_BG}" />')

    title = (spec.get("title") or "").strip()
    if title:
        parts.append(
            f'<text x="{W // 2}" y="22" font-family="Times New Roman, serif" '
            f'font-size="14" fill="{_FG}" text-anchor="middle">{_attr_escape(title)}</text>'
        )

    inner_w = W - 2 * PAD
    inner_h = H - 2 * PAD - 30  # leave footer

    schematic_type = (spec.get("schematic_type") or "simple_circuit").strip().lower()

    if schematic_type == "simple_block":
        nodes: Dict[str, Tuple[float, float]] = {}
        for box in spec.get("boxes") or []:
            if not isinstance(box, dict):
                continue
            bx = PAD + _safe_number(box.get("x"), 0.1) * inner_w
            by = PAD + 30 + _safe_number(box.get("y"), 0.1) * inner_h
            bw = _safe_number(box.get("w"), 0.2) * inner_w
            bh = _safe_number(box.get("h"), 0.15) * inner_h
            label = box.get("label") or box.get("id") or ""
            nodes[str(box.get("id", ""))] = (bx + bw / 2, by + bh / 2)
            parts.append(
                f'<rect x="{bx:.1f}" y="{by:.1f}" width="{bw:.1f}" height="{bh:.1f}" '
                f'fill="none" stroke="{_FG}" stroke-width="1.4" />'
                f'<text x="{(bx + bw / 2):.1f}" y="{(by + bh / 2 + 4):.1f}" '
                f'font-family="Times New Roman, serif" font-size="13" fill="{_FG}" '
                f'text-anchor="middle">{_attr_escape(label)}</text>'
            )
        # Arrows
        parts.append(
            f'<defs><marker id="arr2" markerWidth="10" markerHeight="10" refX="6" refY="3" '
            f'orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L6,3 z" fill="{_FG}" /></marker></defs>'
        )
        for arr in spec.get("arrows") or []:
            if not isinstance(arr, dict):
                continue
            a = _resolve_node(nodes, arr.get("from"))
            b = _resolve_node(nodes, arr.get("to"))
            parts.append(
                f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" '
                f'stroke="{_FG}" stroke-width="1.4" marker-end="url(#arr2)" />'
            )
            label = arr.get("label") or ""
            if label:
                mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
                parts.append(
                    f'<text x="{mx:.1f}" y="{my - 6:.1f}" font-family="Times New Roman, serif" '
                    f'font-style="italic" font-size="11" fill="{_FG}" text-anchor="middle">{_attr_escape(label)}</text>'
                )
    else:
        # simple_circuit
        nodes: Dict[str, Tuple[float, float]] = {}
        for n in spec.get("nodes") or []:
            if not isinstance(n, dict):
                continue
            nid = str(n.get("id", ""))
            if not nid:
                continue
            x = PAD + _safe_number(n.get("x"), 0.5) * inner_w
            y = PAD + 30 + _safe_number(n.get("y"), 0.5) * inner_h
            nodes[nid] = (x, y)
            # Tiny node dots for junctions
            if n.get("junction", False):
                parts.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="3" fill="{_FG}" />')

        for e in spec.get("edges") or []:
            if not isinstance(e, dict):
                continue
            a = _resolve_node(nodes, e.get("from"))
            b = _resolve_node(nodes, e.get("to"))
            comp = e.get("component", "wire")
            label = e.get("label") or ""
            props = {k: v for k, v in e.items() if k not in ("from", "to", "component", "label")}
            for elem in _component(comp, a[0], a[1], b[0], b[1], label, props):
                if elem:
                    parts.append(elem)

    # Footer
    parts.append(
        f'<text x="{W // 2}" y="{H - 14}" font-family="Times New Roman, serif" '
        f'font-size="10" fill="#555" text-anchor="middle">[diagram not to scale]</text>'
    )
    parts.append("</svg>")
    return "".join(parts)
