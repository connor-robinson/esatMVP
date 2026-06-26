"""Constants for ESAT curriculum-only reassessment."""

from __future__ import annotations

from quality_gate.schemas import DISPOSITION_LABELS

REASSESS_VERSION = "v2_borderline_reassessment"

MAX_BLOCKING_SOLUTION_SCORE = 2
MAX_BLOCKING_PACING_SCORE = 2
MAX_BLOCKING_FORMATTING_SCORE = 2

CURRICULUM_ONLY_ISSUE_CODES = frozenset(
    {
        "curriculum_borderline",
        "curriculum_uncertain",
        "invalid_curriculum_output",
    }
)

# Structured non-curriculum issue codes seen in auto_fix_triage / disposition.
KNOWN_BLOCKING_ISSUE_CODES = frozenset(
    {
        "wrong_answer_key",
        "answer_key_mismatch",
        "answer_key_validation",
        "distractor_map_needs_update",
        "formatting",
        "solution_error",
        "weak_distractors",
        "unclear_wording",
        "needs_diagram",
        "missing_table",
        "missing_diagram",
        "deterministic_conflict",
        "too_hard",
        "too_easy",
        "too_long",
        "too_short",
        "unrealistic_pacing",
        "wrong_paper",
        "math2_content_on_math1",
        "other",
    }
) | (DISPOSITION_LABELS - CURRICULUM_ONLY_ISSUE_CODES - frozenset({"formatting_fixed", "wrong_answer_key_fixed"}))

ESAT_SUBJECTS = frozenset(
    {
        "math 1",
        "mathematics 1",
        "math 2",
        "mathematics 2",
        "physics",
        "chemistry",
        "biology",
    }
)

# ESAT generator schema_id prefixes (excludes TMUA).
ESAT_SCHEMA_PREFIXES = ("M_", "P_", "C_", "B_", "m_", "p_", "c_", "b_")

CURRICULUM_REASSESSMENT_SYSTEM_PROMPT = """You are an ESAT curriculum validator performing a narrow,
curriculum-only assessment.

Your sole task is to decide whether the official curriculum of the
assigned ESAT module, together with permitted Mathematics 1 assumed
knowledge and facts explicitly supplied in the question, covers every
piece of knowledge and every method required to solve the question.

Do not assess:

- writing style or clarity
- answer-key correctness
- solution quality
- formatting
- distractor quality
- difficulty
- pacing
- overall question quality

These dimensions have already been assessed separately.

Judge the exact solve path. Do not mark a question in-syllabus merely
because its broad topic appears in the curriculum.

Return exactly one curriculum_match:

in_syllabus:
Every required fact, formula, theorem, method and subject-specific
concept is explicitly allowed by the assigned module, permitted
Mathematics 1 knowledge, or information supplied in the question.

borderline:
The question is probably accessible using the stated curriculum, but a
required term, depth, application or assumed fact is genuinely unclear
from the official specification.

Use borderline sparingly. Do not use it merely because a question is
difficult, combines topics, uses an unfamiliar context, has an unusual
reasoning path, or applies familiar content in a new setting.

out_of_syllabus:
The solver must know a fact, formula, theorem, method or subject-specific
concept that is not permitted by the assigned module and is not supplied
in the question.

Cross-module rules:

- Science modules may assume Mathematics 1, but not Mathematics 2 unless
  the required relationship is supplied.
- Biology may not assume Chemistry-specific or advanced Biology content
  unless supplied.
- Physics may not assume Chemistry content merely because the setting is
  scientific.
- Mathematics 1 must not require Mathematics 2 content.
- Mathematics 2 may assume Mathematics 1.

Respond using the required structured JSON schema only."""
