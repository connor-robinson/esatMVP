# Diagram archetypes (quality gate SVG pipeline)

Pick **one primary** `archetype_id` per scene. Combine only when the brief explicitly needs two idioms (then use `mixed` and list sub-parts).

## 1. `axes_graph`

- **Plotting:** Curves **must** follow **numeric samples** from the **stated equations** in the question (polyline or path of `L` segments). **Do not** approximate parabolas / exponentials / trig with hand-tuned cubic Béziers — wrong slopes near crossings (e.g. \(y=x^2\) too flat where \(f'(x)\) is large) and **ambiguous** local overlap with another curve.
- **Intersections:** Only **true** mathematical crossings; where \(f'(x^*)\neq g'(x^*)\), draw so **steepness differs visibly** at the meet (dense samples near \(x^*\) if needed). **No** extra roots; clarity is about **angle separation**, not fake crossings.
- **Axes:** **Thin** strokes (~**1.0–1.3**), **open** line arrowheads (two strokes at the tip, **not** filled triangles). **No** grid, **no** outer plot frame box.
- **Ticks:** **Sparse** — only values needed for the item (e.g. \(0,2,4\) on \(x\) and \(4,16\) on \(y\) when those are the story). **Serif**, **upright** numerals; origin **`0`** not **`O`**.
- **Type:** *x*, *y* at tips — **italic serif** (Times / STIX / Cambria-class).
- **Curves:** **Quiet** linework; same weight family; one curve **lightly** dashed only if required — **long** gentle dashes, not heavy chart defaults.
- **Labels:** Equation tags (e.g. \(y=x^2\)) **offset** from **busy** intersection zones. Superscripts: Unicode `²` `³` or **one** clean `tspan` baseline-shift — **not** stacked `dy` hacks.
- **Viewport:** **Deliberate** range — **no** empty negative-\(x\) (or other) margin **without** ticks or mathematical reason; modest diagram size (print-integrated, not infographic-centred).

## 2. `geometry_polygon`

- Points, segments, polygons, circles, tangents, chords as needed.
- Marked angles as thin arcs; auxiliary lines dashed.
- Vertices visible; no label sitting on an intersection.

## 3. `mirror_ray_optics`

- Straight mirror segments; clear hinge / meeting angle if two mirrors.
- Incident and reflected rays with **open** / simple stroke arrowheads when direction matters (not filled triangles).
- Reflection order visually obvious (first bounce, second bounce).

## 4. `container_fluid_layers`

- Upright container (often cylindrical outline as two vertical walls + base + optional top opening).
- **Horizontal** liquid–liquid and liquid–air boundaries perfectly level.
- Layer **vertical proportions** match stated depths (e.g. lower 4 cm vs upper 6 cm of a 10 cm stack ⇒ 40% / 60% of interior height).
- Reference lines (e.g. “7 cm from base”) distinct from layer boundaries; dimension style clear.

## 5. `shaded_region`

- Bounded region fill with neutral grey; boundary strokes crisp.
- If combined with graph or geometry, keep one clear shaded target.

## 6. `symmetric_construction`

- Mirror symmetry axis dashed when auxiliary; main figure balanced.
- Equal segments / equal angles only when stated or implied.

---

## Worked reference: immiscible liquids in a cylinder

**Brief pattern:** Liquids P and Q in a tall cylinder; depths; optional horizontal line at a measured height from base; optional cross-sectional area label.

**Archetype:** `container_fluid_layers` (often with a small `geometry_polygon` flavour for the cylinder outline only).

**Scene checklist:** cylinder interior; lower layer Q; upper layer P; horizontal reference at correct fraction of height; labels “Liquid Q”, “Liquid P”; “7 cm” (or as given); “10 cm²” or “cross-sectional area = 10 cm²” if required.

**Layout hints:** portrait canvas; cylinder occupies ~50–65% of height; labels centred in respective liquid bands when space allows; dimension for 7 cm to the side with tick marks, not on the layer boundary line.
