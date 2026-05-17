"""Code-only validator for V4 Implementer output.

Run **before** any LLM Verifier so we don't burn a Verifier call on broken JSON.

Checks (in this order):

1. Implementer output is a dict.
2. Required top-level keys: ``question``, ``solution``, ``distractor_map``.
   Implementer V4 also requires ``metadata``, ``visual_requirements``,
   ``quality_self_check`` — we treat those as soft (warn but don't fail).
3. ``question.stem`` is a non-empty string.
4. ``question.options`` is a dict with at least 4 keys (default 6 = A–F);
   values are non-empty strings; keys are single letters within A–H.
5. ``question.correct_option`` is one of the option keys.
6. ``solution.reasoning`` and ``solution.key_insight`` are non-empty strings.
7. ``distractor_map`` covers **every** option key.
8. KaTeX delimiter sanity via :mod:`.katex_validator`.
9. Visual placeholder/spec linkage via :mod:`.visual_validator`.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from .katex_validator import basic_katex_lint
from .visual_validator import validate_visual_linkage


@dataclass
class DeterministicReport:
    ok: bool
    errors: List[Dict[str, str]] = field(default_factory=list)
    warnings: List[Dict[str, str]] = field(default_factory=list)
    option_keys: List[str] = field(default_factory=list)
    summary: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "ok": self.ok,
            "errors": self.errors,
            "warnings": self.warnings,
            "option_keys": self.option_keys,
            "summary": self.summary,
        }


_VALID_LETTERS = tuple("ABCDEFGH")


def _err(field: str, kind: str, message: str) -> Dict[str, str]:
    return {"field": field, "kind": kind, "message": message}


def deterministic_validate(
    question_pkg: Any,
    *,
    graph_spec: Optional[Dict[str, Any]] = None,
    schematic_spec: Optional[Dict[str, Any]] = None,
    min_option_count: int = 4,
    default_option_count: int = 6,
) -> DeterministicReport:
    errors: List[Dict[str, str]] = []
    warnings: List[Dict[str, str]] = []
    option_keys: List[str] = []

    if not isinstance(question_pkg, dict):
        return DeterministicReport(
            ok=False,
            errors=[_err("root", "not_object", "Implementer output must be a JSON object.")],
            summary="not_object",
        )

    for k in ("question", "solution", "distractor_map"):
        if k not in question_pkg:
            errors.append(_err(k, "missing_top_key", f"Required top-level key missing: {k!r}."))

    for k in ("metadata", "visual_requirements", "quality_self_check"):
        if k not in question_pkg:
            warnings.append(_err(k, "soft_missing", f"V4 expects top-level key {k!r}."))

    if errors:
        return DeterministicReport(
            ok=False, errors=errors, warnings=warnings, summary="missing_required_keys"
        )

    q = question_pkg.get("question") or {}
    if not isinstance(q, dict):
        errors.append(_err("question", "not_object", "'question' must be an object."))

    stem = q.get("stem") if isinstance(q, dict) else None
    if not isinstance(stem, str) or not stem.strip():
        errors.append(_err("question.stem", "empty", "Stem must be a non-empty string."))

    opts = q.get("options") if isinstance(q, dict) else None
    if not isinstance(opts, dict) or not opts:
        errors.append(_err("question.options", "missing", "Options must be a non-empty object."))
    else:
        for k, v in opts.items():
            if not isinstance(k, str) or len(k) != 1 or k.upper() not in _VALID_LETTERS:
                errors.append(
                    _err(
                        f"question.options.{k}",
                        "bad_key",
                        f"Option key must be a single letter A-H, got {k!r}.",
                    )
                )
                continue
            option_keys.append(k.upper())
            if not isinstance(v, str) or not v.strip():
                errors.append(
                    _err(
                        f"question.options.{k}",
                        "empty_value",
                        "Option value must be a non-empty string.",
                    )
                )
        option_keys = sorted(set(option_keys))
        if len(option_keys) < min_option_count:
            errors.append(
                _err(
                    "question.options",
                    "too_few_options",
                    f"Need at least {min_option_count} options, got {len(option_keys)}.",
                )
            )
        if len(option_keys) != default_option_count:
            warnings.append(
                _err(
                    "question.options",
                    "non_default_count",
                    f"Expected {default_option_count} options (A-F); got {len(option_keys)}.",
                )
            )

    correct = q.get("correct_option") if isinstance(q, dict) else None
    if not isinstance(correct, str) or correct.strip().upper() not in option_keys:
        errors.append(
            _err(
                "question.correct_option",
                "invalid",
                f"correct_option must be one of {option_keys}, got {correct!r}.",
            )
        )

    solution = question_pkg.get("solution") or {}
    if not isinstance(solution, dict):
        errors.append(_err("solution", "not_object", "'solution' must be an object."))
    else:
        for k in ("reasoning", "key_insight"):
            v = solution.get(k)
            if not isinstance(v, str) or not v.strip():
                errors.append(
                    _err(f"solution.{k}", "empty", f"solution.{k} must be a non-empty string.")
                )

    dmap = question_pkg.get("distractor_map") or {}
    if not isinstance(dmap, dict):
        errors.append(_err("distractor_map", "not_object", "'distractor_map' must be an object."))
    else:
        missing = [k for k in option_keys if k not in dmap]
        if missing:
            errors.append(
                _err(
                    "distractor_map",
                    "incomplete",
                    f"distractor_map missing entries for options: {missing}.",
                )
            )
        extra = [k for k in dmap.keys() if str(k).upper() not in option_keys]
        if extra:
            warnings.append(
                _err(
                    "distractor_map",
                    "extra_entries",
                    f"distractor_map has entries for non-existent options: {extra}.",
                )
            )

    # KaTeX delimiter sanity (cheap)
    errors.extend(basic_katex_lint(question_pkg))

    # Visual placeholder linkage
    errors.extend(
        validate_visual_linkage(
            question_pkg,
            graph_spec=graph_spec,
            schematic_spec=schematic_spec,
        )
    )

    ok = not errors
    summary = "ok" if ok else f"{len(errors)} error(s)"
    return DeterministicReport(
        ok=ok,
        errors=errors,
        warnings=warnings,
        option_keys=option_keys,
        summary=summary,
    )
