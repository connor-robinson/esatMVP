# Physics TMUA / ENGAA Visual Style Guide V1

This file is a human-readable style guide for generating concept visuals that resemble TMUA / ENGAA / NSAA past-paper diagrams.

It is not a routing file.
It is a reference file for prompt-writing and QC.

---

## Observed style characteristics

Based on typical admissions-test diagrams and the supplied examples, the target style has these features:

### 1. Monochrome print look
- Very light grey or off-white paper background.
- Black or dark charcoal line work.
- No bright colour blocks.
- Shading, if present, is subtle and functional.

### 2. Serif typography
- Times New Roman–like serif text.
- Maths variables in italic serif.
- Units and ordinary words in upright serif.
- Labels are neither oversized nor cramped.

### 3. Clean vector-like line art
- Thin, consistent strokes.
- Slight hierarchy between main outlines and interior details.
- No painterly textures.
- No comic or sketchbook look.

### 4. Label discipline
- Labels sit outside main objects when possible.
- Leader lines are clean and direct.
- No overlapping text.
- No crossing leader lines unless unavoidable.
- Exact requested wording should be preserved.

### 5. Restraint
- Minimal clutter.
- Minimal decorative detail.
- Only useful annotations.
- White space is part of the design.

### 6. Exam conventions
- Axes with small arrowheads.
- Italic axis symbols near arrow tips.
- Bracketed notes such as `[diagram not to scale]` centred under the figure.
- Cross-hatching reserved for material or insulation regions.
- Measurement arrows used sparingly and clearly.

---

## What usually breaks authenticity

- obvious sans-serif fonts,
- too many labels,
- text touching curves or wires,
- overly thick lines,
- grey gradients or soft rendering,
- bright colours,
- perspective-heavy 3D scenes,
- decorative clip-art feel,
- invented numeric labels,
- labels placed randomly inside the figure.

---

## Prompting cheat sheet

Useful prompt phrases:
- `Draw this as a professional monochrome admissions-test diagram.`
- `Use Times New Roman-like serif labels and italic serif maths variables.`
- `Keep all labels separate from lines and objects; no overlap.`
- `Use clean black/charcoal vector-like strokes on a very light grey paper background.`
- `Match the style of TMUA / ENGAA printed exam diagrams.`
- `Use only the listed labels and no extra annotations.`
- `If included, set “[diagram not to scale]” centred beneath the image.`

Useful negative prompt phrases:
- `No sans-serif fonts.`
- `No decorative shading or photorealism.`
- `No extra labels or invented dimensions.`
- `No overlap, clutter, or label collisions.`
- `No bright colours or cartoon style.`

---

## Recommended QC checklist

Before accepting an image, verify:
- Does it look like it belongs in a printed admissions test?
- Is the font convincingly serif?
- Are variables italic where appropriate?
- Are labels readable and separate?
- Is there any extra information that should not be there?
- Is it safely illustrative rather than answer-bearing?

