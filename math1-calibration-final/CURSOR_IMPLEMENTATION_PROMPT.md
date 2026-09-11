# Cursor task: implement the final ESAT CAMP Mathematics 1 calibration

Implement the attached `math1-calibration-final` package in the existing ESAT CAMP codebase. First inspect the current calibration route, question schema, answer persistence, timer, results calculation, analytics conventions and diagram asset handling. Follow established project patterns rather than creating a parallel test system.

The canonical content is `questions.json`. Do not rewrite, regenerate or silently simplify the questions. The package has already been mathematically and visually validated.

## Product goal

This is many students' first interaction with ESAT CAMP. It must feel fast, serious and unusually well made.

The intended feeling is:

1. Question 1 is visually inviting and solvable.
2. The middle changes pace and rewards observations rather than long calculations.
3. Questions 7, 11, 13 and 15 clearly separate strong students without using niche syllabus material.
4. Question 15 ends with a satisfying Pythagorean insight.
5. The result feels evidence-based but never pretends to be an official ESAT score.

## Source files

- `questions.json`: content, options, answers, solutions, tags, timing, provisional IRT values and visual specs.
- `diagram_previews/*.png`: eight approved reference diagrams.
- `score_model_reference.ts`: reference score-estimation implementation.
- `NSAA_ANALYSIS_AND_BLUEPRINT.md`: internal rationale; do not publish this page.
- `validate_content.py`: content and image validation.

## Required test behaviour

- Assessment ID: `m1-calibration-final`
- Exactly 15 questions.
- 20-minute countdown timer.
- No calculator.
- One answer per question; variable option counts from 6 to 8.
- Students may move backwards and forwards.
- Show a compact question navigator with answered/unanswered states.
- Autosave answers and remaining time using the existing authenticated persistence mechanism; use local recovery only if that is already supported.
- Submit automatically at zero seconds using the answers currently saved in client state.
- Before an early submission, warn about unanswered questions without preventing submission.
- Never reveal difficulty, IRT values, correct answers, mistake tags, topic labels, or inspiration metadata during the test.
- Render every expression with the project's existing KaTeX/LaTeX component. Raw backslashes must never appear.
- Diagrams are not measurable; retain the `[diagram not to scale]` caption inside each supplied image.

## Content replacement

Replace the existing Mathematics 1 calibration content with the 15 entries in `questions.json`.

Preserve the exact order. Old ESAT CAMP Q4 (formula rearrangement) is now final Q3. Old ESAT CAMP Q6 (quadratic tangency) is now final Q6. The other questions are the approved final versions.

Do not reintroduce any rejected items, including:

- time-lapse storage;
- 3D-printer filament mass;
- parabolic-arch root solving;
- similar-sculpture density;
- growing dot walls;
- histogram questions;
- standard tower-of-elevation trigonometry;
- shortest surface route over a cuboid.

No final item requires the quadratic formula. Question 6 deliberately uses the discriminant only.

## Diagram implementation

Copy the eight approved PNGs to the appropriate public asset directory and reference them through the app's normal image component:

- Q1 `q01-midpoint-incircle.png`
- Q5 `q05-square-points.png`
- Q7 `q07-number-spiral.png`
- Q9 `q09-circle-tangent.png`
- Q10 `q10-gears.png`
- Q11 `q11-counter-transfer.png`
- Q12 `q12-inscribed-polygons.png`
- Q15 `q15-tangent-circles.png`

Use the `visualSpec.altText` value from each question as the image alt text.

Display rules:

- Preserve the complete image without cropping.
- Desktop maximum width: approximately 560-680 px depending on aspect ratio.
- Mobile width: `100%` of the question column with height automatic.
- Never upscale beyond the image's intrinsic width.
- Give the image generous white space but avoid a card inside a card.
- Do not add colour, gradients, shadows or decorative illustration.
- Maintain black, white and grey output. The historic NSAA aesthetic is sparse: thin lines, clear labels, no ornamental axes or grid.
- If production requires SVG, faithfully trace the supplied geometry. Do not ask a generative model to redraw it.

Run `python3 render_reference_diagrams.py` only when source geometry changes. A renderer change requires human review of all eight outputs and the contact sheet.

## Question interface

Use the existing assessment shell where possible. The content area should prioritise the question:

- question number and progress at the top;
- stem with comfortable line height;
- diagram immediately after the relevant sentence or displayed expression;
- vertically stacked answer choices;
- Previous and Next controls in a stable position;
- persistent but visually quiet timer;
- no motivational popups or correctness feedback between questions.

Keyboard support:

- Number or letter shortcuts select options only if this already matches the site convention.
- Left/right navigation must not steal cursor behaviour from focused controls.
- Every option is a native radio input or an equally accessible labelled control.
- Focus states must be visible.

## Estimated ESAT range

Use `score_model_reference.ts` as the scoring reference. Adapt its types/imports to the app but preserve the calculation and constants.

The estimator uses the complete right/wrong response pattern:

- Every item has a provisional difficulty `b` and discrimination `a` in `questions.json`.
- Guessing probability is `1 / optionCount`.
- Ability is found by MAP estimation on the fixed theta grid.
- The normal prior stabilises a short 15-question test.
- Theta is provisionally mapped so the intended cohort median is 4.5 and its 90th percentile is 7.0.
- The posterior 16th and 84th percentiles form the estimated range.

This is not an official score conversion. Use these labels exactly:

- Heading: `Estimated ESAT range`
- Supporting label: `Based on this 15-question calibration`
- Method link: `How this estimate works`
- Disclaimer: `This is a provisional diagnostic estimate, not an official ESAT score. Your real result will also depend on the live paper and test-day conditions.`

Never display `Official score`, `Predicted official score`, a percentile, or false precision.

Display the central estimate to one decimal place, but make the range visually primary. Example:

> Estimated ESAT range: 5.4-6.5  
> Midpoint estimate: 6.0

Do not show an estimate if fewer than 12 questions were answered. Instead show:

> Not enough evidence for an estimated range. You answered 11 of 15 questions.

Timing must not change the estimated score. It should appear in a separate pace section.

## Results evidence

Alongside the estimate, show:

1. Raw score: `x / 15`
2. Questions answered: `x / 15`
3. Foundation anchors: Q1, Q2, Q4, Q10
4. Core anchors: Q3, Q5, Q6, Q8, Q9, Q12, Q14
5. High-ceiling anchors: Q7, Q11, Q13, Q15

Use the anchor groups for plain-English interpretation, not a second score:

- Foundation below 3/4: `Fundamentals are currently leaking marks.`
- Foundation 4/4 and high-ceiling 0-1/4: `Your foundations are secure; harder pattern-selection questions are the next step.`
- High-ceiling 2/4: `You are beginning to convert the questions that separate stronger candidates.`
- High-ceiling 3-4/4 with raw score at least 11: `You converted most of the paper's strongest separator questions.`
- If high-ceiling is at least 3/4 but foundation is below 3/4: `Your result is uneven: strong reasoning appeared alongside avoidable foundational losses.`

Skill groups:

| Display group | Questions |
|---|---|
| Algebra and functions | 3, 6, 7, 8, 13 |
| Geometry and trigonometry | 1, 5, 9, 12, 15 |
| Number, proportion and rates | 2, 10, 14 |
| Probability | 4, 11 |

For groups with only two or three questions, say `limited evidence` and do not describe the student as globally weak. Show counts such as `3/5`, not fake percentage precision.

## Review mode

After submission, allow students to review every question.

Each review card should include:

- their answer;
- the correct answer;
- full `solutionMarkdown`;
- a collapsed `Fast insight` using `fastInsight`;
- no internal NSAA inspiration metadata;
- no raw IRT parameters;
- a clear diagram where applicable.

Use `mistakeTagsByOption` only to select helpful feedback internally. Never display machine-like labels such as `sign-error-when-reversing-denominator` directly. Map them to natural copy or omit them.

## Analytics

Use existing analytics wrappers and naming conventions. At minimum preserve or add:

- `calibration_started` with `subject: math_1`, `assessment_version: 3.0.0`
- `calibration_question_answered` with question ID and elapsed bucket, but never send mathematical answer content as PII-like free text
- `calibration_submitted` with raw score, answered count and submission reason (`manual` or `timeout`)
- `calibration_results_viewed`
- `calibration_review_opened`
- results CTA event using the existing CTA convention

Do not emit the estimated ESAT value as an advertising conversion value.

## Tests

Add or update automated tests for:

### Content

- Loads exactly 15 questions in positions 1-15.
- Answer sequence is `CEBFADCEBFADCEB`.
- Difficulty mix is 4 accessible, 7 medium, 4 difficult.
- Eight diagram assets resolve.
- Every correct option exists and every item has only one keyed answer.
- Total target time is 1195 seconds.
- LaTeX renders without raw markup or parser errors.

### Scoring

- Fewer than 12 answered questions returns no estimate.
- All-wrong and all-correct patterns remain within the 1.0-9.0 bounds.
- Output is deterministic for the same responses.
- The displayed range contains the central estimate.
- Displayed range is at least 0.8 points wide before empirical calibration, except where clamped by scale endpoints.
- Swapping a correct and incorrect response between differently parameterised items can change the estimate.
- Timing changes do not change the estimate.
- Unknown question IDs are ignored or rejected consistently with existing validation; they must never influence the score.

### Test flow

- Refresh restores answers and timer correctly.
- Timeout submits the latest selected answer.
- Early submission warns when questions remain unanswered.
- Keyboard and screen-reader navigation work.
- Internal metadata is absent from the student-facing DOM and payloads.

### Visual regression

- All eight diagrams remain uncropped at desktop and mobile widths.
- Option text does not collide with radio controls.
- Long fractions and displayed equations do not overflow at 320 px width.

Finally run the repository's formatter, typecheck, unit tests and relevant browser tests. Also run from this package:

```bash
python3 validate_content.py
```

Report the files changed, tests run and any assumptions. Do not deploy unless explicitly asked.

