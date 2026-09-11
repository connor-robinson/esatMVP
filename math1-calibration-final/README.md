# ESAT CAMP Mathematics 1 Calibration - final package

This folder contains the implementation-ready 15-question calibration.

## Contents

- `questions.json` - canonical question content, solutions, distractor diagnostics, provisional IRT metadata and visual specifications.
- `diagram_previews/` - eight high-resolution black-and-white reference diagrams.
- `diagram-contact-sheet.png` - one-page visual review of all diagrams.
- `render_reference_diagrams.py` - deterministic Matplotlib renderer.
- `score_model_reference.ts` - reference response-pattern score estimator.
- `validate_content.py` - structural, mathematical and image checks.
- `NSAA_ANALYSIS_AND_BLUEPRINT.md` - official-paper analysis and design rationale.
- `CURSOR_IMPLEMENTATION_PROMPT.md` - instructions to paste into Cursor.

## Non-negotiable product behaviour

- 15 questions in 20 minutes; no calculator.
- Do not show difficulty, correct answers, item parameters, diagnostic tags or NSAA inspiration during the test.
- Preserve mathematical notation as KaTeX/LaTeX; never display raw markup.
- Use the supplied diagrams or reproduce them faithfully as SVG with the same black-and-white geometry.
- Results must say `Estimated ESAT range`, not `Official ESAT score`.
- Do not use timing to inflate or reduce the estimated score.

## Validation

Run:

```bash
python3 render_reference_diagrams.py
python3 validate_content.py
```

Both commands are deterministic. If the renderer changes, inspect every generated diagram before replacing production assets.

