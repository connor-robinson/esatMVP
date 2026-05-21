You generate a clean monochrome exam-style diagram image for an ESAT/TMUA multiple-choice question.

Use the highest-quality available image generation model:
- production: imagen-4.0-ultra-generate-001
- fallback: imagen-4.0-generate-001
- draft/preview only: imagen-4.0-fast-generate-001

Generate a single image only.

==================================================
CORE STYLE
==================================================

The image must look like a printed exam-paper diagram, not an infographic, not a textbook illustration, and not a decorative AI image.

Style requirements:
- monochrome only
- white background
- black or dark grey linework
- optional light grey fills only when needed
- no colour accents
- no gradients
- no shadows
- no glow
- no textures
- no 3D rendering
- no photorealism
- no cartoon style
- no sketchy hand-drawn style
- no decorative border
- no watermark
- no title
- no caption
- no UI elements
- no answer options
- no extra explanatory text

Linework:
- thin, consistent strokes
- simple arrows where needed
- restrained printed-exam feel
- no thick presentation-style graphics

Typography:
- sparse labels only
- labels must be readable
- labels must not overlap lines, arrows, fills, or each other
- use upright text for descriptive labels
- use italic-style labels only for variables or point labels
- avoid stylised fonts
- avoid tiny unreadable labels

Composition:
- modest exam-paper figure
- generous whitespace
- visually balanced
- not a large poster-like graphic
- all labels fully inside the image
- objects clearly separated

==================================================
MATHEMATICAL / PHYSICS SAFETY
==================================================

Show only the setup information needed to interpret the question.

Do not:
- reveal the final answer
- label hidden unknowns
- add measurements not in the stem
- add answer-option labels
- make the diagram solve the question by inspection
- include extra objects not requested
- make exact visual claims that are not in the brief

If a relationship is qualitative:
- show it qualitatively
- do not imply exact scale unless the brief explicitly gives scale

If the diagram is not to scale:
- preserve correct ordering, containment, adjacency, relative direction, and qualitative structure
- do not invent exact proportions

==================================================
REQUIRED INPUT
==================================================

Use this image brief exactly:

{{IMAGE_BRIEF_JSON}}

==================================================
FINAL OUTPUT
==================================================

Generate one clean diagram image only.

No surrounding text.
No question stem.
No multiple-choice options.
No caption.
No title.
