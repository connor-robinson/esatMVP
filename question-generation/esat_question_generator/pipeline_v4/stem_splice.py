"""Splice rendered visuals into ``question.stem`` for the review app.

Inputs are placeholder tags emitted by the Implementer/Designer such as::

    See the velocity-time graph below. <GRAPH id="g1" />

This module replaces ``<GRAPH id="..." />`` and ``<DIAGRAM id="..." />`` with
``<figure class="qg-diagram">...</figure>`` blocks that the review-app's
``StemContent`` component already knows how to render (see
``question-generation/review-app/src/components/shared/StemContent.tsx``).

The replacement strategy is intentionally simple:

* If only one visual was produced, every placeholder of the matching kind is
  replaced with that visual.
* If no placeholder is found in the stem but a visual exists, the visual is
  appended to the end of the stem so reviewers still see it.
* Non-matching placeholders are left intact (the deterministic visual linkage
  validator catches truly stale references during generation).
"""

from __future__ import annotations

import base64
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


GRAPH_PLACEHOLDER_RE = re.compile(
    r"<\s*GRAPH\s+id\s*=\s*[\"\']([^\"\']+)[\"\']\s*/\s*>",
    re.IGNORECASE,
)
DIAGRAM_PLACEHOLDER_RE = re.compile(
    r"<\s*DIAGRAM\s+id\s*=\s*[\"\']([^\"\']+)[\"\']\s*/\s*>",
    re.IGNORECASE,
)


def _figure_with_svg(svg: str, *, caption: str = "") -> str:
    """Wrap a raw SVG string in a ``qg-diagram`` figure.

    The review app whitelists ``<figure class="qg-diagram">...<svg>...</svg></figure>``
    blocks via ``maskQgDiagramFigures`` and renders them as inline diagrams.
    """
    caption_html = ""
    if caption.strip():
        # Reviewer escapes prose -- we want to surface a small label so use plain text.
        caption_html = f"<figcaption>{caption.strip()}</figcaption>"
    return f'<figure class="qg-diagram">{svg.strip()}{caption_html}</figure>'


def _png_as_svg_figure(png_bytes: bytes, *, alt: str = "") -> str:
    """Wrap raw PNG bytes in an inline ``<svg><image href=data:.../></svg>`` block.

    We embed PNGs inside SVG so the reviewer's SVG-only inline path still
    surfaces them without us having to upload to Supabase Storage. The image is
    scaled to the standard 600x420 viewport used by ``StemContent.ensureSvgViewport``.
    """
    b64 = base64.b64encode(png_bytes).decode("ascii")
    safe_alt = (alt or "").replace('"', "&quot;")
    inner = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 420" '
        'width="600" height="420" role="img" aria-label="' + safe_alt + '">'
        '<image href="data:image/png;base64,' + b64 + '" '
        'x="0" y="0" width="600" height="420" preserveAspectRatio="xMidYMid meet" />'
        "</svg>"
    )
    return _figure_with_svg(inner, caption=alt)


def splice_graph_svg_into_stem(
    stem: str,
    *,
    graph_id: str,
    svg: str,
    caption: str = "",
) -> Tuple[str, bool]:
    """Replace ``<GRAPH id="g1" />`` with ``<figure>...<svg>...</svg></figure>``.

    Returns ``(new_stem, replaced)`` where ``replaced`` is True if a placeholder
    matched. If nothing matched, the SVG is appended at the end of the stem.
    """
    figure = _figure_with_svg(svg, caption=caption)
    replaced = False

    def _sub(match: "re.Match[str]") -> str:
        nonlocal replaced
        if str(match.group(1)).strip().lower() == graph_id.strip().lower():
            replaced = True
            return "\n\n" + figure + "\n\n"
        return match.group(0)

    new_stem = GRAPH_PLACEHOLDER_RE.sub(_sub, stem or "")
    if not replaced:
        # No matching placeholder. Append it anyway so reviewers can see it.
        new_stem = (stem or "").rstrip() + "\n\n" + figure + "\n"
        replaced = True  # we did insert something
    return new_stem, replaced


def splice_schematic_svg_into_stem(
    stem: str,
    *,
    diagram_id: str,
    svg: str,
    caption: str = "",
) -> Tuple[str, bool]:
    """Same as ``splice_graph_svg_into_stem`` but for ``<DIAGRAM id="..." />``.

    Schematic specs come from ``Physics Accurate_Schematic_Spec.md`` and
    reference ``<DIAGRAM id="d1" />`` placeholders in the stem.
    """
    figure = _figure_with_svg(svg, caption=caption)
    replaced = False

    def _sub(match: "re.Match[str]") -> str:
        nonlocal replaced
        if str(match.group(1)).strip().lower() == diagram_id.strip().lower():
            replaced = True
            return "\n\n" + figure + "\n\n"
        return match.group(0)

    new_stem = DIAGRAM_PLACEHOLDER_RE.sub(_sub, stem or "")
    if not replaced:
        new_stem = (stem or "").rstrip() + "\n\n" + figure + "\n"
        replaced = True
    return new_stem, replaced


def splice_concept_image_into_stem(
    stem: str,
    *,
    image_path: Path,
    placeholder_id: str = "img1",
    alt: str = "",
) -> Tuple[str, bool]:
    """Embed a concept image PNG as base64 inside the stem.

    The reviewer's ``StemContent`` masks ``<figure>...<svg>...</svg></figure>``
    blocks and inlines them. We therefore embed the PNG as an ``<image>``
    element inside an ``<svg>`` so it lands on the same render path.
    """
    image_path = Path(image_path)
    if not image_path.is_file():
        return stem, False
    data = image_path.read_bytes()
    figure = _png_as_svg_figure(data, alt=alt or placeholder_id)

    replaced = False

    def _sub(match: "re.Match[str]") -> str:
        nonlocal replaced
        if str(match.group(1)).strip().lower() == placeholder_id.strip().lower():
            replaced = True
            return "\n\n" + figure + "\n\n"
        return match.group(0)

    # Try DIAGRAM first (most common for concept images), then GRAPH as fallback.
    new_stem = DIAGRAM_PLACEHOLDER_RE.sub(_sub, stem or "")
    if not replaced:
        new_stem = GRAPH_PLACEHOLDER_RE.sub(_sub, new_stem)
    if not replaced:
        new_stem = (stem or "").rstrip() + "\n\n" + figure + "\n"
        replaced = True
    return new_stem, replaced


def collect_placeholder_ids(stem: str) -> Dict[str, List[str]]:
    """Return ``{"graphs": [...ids...], "diagrams": [...ids...]}`` parsed from the stem."""
    return {
        "graphs": [m.group(1) for m in GRAPH_PLACEHOLDER_RE.finditer(stem or "")],
        "diagrams": [m.group(1) for m in DIAGRAM_PLACEHOLDER_RE.finditer(stem or "")],
    }
