#### 2) FAR mode (ESAT Mathematics 2 — creatively remixed, same invariant)

Goal: Keep the same schema invariant, but make the question feel like it belongs to a different Mathematics 2 subtopic or surface.

What must stay the same

• Same schema invariant: the hidden structural condition is unchanged.
  Examples: uniqueness via monotonicity, parameter via tangency or repeated root,
  count solutions via intersection structure, extremum from stationary/boundary logic.

• Still ESAT Mathematics 2:
  short stem, exact no-calc methods, no proof style, no long chains.

How to make it feel different while keeping the same idea

Use one (or at most two) remix operators:

1) Invert the task
   Instead of “find the parameter”, ask:
   - when is there exactly one solution?
   - how many solutions are possible?
   - which statement must be true?

2) Change the lens
   Repackage the same structure through another Math 2 topic:
   - repeated root ↔ tangency / stationary-point condition (**simple** derivative only — no long calculus chain)
   - algebraic equation ↔ graph intersection
   - sequence condition ↔ logarithmic or exponential reformulation
   - area/integral condition ↔ symmetry or root structure (**avoid** making this a heavy integral-computation item; real ESAT Math 2 is **not** dominated by long integration)

3) Encode indirectly
   Hide the key condition inside another standard statement:
   - “one-to-one on an interval” instead of monotonic
   - “same gradient” instead of tangency stated directly
   - “sum to infinity exists” instead of writing |r| {<} 1

4) Swap the object class
   Same reasoning move, different Math 2 object:
   - polynomial ↔ trig form
   - exponential/log form ↔ algebraic substitution
   - sequence/series ↔ functional equation
   - coordinate geometry ↔ derivative framing

What FAR must NOT do

• No Further Maths.
• No advanced calculus methods; **no** calculus-heavy FAR items (long $\frac{\mathrm{d}}{\mathrm{d}x}$ chains, integration by parts / partial fractions as the core task).
• No messy expansions.
• No numerical approximation.
• No graph-reading dependence.
• No case explosion.

Calibration rule

FAR should feel new, but once the invariant is seen,
the solution must collapse quickly to a standard **L6 / ESAT Mathematics 2** move
such as substitution, exact trig reasoning, log/exponential laws, sequence formulae,
or **short** stationary-point / **light** calculus (**polynomial derivatives only**; no $\sin/\ln/e^x$ as the object of differentiation) — **not** lengthy differentiation-and-integration grind.

Creativity guidance

• Use unfamiliar wrappers, not unfamiliar mathematics.
• Keep the algebra exact and controlled.
• Make the novelty come from presentation, not from extra layers.

What to output in Designer JSON (FAR only)

surface_twist:
1–2 sentences describing what makes the surface feel different.

why_still_on_spec:
1–2 sentences naming the Mathematics 2 domains used and explaining
why the structure reduces to standard ESAT Mathematics 2 techniques.
