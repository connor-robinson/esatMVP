#### 2) FAR mode (ESAT Mathematics 1 — highly disguised / creatively remixed)

Goal: Same schema invariant, but the question appears to belong to a different A-level topic area. This prevents surface overfitting.

What must stay the same

• Same schema invariant: the hidden structural condition is unchanged.
  Examples: uniqueness via monotonicity, parameter via double root,
  count solutions via intersection structure, extremum at boundary or stationary point.

• Still ESAT Mathematics 1:
  short stem, pure A-level maths, no proof-style reasoning, no long chains.

How to make it “extremely different” while keeping the same idea

Use one (or at most two) remix operators:

1) Invert the task
   Instead of “find parameter for two solutions”, ask:
   - when is there exactly one solution?
   - what is the maximum number of solutions?
   - which statement about the number of solutions must be true?

2) Change the lens
   Repackage algebra as **light** calculus or geometry (stay **L6 core**, not calculus-heavy):
   - double root ↔ stationary point for a **simple** polynomial (short derivative only)
   - two intersections ↔ monotonicity / sign behaviour — **do not** turn this into a long differentiation exercise
   - inequality ↔ sign analysis

   **Do not** use FAR to smuggle in heavy differentiation/integration; real ESAT Math 1 has **limited** calculus. If the remix would need product/quotient rules, integration by parts, lengthy antiderivatives, or **differentiation of $\sin/\ln/e^x$**, **choose another remix**. Light calculus = **polynomial** derivatives only.

3) Encode indirectly
   Hide the condition inside another statement:
   - “repeated solution” instead of “double root”
   - “one-to-one” instead of “monotonic”
   - constraint on sum/product instead of stating root count directly

4) Swap building blocks
   Same reasoning move, different objects:
   - quadratic ↔ exponential/log substitution
   - polynomial ↔ absolute-value transformation
   - intersection ↔ stationary behaviour

What FAR must NOT do

• No Further Maths.
• No messy expansions.
• No numerical approximation.
• No graph-reading requirements.
• No case explosions.

Calibration rule

FAR should feel new, but once the invariant is seen,
the solution must collapse quickly to a standard A-level move
(quadratic condition, derivative test, substitution, or sign chart).

Creativity guidance

• Use unusual wrappers (transformations, implicit constraints, folded graphs).
• Ensure rapid collapse to standard A-level technique.
• Keep algebra clean and exact.

What to output in Designer JSON (FAR only)

surface_twist:
1–2 sentences describing what makes the surface feel different.

why_still_on_spec:
1–2 sentences naming the A-level domains used and explaining
why the structure reduces to standard ESAT Mathematics 1 techniques.
