"""Shared TMUA/Cambridge exam SVG style constants and lint checks."""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any, Dict, List

_DIR = Path(__file__).resolve().parent

# Reference constants for prompts / layout JSON (not a React runtime).
SVG_STYLE: Dict[str, Any] = {
    "fontFamily": '"Times New Roman", Times, "STIX Two Text", "Cambria Math", serif',
    "stroke": "#111",
    "textFill": "#111",
    "mainStrokeWidth": 1.6,
    "secondaryStrokeWidth": 1.2,
    "constructionStrokeWidth": 1.1,
    "labelSize": 14,
    "smallLabelSize": 12,
    "pointRadius": 2.5,
    "dashArray": "4 4",
    "greyFill": "#B8B8B8",
    "greyFillLight": "#D9D9D9",
}

_WEB_FONT_RE = re.compile(
    r"font-family\s*=\s*['\"][^'\"]*\b(?:Arial|Helvetica|Inter|system-ui|Segoe UI|Roboto)\b",
    re.I,
)
_FORBIDDEN_SVG_RE = [
    (re.compile(r"<linearGradient\b", re.I), "linearGradient"),
    (re.compile(r"<radialGradient\b", re.I), "radialGradient"),
    (re.compile(r"<filter\b", re.I), "filter"),
    (re.compile(r"feDropShadow|feGaussianBlur", re.I), "SVG filter effect"),
    (re.compile(r"<script[\s>]", re.I), "script"),
]
_THICK_STROKE_RE = re.compile(
    r"stroke-width\s*=\s*['\"]?([0-9]+(?:\.[0-9]+)?)",
    re.I,
)
_WHITE_TEXT_RE = re.compile(
    r"<text\b[^>]*\bfill\s*=\s*['\"]#(?:fff|ffffff)['\"]",
    re.I,
)


def load_svg_exam_style_instructions() -> str:
    return (_DIR / "svg_exam_style.md").read_text(encoding="utf-8")


def append_exam_style_to_system(base_system: str) -> str:
    """Prepend canonical exam-style rules to every SVG LLM system prompt."""
    style = load_svg_exam_style_instructions()
    return (
        "==================================================\n"
        "MANDATORY TMUA / CAMBRIDGE EXAM SVG STYLE\n"
        "==================================================\n\n"
        + style
        + "\n\n==================================================\n"
        "PHASE-SPECIFIC INSTRUCTIONS\n"
        "==================================================\n\n"
        + base_system.strip()
    )


def lint_svg_exam_style(svg: str) -> List[str]:
    """
    Lint-style checks for generated SVG. Returns human-readable issue strings (warnings).
    """
    issues: List[str] = []
    if not svg or "<svg" not in svg.lower():
        issues.append("missing or invalid SVG root")
        return issues

    if not re.search(r"<svg\b[^>]*\bviewBox\s*=", svg, re.I):
        issues.append("missing viewBox on <svg>")

    for pat, name in _FORBIDDEN_SVG_RE:
        if pat.search(svg):
            issues.append(f"forbidden element or effect: {name}")

    for m in _THICK_STROKE_RE.finditer(svg):
        try:
            w = float(m.group(1))
            if w > 2.5:
                issues.append(f"stroke-width {w} > 2.5 (too heavy for exam style)")
        except ValueError:
            pass

    if _WEB_FONT_RE.search(svg):
        issues.append("web/sans font detected (use Times/STIX/Cambria serif stack)")

    if _WHITE_TEXT_RE.search(svg):
        issues.append("white fill on <text> (likely invisible on white background)")

    text_count = len(re.findall(r"<text\b", svg, re.I))
    if text_count > 28:
        issues.append(f"too many labels ({text_count} <text> elements; prefer sparse TMUA labeling)")

    if not re.search(
        r"<(?:line|circle|rect|path|polyline|polygon|ellipse|text)\b",
        svg,
        re.I,
    ):
        issues.append("no drawable primitives found")

    return issues
