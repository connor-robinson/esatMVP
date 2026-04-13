"""
Catalog of known Implementer JSON shape issues and how the pipeline handles them.

All subjects use the same implementer path — these fixes apply to M, P, C, B.

Human-readable detail: IMPLEMENTER_JSON_ERRORS.md
"""

from typing import Any, Dict, List

# id: stable key for grep / analytics
# detector: substring of ValueError or log line, or description
# handler: where it is addressed
IMPLEMENTER_JSON_FIXES: List[Dict[str, Any]] = [
    {
        "id": "flat_question_root",
        "detector": "missing 'question' field",
        "handler": "normalize_implementer_output: wrap stem/options/correct_* into question",
        "subjects": ("M", "P", "C", "B"),
    },
    {
        "id": "options_as_list",
        "detector": "options list instead of dict",
        "handler": "_coerce_options_to_dict + _normalize_question_inner_aliases",
        "subjects": ("M", "P", "C", "B"),
    },
    {
        "id": "correct_answer_alias",
        "detector": "correct_answer vs correct_option",
        "handler": "_normalize_question_inner_aliases; flat wrap reads correct_answer",
        "subjects": ("M", "P", "C", "B"),
    },
    {
        "id": "solution_under_question",
        "detector": "question.solution present",
        "handler": "normalize_implementer_output: promote solution to top level",
        "subjects": ("M", "P", "C", "B"),
    },
    {
        "id": "distractor_map_under_question",
        "detector": "question.distractor_map present",
        "handler": "normalize_implementer_output: promote distractor_map",
        "subjects": ("M", "P", "C", "B"),
    },
    {
        "id": "top_level_key_insight",
        "detector": "key_insight at root with solution dict",
        "handler": "normalize_implementer_output: fold into solution",
        "subjects": ("M", "P", "C", "B"),
    },
    {
        "id": "question_id_metadata",
        "detector": "question_id at root",
        "handler": "normalize_implementer_output: merge into metadata",
        "subjects": ("M", "P", "C", "B"),
    },
    {
        "id": "solution_scalar",
        "detector": "solution is string not object",
        "handler": "normalize_implementer_output: wrap as reasoning + key_insight",
        "subjects": ("M", "P", "C", "B"),
    },
    {
        "id": "json_parse_failure",
        "detector": "failed to parse as JSON / JSONDecodeError",
        "handler": "repair_implementer_json_raw (Format Fixer rules)",
        "subjects": ("M", "P", "C", "B"),
    },
    {
        "id": "empty_distractor_map",
        "detector": "EMPTY distractor_map / insufficient distractor_map",
        "handler": "_fill_distractor_map_gaps after normalize (template text per option)",
        "subjects": ("M", "P", "C", "B"),
    },
    {
        "id": "question_text_root",
        "detector": "top-level question_text instead of question.stem",
        "handler": "normalize_implementer_output: wrap into question",
        "subjects": ("M", "P", "C", "B"),
    },
    {
        "id": "correct_option_index",
        "detector": "correct_option_index without correct_option",
        "handler": "_apply_correct_option_index_from_obj",
        "subjects": ("M", "P", "C", "B"),
    },
    {
        "id": "display_math_one_line",
        "detector": "DISPLAY_LINE_NOT_PURE / DISPLAY_BLOCK_SPACING",
        "handler": "katex_linter.fix_display_math_newlines + normalize_display_math_in_question_package",
        "subjects": ("M", "P", "C", "B"),
    },
]
