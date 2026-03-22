
#### 2) **FAR mode** (same schema, *highly disguised / creatively remixed*)

Goal: still the same schema, but the question looks like it lives in a different neighbourhood. This is where you stop users overfitting.

**What must stay the same**

* **Same schema invariant**: the hidden condition/decision point is unchanged.

  * Example invariants: “uniqueness via monotonicity”, “parameter condition via double root”, “count solutions via intersection picture”, “symmetry/translation invariance”, “extremum occurs at boundary or stationary point”, etc.
* Still TMUA Paper 1: **short stem, pure maths, no long proof chains**.

**How to make it “extremely different” while still the same idea**
You can use one (or at most two) of these FAR “remix operators”, or invent your own:

1. **Invert the task**

* Instead of “find (m) so there are two intersections”, ask:

  * “for which (m) is there exactly one solution?”
  * “what is the maximum possible number of solutions as (m) varies?”
  * “which statement about the number of solutions is always true?”

2. **Change the lens**

* Turn an algebra condition into a geometry/intersection condition, or vice versa:

  * “double root” ↔ “tangent point” ↔ “touches axis” ↔ “equal areas implies integral = 0”
  * “inequality solution set” ↔ “sign chart / crossing points picture”

3. **Encode the same condition indirectly**

* Make the schema appear as a consequence of something else:

  * Instead of saying “touches the x-axis”, use “has exactly one x-intercept”.
  * Instead of “two solutions”, use “sum of solutions = … and number of solutions = …” like TMUA Q18 style. 

4. **Swap the building blocks**

* Same reasoning move, but with different “atoms”:

  * Quadratic ↔ transformed modulus graph ↔ simple trig identity with absolute value ↔ log substitution ↔ sequence recurrence (only if it stays Paper 1-ish).

**What FAR must NOT do**

* Don’t become a Paper 2 “proof/logic” question.
* Don’t require a long chain or hidden trick unrelated to the schema.
* Don’t require messy computation or case explosions.

**Calibration rule for FAR**

* FAR should feel "new", but the solution should still collapse quickly *once the invariant is seen*.

**Explicit creativity guidance**

* **Make the surface wrapper feel novel/unexpected**: Use unusual wrappers (tangents, transformations, absolute-value folding, implicit constraints, "exotic-looking" but collapsible expressions)
* **However, ensure the solution collapses to standard TMUA moves**: Within a few steps, the question must reduce to a standard TMUA move as per the spec tags
* **No messy expansions**: Avoid long algebraic expansions or numerical approximation
* **No graph-reading crutches**: If the question doesn't show a graph, don't require reading values off a plot
* **If your idea would require approximation, long expansion, or reading values off a plot, redesign**: The question must be solvable with clean, exact algebra using only Section 1 spec techniques

**What to output in Designer YAML**

* `surface_twist`: 1-2 sentences describing what makes this feel different (e.g., "Uses absolute value folding to disguise a quadratic", "Presents as a sequence but collapses to polynomial root structure")
* `why_still_on_spec`: 1-2 sentences naming exact spec tags and explaining the collapse (e.g., "Uses MM1 and MM4 - the absolute value unwraps to a standard quadratic equation")

---

* **Make the surface wrapper feel novel/unexpected**: Use unusual wrappers (tangents, transformations, absolute-value folding, implicit constraints, "exotic-looking" but collapsible expressions)
* **However, ensure the solution collapses to standard TMUA moves**: Within a few steps, the question must reduce to a standard TMUA move as per the spec tags
* **No messy expansions**: Avoid long algebraic expansions or numerical approximation
* **No graph-reading crutches**: If the question doesn't show a graph, don't require reading values off a plot
* **If your idea would require approximation, long expansion, or reading values off a plot, redesign**: The question must be solvable with clean, exact algebra using only Section 1 spec techniques

**What to output in Designer YAML**

* `surface_twist`: 1-2 sentences describing what makes this feel different (e.g., "Uses absolute value folding to disguise a quadratic", "Presents as a sequence but collapses to polynomial root structure")
* `why_still_on_spec`: 1-2 sentences naming exact spec tags and explaining the collapse (e.g., "Uses MM1 and MM4 - the absolute value unwraps to a standard quadratic equation")

---

* **Make the surface wrapper feel novel/unexpected**: Use unusual wrappers (tangents, transformations, absolute-value folding, implicit constraints, "exotic-looking" but collapsible expressions)
* **However, ensure the solution collapses to standard TMUA moves**: Within a few steps, the question must reduce to a standard TMUA move as per the spec tags
* **No messy expansions**: Avoid long algebraic expansions or numerical approximation
* **No graph-reading crutches**: If the question doesn't show a graph, don't require reading values off a plot
* **If your idea would require approximation, long expansion, or reading values off a plot, redesign**: The question must be solvable with clean, exact algebra using only Section 1 spec techniques

**What to output in Designer YAML**

* `surface_twist`: 1-2 sentences describing what makes this feel different (e.g., "Uses absolute value folding to disguise a quadratic", "Presents as a sequence but collapses to polynomial root structure")
* `why_still_on_spec`: 1-2 sentences naming exact spec tags and explaining the collapse (e.g., "Uses MM1 and MM4 - the absolute value unwraps to a standard quadratic equation")
