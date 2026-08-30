"""CLI for Diagram Designer (Phase 2)."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from .diagram_designer import DiagramDesignerInput, run_diagram_designer
from .render_matplotlib import render_diagram


def main() -> None:
    parser = argparse.ArgumentParser(description="Run ESAT Diagram Designer (Gemini multimodal)")
    parser.add_argument("--image", required=True, help="Path to original reference diagram PNG/JPG")
    parser.add_argument("--reference-question", required=True, help="Path to reference question text file")
    parser.add_argument("--reference-solution", default="", help="Optional path to reference solution text")
    parser.add_argument("--schema", default="", help="Optional path to reasoning schema markdown")
    parser.add_argument("--idea-plan", default="", help="Optional path to idea_plan JSON")
    parser.add_argument("--variation-mode", default="sibling", choices=["sibling", "far"])
    parser.add_argument("--math-paper", default="Math 1")
    parser.add_argument("--difficulty", default="Medium")
    parser.add_argument("--source-question-id", default="")
    parser.add_argument("--out-dir", default="visual_engine/tests/output/designer")
    parser.add_argument("--model", default="")
    parser.add_argument("--thinking", default="high", choices=["low", "medium", "high"])
    args = parser.parse_args()

    ref_q = Path(args.reference_question).read_text(encoding="utf-8")
    ref_s = Path(args.reference_solution).read_text(encoding="utf-8") if args.reference_solution else ""
    schema = Path(args.schema).read_text(encoding="utf-8") if args.schema else ""
    idea_plan = None
    if args.idea_plan:
        idea_plan = json.loads(Path(args.idea_plan).read_text(encoding="utf-8"))

    inp = DiagramDesignerInput(
        reference_question=ref_q,
        reference_solution=ref_s,
        diagram_image_path=Path(args.image),
        schema_block=schema,
        target_difficulty=args.difficulty,
        variation_mode=args.variation_mode,
        math_paper=args.math_paper,
        idea_plan=idea_plan,
        source_question_id=args.source_question_id or None,
    )

    result = run_diagram_designer(
        inp,
        model=args.model or None,
        thinking_level=args.thinking,
    )

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    spec_path = out_dir / "visual_spec.json"
    png_path = out_dir / "diagram.png"
    spec_path.write_text(json.dumps(result.visual_spec, ensure_ascii=False, indent=2), encoding="utf-8")
    render_diagram(result.visual_spec, png_path)

    print(f"model={result.model}")
    print(f"spec={spec_path}")
    print(f"png={png_path}")


if __name__ == "__main__":
    main()
