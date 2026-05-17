"""Deterministic SVG renderers for V4 visual specs.

Both ``render_graph_svg`` and ``render_schematic_svg`` are intentionally
pure-Python (no matplotlib, no fonts beyond serif fallback) so they can run
inside any worker environment without extra system deps. The output is sized
roughly like a TMUA/ENGAA print figure (600x420) and uses light grey paper +
black charcoal strokes per ``Physics TMUA_ENGAA_Visual_Style_Guide.md``.
"""

from .graph_svg import render_graph_svg
from .schematic_svg import render_schematic_svg

__all__ = ["render_graph_svg", "render_schematic_svg"]
