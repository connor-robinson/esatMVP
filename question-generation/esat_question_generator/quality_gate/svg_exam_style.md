# TMUA / Cambridge exam SVG style (mandatory)

All quality-gate SVG diagrams must look like a **printed maths admissions test** figure: minimal, precise, black-and-white, sparse labels, no decoration, no AI/website styling.

**Core instruction for every generation step:**

> Generate a clean black-and-white TMUA-style admissions-test SVG diagram. Use Times-class serif exam typography (not Arial/Helvetica), thin black strokes, sparse labels, no colour, no shadows, no gradients, no decorative styling. The diagram must be mathematically clear, printable, and not over-labelled. Include only information needed to answer the question. Use a proper viewBox and ensure nothing is cropped.

The diagram must contain **useful** information the student needs to inspect or reason about — not mere decoration.

---

## 1. Typography (serif exam paper — NOT sans UI)

**Do NOT** use Arial, Helvetica, Inter, or `system-ui` as the main diagram font.

**Font stack for all `<text>`:**

```text
font-family: "Times New Roman", Times, "STIX Two Text", "Cambria Math", serif;
```

- **Variables** (*x*, *y*, θ, λ): italic serif, ~14–15px  
- **Point labels** (A, B, C): upright serif capitals  
- **Numbers / tick labels**: upright serif, 11–12px (small) or 14–15px (normal)  
- **Units / short descriptions**: upright serif  
- Normal weight unless emphasis is mathematically necessary  
- **No** bold UI headings, rounded web fonts, shadows on text, or stroke outlines on glyphs (`fill` only, `#111` or `#222`)

---

## 2. Lines and colour

| Role | stroke | stroke-width |
|------|--------|----------------|
| Main geometry / curves | `#111` or `#000` | 1.4–1.8 |
| Axes / secondary | `#111` / `#333` | 1.0–1.3 |
| Construction / dashed | `#333` | 1.0–1.2, `stroke-dasharray="4 4"` or `"5 4"` |

- `stroke-linecap="round"` and `stroke-linejoin="round"` only where they improve clarity  
- **No** cartoon-thick lines (avoid stroke-width > 2.5 unless a brief explicitly requires it)  
- **No** gradients, glows, filters, drop shadows, coloured arrows, or textured fills  
- Grey fills only when needed: `#B8B8B8`, `#D9D9D9` — never bright colour  
- Background: transparent or white; **no** decorative full-frame background rect unless required  

---

## 3. SVG structure

- Always include a clean `viewBox`; centre content with generous padding  
- **Inline attributes only** — no external CSS, no `<script>`, no `foreignObject`, no embedded images  
- Portable monochrome SVG that prints in B&W  
- Group with `<g>` when helpful; respect z-order: fills → strokes → knockouts → text  

---

## 4. Labels

- Sparse, mathematically useful only  
- Offset from lines/points — no collisions  
- `text-anchor` and `dominant-baseline` set deliberately  
- Leader lines + white knockouts under text when clearance &lt; 10px from ink (knockout `fill="#ffffff"` only under glyphs, not as a page background)  
- Origin: numeral **0**, not letter **O**, unless the stem names point O  

---

## 5. Points

- Small filled circles: `r="2.2"` to `r="3"`, `fill="#111"`  
- Omit dots when intersection is already clear  

---

## 6. Axes and graphs

- Thin black axes; **open** arrowheads (two short `<line>` segments, stroke only — **no** filled triangular markers)  
- Short sparse ticks; only key intercepts/labels from the stem  
- **No** grid unless the question requires it  
- Curves: smooth black polylines/paths from **numeric sampling** of stated equations — not hand-fitted Bézier guesses  
- Open whitespace — do not cram the plot  

---

## 7. Geometry

- Not to scale unless stated; relationships must look plausible (parallel, perpendicular, tangency)  
- Angle arcs and right-angle markers only where needed — small and clean  
- Parallel marks short and subtle  

---

## 8. Physics-style (if needed)

- Simple black arrows; small open arrowheads  
- Prefer black only for TMUA maths  

---

## 9. Implementation constants (reference)

When planning layout JSON or writing SVG directly, target:

- `mainStrokeWidth`: 1.6  
- `secondaryStrokeWidth`: 1.2  
- `constructionStrokeWidth`: 1.1  
- `labelSize`: 14  
- `smallLabelSize`: 12  
- `pointRadius`: 2.5  

Primitives: thin `line` / `path` / `polyline` / `circle`; `text` for labels (not path-outlined text).

---

## 10. Quality checks (enforced in code where possible)

Reject or revise if the SVG has:

- `fill="#FFFFFF"` or `fill="#fff"` on `<text>` (unless paired with an intentional knockout rect)  
- `linearGradient`, `radialGradient`, `<filter>`, feDropShadow, or heavy blur  
- `stroke-width` &gt; 2.5 without justification  
- Missing `viewBox`  
- Web fonts: Arial, Helvetica, Inter, system-ui  
- Excessive labels (roughly &gt; 28 `<text>` nodes)  
- Labels obviously clipped outside `viewBox`  
- `<script>` or external stylesheet references  

---

## 11. Anti-patterns (never)

- Infographic chart styling (thick axes, filled arrow markers, sans tick labels)  
- Photorealistic or 3D shading  
- Decorative borders, titles, captions inside the image  
- Answer-revealing labels for unknowns the student must find  
