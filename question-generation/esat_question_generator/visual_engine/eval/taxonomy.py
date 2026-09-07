"""Keyword taxonomy for Phase 2 eval non-PASS cases."""

from __future__ import annotations

from collections import Counter
from typing import Any

TAXONOMY = {
    "A. Axis ticks/titles": (
        "tick",
        "axis title",
        "axis label",
        "floating",
        "x-axis",
        "y-axis",
        "axes",
        "title sits",
    ),
    "B. Dimension lines": (
        "dimension",
        "arrowhead",
        "extension",
        "callout",
        "depth marker",
    ),
    "C. Mathtext units": (
        "semicolon",
        "mathtext",
        r"\text",
        ";cm",
        "; kg",
    ),
    "D. Labels inside geometry": (
        "inside the",
        "inside polygon",
        "inside the rectangle",
        "inside the shape",
        "inside the triangle",
        "inside the circle",
        "label is inside",
    ),
    "E. Out-of-scope": (
        "circuit",
        "flowchart",
        "biology",
        "unsupported",
        "wrong diagram",
        "unrelated",
    ),
    "F. Collision / layout": (
        "collision",
        "overlap",
        "out of bounds",
        "clipped",
        "cut off",
    ),
}


def classify_issue(text: str) -> str:
    low = (text or "").lower()
    for label, needles in TAXONOMY.items():
        if any(n.lower() in low for n in needles):
            return label
    return "G. Other"


def classify_failures(failures: list[dict[str, Any]]) -> dict[str, Any]:
    counts: Counter[str] = Counter()
    by_class: dict[str, list[str]] = {}
    for fail in failures:
        blob = " ".join(str(x) for x in (fail.get("issues") or []))
        blob = blob or str(fail.get("render_error") or fail.get("spec_error") or "")
        label = classify_issue(blob)
        counts[label] += 1
        key = f"Q{fail.get('question_id')} {fail.get('variation_mode')}"
        by_class.setdefault(label, []).append(key)

    lines = ["# Failure taxonomy", ""]
    if not failures:
        lines.append("No remaining failures.")
        return {"counts": {}, "by_class": {}, "markdown": "\n".join(lines) + "\n"}

    lines.append(f"{len(failures)} non-PASS cases:")
    lines.append("")
    for label, count in counts.most_common():
        cases = ", ".join(by_class.get(label) or [])
        lines.append(f"- {label}: {count} ({cases})")
    lines.append("")
    return {
        "counts": dict(counts),
        "by_class": by_class,
        "markdown": "\n".join(lines),
    }
