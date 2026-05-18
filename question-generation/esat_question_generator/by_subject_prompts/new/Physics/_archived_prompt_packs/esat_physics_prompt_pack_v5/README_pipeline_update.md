# ESAT Physics Generation Pipeline V5

## Purpose

## V5 update summary

V5 keeps the V4 architecture but tightens two behaviours:

1. **Goldilocks difficulty**
   - Questions must be neither plug-and-chug nor A-level extension/challenge problems.
   - Medium/Hard/Extreme should have one compact reasoning hinge, not a chain of several physics laws.
   - The pipeline now explicitly rejects over-stacked chains such as motional emf → induced current → magnetic force → terminal velocity → power.

2. **Brutally simple diagrams**
   - Default visual route is now `none`.
   - Concept images are optional and non-answer-bearing only.
   - Concept images should normally have max 3 object types, max 3 labels, and no unrequested arrows, force labels, field patterns, construction arcs, or explanatory overlays.
   - Overcomplicated images should be deleted rather than accepted.

V5 updates only the calibration/safety prompts. It does not change the overall V4 pipeline architecture.

---

## V4 update summary

V4 added a second major improvement on top of V3:

> concept-image prompts must now preserve **diagram logic**, not just diagram style.

This update was motivated by a common failure mode in generated exam diagrams:
- the picture looked polished,
- but object relationships were wrong,
- support surfaces were implausible,
- measurement arrows were unclear, or
- comparative sizes were misleading even with a "not to scale" note.

V4 therefore strengthens three files:
- `Physics Concept_Image_Prompt.md`
- `Physics Concept_Image_Verifier.md`
- `Physics Concept_Image_Regen.md`

New V4 concept-image requirements include:
- explicit object-support relations,
- explicit measurement mapping,
- relative-size plausibility checks,
- simplified human/object figure requirements,
- hard constraints such as `bag must be resting on trolley platform`.

---

This pack upgrades the Physics generation pipeline in three directions at once:

1. **better question selectivity**,
2. **better visual quality control**,
3. **Goldilocks difficulty control so questions do not become too hard.**

The central lesson is:

> ESAT / ENGAA / NSAA-style Physics difficulty should come from one compact reasoning hinge, not from more words, more arithmetic, more obscure content, or several linked physics laws.

And for visuals:

> Use JSON for accuracy. Use image generation for appearance. Never confuse the two.

---

## What was going wrong before

The old question prompts were good at producing:
- short stems,
- valid school physics,
- no-calculator arithmetic,
- one dominant idea.

But they were not strict enough about **selectivity**.

That produced too many questions of the form:
1. identify formula,
2. substitute values,
3. pick answer.

These feel clean, but they are often too easy for admissions-test Physics.

On the visual side, the old image prompt was too generic. It did not strongly enforce:
- TMUA / ENGAA diagram appearance,
- serif typography,
- label spacing,
- no-overlap discipline,
- exam-style shading and annotation conventions,
- visual QA after generation.

---

# Part A — New Question Pipeline

## Recommended pipeline

```txt
0. Setup
   schemas/Schemas_ESAT.md
   curriculum/ESAT_CURRICULUM.json
   by_subject_prompts/new/ESAT_curriculum.md

1. Designer
   Physics Designer.md
   Physics Sibling Mode.md or Physics Far Mode.md

2. Idea Judge
   Physics Idea_Judge.md

3. Implementer
   Physics Implementer.md

4. Deterministic Validator (code step)
   - JSON parse
   - required-key validation
   - KaTeX lint
   - option-set validation
   - answer-shape validation
   - graph placeholder/schema checks

5. Verifier
   Physics Verifier.md

6. Style Checker
   Physics Style_checker.md

7. Diagram / Graph Router
   Physics Diagram_Graph_Router.md

8. Visual Generation
   a) Physics Accurate_Graph_Spec.md
   b) Physics Accurate_Schematic_Spec.md
   c) Physics Concept_Image_Prompt.md

9. Visual Validation
   Physics Graph_Visual_Verifier.md
   Physics Concept_Image_Verifier.md  (for rendered Gemini images)

10. Retry / Regenerate
   Physics Retry_controller.md
   Physics regen header.md
   Physics Implementer.md
   Physics Concept_Image_Regen.md     (only for concept-image reprompts)

11. Tagging
   Physics Tag_Labeler.md

12. Save
   accepted.jsonl → db_sync.py → Supabase
```

---

## Core philosophy for question generation

Each Medium / Hard / Extreme question should contain a **reasoning hinge**.

A reasoning hinge is the moment where:
- a strong candidate spots the correct physical model,
- a middling candidate chooses a tempting wrong route,
- the difference is conceptual, not just arithmetic speed.

Typical hinges:
- a change in reading corresponds to $2F$, not $F$,
- a quantity is unchanged even though the setup looks different,
- the graph quantity needed is gradient, not height,
- the relevant conservation law is not the most obvious one,
- a vector direction matters,
- two cases must be compared under a hidden constraint,
- a familiar law must be applied in a slightly disguised wrapper.

---

## V5 Goldilocks calibration

A good ESAT Physics item should usually require:

- 1 main physics principle,
- at most 1 supporting school-level idea,
- 1 reasoning hinge,
- 1 short calculation or comparison.

Good hard-question hinges:

- balance reading changes by twice the force,
- graph gradient vs height/area,
- frequency unchanged but wavelength changes,
- terminal velocity means resultant force is zero,
- same current in series but different voltage splits,
- pressure depends on force per area,
- proportional comparison instead of full calculation.

Bad over-hard chains:

- motional emf + induced current + magnetic braking + terminal velocity + power,
- Faraday/Lenz law + circuit resistance + force balance + power,
- exponential cooling + ideal gas pressure unless the rule is given,
- quantitative charged-particle magnetic motion unless the formula is given,
- anything needing a complex explanatory diagram.

---

## What each prompt file now does

### 1. `Physics Designer.md`
Designs the idea only.

Must now explicitly define:
- the dominant reasoning move,
- the discrimination mechanism,
- the intended mid-student wrong route,
- why the question is not direct substitution.

### 2. `Physics Idea_Judge.md`
New pre-implementation gate.

Rejects ideas that are:
- vague,
- formula-only,
- too derivative,
- weakly disguised,
- badly calibrated.

This is one of the highest-leverage additions.

### 3. `Physics Implementer.md`
Builds the final MCQ.

Must ensure:
- visible reasoning hinge,
- believable distractors linked to that hinge,
- exact one-correct-answer integrity,
- explicit visual dependency fields when needed.

### 4. `Physics Verifier.md`
Checks correctness, uniqueness, syllabus, no-calc feasibility, missing information, and graph dependency.

Should be used **after** deterministic validation.

### 5. `Physics Style_checker.md`
Checks authenticity and difficulty.

It should fail questions that are:
- clean but too easy,
- formula-only,
- too grindy,
- too wordy,
- too unlike ESAT / ENGAA / NSAA Section 1 Physics.

### 6. `Physics Retry_controller.md`
Controls regeneration.

Important rule:
- If the question is too easy, do **not** merely change numbers.
- Add or sharpen the reasoning hinge.

---

# Part B — New Visual Strategy

## V5 visual simplification

Most Physics questions should not have generated images.

Use a concept image only if it is simple, optional, and non-answer-bearing.

Concept images should normally obey:

- max 3 object types,
- max 3 labels,
- no force arrows unless explicitly required,
- no field-symbol backgrounds unless the image is purely about field direction,
- no construction arcs,
- no vector labels,
- no solution overlays,
- no apparatus + force diagram + field diagram mashups.

If a concept image makes the setup harder to understand, delete it.

---

## High-level rule

There are now **two visual tracks**.

### Track 1: Accuracy track
Use JSON and deterministic rendering.

Use this when the answer depends on the visual.

Allowed V3 accurate types:
1. **Graphs**
2. **One extra deterministic type only:** simple schematic/apparatus/circuit/block diagram

Do **not** use deterministic JSON for exact geometric diagrams yet.

### Track 2: Appearance track
Use Gemini image generation.

Use this when the visual is illustrative only and does **not** determine the answer.

This is where the TMUA / ENGAA exam-diagram style matters most.

---

## Which visual types belong in which track?

### Use `accurate_graph_json` for:
- line graphs,
- piecewise linear graphs,
- temperature-time / velocity-time / force-time style graphs,
- simple curves where intercepts or turning points matter,
- I–V graphs,
- cooling/heating graphs,
- any graph where gradient, area, intercept, or exact reading matters.

### Use `accurate_schematic_json` for:
- simple circuit diagrams,
- simple apparatus layouts,
- simple force-arrow block diagrams,
- simple labelled setup diagrams where exact geometric measurement is **not** required.

### Use `concept_image_prompt` for:
- simple transport/mechanics setup illustrations,
- simple thermal setup illustrations,
- simple apparatus/context illustrations,
- optional non-answer-bearing solution visuals.

Do not use concept images for complex electromagnetic induction, field-force combinations, or diagrams with many labels/arrows.

### Mark as unsupported if the answer depends on:
- exact ray geometry,
- exact triangles or geometric constructions,
- precise scale drawing,
- image-measured distances,
- any geometry where model error from AI art would be dangerous.

---

# Part C — TMUA / ENGAA visual style standard

## Style analysis from past-paper-like diagrams

The supplied examples and common admissions-paper diagram conventions show a consistent visual language:

### 1. Paper look
- very light grey or off-white paper background,
- no dark backgrounds,
- no decorative framing.

### 2. Typography
- Times New Roman–like serif text,
- maths variables in italic serif,
- units and plain words upright,
- labels are moderate size and clearly printed.

### 3. Line quality
- thin black or charcoal strokes,
- clean vector-like drawing,
- mild hierarchy: main outlines slightly stronger than interior guides,
- no rough hand-drawn wobble unless intentionally subtle.

### 4. Label placement
- labels outside objects where possible,
- leader lines used cleanly,
- no overlap,
- no clutter,
- no accidental touching of labels and lines.

### 5. Minimal shading
- subtle hatch/cross-hatch only when useful,
- no gradients,
- no painterly texture,
- no modern glossy effects.

### 6. Exam conventions
- axis labels near arrow tips,
- measurement arrows simple and readable,
- notes like `[diagram not to scale]` centred beneath the figure,
- no unnecessary embellishment.

This is the exact look the concept-image prompts should aim for.

Reference helper file:
- `Physics TMUA_ENGAA_Visual_Style_Guide.md`

---

# Part D — Visual generation files

## 1. `Physics Diagram_Graph_Router.md`
Decides whether the question needs:
- no visual,
- accurate graph JSON,
- accurate schematic JSON,
- concept image prompt,
- or unsupported route.

## 2. `Physics Accurate_Graph_Spec.md`
Produces structured JSON for exact graphs.

The graph should then be rendered by code, not by an image model.

Recommended renderer stack:
- Python + matplotlib,
- custom SVG generator,
- React/Canvas/SVG component renderer,
- any deterministic rendering tool that you control.

## 3. `Physics Accurate_Schematic_Spec.md`
Produces structured JSON for the one non-graph deterministic type:
- simple circuit / apparatus / block schematic.

Keep this narrow.
Do not let it expand into general geometry.

## 4. `Physics Concept_Image_Prompt.md`
Produces a structured image prompt for Gemini.

This file now explicitly enforces:
- TMUA / ENGAA exam-diagram style,
- Times New Roman–like serif font,
- no overlap,
- no extra labels,
- monochrome / grayscale,
- not-to-scale behaviour,
- post-generation QC.

## 5. `Physics Graph_Visual_Verifier.md`
Checks that the chosen visual route is valid and safe.

## 6. `Physics Concept_Image_Verifier.md`
New file.

This inspects a generated image and outputs:
- `PASS`,
- `REGENERATE`, or
- `DELETE`.

In V4 it also checks spatial logic, support relations, arrow anchoring, and comparative-size plausibility.

It checks:
- style match,
- font plausibility,
- overlap,
- extra labels,
- monochrome style,
- professionalism,
- safety as a non-answer-bearing visual.

## 7. `Physics Concept_Image_Regen.md`
New file.

This takes verifier feedback and rewrites the image prompt for another generation pass.

---

# Part E — Suggested model routing

## Keep model names configurable

Do **not** hard-code model names deeply into logic.
Use environment variables.

Example environment variables:

```bash
MODEL_STRUCTURED_STRONG=YOUR_BEST_REASONING_MODEL
MODEL_STRUCTURED_FAST=YOUR_FAST_REASONING_MODEL
MODEL_STRUCTURED_LIGHT=YOUR_CHEAPEST_RELIABLE_MODEL
MODEL_IMAGE_FAST=YOUR_FAST_IMAGE_MODEL
MODEL_IMAGE_HIGH_QUALITY=YOUR_BEST_IMAGE_MODEL
```

Then map stages to these roles.

## Recommended stage-to-model assignment

### Strong structured model
Use for:
- Designer
- Implementer
- difficult Verifier tasks if needed
- image-prompt generation if you want high prompt quality

### Fast structured model
Use for:
- Idea Judge
- Verifier
- Style Checker
- Diagram / Graph Router
- Graph spec generation
- Visual verifier prompts

### Light structured model
Use for:
- Tag Labeler
- Format Fixer
- simple routing or low-risk metadata tasks

### Fast image model
Use for:
- first-pass concept-image generation,
- drafts for illustrative visuals.

### High-quality image model
Use for:
- final concept-image generation after prompt is stable,
- regeneration after QC if quality matters.

---

# Part F — Recommended visual QA loop

This is important.

## Concept-image loop

```txt
question accepted
   ↓
visual router says concept_image_prompt
   ↓
create concept_image_prompt.json
   ↓
generate image with Gemini image model
   ↓
run Physics Concept_Image_Verifier.md on the rendered image
   ↓
if PASS → save
if REGENERATE → run Physics Concept_Image_Regen.md and generate again
if DELETE → discard asset and either reroute or keep question without image
```

## Regeneration cap

Recommended:
- allow up to **2 regenerate passes**,
- if still not acceptable, **delete** the concept image,
- do not keep a low-quality exam-style image just because the question is good.

## Delete conditions

Delete completely if the image:
- invents critical information,
- becomes answer-bearing,
- is visually confusing,
- cannot reliably achieve exam style after one or two retries,
- looks too unlike a real admissions-paper diagram.

---

# Part G — File attachment and storage design

## Recommended local file tree

```txt
generated/
  physics/
    accepted/
      q_2026_05_17_000123/
        question.json
        designer_plan.json
        idea_judge.json
        verifier.json
        style_checker.json
        tag_labeler.json
        visual_router.json
        graph_spec.json
        schematic_spec.json
        concept_image_prompt.json
        concept_image_verifier.json
        concept_image_regen_1.json
        manifest.json
        assets/
          graph.svg
          graph.png
          schematic.svg
          schematic.png
          concept_image_v1.png
          concept_image_v2.png
          final_concept_image.png
```

## Recommended manifest structure

```json
{
  "question_id": "q_2026_05_17_000123",
  "subject": "physics",
  "status": "accepted",
  "has_visual": true,
  "visual_type": "concept_image_prompt",
  "answer_depends_on_visual": false,
  "assets": [
    {
      "kind": "concept_image",
      "source": "concept_image_prompt.json",
      "path_png": "assets/final_concept_image.png",
      "qc_status": "pass",
      "qc_source": "concept_image_verifier.json",
      "renderer": "MODEL_IMAGE_HIGH_QUALITY",
      "checksum": "..."
    }
  ],
  "model_trace": {
    "designer": "MODEL_STRUCTURED_STRONG",
    "implementer": "MODEL_STRUCTURED_STRONG",
    "verifier": "MODEL_STRUCTURED_FAST",
    "style_checker": "MODEL_STRUCTURED_FAST",
    "visual_router": "MODEL_STRUCTURED_FAST",
    "concept_image_generator": "MODEL_IMAGE_HIGH_QUALITY"
  }
}
```

## Suggested Supabase tables

### `ai_generated_questions`
Main question records.

Suggested fields:
- `id`
- `subject`
- `difficulty`
- `schema_id`
- `variation_mode`
- `question_json`
- `correct_option`
- `primary_tag`
- `secondary_tags`
- `status`
- `has_visual`
- `visual_type`
- `answer_depends_on_visual`

### `ai_question_assets`
One row per asset.

Suggested fields:
- `id`
- `question_id`
- `asset_type`
- `source_type`
- `spec_json`
- `storage_path_svg`
- `storage_path_png`
- `answer_depends_on_asset`
- `qc_status`
- `qc_json`
- `renderer_version`
- `checksum`
- `created_at`

---

# Part H — Implementation order

## Stage 1 — Replace prompt files

Replace or add:
- `Physics Designer.md`
- `Physics Idea_Judge.md`
- `Physics Implementer.md`
- `Physics Verifier.md`
- `Physics Style_checker.md`
- `Physics Retry_controller.md`
- `Physics regen header.md`
- `Physics Sibling Mode.md`
- `Physics Far Mode.md`
- `Physics Diagram_Graph_Router.md`
- `Physics Concept_Image_Prompt.md`
- `Physics Graph_Visual_Verifier.md`
- `Physics Concept_Image_Verifier.md`
- `Physics Concept_Image_Regen.md`
- `Physics TMUA_ENGAA_Visual_Style_Guide.md`

Keep mostly unchanged:
- `Physics Format Fixer.md`
- `Physics Tag_Labeler.md`
- `Physics Accurate_Graph_Spec.md`
- `Physics Accurate_Schematic_Spec.md`

## Stage 2 — Add deterministic validation code

Before any LLM verifier:
- parse JSON,
- validate required keys,
- validate options and answer key,
- lint KaTeX,
- validate graph placeholder/spec linkage,
- validate schematic route consistency.

## Stage 3 — Implement visual loop

Especially for concept images:
- generate,
- verify,
- regenerate if needed,
- delete if still bad.

## Stage 4 — Run sample batch

Recommended test batch:
- 20 Easy
- 30 Medium
- 35 Hard
- 15 Extreme

For each item log:
- retries,
- verifier failure reason,
- style failure reason,
- whether a concept image was requested,
- whether the concept image passed first try,
- whether the asset was deleted.

## Stage 5 — Human audit

Manually review:
- 30 questions,
- 15 attached visuals,
- especially any accepted concept images.

Label each as:
- too easy,
- authentic,
- wrong,
- off-spec,
- too wordy,
- good question / bad image,
- good image / unnecessary,
- excellent.

---

# Part I — Key operating rules

## Question rule
Do not ask for “harder” in vague language.
Ask for a named reasoning hinge.

## Visual rule
If the visual affects the answer, use JSON.
If the visual is only for comprehension or polish, use Gemini image generation.

## Quality rule
Do not keep a weak visual just because the question is good.
A bad exam-style image is worse than no image.

## Scope rule
Do not expand deterministic JSON into exact geometric diagrams yet.
Keep it mainly to:
- graphs,
- one extra type: simple circuit/apparatus/block schematic.

That scope discipline will keep the system much more reliable.

