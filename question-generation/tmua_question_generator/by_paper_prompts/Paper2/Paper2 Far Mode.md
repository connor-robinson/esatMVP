#### 2) **FAR mode** (Paper 2) — same schema, *highly disguised / creatively remixed*

Goal: preserve the **same schema invariant reasoning move**, but make the surface feel like it comes from a different “template neighbourhood”.
This is where you stop overfitting and force genuine reasoning.

Treat these rules as **strong guidance**, not a ceiling — be creative while staying on-syllabus and faithful to the schema.

### What must stay the same
- **Same dominant schema invariant** (one core reasoning move; no stacking).
- **Same logical identity** of the mistake/insight:
  - e.g. converse vs contrapositive, necessary vs sufficient, quantifier negation, invalid cancellation/hidden zero case, “examples prove” fallacy, missing case, etc.
- **Paper 2 focus**: difficulty comes from **inference**, not computation.
- Still must be **MCQ-viable** with clean, distinct wrong paths.

### How to make it “extremely different” while still the same idea
In FAR mode you are encouraged to do at least one of these (two max), or invent your own equivalent remix:

1) **Switch template family**
- Keep the same invariant, but change the Paper 2 surface form:
  - `error_spotting_lines` ↔ `necessary_sufficient_conditions`
  - `quantifiers_negation` ↔ `counterexample_disproof`
  - `which_statements_true` ↔ `exactly_one_true`
  - `truth_liars_constraints` ↔ `which_statements_true`
This is the main FAR lever for Paper 2.

2) **Invert the task (meta inversion)**
- Ask the “opposite direction” question while preserving the invariant:
  - instead of “which step is invalid?”, ask “which extra condition would make the argument valid?”
  - instead of “which statement must be true?”, ask “which statement could be false?”
  - instead of “which condition is sufficient?”, ask “which condition is NOT sufficient?”

3) **Encode the invariant indirectly**
- Hide the logic target inside a more ordinary-looking wrapper:
  - quantifier logic embedded inside a simple algebraic claim
  - necessary/sufficient phrasing disguised as “only if / iff” in natural language
  - contrapositive confusion embedded as a student’s “therefore” step

4) **Change the mathematical wrapper while keeping inference central**
- Shift domain (still Section 1 maths) so the *same* logic invariant reappears:
  - integers/parity ↔ algebraic expressions ↔ simple functions ↔ geometric constraints ↔ probability statements
Keep the maths simple; the reasoning is the bottleneck.

### Calibration rule for FAR
- FAR should feel **new**, but once the invariant is spotted, it should **collapse cleanly**.
- It must not become long proof writing, heavy algebra grind, or a multi-case explosion.

**Explicit creativity guidance**

* **Make the surface wrapper feel novel/unexpected**: Use unusual wrappers, template switches, or indirect encodings while preserving the logical invariant
* **However, ensure the solution collapses to standard TMUA moves**: Within a few steps, the question must reduce to standard Section 1/2 spec moves
* **No messy expansions**: Avoid long algebraic expansions or case explosions
* **No approximation required**: All reasoning must be exact, using only spec techniques
* **If your idea would require approximation, long expansion, or off-spec techniques, redesign**: The question must be solvable with clean, exact reasoning using only Section 1/2 spec techniques

**What to output in Designer JSON**

* `surface_twist`: 1-2 sentences describing what makes this feel different (e.g., "Uses a truth-tellers/liars wrapper around a polynomial root condition", "Presents as a proof ordering question but tests quantifier negation")
* `why_still_on_spec`: 1-2 sentences naming exact spec tags (Section 1 and Section 2) and explaining the collapse (e.g., "Uses M1 and Arg2 - the polynomial condition reduces to a standard discriminant check")

### What FAR must NOT do
- Do not drift into off-syllabus formal logic or university proof methods.
- Do not rely on a diagram or unspecified visual.
- Do not stack multiple deep ideas to create difficulty.
- Do not turn it into a Paper 1 “compute the value” question unless the schema explicitly demands it.
- Do not make distractors “random near-misses”: every wrong option must correspond to a distinct reasoning failure.


**What to output in Designer JSON**

* `surface_twist`: 1-2 sentences describing what makes this feel different (e.g., "Uses a truth-tellers/liars wrapper around a polynomial root condition", "Presents as a proof ordering question but tests quantifier negation")
* `why_still_on_spec`: 1-2 sentences naming exact spec tags (Section 1 and Section 2) and explaining the collapse (e.g., "Uses M1 and Arg2 - the polynomial condition reduces to a standard discriminant check")

### What FAR must NOT do
- Do not drift into off-syllabus formal logic or university proof methods.
- Do not rely on a diagram or unspecified visual.
- Do not stack multiple deep ideas to create difficulty.
- Do not turn it into a Paper 1 “compute the value” question unless the schema explicitly demands it.
- Do not make distractors “random near-misses”: every wrong option must correspond to a distinct reasoning failure.


**What to output in Designer JSON**

* `surface_twist`: 1-2 sentences describing what makes this feel different (e.g., "Uses a truth-tellers/liars wrapper around a polynomial root condition", "Presents as a proof ordering question but tests quantifier negation")
* `why_still_on_spec`: 1-2 sentences naming exact spec tags (Section 1 and Section 2) and explaining the collapse (e.g., "Uses M1 and Arg2 - the polynomial condition reduces to a standard discriminant check")

### What FAR must NOT do
- Do not drift into off-syllabus formal logic or university proof methods.
- Do not rely on a diagram or unspecified visual.
- Do not stack multiple deep ideas to create difficulty.
- Do not turn it into a Paper 1 “compute the value” question unless the schema explicitly demands it.
- Do not make distractors “random near-misses”: every wrong option must correspond to a distinct reasoning failure.