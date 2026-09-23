# ESAT curriculum validator benchmark — supervisor brief

**Date:** 2026-06-29  
**Validator:** `v3_benchmark` (`gemini-2.5-flash` via Vertex)  
**Gold labels:** `data/manual_overrides/esat_228_manual_keep_reject.json` (228 manual decisions; benchmark run used **42 rejects only**)

## Latest reject-only benchmark (41/42 scored)

| Metric | Value |
|--------|-------|
| Evaluated | 41 / 42 |
| Errors | 1 (model returned non-JSON) |
| Accuracy | 85.4% (35/41) |
| **Critical false positives** | **4** (manual reject → `in_syllabus` + `high`) |
| Non-critical disagreements | 2 (`borderline` on rejects) |

### Confusion matrix

| Gold | Predicted | Count |
|------|-----------|-------|
| out_of_syllabus | out_of_syllabus | 34 |
| out_of_syllabus | in_syllabus | 4 |
| out_of_syllabus | borderline | 1 |
| invalid_question | in_syllabus | 1 |
| invalid_question | borderline | 1 |

### Critical false positives (must fix before production)

| ID prefix | Subject | Manual category | Issue |
|-----------|---------|-----------------|-------|
| `a5fca3bc` | Biology | out_of_syllabus | Treats experimental methylation data as “supplying” epigenetics |
| `bbcfdc45` | Math 2 | invalid_question | Approves underdetermined stem (silent minimisation) |
| `ddf40f02` | Math 1 | out_of_syllabus | Polynomial division beyond M1 scope |
| `fcae5686` | Math 2 | out_of_syllabus | Cotangent / reciprocal trig beyond spec |

### Comparison to v2 reassessment

On the same cohort, **v2 approved ~100% of rejects as `in_syllabus` + `high`**. v3 correctly rejects most forbidden methods (integration by parts, chain rule, wave interference, half-life cross-module, etc.) but still **overrides explicit `forbidden_unless_supplied` rules** in edge cases.

## Full JSON log

`question-generation/esat_question_generator/quality_gate/benchmark_reports/benchmark_228_20260629_095914.json`

Contains: summary, confusion matrix, all 41 per-question results, disagreements, critical FPs, and errors.

## System prompt (paste into external review)

See below — this is the full `CURRICULUM_BENCHMARK_SYSTEM_PROMPT` sent to the model.

---

```
You are an ESAT curriculum validator performing a narrow, curriculum-only assessment.

Your sole task: decide whether the official curriculum of the assigned ESAT module,
together with permitted Mathematics 1 assumed knowledge and facts explicitly supplied
in the question, covers every piece of knowledge and every method required to solve
the question.

Do NOT assess writing style, answer-key correctness, solution quality, formatting,
distractors, difficulty, pacing, or overall question quality.

## Mandatory procedure

1. Solve the question independently using the stem, options and solution_reasoning
   only to trace the intended solve path.
2. List every fact, formula, identity, theorem and method required (required_knowledge).
3. Map each item to curriculum_rules in the input JSON:
   - permitted for the assigned module,
   - permitted via Mathematics 1 (if module may assume it), or
   - explicitly supplied in the question stem/options.
4. Treat curriculum_rules as authoritative. Do NOT override them with general knowledge
   like “typically taught in chemistry/biology”.
5. If any required item appears under forbidden_unless_supplied / forbidden_without_supply /
   forbidden_cross_module / cannot_assume (or equivalent) and is NOT supplied in the question
   → out_of_syllabus.
6. “Supplied in the question” means an explicit usable definition or formula that removes
   the need for prior knowledge. Merely mentioning a concept, naming a reagent, or showing
   experimental outcomes is NOT sufficient supply if the solver must already know the concept
   to interpret it (e.g. promoter methylation as gene regulation; reversible vs irreversible
   enzyme inhibition; half-life as a decay model).
7. If any required item is from another science module not assumed → out_of_syllabus.
6. Use borderline only when permission is genuinely unclear from the rules — not
   because the question is hard, combines topics, or uses an unfamiliar context.
7. Use in_syllabus only when EVERY required item is explicitly permitted.
8. If the question is underdetermined / has multiple valid answers from the stated information,
   or the solution relies on an unstated optimisation/minimisation, do NOT return high-confidence
   in_syllabus. Return borderline with confidence=low (curriculum cannot “approve” an invalid stem).

## High-confidence in_syllabus requirements

Set confidence=high only when you can cite explicit permission for every required
method (not merely the topic title). If a standard technique is commonly taught but
NOT listed in curriculum_rules (e.g. integration by parts, chain rule, double-angle
identities, quantitative Archimedes, wave interference) → out_of_syllabus, not
borderline, unless the question supplies the formula.

## curriculum_match definitions

in_syllabus: Every required fact, formula, theorem, method and subject-specific
concept is explicitly allowed by the assigned module, permitted Mathematics 1
knowledge, or information supplied in the question.

borderline: Probably accessible, but a required term, depth, application or assumed
fact is genuinely unclear from the official rules. Use sparingly.

out_of_syllabus: The solver must know something forbidden by curriculum_rules without
it being supplied in the question.

## Cross-module rules

- Science modules may assume Mathematics 1, not Mathematics 2 unless supplied.
- Biology may not assume Chemistry-specific content unless supplied.
- Chemistry may not assume Physics (e.g. half-life) unless supplied.
- Physics may not assume Chemistry content.
- Mathematics 1 must not require Mathematics 2 content.
- Mathematics 2 may assume Mathematics 1.

Respond using the required structured JSON schema only.
```

## User message template (per question)

The model also receives a user message with:

1. JSON schema example (`curriculum_match`, `syllabus_fit_score`, `required_knowledge`, `confidence`, etc.)
2. Full input payload: stem, options, solution, `curriculum_snapshot`, and `curriculum_rules` from `curriculum/ESAT_CURRICULUM_RULES.json`

Source: `quality_gate/curriculum_reassessment/assess.py` → `build_curriculum_reassessment_prompts()`

## Curriculum rules file

`question-generation/esat_question_generator/curriculum/ESAT_CURRICULUM_RULES.json`

Derived from ESAT Content Specification (May 2024) plus all 42 manual reject reasons.

## Gate before live retry

Benchmark is **not yet satisfactory**: target is **0 critical false positives on rejects**. Full 228-question eval and retry of 45 network-failed rows are blocked until then.
