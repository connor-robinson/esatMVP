"""Render all fixture diagrams to PNG for manual inspection."""

from __future__ import annotations

import json
from pathlib import Path

from visual_engine import render_diagram

FIXTURES = Path(__file__).resolve().parent.parent / "fixtures"
OUTPUT = Path(__file__).resolve().parent / "output"


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for fixture_path in sorted(FIXTURES.glob("*.json")):
        spec = json.loads(fixture_path.read_text(encoding="utf-8"))
        out = OUTPUT / f"{fixture_path.stem}.png"
        result = render_diagram(spec, out)
        print(f"Rendered {fixture_path.name} -> {result.path} ({result.path.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
