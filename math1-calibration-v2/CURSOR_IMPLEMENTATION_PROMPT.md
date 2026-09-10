# Cursor implementation prompt

Copy the prompt below into Cursor after placing the `math1-calibration-v2` folder at the repository root.

---

Implement the new ESAT Mathematics 1 calibration test contained in:

- `math1-calibration-v2/questions.json` — source of truth for content, answers, metadata, diagnostics, and semantic diagram specifications
- `math1-calibration-v2/diagram_previews/` — visual acceptance references, not production assets to copy blindly
- `math1-calibration-v2/render_reference_diagrams.py` — deterministic reference renderer showing exact geometry and layout intent
- `math1-calibration-v2/validate_content.py` — independent arithmetic and structural checks

This is the first substantive ESAT Camp interaction for many students. Mathematical trust, rendering quality, speed, and mobile layout are release-blocking requirements.

## 1. Inspect before changing anything

First locate and read completely:

1. The current Mathematics 1 calibration question data and its schema.
2. The calibration test route, question component, option component, progress UI, results flow, persistence, and analytics.
3. The existing Python/Matplotlib `visual_engine`, including its schema, style system, collision-safe labels, fixtures, output paths, and tests.
4. The existing mathematical renderer and conventions for inline/display LaTeX.

Report the exact files you intend to change. Follow existing project architecture and naming. Do not create a second React/SVG diagram system and do not replace the current renderer.

## 2. Import the assessment safely

Map `questions.json` into the existing application schema without changing the mathematical content.

- Use assessment version `2.0.0` and question IDs `m1cal-v2-q01` through `m1cal-v2-q15`.
- Keep the question order and option order exactly as supplied. The answer-position sequence is intentionally balanced.
- Keep internal fields such as difficulty, specification references, correct answers, solutions, fast insights, and mistake tags hidden during the live test.
- Store `assessmentVersion: "2.0.0"` with every new attempt so old and new calibration data are never mixed.
- Preserve existing attempt saving, resuming, analytics, and results behaviour unless a small compatibility update is required.
- Do not delete historical attempts or mutate production data.
- Do not expose solutions before submission through an avoidable client payload if the current architecture already supports server-side marking.

Run this before and after integration:

```bash
python3 math1-calibration-v2/validate_content.py
```

It must print a PASS result.

## 3. Render the eight diagrams through the existing visual engine

Questions 1, 3, 5, 9, 12, 13, 14, and 15 require diagrams. Translate each semantic `visualSpec` into the closest existing visual-engine schema. Extend the existing renderer only where an object is genuinely missing. Reuse collision detection, label placement, and shared style primitives.

Required production properties:

- Deterministic output: the same spec always produces the same image.
- At least 1400 px wide at export and at least 200 dpi.
- White background, charcoal geometry, slate construction lines, pale neutral fills.
- Proper Euclidean aspect ratios for geometry.
- MathText for symbols and DejaVu Sans for prose.
- No clipped labels, dimension lines, angle arcs, equality ticks, or axis labels.
- No label may touch or cross an unrelated line.
- Every diagram remains unambiguous when converted to grayscale.
- Use the supplied alt text exactly or improve it without adding information that gives away the answer.
- Never infer geometry from an LLM-generated bitmap. All coordinates and shapes must come from the deterministic specification.

Question-specific acceptance checks:

### Q1

- Outer square, rotated midpoint square, and incircle must be mathematically exact.
- The circle must visibly touch all four sides of `EFGH`.
- Show the `12 cm` dimension once, below the square.
- This is the opening image: give it generous whitespace and render it especially crisply.

### Q3

- Render the exact curve `y = x(8-x)` over `0 <= x <= 8`.
- The point `(2,12)` and line `y=9` must be exact.
- Label the two intersections `P` and `Q` without printing their x-coordinates.

### Q5

- Both circles must have four equal sectors.
- Spinner X labels are `1, 2, 2, 3`; Spinner Y labels are `1, 2, 3, 4`.
- Repeated sectors must look like distinct equally likely outcomes.

### Q9

- `AT` must be exactly tangent at `A`.
- The geometry must satisfy `AB = AT`, `angle ATB = 70 degrees`, and `angle ACB = 40 degrees`.
- Show one matching equality tick on `AB` and `AT`.
- Do not print the target angle.

### Q12

- Stage 1 is a `2 x 4` dot grid, Stage 2 is `3 x 5`, and Stage 3 is `4 x 6`.
- Every light must be individually countable.
- Include a subtle continuation ellipsis after Stage 3.

### Q13

- Box A contains labelled tokens `G, G, B`; Box B contains `G, B, B, B`.
- Tokens must remain distinguishable without colour, so the `G` and `B` labels are mandatory.

### Q14

- Show unnumbered coordinate axes, `A=(-2,1)`, `B=(6,5)`, `P`, `Q`, and the perpendicular marker.
- Do not show grid lines, numeric ticks, `P=(4,4)`, or `Q=(6,0)`. The diagram must not reveal the answer.

### Q15

- Render a clean oblique/isometric cuboid with dimensions `3 cm`, `5 cm`, and `6 cm`.
- `A` and `G` must be opposite vertices.
- Do not draw a candidate route.
- Omit projected hidden edges if they cross a visible face or create misleading internal diagonals.
- The final image should feel conclusive and polished; it is the last question students see.

Compare every production render side by side with the corresponding file in `diagram_previews`. The production result may improve typography and spacing, but it must preserve the exact geometry and information.

## 4. Live-test presentation

Use the existing calibration shell, with these content requirements:

- Intro heading: `Find your starting level`
- Summary: `15 questions · about 20 minutes · no calculator`
- Supporting copy from `assessment.studentIntro.supportingText`
- One question per screen.
- Clearly visible `Question n of 15` progress.
- Answer buttons large enough for touch input and keyboard accessible.
- Preserve selected answers when moving backward and forward.
- Do not require an account before the student can start or see their basic result, if the current product flow supports anonymous attempts.
- Render diagrams responsively with `width: 100%`, intrinsic aspect ratio, and `object-fit: contain`; never stretch or crop them.
- Do not show the words accessible, medium, difficult, specification codes, mistake tags, or target time.
- Do not add decorative animation that delays question interaction or causes layout shift.

Render all mathematics through the existing LaTeX/MathJax component. Never display raw source such as `\\dfrac`, missing fraction bars, plain `x^2`, or broken roots.

## 5. Marking and results

- Award one mark per correct answer and apply no negative marking.
- Use the supplied `correctOption` values exactly.
- After submission, show the supplied worked solution and `fastInsight` for each item.
- Feed the selected incorrect option's mistake tags into the existing diagnostic system where compatible.
- Treat any ESAT scaled-score estimate as provisional unless it is already based on empirical calibration data. Do not invent false precision from 15 questions.
- Prefer a range and careful wording such as `estimated starting range` over a guaranteed score prediction.

## 6. Tests and release blockers

Add or update tests for:

1. Exactly 15 unique questions in the intended order.
2. Exactly one valid correct option per question.
3. Correct answer sequence `CEBADFCAEBDFACE`.
4. Difficulty counts `4 accessible / 7 medium / 4 difficult` internally.
5. All eight diagram assets exist, are non-blank, and meet minimum dimensions.
6. All LaTeX strings render without a parser error.
7. No internal answer or difficulty metadata is shown during the live test.
8. Back/forward navigation retains answers.
9. Submission produces the correct raw score for an all-correct, all-wrong, and mixed fixture.
10. Existing calibration and analytics tests still pass.

Then perform browser verification at approximately 1440 px, 1024 px, and 390 px widths. Capture every visual question. Check labels, clipping, option wrapping, image sharpness, cumulative layout shift, and tap targets.

Do not declare completion if any of the following occurs:

- a diagram is missing, stretched, blurry, clipped, or geometrically wrong;
- raw LaTeX appears;
- any supplied answer check fails;
- Q14 reveals Q's coordinate;
- Q15 contains a misleading line through the solid;
- an option wraps into an unreadable or ambiguous expression;
- the user must sign in before seeing any result despite anonymous results being supported;
- old attempts are silently mixed with v2 attempts.

At the end, report:

1. Files changed.
2. How each semantic diagram spec was mapped to the existing visual engine.
3. Commands and tests run with exact results.
4. Browser widths checked.
5. Paths to all eight final production diagrams.
6. Any remaining uncertainty. Do not hide failures or silently alter question content.

---
