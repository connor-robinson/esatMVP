#!/usr/bin/env python3
"""
ESAT / ENGAA Question Generator Pipeline (v2 - Subject-Specific)

Implements:
Schema -> Designer -> Implementer -> Verifier -> Style Judge -> Classifier -> Save
with Retry Controller (max retries on fixable failures).

Directory layout expected (relative to this script):
esat_question_generator/
├── by_subject_prompts/
│   ├── new/Math1/, new/Math2/   # Math pipelines (JSON + variation injection)
│   ├── new/Physics/, new/Chemistry/, new/Biology/  # P/C/B JSON pipeline packs
│   └── old/                # Optional reference copies (not loaded — pipeline uses ``new/`` only)
├── schemas/Schemas_ESAT.md   # sole schema source for this pipeline

Notes:
- This script is interface-free. It writes JSONL logs/output files under runs/<timestamp>/.
- Uses Vertex AI auth via Application Default Credentials (ADC).
- Requires GOOGLE_CLOUD_PROJECT + GOOGLE_CLOUD_LOCATION in .env.local (or environment).
  If ``GOOGLE_CLOUD_LOCATION`` is ``global``, the GenAI client uses ``us-central1`` by default
  (publisher Gemini models often 404 on ``global``); override with ``VERTEX_GENAI_LOCATION`` or
  set ``GOOGLE_CLOUD_LOCATION`` to a regional endpoint (e.g. ``us-central1``).
- Uses Google GenAI Python SDK: `google-genai`.
- Loads environment variables from .env.local using python-dotenv
- Math questions get classified into Math 1 or Math 2 papers by the classifier
"""

from __future__ import annotations

import os
import sys
import re
import json
import time
import random
import hashlib
import uuid
import datetime
import threading
import sqlite3
from pathlib import Path
from dataclasses import dataclass
from typing import Dict, Any, List, Optional, Tuple, Callable
from dotenv import load_dotenv

from pipeline_log import init_pipeline_log, plog
from correct_option_reconcile import apply_reconcile_to_question_package

# Append-only JSONL for rate limits / key rotation (review after long runs)
_api_event_log_lock = threading.Lock()


def append_gemini_api_event(event: Dict[str, Any]) -> None:
    """
    Log API/rate-limit events to JSONL for overnight review.
    Path: GEMINI_API_EVENT_LOG or esat_question_generator/gemini_api_events.jsonl
    """
    path = (os.environ.get("GEMINI_API_EVENT_LOG") or "").strip()
    if not path:
        path = str(Path(__file__).resolve().parent / "gemini_api_events.jsonl")
    row: Dict[str, Any] = {
        "ts": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        **event,
    }
    with _api_event_log_lock:
        try:
            with open(path, "a", encoding="utf-8") as f:
                f.write(json.dumps(row, ensure_ascii=False) + "\n")
        except OSError:
            pass


# Configure UTF-8 encoding for Windows console
if sys.platform == "win32":
    try:
        # Python 3.7+
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except AttributeError:
        # Fallback for older Python versions
        import codecs
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
        sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# GUI support
try:
    import tkinter as tk
    from tkinter import ttk, scrolledtext, messagebox
    _TKINTER_AVAILABLE = True
except ImportError:
    _TKINTER_AVAILABLE = False
    messagebox = None  # type: ignore

# Google GenAI SDK (Gemini)
_GENAI_AVAILABLE = True
try:
    from google import genai
except Exception:
    _GENAI_AVAILABLE = False


# ---------- Config ----------

@dataclass
class ModelsConfig:
    designer: str = "gemini-2.5-pro"
    implementer: str = "gemini-2.5-pro"
    verifier: str = "gemini-2.5-flash"
    style_judge: str = "gemini-2.5-flash"
    classifier: str = "gemini-2.5-flash"  # NEW: For curriculum tag classification
    # Used when regenerating after Style FAIL but Verifier PASS (see ``_style_only_regen_model``).
    implementer_regen: str = ""


def get_default_models_config() -> ModelsConfig:
    """
    Returns a ModelsConfig instance with default model values.
    This is the single source of truth for model defaults.
    Environment variables can override individual models.
    """
    import os
    return ModelsConfig(
        designer=os.environ.get("MODEL_DESIGNER", "gemini-2.5-pro"),
        implementer=os.environ.get("MODEL_IMPLEMENTER", "gemini-2.5-pro"),
        verifier=os.environ.get("MODEL_VERIFIER", "gemini-2.5-flash"),
        style_judge=os.environ.get("MODEL_STYLE", "gemini-2.5-flash"),
        classifier=os.environ.get("MODEL_CLASSIFIER", "gemini-2.5-flash"),
        implementer_regen=(os.environ.get("MODEL_IMPLEMENTER_REGEN") or "").strip(),
    )


@dataclass
class RunConfig:
    max_implementer_retries: int = 2
    max_designer_retries: int = 2  # if designer outputs invalid JSON, etc.
    seed: Optional[int] = None
    difficulty_weights: Dict[str, float] = None  # type: ignore
    schema_weights: Optional[Dict[str, float]] = None  # optional weighting by schema_id
    out_dir: str = "runs"
    allow_schema_prefixes: Tuple[str, ...] = ("M",)  # default Math 1 only; widen with env SCHEMA_PREFIXES or caller
    enable_tag_labeling: bool = True  # Enable curriculum tag labeling
    curriculum_file_path: Optional[str] = None  # Path to curriculum JSON (default: curriculum/ESAT_CURRICULUM.json)
    # For M* schemas only: "Math 1" | "Math 2". Ignored for P/B/C. Per-run override via run_once(..., math_paper=...).
    math_paper: Optional[str] = None


def effective_math_paper_for_schema(
    schema_id: str,
    cfg: RunConfig,
    override: Optional[str] = None,
) -> Optional[str]:
    """
    Return "Math 1" / "Math 2" for mathematics schemas; None otherwise.
    ``override`` wins, then ``cfg.math_paper``, else "Math 1".
    """
    if not schema_id or schema_id[0].upper() != "M":
        return None
    p = override if override is not None else getattr(cfg, "math_paper", None)
    if p == "Math 2":
        return "Math 2"
    return "Math 1"


# Default ESAT difficulty mix: Easy 5%, Medium 20%, Hard 55%, Extreme 15%.
# Env vars W_EASY, W_MED, W_HARD, W_EXTREME are relative sampling weights (like difficulty_weights.txt);
# they need not sum to 1 — ``choose_difficulty`` uses them as ``random.choices`` weights.
DEFAULT_ESAT_DIFFICULTY_WEIGHTS: Dict[str, float] = {
    "Easy": 0.05,
    "Medium": 0.20,
    "Hard": 0.55,
    "Extreme": 0.15,
}


def difficulty_weights_from_env() -> Dict[str, float]:
    """Relative weights for Easy / Medium / Hard / Extreme from environment (W_ = weight)."""
    d = DEFAULT_ESAT_DIFFICULTY_WEIGHTS
    return {
        "Easy": float(os.environ.get("W_EASY", str(d["Easy"]))),
        "Medium": float(os.environ.get("W_MED", str(d["Medium"]))),
        "Hard": float(os.environ.get("W_HARD", str(d["Hard"]))),
        "Extreme": float(os.environ.get("W_EXTREME", str(d["Extreme"]))),
    }


# ---------- Utilities ----------

def read_text(path: str) -> str:
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

def ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)

def now_stamp() -> str:
    """
    Unique per run directory. Wall-clock second + random suffix so concurrent
    workers never share the same ``runs/<id>/`` folder.
    """
    return datetime.datetime.now().strftime("%Y%m%d_%H%M%S") + "_" + uuid.uuid4().hex[:10]

def sha1_short(s: str) -> str:
    return hashlib.sha1(s.encode("utf-8")).hexdigest()[:10]

def strip_code_fences(text: str) -> str:
    """
    Removes surrounding fenced code blocks (e.g. ```json ... ```) if present.
    """
    t = text.strip()
    if t.startswith("```"):
        t = re.sub(r"^```[a-zA-Z0-9_-]*\s*\n?", "", t)
        t = re.sub(r"\n?```\s*$", "", t.strip())
    return t.strip()


def prompt_json_dumps(obj: Any) -> str:
    """Pretty JSON for LLM user messages (UTF-8, stable for prompts)."""
    return json.dumps(obj, ensure_ascii=False, indent=2, default=str)


def _extract_top_json_object(s: str) -> Optional[str]:
    """Extract first balanced `{ ... }` from text (handles strings with braces)."""
    start = s.find("{")
    if start < 0:
        return None
    depth = 0
    in_string = False
    escape = False
    i = start
    while i < len(s):
        ch = s[i]
        if in_string:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_string = False
        else:
            if ch == '"':
                in_string = True
            elif ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    return s[start : i + 1]
        i += 1
    return None


def safe_json_load(text: str) -> Any:
    """Parse model output as JSON; strip fences; optionally extract first JSON object.

    String values may contain colons, percent signs, currency symbols, and most Unicode;
    only ``"`` and ``\\`` must be escaped in strings, and newlines inside strings should
    be ``\\n`` (not raw line breaks).
    """
    cleaned = strip_code_fences(text).strip()
    if not cleaned:
        raise ValueError("JSON parse: empty input after stripping fences.")
    try:
        result = json.loads(cleaned)
    except json.JSONDecodeError as e1:
        snippet = _extract_top_json_object(cleaned)
        if snippet:
            try:
                result = json.loads(snippet)
            except json.JSONDecodeError as e2:
                preview = cleaned[:500] if len(cleaned) <= 500 else cleaned[:500] + "\n... (truncated)"
                raise ValueError(
                    f"JSON parsing error: {e1}\nExtracted object also invalid: {e2}\n\nPreview:\n{preview}"
                ) from e2
        else:
            preview = cleaned[:500] if len(cleaned) <= 500 else cleaned[:500] + "\n... (truncated)"
            raise ValueError(f"JSON parsing error: {e1}\n\nPreview:\n{preview}") from e1
    if result is None:
        raise ValueError("JSON parsed to null (invalid for pipeline).")
    return result


def _resolve_format_fixer_system_prompt(
    prompts: Prompts, schema_id: str, math_paper: Optional[str]
) -> Optional[str]:
    """Same prompt selection as format_fixer_call (for JSON repair on unparsed implementer text)."""
    subject = get_subject_from_schema(schema_id)
    format_fixer_prompt = None
    if subject == "mathematics":
        if math_paper == "Math 2" and getattr(prompts, "format_fixer_math2", None):
            format_fixer_prompt = prompts.format_fixer_math2
        elif getattr(prompts, "format_fixer_math1", None):
            format_fixer_prompt = prompts.format_fixer_math1
    else:
        pack = (getattr(prompts, "subject_new_packs", None) or {}).get(subject) or {}
        ff = (pack.get("format_fixer") or "").strip()
        if ff:
            format_fixer_prompt = ff
    return format_fixer_prompt


def repair_implementer_json_raw(
    llm: LLMClient,
    prompts: Prompts,
    models: ModelsConfig,
    schema_id: str,
    math_paper: Optional[str],
    broken_text: str,
    parse_error: str,
    repair_model: Optional[str] = None,
) -> Optional[str]:
    """
    When the Implementer returns almost-valid JSON but invalid (trailing commas, truncated, extra prose),
    one low-temperature pass using Format Fixer rules to return parseable JSON.
    Disabled when ESAT_IMPLEMENTER_JSON_REPAIR is 0/false/off.
    """
    flag = (os.environ.get("ESAT_IMPLEMENTER_JSON_REPAIR") or "1").strip().lower()
    if flag in ("0", "false", "no", "off"):
        return None
    system_prompt = _resolve_format_fixer_system_prompt(prompts, schema_id, math_paper)
    if not system_prompt:
        system_prompt = (
            "You repair JSON only: valid UTF-8 JSON object, no markdown fences. "
            "Escape double quotes and backslashes inside strings per JSON rules. "
            "Preserve keys, numbers, and mathematical meaning. Output a single JSON object only."
        )
    max_chars = int(os.environ.get("IMPLEMENTER_JSON_REPAIR_MAX_CHARS", "20000"))
    bt = broken_text if len(broken_text) <= max_chars else broken_text[:max_chars] + "\n/* ... truncated */\n"
    pe = parse_error if len(parse_error) <= 4000 else parse_error[:4000] + "\n..."

    user = f"""The text below was meant to be ONE JSON object (ESAT implementer question package) but json.loads failed.

Parser error:
{pe}

Broken text:
---
{bt}
---

Task:
- Output exactly ONE valid JSON object with the same structure (metadata, question, solution, distractor_map, key_insight as applicable) and the same mathematical content.
- Fix ONLY JSON syntax (quotes, commas, brackets). LaTeX inside strings: use \\\\ for each TeX backslash.
- JSON string escapes are strict: only \\\", \\\\, \\/, \\b, \\f, \\n, \\r, \\t, or \\uXXXX after \\. Never emit invalid escapes like \\c or a lone \\ before a letter.
- Do not change which option is correct or numeric values.
- Return raw JSON only (no ``` fences, no commentary before or after the object).
"""
    model_id = (repair_model or "").strip() or models.implementer
    return llm.generate(
        model=model_id,
        system_prompt=system_prompt,
        user_prompt=user,
        temperature=0.15,
        trace_label="Implementer JSON repair",
    )


def _coerce_options_to_dict(options: Any) -> Optional[Dict[str, Any]]:
    """
    Normalise ``options`` to a dict mapping A/B/C/... to text.

    Implementers sometimes return a list of objects or strings instead of a dict.
    Applies to **all subjects** (same ``implementer_call`` path).
    """
    if isinstance(options, dict):
        return options
    if not isinstance(options, list):
        return None
    out: Dict[str, Any] = {}
    for item in options:
        if isinstance(item, dict):
            k = (
                item.get("label")
                or item.get("key")
                or item.get("option")
                or item.get("letter")
                or item.get("id")
            )
            t = (
                item.get("text")
                or item.get("value")
                or item.get("body")
                or item.get("content")
            )
            if k is not None and t is not None:
                ks = str(k).strip()
                kk = ks.upper() if len(ks) == 1 else ks
                out[kk] = t
        elif isinstance(item, str):
            m = re.match(r"^\s*([A-Ha-h])\s*[\).:\-]\s*(.+)$", item.strip())
            if m:
                out[m.group(1).upper()] = m.group(2).strip()
    return out if out else None


def _normalize_question_inner_aliases(q: Dict[str, Any]) -> None:
    """In-place: list ``options`` → dict; ``correct_answer`` → ``correct_option``."""
    if isinstance(q.get("options"), list):
        conv = _coerce_options_to_dict(q.get("options"))
        if conv:
            q["options"] = conv
    if "correct_option" not in q or q.get("correct_option") in (None, ""):
        ca = q.pop("correct_answer", None)
        if ca is not None and str(ca).strip():
            q["correct_option"] = ca


def _apply_correct_option_index(q: Dict[str, Any], idx: Any) -> None:
    """Set ``correct_option`` from 0-based index when the model emits ``correct_option_index``."""
    if idx is None:
        return
    if q.get("correct_option") not in (None, "") and str(q.get("correct_option", "")).strip():
        return
    opts = q.get("options")
    letters: List[str] = []
    if isinstance(opts, dict):
        letters = [str(k) for k in opts.keys()]
    elif isinstance(opts, list):
        letters = [chr(ord("A") + i) for i in range(len(opts))]
    else:
        return
    try:
        i = int(idx)
    except (TypeError, ValueError):
        return
    if i < 0 or i >= len(letters):
        return
    pick = letters[i]
    q["correct_option"] = str(pick).strip().upper()[:1] if len(str(pick).strip()) == 1 else str(pick).strip()


def _apply_correct_option_index_from_obj(obj: Dict[str, Any]) -> None:
    top_idx = obj.pop("correct_option_index", None)
    q = obj.get("question")
    if not isinstance(q, dict):
        return
    inner_idx = q.pop("correct_option_index", None)
    _apply_correct_option_index(q, inner_idx if inner_idx is not None else top_idx)


def _fill_distractor_map_gaps(obj: Dict[str, Any]) -> None:
    """
    Ensure every option key has a non-empty distractor_map entry.
    Uses neutral template text when the model left entries blank (better than failing the pipeline).
    """
    q = obj.get("question")
    if not isinstance(q, dict):
        return
    opts = q.get("options")
    if isinstance(opts, dict):
        keys = list(opts.keys())
    elif isinstance(opts, list):
        keys = [chr(ord("A") + i) for i in range(len(opts))]
    else:
        return
    if not keys:
        return
    dm = obj.get("distractor_map")
    if not isinstance(dm, dict):
        dm = {}
        obj["distractor_map"] = dm
    cor = str(q.get("correct_option", "") or "").strip().upper()[:1]
    for k in keys:
        ks = str(k)
        letter = ks.strip().upper()[:1] if len(ks.strip()) >= 1 else ks
        cur = dm.get(k)
        if cur is not None and str(cur).strip():
            continue
        if letter == cor:
            dm[k] = "This is the correct answer given the worked reasoning in the solution."
        else:
            dm[k] = (
                "Plausible mistake: misapplies a relation from the stem or slips at one algebraic step "
                "(see solution for the correct chain)."
            )


def normalize_display_math_in_question_package(pkg: Dict[str, Any]) -> None:
    """In-place KaTeX display-math layout repair on question / solution / distractor strings."""
    try:
        from katex_linter import deep_apply_display_math_fix, fix_display_math_newlines
    except ImportError:
        return
    if not isinstance(pkg, dict):
        return
    q = pkg.get("question")
    if isinstance(q, dict):
        for fld in ("stem", "stimulus", "data_block", "graph_intent"):
            v = q.get(fld)
            if isinstance(v, str) and v and "$$" in v:
                q[fld] = fix_display_math_newlines(v)
        opts = q.get("options")
        if isinstance(opts, dict):
            for ok, ov in list(opts.items()):
                if isinstance(ov, str) and ov and "$$" in ov:
                    opts[ok] = fix_display_math_newlines(ov)
    sol = pkg.get("solution")
    if isinstance(sol, dict):
        deep_apply_display_math_fix(sol)
    dm = pkg.get("distractor_map")
    if isinstance(dm, dict):
        for dk, dv in list(dm.items()):
            if isinstance(dv, str) and dv and "$$" in dv:
                dm[dk] = fix_display_math_newlines(dv)


def synthesize_reasoning_from_solution_steps(solution: Dict[str, Any]) -> str:
    """
    Some models put the worked solution in ``solution_steps`` / ``steps`` (per-step
    fields like ``calculation``, ``step_body``, etc.) but omit ``reasoning``. The DB
    and review UI only persist ``solution_reasoning`` / ``solution_key_insight``, so we
    fold steps into a single reasoning string when ``reasoning`` is empty.
    """
    if not isinstance(solution, dict):
        return ""
    steps = solution.get("solution_steps")
    if steps is None:
        steps = solution.get("steps")
    parts: List[str] = []
    if isinstance(steps, list) and steps:
        for i, step in enumerate(steps, start=1):
            if isinstance(step, str):
                s = step.strip()
                if s:
                    parts.append(s)
                continue
            if not isinstance(step, dict):
                continue
            n = step.get("step")
            if n is None:
                n = step.get("step_number")
            if n is None:
                n = step.get("n")
            if n is None:
                n = i
            bits: List[str] = []
            for k in (
                "step_title",
                "title",
                "heading",
                "step_body",
                "body",
                "explanation",
                "text",
                "description",
                "reasoning",
                "calculation",
                "math",
                "work",
            ):
                v = step.get(k)
                if v is not None and str(v).strip():
                    bits.append(str(v).strip())
            if bits:
                parts.append(f"Step {n}:\n\n" + "\n\n".join(bits))
    out = "\n\n".join(parts)
    if not out.strip():
        inner = solution.get("solution")
        if isinstance(inner, dict):
            sub = synthesize_reasoning_from_solution_steps(inner)
            if sub.strip():
                out = sub
    fa = solution.get("final_answer")
    fa_s = str(fa).strip() if fa is not None else ""
    if fa_s:
        if out.strip():
            return f"{out.strip()}\n\n{fa_s}"
        return fa_s
    return out.strip()


def normalize_implementer_output(obj: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalise Implementer JSON-shaped dict into the expected structure.

    Some models emit a *flat* object (stem, options, correct_option at top level) instead
    of ``question: { stem, options, correct_option }`` — wrap that shape before validation.

    Some models nest `solution` under `question.solution` instead of top-level.
    This function promotes it to the top-level `solution` key so downstream
    agents (Verifier, Style Judge) see the expected schema.
    
    Also handles distractor_map which may be nested under question or at top level.

    **Subjects:** Every schema (M/P/C/B) uses the same ``implementer_call`` / regen path, so
    all coercions here apply universally. See ``IMPLEMENTER_JSON_ERRORS.md`` for a catalog
    of common failure modes and mitigations.
    """
    if not isinstance(obj, dict):
        return obj

    # ``question`` as a plain string + top-level ``options`` / ``answer`` (common LLM slip)
    if isinstance(obj.get("question"), str):
        stem_s = (obj.get("question") or "").strip()
        raw_opts = obj.get("options")
        opts_dict = raw_opts if isinstance(raw_opts, dict) else _coerce_options_to_dict(raw_opts)
        q_block: Dict[str, Any] = {"stem": stem_s, "options": opts_dict or {}}
        for key in ("answer", "correct_option", "key"):
            if obj.get(key) is not None and str(obj.get(key)).strip():
                q_block["correct_option"] = str(obj[key]).strip().upper()[:1]
                break
        obj["question"] = q_block

    # ``stem`` as an object (e.g. { "question_text": "..." }) with top-level ``options``
    if "question" not in obj and isinstance(obj.get("stem"), dict):
        sd = obj.get("stem") or {}
        stem_text = sd.get("question_text") or sd.get("text") or sd.get("stem") or sd.get("body")
        if stem_text:
            raw_opts = obj.get("options")
            opts_dict = raw_opts if isinstance(raw_opts, dict) else _coerce_options_to_dict(raw_opts)
            q_block2: Dict[str, Any] = {"stem": str(stem_text).strip(), "options": opts_dict or {}}
            co = obj.get("key") or obj.get("answer") or obj.get("correct_option") or sd.get("correct_option")
            if co is not None and str(co).strip():
                q_block2["correct_option"] = str(co).strip().upper()[:1]
            for k in ("stimulus", "data_block", "graph_intent"):
                if k in sd:
                    q_block2[k] = sd[k]
            obj["question"] = q_block2
            obj.pop("stem", None)

    # Flat implementer shape (common LLM slip): stem + options at top level (dict or list)
    if "question" not in obj and isinstance(obj.get("stem"), str):
        raw_opts = obj.get("options")
        opts_dict = raw_opts if isinstance(raw_opts, dict) else _coerce_options_to_dict(raw_opts)
        if opts_dict is not None:
            stem = obj.pop("stem", "")
            obj.pop("options", None)
            q_block = {"stem": stem, "options": opts_dict}
            co = obj.pop("correct_option", None)
            ca = obj.pop("correct_answer", None)
            if co is not None:
                q_block["correct_option"] = co
            elif ca is not None:
                q_block["correct_option"] = ca
            for k in ("stimulus", "data_block", "graph_intent"):
                if k in obj:
                    q_block[k] = obj.pop(k)
            obj["question"] = q_block

    # Top-level ``question_text`` (common Gemini slip) + ``options``
    if "question" not in obj and isinstance(obj.get("question_text"), str):
        stem_s = obj.pop("question_text", "").strip()
        raw_opts = obj.get("options")
        opts_dict = raw_opts if isinstance(raw_opts, dict) else _coerce_options_to_dict(raw_opts)
        if stem_s and opts_dict is not None:
            q_block_qt: Dict[str, Any] = {"stem": stem_s, "options": opts_dict}
            co = obj.pop("correct_option", None)
            ca = obj.pop("correct_answer", None)
            if co is not None and str(co).strip():
                q_block_qt["correct_option"] = str(co).strip().upper()[:1]
            elif ca is not None and str(ca).strip():
                q_block_qt["correct_option"] = str(ca).strip().upper()[:1]
            obj["question"] = q_block_qt
            obj.pop("options", None)

    # Existing question object: fix list options / correct_answer alias
    q0 = obj.get("question")
    if isinstance(q0, dict):
        _normalize_question_inner_aliases(q0)

    # Top-level key_insight alongside top-level solution dict
    if "key_insight" in obj:
        ki = obj.get("key_insight")
        sol = obj.get("solution")
        if isinstance(sol, dict):
            if not (sol.get("key_insight") or "").strip() and ki is not None:
                sol["key_insight"] = ki
            obj.pop("key_insight", None)
        elif sol is None:
            reasoning = obj.pop("reasoning", "") or ""
            obj.pop("key_insight", None)
            obj["solution"] = {"key_insight": ki if ki is not None else "", "reasoning": reasoning}

    # Promote question_id into metadata for downstream consistency
    if "question_id" in obj:
        qid = obj.pop("question_id")
        md = obj.get("metadata")
        if not isinstance(md, dict):
            obj["metadata"] = {}
            md = obj["metadata"]
        if qid is not None and "question_id" not in md:
            md["question_id"] = qid

    # Non-dict solution at top level -> wrap
    if "solution" in obj and not isinstance(obj.get("solution"), dict):
        obj["solution"] = {
            "reasoning": str(obj.pop("solution", "") or ""),
            "key_insight": str(obj.pop("key_insight", "") or ""),
        }

    q = obj.get("question")
    if isinstance(q, dict):
        # If solution is nested under question, promote it
        if "solution" in q and "solution" not in obj and isinstance(q["solution"], dict):
            obj["solution"] = q["solution"]
        
        # If distractor_map is nested under question, promote it
        if "distractor_map" in q and "distractor_map" not in obj and isinstance(q["distractor_map"], dict):
            obj["distractor_map"] = q["distractor_map"]
    
    # Ensure distractor_map exists (even if empty) - it's required by the prompt
    if "distractor_map" not in obj:
        obj["distractor_map"] = {}

    sol_out = obj.get("solution")
    if isinstance(sol_out, dict) and not str(sol_out.get("reasoning") or "").strip():
        folded = synthesize_reasoning_from_solution_steps(sol_out)
        if folded:
            sol_out["reasoning"] = folded

    _apply_correct_option_index_from_obj(obj)
    _fill_distractor_map_gaps(obj)
    if apply_reconcile_to_question_package(obj):
        plog(
            "pipeline",
            "correct_option_reconciled",
            detail={"stage": "normalize_implementer_output"},
            echo=False,
        )
    normalize_display_math_in_question_package(obj)

    return obj

def dump_jsonl(path: str, obj: Dict[str, Any]) -> None:
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(obj, ensure_ascii=False) + "\n")


# ---------- Subject-specific helper functions ----------

def fetch_exemplar_texts(exemplar_ids: List[str]) -> List[str]:
    """Fetch the actual question text for each exemplar ID from the SQLite DB."""
    if not exemplar_ids:
        return []
    
    # question-generation/schema_generator/restructure/nsaa_state.db
    current_dir = os.path.dirname(os.path.abspath(__file__))
    qgen_root = os.path.dirname(current_dir)
    db_path = os.path.join(qgen_root, "schema_generator", "restructure", "nsaa_state.db")
    
    if not os.path.exists(db_path):
        return []
    
    texts = []
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        valid_ids = [eid for eid in exemplar_ids if eid.strip()]
        if not valid_ids:
            return []
            
        placeholders = ",".join(["?"] * len(valid_ids))
        query = f"SELECT text FROM questions_queue WHERE question_id IN ({placeholders})"
        cursor.execute(query, valid_ids)
        rows = cursor.fetchall()
        texts = [row[0] for row in rows]
        conn.close()
    except Exception as e:
        # Silently fail but print for debug if needed
        # print(f"Error fetching exemplar texts from {db_path}: {e}")
        pass
    
    return texts

def get_subject_from_schema(schema_id: str) -> str:
    """Map schema_id prefix to subject name."""
    prefix = schema_id[0].upper()
    mapping = {
        'M': 'mathematics',
        'P': 'physics',
        'B': 'biology',
        'C': 'chemistry'
    }
    return mapping.get(prefix, 'mathematics')


# Physics / Chemistry / Biology use the same TMUA-style designer user message as Math when
# ``by_subject_prompts/new/<Subject>/`` is loaded (Designer + Implementer + Tag_Labeler).
_TMUA_PIPELINE_SUBJECTS = frozenset({"physics", "chemistry", "biology"})


def _subject_uses_new_tmua_pipeline(prompts: "Prompts", subject: str) -> bool:
    if subject not in _TMUA_PIPELINE_SUBJECTS:
        return False
    pack = (getattr(prompts, "subject_new_packs", None) or {}).get(subject) or {}
    return bool((pack.get("classifier") or "").strip())


def get_subject_prompts(
    prompts: "Prompts",
    schema_id: str,
    math_paper: Optional[str] = None,
) -> Dict[str, str]:
    """Get subject-specific prompts based on schema_id and ESAT math paper (M* only)."""
    subject = get_subject_from_schema(schema_id)
    if subject == "mathematics" and math_paper == "Math 2":
        d = getattr(prompts, "designer_math2", None) or ""
        i = getattr(prompts, "implementer_math2", None) or ""
        t = getattr(prompts, "tag_labeler_math2", None) or ""
        if d.strip() and i.strip() and t.strip():
            return {"designer": d, "implementer": i, "classifier": t}
    return {
        "designer": prompts.designer[subject],
        "implementer": prompts.implementer[subject],
        "classifier": prompts.classifier[subject],
    }


# ---------- Schema parsing ----------

# Updated regex to accept numbered (M1, P3), unique (M_a1b2c3d4), and unnumbered (M., P.) formats
SCHEMA_HEADER_RE = re.compile(r"^##\s+\*\*((?:M|P|B|C)(?:\d+|_[a-f0-9]{8}))\.?\s+(.+?)\*\*\s*$", re.MULTILINE)

def parse_schemas_from_markdown(md: str, allow_prefixes: Tuple[str, ...]=("M","P")) -> Dict[str, Dict[str, str]]:
    """
    Parses Schemas.md into blocks keyed by schema_id (e.g., M1, P3, or M_custom, P_custom).
    Accepts both numbered format (## **M1. Title**) and unnumbered format (## **M. Title**).
    For unnumbered schemas, generates schema_id as {prefix}_{sanitized_title}.
    Returns: { "M1": {"title": "...", "block": "## M1...."} , ... }
    """
    matches = list(SCHEMA_HEADER_RE.finditer(md))
    schemas: Dict[str, Dict[str, str]] = {}
    unnumbered_counter = {}  # Track unnumbered schemas per prefix
    
    for i, m in enumerate(matches):
        schema_prefix_and_num = m.group(1).strip()
        title = m.group(2).strip()
        
        # Extract prefix (M, P, B, or C)
        prefix = schema_prefix_and_num[0]
        if prefix not in allow_prefixes:
            continue
        
        # Determine schema_id
        if schema_prefix_and_num.endswith('.'):
            # Unnumbered format (M., P.) - generate ID from title
            # Use a simple sanitization: lowercase, replace spaces with underscores, remove special chars
            sanitized_title = re.sub(r'[^a-zA-Z0-9\s]', '', title).strip().lower()
            sanitized_title = re.sub(r'\s+', '_', sanitized_title)[:30]  # Limit length
            if not sanitized_title:
                sanitized_title = "unnamed"
            # Add counter to ensure uniqueness
            if prefix not in unnumbered_counter:
                unnumbered_counter[prefix] = {}
            if sanitized_title not in unnumbered_counter[prefix]:
                unnumbered_counter[prefix][sanitized_title] = 0
            unnumbered_counter[prefix][sanitized_title] += 1
            counter = unnumbered_counter[prefix][sanitized_title]
            schema_id = f"{prefix}_{sanitized_title}" if counter == 1 else f"{prefix}_{sanitized_title}_{counter}"
        elif '_' in schema_prefix_and_num:
            # Unique ID format (M_a1b2c3d4) - use as-is
            schema_id = schema_prefix_and_num
        else:
            # Numbered format (M1, P3) - use as-is
            schema_id = schema_prefix_and_num
        
        start = m.start()
        end = matches[i+1].start() if i+1 < len(matches) else len(md)
        block = md[start:end].strip()
        
        # Extract exemplar IDs from the block (format: - `ID`: Justification)
        exemplar_ids = re.findall(r"- `([^`]+)`:", block)
        
        schemas[schema_id] = {"title": title, "block": block, "exemplar_ids": exemplar_ids}
    
    if not schemas:
        raise ValueError("No schemas parsed. Ensure Schemas.md uses headings like: ## **M1. Title** or ## **P1. Title** or ## **B1. Title** or ## **C1. Title** or ## **M. Title** or ## **P. Title**")
    return schemas


# ---------- Gemini client wrapper ----------


class GeminiQuotaExhaustedError(RuntimeError):
    """Raised when every configured API key hits quota / rate limits for the same request."""


def _gemini_console(msg: str, *, error_excerpt: str = "") -> None:
    """Print rate-limit / key-switch context to stdout (always on; plog warnings often skip the console)."""
    try:
        line = f"[Gemini API] {msg}"
        if error_excerpt:
            ex = error_excerpt.strip().replace("\n", " ")
            if len(ex) > 600:
                ex = ex[:600] + "…"
            line += f" | {ex}"
        print(line, flush=True)
    except OSError:
        pass


def _llm_debug_logging_enabled() -> bool:
    return os.environ.get("GEMINI_DEBUG_LLM", "").strip().lower() in ("1", "true", "yes")


def _vertex_env_config() -> Tuple[str, str]:
    """Return ``(project, location)`` required for Vertex AI mode."""
    project = (os.environ.get("GOOGLE_CLOUD_PROJECT") or "").strip()
    location = (os.environ.get("GOOGLE_CLOUD_LOCATION") or "").strip()
    return project, location


def _ensure_vertex_env_config() -> Tuple[str, str]:
    """Validate required Vertex AI environment variables."""
    project, location = _vertex_env_config()
    missing: List[str] = []
    if not project:
        missing.append("GOOGLE_CLOUD_PROJECT")
    if not location:
        missing.append("GOOGLE_CLOUD_LOCATION")
    if missing:
        raise SystemExit(
            "Missing Vertex AI configuration: "
            + ", ".join(missing)
            + ". Set these env vars and ensure ADC is authenticated (`gcloud auth application-default login`)."
        )
    return project, location


_vertex_genai_global_remap_logged = False


def _vertex_genai_client_location(location: str) -> str:
    """Map ``GOOGLE_CLOUD_LOCATION`` to a region the google-genai Vertex client accepts for Gemini.

    Requests to ``locations/global/.../publishers/google/models/gemini-*`` often return
    ``404 NOT_FOUND`` even when the same model id works under ``us-central1`` (or another
    regional endpoint). Remap ``global`` unless the operator opts out.

    Set ``VERTEX_GENAI_NO_GLOBAL_REMAP=1`` to pass ``global`` through unchanged.
    Set ``VERTEX_GENAI_LOCATION`` to choose the remap target (default ``us-central1``).
    """
    loc = (location or "").strip()
    if loc.lower() != "global":
        return loc
    if os.environ.get("VERTEX_GENAI_NO_GLOBAL_REMAP", "").strip().lower() in ("1", "true", "yes"):
        return loc
    fallback = (os.environ.get("VERTEX_GENAI_LOCATION") or "us-central1").strip()
    return fallback or "us-central1"


_RETRY_AFTER_SECONDS_RE = re.compile(
    r"Please retry in\s+([0-9]+(?:\.[0-9]+)?)\s*(?:s(?:ec(?:onds?)?)?)\b",
    re.IGNORECASE,
)
_RETRY_AFTER_MS_RE = re.compile(
    r"Please retry in\s+([0-9]+(?:\.[0-9]+)?)\s*ms\b",
    re.IGNORECASE,
)


def _parse_retry_after_seconds_from_error(error_str: str) -> Optional[float]:
    """Parse ``Please retry in …`` from Google quota / 429 bodies (Vertex or AI Studio)."""
    if not error_str:
        return None
    m = _RETRY_AFTER_MS_RE.search(error_str)
    if m:
        try:
            return max(0.0, float(m.group(1)) / 1000.0)
        except ValueError:
            pass
    m = _RETRY_AFTER_SECONDS_RE.search(error_str)
    if m:
        try:
            return max(0.0, float(m.group(1)))
        except ValueError:
            pass
    return None


def _compute_rate_limit_backoff_seconds(
    *,
    attempt: int,
    rate_limit_delay: float,
    error_str: str,
) -> float:
    """
    Combine exponential backoff with server-provided retry hints and light jitter.
    """
    parsed = _parse_retry_after_seconds_from_error(error_str)
    rl = max(0.5, float(rate_limit_delay))
    exp = rl * (1.55 ** attempt) + float(2 ** min(attempt, 4))
    wait_time = max(exp, float(2 ** min(attempt, 3)))
    if parsed is not None:
        wait_time = max(wait_time, parsed + random.uniform(0.15, 0.85))
    else:
        wait_time += random.uniform(0, min(2.5, wait_time * 0.12))
    cap = float(os.environ.get("API_RATE_LIMIT_BACKOFF_CAP", "180"))
    return min(max(wait_time, 0.5), cap)


class LLMClient:
    # Cross-worker: cap concurrent in-flight Gemini calls; shared min-delay pacing
    _api_concurrency_sem: Optional[threading.BoundedSemaphore] = None
    _api_sem_init_lock = threading.Lock()
    _global_pacing_lock = threading.Lock()
    _global_last_call_time: float = 0.0
    # After any worker sees 429, others wait too (reduces stampedes on TPM/RPM windows).
    _global_cooldown_until: float = 0.0
    # Index into key chain to try first on each generate() after primary exhausts quota (stick to alt until it fails).
    _session_preferred_first: int = 0
    _session_pref_lock = threading.Lock()

    @classmethod
    def _get_api_semaphore(cls) -> threading.BoundedSemaphore:
        with cls._api_sem_init_lock:
            if cls._api_concurrency_sem is None:
                n = max(1, int(os.environ.get("GEMINI_MAX_CONCURRENT", "1")))
                cls._api_concurrency_sem = threading.BoundedSemaphore(n)
            return cls._api_concurrency_sem

    def __init__(
        self,
        api_key: str = "",
        min_delay: float = 0.0,
        rate_limit_delay: float = 5.0,
        prompt_trace_callback: Optional[Callable[[str, str, str, str, float], None]] = None,
        alternative_api_key: Optional[str] = None,
    ):
        """
        Lightweight wrapper around the Gemini client with optional rate limiting.

        Args:
            api_key: Deprecated; ignored in Vertex mode.
            min_delay: Minimum delay (in seconds) between consecutive calls
            rate_limit_delay: Extra delay (in seconds) to wait after a rate-limit style error
            prompt_trace_callback: Optional ``(trace_label, model, system_prompt, user_prompt, temperature)`` fired before each API attempt (GUI / debugging).
            alternative_api_key: Deprecated; ignored in Vertex mode.
        """
        self._key_chain: List[str] = ["vertex"]
        self._active_key_index = 0
        self.api_key = ""
        self.client = None
        self.last_usage = None  # Store last API call's token usage
        self.total_usage = {"prompt_tokens": 0, "candidates_tokens": 0, "total_tokens": 0}  # Accumulate total usage
        self.min_delay = float(min_delay) if min_delay is not None else 0.0
        self.rate_limit_delay = float(rate_limit_delay) if rate_limit_delay is not None else 5.0
        self.prompt_trace_callback = prompt_trace_callback
        self._rebuild_client()

    def _rebuild_client(self) -> None:
        if _GENAI_AVAILABLE:
            global _vertex_genai_global_remap_logged
            project, location = _ensure_vertex_env_config()
            api_location = _vertex_genai_client_location(location)
            if (
                (location or "").strip().lower() == "global"
                and api_location != (location or "").strip()
                and not _vertex_genai_global_remap_logged
            ):
                _gemini_console(
                    "Vertex GenAI: GOOGLE_CLOUD_LOCATION is `global` — using "
                    f"{api_location!r} for the API client (Gemini publisher models often return NOT_FOUND on global). "
                    "Set GOOGLE_CLOUD_LOCATION to a region (e.g. us-central1), or VERTEX_GENAI_LOCATION / "
                    "VERTEX_GENAI_NO_GLOBAL_REMAP=1."
                )
                _vertex_genai_global_remap_logged = True
            self.client = genai.Client(
                vertexai=True,
                project=project,
                location=api_location,
            )
        else:
            self.client = None

    def _key_indices_try_order(self) -> List[int]:
        """Rotate key order so we keep using the alternative key first after primary hits rate limits."""
        n = len(self._key_chain)
        if n == 0:
            return []
        with LLMClient._session_pref_lock:
            start = LLMClient._session_preferred_first
        start = max(0, min(start, n - 1))
        return list(range(start, n)) + list(range(0, start))

    def generate(
        self,
        model: str,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.6,
        max_retries: int = 5,
        trace_label: Optional[str] = None,
    ) -> str:
        """
        Returns model output as text.
        Retries on transient errors (503, network issues) with exponential backoff.
        On repeated quota / rate-limit errors, raises ``GeminiQuotaExhaustedError``.
        """
        env_mr = (os.environ.get("GEMINI_VERTEX_MAX_RETRIES") or "").strip()
        if env_mr:
            try:
                max_retries = max(1, min(12, int(env_mr)))
            except ValueError:
                pass
        if not self.client:
            raise RuntimeError(
                "Google GenAI SDK not available. Install with `pip install google-genai` "
                "or adapt the code to your preferred LLM client."
            )

        _dbg = _llm_debug_logging_enabled()
        last_error: Optional[BaseException] = None
        key_order = self._key_indices_try_order()

        for ord_i, key_idx in enumerate(key_order):
            self._active_key_index = key_idx
            self._rebuild_client()
            key_label = "primary" if key_idx == 0 else "alternative"

            for attempt in range(max_retries):
                sem = self._get_api_semaphore()
                sem.acquire()
                try:
                    # Min spacing between successful calls + cooperative 429 cooldown (all threads).
                    while True:
                        now = time.time()
                        with LLMClient._global_pacing_lock:
                            last = LLMClient._global_last_call_time
                            cool = LLMClient._global_cooldown_until
                        earliest = max(
                            last + (self.min_delay if self.min_delay > 0 else 0.0),
                            cool,
                        )
                        wait = earliest - now
                        if wait <= 0:
                            break
                        if _dbg:
                            plog(
                                "llm",
                                "min_delay_wait",
                                level="debug",
                                detail={
                                    "wait_s": round(wait, 2),
                                    "min_delay": self.min_delay,
                                    "cooldown_until": round(cool, 2) if cool > now else None,
                                },
                                echo=False,
                            )
                        time.sleep(wait if wait < 5.0 else 5.0)

                    if _dbg:
                        plog(
                            "llm",
                            "generate_attempt",
                            level="debug",
                            detail={
                                "model": model,
                                "auth": "vertex_adc",
                                "attempt": attempt + 1,
                                "max_retries": max_retries,
                            },
                            echo=False,
                        )

                    if self.prompt_trace_callback is not None:
                        try:
                            lbl = trace_label or model
                            self.prompt_trace_callback(
                                lbl, model, system_prompt, user_prompt, float(temperature)
                            )
                        except Exception:
                            pass

                    resp = self.client.models.generate_content(
                        model=model,
                        contents=user_prompt,
                        config={
                            "system_instruction": system_prompt,
                            "temperature": temperature,
                        },
                    )

                    with LLMClient._global_pacing_lock:
                        LLMClient._global_last_call_time = time.time()

                    if _dbg:
                        plog("llm", "api_ok", level="debug", detail={"model": model}, echo=False)
                    usage_info = {}
                    if hasattr(resp, "usage_metadata"):
                        usage_info = {
                            "prompt_tokens": getattr(resp.usage_metadata, "prompt_token_count", None),
                            "candidates_tokens": getattr(resp.usage_metadata, "candidates_token_count", None),
                            "total_tokens": getattr(resp.usage_metadata, "total_token_count", None),
                        }
                    elif hasattr(resp, "usage"):
                        usage_info = {
                            "prompt_tokens": getattr(resp.usage, "prompt_token_count", None),
                            "candidates_tokens": getattr(resp.usage, "candidates_token_count", None),
                            "total_tokens": getattr(resp.usage, "total_token_count", None),
                        }

                    if usage_info and any(usage_info.values()):
                        self.last_usage = usage_info
                        for ukey in self.total_usage:
                            if usage_info.get(ukey) is not None:
                                self.total_usage[ukey] += usage_info[ukey]

                    with LLMClient._session_pref_lock:
                        LLMClient._session_preferred_first = key_idx
                    return (resp.text or "").strip()
                except Exception as e:
                    last_error = e
                    error_str = str(e)

                    if _dbg:
                        plog(
                            "llm",
                            "api_fail",
                            level="debug",
                            detail={
                                "model": model,
                                "attempt": attempt + 1,
                                "error_type": type(e).__name__,
                                "error": error_str[:500],
                            },
                            echo=False,
                        )

                    if "403" in error_str or "PERMISSION_DENIED" in error_str:
                        _gemini_console(
                            "Permission denied (403). Check Vertex IAM role and active ADC credentials.",
                            error_excerpt=error_str,
                        )
                        raise

                    is_transient = (
                        "503" in error_str
                        or "UNAVAILABLE" in error_str
                        or "overloaded" in error_str.lower()
                        or "disconnected" in error_str.lower()
                        or "getaddrinfo" in error_str.lower()
                        or "timeout" in error_str.lower()
                        or "connection" in error_str.lower()
                    )

                    is_rate_limit = (
                        "rate" in error_str.lower()
                        or "quota" in error_str.lower()
                        or "429" in error_str
                        or "resource_exhausted" in error_str.lower()
                        or "too many requests" in error_str.lower()
                    )

                    if (is_transient or is_rate_limit) and attempt < max_retries - 1:
                        if is_rate_limit:
                            wait_time = _compute_rate_limit_backoff_seconds(
                                attempt=attempt,
                                rate_limit_delay=self.rate_limit_delay,
                                error_str=error_str,
                            )
                            with LLMClient._global_pacing_lock:
                                LLMClient._global_cooldown_until = max(
                                    LLMClient._global_cooldown_until,
                                    time.time() + wait_time,
                                )
                            plog(
                                "llm",
                                "rate_limit_backoff",
                                level="warning",
                                detail={
                                    "key": key_label,
                                    "wait_s": round(wait_time, 2),
                                    "parsed_retry_hint_s": _parse_retry_after_seconds_from_error(
                                        error_str
                                    ),
                                    "attempt": attempt + 1,
                                    "model": model,
                                    "trace": trace_label or "",
                                },
                                echo=False,
                            )
                            _gemini_console(
                                f"Rate limit / quota — key={key_label}, attempt {attempt + 1}/{max_retries}, "
                                f"waiting {round(wait_time, 1)}s then retry "
                                f"(trace={trace_label or '—'})",
                                error_excerpt=error_str,
                            )
                            append_gemini_api_event(
                                {
                                    "event": "rate_limit_backoff",
                                    "key": key_label,
                                    "model": model,
                                    "trace_label": trace_label or "",
                                    "attempt": attempt + 1,
                                    "max_retries": max_retries,
                                    "wait_s": round(wait_time, 2),
                                    "parsed_retry_hint_s": _parse_retry_after_seconds_from_error(
                                        error_str
                                    ),
                                    "error_excerpt": error_str[:600],
                                }
                            )
                        else:
                            wait_time = float(2**attempt)
                            wait_time += random.uniform(0, min(1.0, wait_time * 0.08))
                            if _dbg:
                                plog(
                                    "llm",
                                    "transient_retry",
                                    level="debug",
                                    detail={"wait_s": wait_time},
                                    echo=False,
                                )
                        time.sleep(wait_time)
                        continue

                    if is_rate_limit and ord_i < len(key_order) - 1:
                        next_key_idx = key_order[ord_i + 1]
                        next_label = "primary" if next_key_idx == 0 else "alternative"
                        with LLMClient._session_pref_lock:
                            LLMClient._session_preferred_first = next_key_idx
                        plog(
                            "llm",
                            "switching_api_key",
                            detail={
                                "from": key_label,
                                "to": next_label,
                                "model": model,
                                "trace": trace_label or "",
                            },
                            echo=True,
                            spacer=True,
                        )
                        _gemini_console(
                            f"Switching API key after rate limits on {key_label} → using {next_label} next "
                            f"(model={model}, trace={trace_label or '—'})",
                            error_excerpt=error_str,
                        )
                        append_gemini_api_event(
                            {
                                "event": "switching_api_key",
                                "from_key": key_label,
                                "to_key": next_label,
                                "model": model,
                                "trace_label": trace_label or "",
                                "after_attempts": max_retries,
                                "error_excerpt": error_str[:600],
                            }
                        )
                        break

                    if is_rate_limit:
                        _gemini_console(
                            f"All configured API keys hit quota/rate limits ({len(self._key_chain)} key(s)); stopping. "
                            f"(model={model}, trace={trace_label or '—'})",
                            error_excerpt=error_str,
                        )
                        append_gemini_api_event(
                            {
                                "event": "quota_exhausted_all_keys",
                                "model": model,
                                "trace_label": trace_label or "",
                                "keys_tried": len(self._key_chain),
                                "last_error_excerpt": error_str[:800],
                            }
                        )
                        raise GeminiQuotaExhaustedError(
                            "Gemini quota or rate limit exhausted on Vertex AI. "
                            "Designer and Implementer stay on Gemini 3.1 Pro Preview (no automatic switch to 2.5 Pro). "
                            "Limits are per Google Cloud project (RPM, TPM, RPD). "
                            "Check Vertex AI quota in Google Cloud Console."
                        ) from last_error
                    raise
                finally:
                    sem.release()

        raise RuntimeError(f"Failed after Vertex retries. Last error: {last_error}")


# ---------- Prompt loaders ----------

_STRICT_NEW_PACK_FILES = (
    ("designer", "{stem} Designer.md"),
    ("implementer", "{stem} Implementer.md"),
    ("tag_labeler", "{stem} Tag_Labeler.md"),
    ("retry", "{stem} Retry_controller.md"),
    ("verifier", "{stem} Verifier.md"),
    ("style", "{stem} Style_checker.md"),
    ("format_fixer", "{stem} Format Fixer.md"),
)


def _load_strict_new_pack(prompt_dir: str, folder: str, stem: str) -> Dict[str, str]:
    """
    Load a complete subject pack from ``by_subject_prompts/new/<folder>/``.
    No fallbacks — missing files raise ``FileNotFoundError``.
    """
    base = os.path.join(prompt_dir, "new", folder)
    if not os.path.isdir(base):
        raise FileNotFoundError(
            f"Required prompt directory missing:\n  {base}\n"
            "The pipeline loads only by_subject_prompts/new/ (legacy old/ is not used)."
        )
    out: Dict[str, str] = {}
    missing: List[str] = []
    for key, pat in _STRICT_NEW_PACK_FILES:
        fn = pat.format(stem=stem)
        p = os.path.join(base, fn)
        if not os.path.isfile(p):
            missing.append(p)
        else:
            out[key] = read_text(p)
    if missing:
        raise FileNotFoundError(
            f"Incomplete pack under {base}. Missing required files:\n  "
            + "\n  ".join(missing)
        )
    for key, pat in (("sibling", "{stem} Sibling Mode.md"), ("far", "{stem} Far Mode.md")):
        fn = pat.format(stem=stem)
        p = os.path.join(base, fn)
        out[key] = read_text(p) if os.path.isfile(p) else ""
    return out


def _subject_new_pack_row(strict: Dict[str, str]) -> Dict[str, str]:
    """Shape stored on ``Prompts.subject_new_packs`` (classifier = Tag_Labeler body).

    Keys used by the pipeline: ``designer``, ``implementer``, ``classifier``, ``format_fixer``,
    ``verifier``, ``style``, ``retry``, optional ``sibling`` / ``far`` (Sibling Mode / Far Mode).
    """
    sib = strict.get("sibling", "") or ""
    far = strict.get("far", "") or ""
    sty = strict["style"]
    ret = strict["retry"]
    return {
        "designer": strict["designer"],
        "implementer": strict["implementer"],
        "classifier": strict["tag_labeler"],
        "format_fixer": strict.get("format_fixer", "") or "",
        "sibling": sib,
        "far": far,
        "verifier": strict["verifier"],
        "style": sty,
        "retry": ret,
        # Aliases (same strings) for call sites that used older key names
        "sibling_mode": sib,
        "far_mode": far,
        "style_checker": sty,
        "retry_controller": ret,
    }


@dataclass
class Prompts:
    # Subject-specific prompts (dict mapping subject -> prompt text)
    designer: Dict[str, str]
    implementer: Dict[str, str]
    classifier: Dict[str, str]
    
    # Retired universal prompts (always empty; each subject uses new/<Subject>/ stages only).
    retry_controller: str
    verifier: str
    style_checker: str


def load_prompts(base_dir: str) -> Prompts:
    """Load **only** ``by_subject_prompts/new/`` packs. No ``old/`` fallback — missing files raise.

    Required: complete Math1, Math2, Physics, Chemistry, Biology folders (Designer, Implementer,
    Tag_Labeler, Retry_controller, Verifier, Style_checker, Format Fixer). Sibling/Far mode files
    are optional within each folder.
    """
    init_pipeline_log(base_dir)
    prompt_dir = os.path.join(base_dir, "by_subject_prompts")

    m1 = _load_strict_new_pack(prompt_dir, "Math1", "Math1")
    m2 = _load_strict_new_pack(prompt_dir, "Math2", "Math2")

    designers: Dict[str, str] = {
        "mathematics": m1["designer"],
    }
    implementers: Dict[str, str] = {
        "mathematics": m1["implementer"],
    }
    tag_labeler_math1 = m1["tag_labeler"]
    classifiers: Dict[str, str] = {
        "mathematics": tag_labeler_math1,
    }

    sibling_mode_prompt = m1["sibling"] or None
    far_mode_prompt = m1["far"] or None
    format_fixer_math1 = m1["format_fixer"]
    retry_math1 = m1["retry"]
    verifier_math1 = m1["verifier"]
    style_math1 = m1["style"]

    designer_math2 = m2["designer"]
    implementer_math2 = m2["implementer"]
    tag_labeler_math2 = m2["tag_labeler"]
    sibling_mode_math2 = m2["sibling"] or None
    far_mode_math2 = m2["far"] or None
    format_fixer_math2 = m2["format_fixer"]
    retry_math2 = m2["retry"]
    verifier_math2 = m2["verifier"]
    style_math2 = m2["style"]

    subject_new_packs: Dict[str, Dict[str, str]] = {}
    for subj_key, disp_folder, stem in (
        ("physics", "Physics", "Physics"),
        ("chemistry", "Chemistry", "Chemistry"),
        ("biology", "Biology", "Biology"),
    ):
        strict = _load_strict_new_pack(prompt_dir, disp_folder, stem)
        row = _subject_new_pack_row(strict)
        subject_new_packs[subj_key] = row
        designers[subj_key] = row["designer"]
        implementers[subj_key] = row["implementer"]
        classifiers[subj_key] = row["classifier"]

    Prompts.sibling_mode = sibling_mode_prompt
    Prompts.far_mode = far_mode_prompt
    Prompts.format_fixer_math1 = format_fixer_math1
    Prompts.retry_controller_math1 = retry_math1
    Prompts.verifier_math1 = verifier_math1
    Prompts.style_checker_math1 = style_math1
    Prompts.tag_labeler_math1 = tag_labeler_math1
    Prompts.designer_math2 = designer_math2
    Prompts.implementer_math2 = implementer_math2
    Prompts.tag_labeler_math2 = tag_labeler_math2
    Prompts.sibling_mode_math2 = sibling_mode_math2
    Prompts.far_mode_math2 = far_mode_math2
    Prompts.format_fixer_math2 = format_fixer_math2
    Prompts.retry_controller_math2 = retry_math2
    Prompts.verifier_math2 = verifier_math2
    Prompts.style_checker_math2 = style_math2
    Prompts.subject_new_packs = subject_new_packs

    plog(
        "prompts",
        "strict_new_packs_loaded",
        detail={
            "pcb_subjects": sorted(subject_new_packs.keys()),
            "note": "Math1+Math2+P/C/B new/ only; see pipeline_session.jsonl",
        },
        echo=False,
    )

    return Prompts(
        designer=designers,
        implementer=implementers,
        classifier=classifiers,
        retry_controller="",
        verifier="",
        style_checker="",
    )


# ---------- Pipeline steps ----------

def choose_schema(schemas: Dict[str, Dict[str, str]], cfg: RunConfig) -> str:
    ids = [sid for sid in schemas.keys() if sid.startswith(cfg.allow_schema_prefixes)]
    if not ids:
        raise ValueError("No schemas available after prefix filter.")
    if cfg.schema_weights:
        weights = [cfg.schema_weights.get(sid, 1.0) for sid in ids]
        return random.choices(ids, weights=weights, k=1)[0]
    return random.choice(ids)

def get_schemas_sorted_by_category(schemas: Dict[str, Dict[str, str]], category_order: List[str] = None) -> List[Tuple[str, str]]:
    """
    Get schemas sorted by category and number.
    
    Args:
        schemas: Dictionary of schemas
        category_order: List of category prefixes in desired order (e.g., ["M", "P", "B", "C"])
        
    Returns:
        List of tuples (schema_id, category) sorted by category and schema number
    """
    if category_order is None:
        category_order = ["M", "P", "B", "C"]
    
    # Group schemas by category
    by_category = {}
    for schema_id in schemas.keys():
        prefix = schema_id[0].upper()
        if prefix in category_order:
            if prefix not in by_category:
                by_category[prefix] = []
            by_category[prefix].append(schema_id)
    
    # Sort schemas within each category by number
    for prefix in by_category:
        by_category[prefix].sort(key=lambda sid: int(re.search(r'\d+', sid).group()) if re.search(r'\d+', sid) else 999)
    
    # Build sorted list
    result = []
    for prefix in category_order:
        if prefix in by_category:
            for schema_id in by_category[prefix]:
                result.append((schema_id, prefix))
    
    return result

def choose_difficulty(cfg: RunConfig) -> str:
    if not cfg.difficulty_weights:
        return random.choice(["Easy", "Medium", "Hard", "Extreme"])
    diffs = list(cfg.difficulty_weights.keys())
    weights = [max(0.0, float(cfg.difficulty_weights[d])) for d in diffs]
    s = sum(weights)
    if s <= 0:
        return random.choice(["Easy", "Medium", "Hard", "Extreme"])
    return random.choices(diffs, weights=weights, k=1)[0]

def apply_mode_injection(
    llm: LLMClient,
    prompts: Prompts,
    models: ModelsConfig,
    idea_plan: Dict[str, Any],
    mode: str,
    schema_id: str = "",
) -> Dict[str, Any]:
    """
    Apply mode injection (Sibling/Far) to a designer idea_plan.
    
    Args:
        llm: LLM client
        prompts: Prompts object
        models: Models config
        idea_plan: Original idea_plan from designer
        mode: "sibling" or "far"
        schema_id: Selects P/C/B sibling/far prompts from ``subject_new_packs`` when applicable.
    
    Returns:
        Modified idea_plan with mode injection applied
    """
    if mode not in ["sibling", "far"]:
        return idea_plan  # No injection needed
    
    # Get appropriate mode prompt (subject new-pack first, then Math 1 global blobs)
    mode_prompt = None
    subj = get_subject_from_schema(schema_id) if schema_id else ""
    pack = (getattr(prompts, "subject_new_packs", None) or {}).get(subj) if subj else None
    if pack:
        if mode == "sibling":
            mode_prompt = (pack.get("sibling") or pack.get("sibling_mode") or "").strip() or None
        elif mode == "far":
            mode_prompt = (pack.get("far") or pack.get("far_mode") or "").strip() or None
    if not mode_prompt:
        if mode == "sibling" and hasattr(prompts, "sibling_mode") and prompts.sibling_mode:
            mode_prompt = prompts.sibling_mode
        elif mode == "far" and hasattr(prompts, "far_mode") and prompts.far_mode:
            mode_prompt = prompts.far_mode
    
    if not mode_prompt:
        # Mode injection not available, return original
        return idea_plan
    
    # Apply mode injection
    user = f"""Original idea_plan (JSON):
{prompt_json_dumps(idea_plan)}

Apply {mode.upper()} mode injection to this idea_plan.
Return the modified idea_plan as a single JSON object with variation_mode set to "{mode}".
"""
    
    txt = llm.generate(
        model=models.designer,
        system_prompt=mode_prompt,
        user_prompt=user,
        temperature=_designer_temperature_for_variation_mode(mode),
        trace_label="Designer (mode injection)",
    )
    
    obj = safe_json_load(txt)
    if not isinstance(obj, dict):
        # If parsing fails, return original with mode set
        idea_plan["variation_mode"] = mode
        return idea_plan
    
    # Ensure variation_mode is set
    obj["variation_mode"] = mode
    obj["_raw_text"] = txt
    return obj


def load_variation_mode_weights(base_dir: str) -> Tuple[float, float]:
    """
    Load Sibling vs Far weights from ``variation_weights.txt`` under ``base_dir``.
    Returns ``(w_sibling, w_far)`` normalized to sum to 1.0. On missing/invalid file, (0.75, 0.25).
    """
    default = (0.75, 0.25)
    path = os.path.join(base_dir, "variation_weights.txt")
    if not os.path.isfile(path):
        return default
    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
    except OSError:
        return default
    sib: Optional[float] = None
    far: Optional[float] = None
    for line in content.split("\n"):
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, rest = line.partition("=")
        k = key.strip().lower()
        try:
            val = float(rest.strip())
        except ValueError:
            continue
        if k in ("sibling", "sib"):
            sib = val
        elif k == "far":
            far = val
    if sib is None or far is None or sib < 0 or far < 0:
        return default
    tot = sib + far
    if tot <= 0:
        return default
    return (sib / tot, far / tot)


def _resolve_math1_variation_mode(requested: str, base_dir: Optional[str] = None) -> str:
    """Math 1: SIBLING or FAR only when not forced by env/config; else weighted random from variation_weights.txt."""
    r = (requested or "").strip().lower()
    if r in ("sibling", "far"):
        return r
    bd = base_dir or os.path.dirname(os.path.abspath(__file__))
    ws, wf = load_variation_mode_weights(bd)
    return random.choices(["sibling", "far"], weights=[ws, wf], k=1)[0]


def _split_reference_question_solution(blob: str) -> Tuple[str, str]:
    """Split NSAA bank text into question vs solution when common separators exist."""
    blob = (blob or "").strip()
    if not blob:
        return "", ""
    for sep in ("\n---\n", "\n\nSolution\n", "\nSolution:\n", "\n\nOfficial solution\n", "\nOfficial solution:\n"):
        if sep in blob:
            q, s = blob.split(sep, 1)
            return q.strip(), s.strip()
    return blob, ""


MATH1_VARIATION_INSERT_MARKER = "<INSERT_VARIATION_POLICY>"


def _variation_blobs_for_math_paper(prompts: Prompts, math_paper: str) -> Tuple[str, str]:
    """Return (sibling_blob, far_blob) for Math 1 or Math 2 designer injection."""
    if math_paper == "Math 2":
        s = (getattr(prompts, "sibling_mode_math2", None) or "").strip()
        f = (getattr(prompts, "far_mode_math2", None) or "").strip()
        return s, f
    s = (getattr(prompts, "sibling_mode", None) or "").strip()
    f = (getattr(prompts, "far_mode", None) or "").strip()
    return s, f


def _inject_variation_policy_from_blobs(
    designer_body: str, sibling_blob: str, far_blob: str, mode: str
) -> Tuple[str, bool]:
    """Inject SIBLING/FAR policy using ``<INSERT_VARIATION_POLICY>`` or an appended contract."""
    sib = (sibling_blob or "").strip()
    far = (far_blob or "").strip()
    blob = (sib if mode == "sibling" else far).strip()
    if not blob:
        return designer_body, False
    if MATH1_VARIATION_INSERT_MARKER in designer_body:
        return designer_body.replace(MATH1_VARIATION_INSERT_MARKER, blob, 1), True
    header = (
        "\n\n------------------------------------------------------------\n\n"
        "# VARIATION CONTRACT (mandatory)\n\n"
        f"Set variation_mode in your JSON output to exactly \"{mode}\".\n\n"
    )
    return designer_body + header + blob + "\n", True


def _inject_subject_variation_policy(
    designer_body: str,
    prompts: Prompts,
    mode: str,
    subject: str,
    math_paper: Optional[str],
) -> Tuple[str, bool]:
    """Inject SIBLING/FAR for Mathematics (Math 1/2) or a loaded P/C/B ``subject_new_packs`` designer."""
    if subject == "mathematics":
        sib, far = _variation_blobs_for_math_paper(prompts, math_paper or "Math 1")
    else:
        pack = (getattr(prompts, "subject_new_packs", None) or {}).get(subject) or {}
        sib = (pack.get("sibling") or pack.get("sibling_mode") or "").strip()
        far = (pack.get("far") or pack.get("far_mode") or "").strip()
    return _inject_variation_policy_from_blobs(designer_body, sib, far, mode)


def _inject_math_variation_policy(
    designer_body: str, prompts: Prompts, mode: str, math_paper: str
) -> Tuple[str, bool]:
    """Inject SIBLING/FAR policy into Math1/Math2 Designer (``<INSERT_VARIATION_POLICY>``)."""
    return _inject_subject_variation_policy(designer_body, prompts, mode, "mathematics", math_paper)


def _inject_math1_variation_policy(designer_body: str, prompts: Prompts, mode: str) -> Tuple[str, bool]:
    """Backward-compatible alias: Math 1 blobs only."""
    return _inject_math_variation_policy(designer_body, prompts, mode, "Math 1")


def _math1_designer_user_prompt(
    schema_block: str,
    difficulty: str,
    exemplar_ids: Optional[List[str]],
    variation_mode: str,
) -> str:
    """
    User message for Math1 Designer: variation_seed + schema + reference Q/S (TMUA-style inputs).
    Schema block is the markdown invariant from Schemas_ESAT (from ``run_once``).
    """
    seed = variation_mode.strip().upper()
    lines = [
        f"variation_seed: {seed}",
        "",
        "Apply the variation policy already included in your instructions. "
        f"Your JSON output must set variation_mode to exactly \"{variation_mode}\" (same as variation_seed, lower case).",
        "",
        "# Schema (invariant — preserve this reasoning pattern)",
        schema_block,
        "",
    ]
    ref_q, ref_sol = "", ""
    if exemplar_ids:
        sample_ids = random.sample(exemplar_ids, min(len(exemplar_ids), 1))
        texts = fetch_exemplar_texts(sample_ids)
        if texts:
            ref_q, ref_sol = _split_reference_question_solution(texts[0])

    if ref_q:
        lines.extend(
            [
                "# Reference question",
                '"""',
                ref_q,
                '"""',
                "",
            ]
        )
        if ref_sol:
            lines.extend(
                [
                    "# Reference solution",
                    '"""',
                    ref_sol,
                    '"""',
                    "",
                ]
            )
        else:
            lines.extend(
                [
                    "# Reference solution",
                    "(No separate solution section detected in the bank text — use any solution text embedded in the reference question block only if present.)",
                    "",
                ]
            )
    else:
        lines.extend(
            [
                "# Reference question",
                "(No exemplar loaded from the question bank for this schema — design from the schema and difficulty only.)",
                "",
                "# Reference solution",
                "(None.)",
                "",
            ]
        )

    lines.extend(
        [
            f"Target difficulty: {difficulty}",
            "(Valid labels: Easy, Medium, Hard, Extreme — defined in your system instructions.)",
            "",
            "Return raw JSON only (one object), following the output format in your system instructions.",
        ]
    )
    return "\n".join(lines)


def _designer_temperature_for_variation_mode(variation_mode: str) -> float:
    """
    Sampling temperature for the Designer (and sibling/far mode-injection pass).
    Far mode uses a higher default so idea_plans explore more diverse structures.
    Override with ESAT_DESIGNER_TEMPERATURE_FAR / ESAT_DESIGNER_TEMPERATURE (floats in [0, 2]).
    """
    vm = (variation_mode or "").strip().lower()
    if vm == "far":
        raw = (os.environ.get("ESAT_DESIGNER_TEMPERATURE_FAR") or "").strip()
        if raw:
            try:
                return max(0.0, min(2.0, float(raw)))
            except ValueError:
                pass
        return 0.9
    raw = (os.environ.get("ESAT_DESIGNER_TEMPERATURE") or "").strip()
    if raw:
        try:
            return max(0.0, min(2.0, float(raw)))
        except ValueError:
            pass
    return 0.7


def designer_call(
    llm: LLMClient,
    prompts: Prompts,
    models: ModelsConfig,
    schema_block: str,
    schema_id: str,
    difficulty: str,
    exemplar_ids: List[str] = None,
    variation_mode: str = "base",
    base_dir: Optional[str] = None,
    math_paper: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Call Designer to create an idea_plan.
    
    Args:
        llm: LLM client
        prompts: Prompts object
        models: Models config
        schema_block: Schema markdown block
        schema_id: Schema ID
        difficulty: Target difficulty
        exemplar_ids: List of exemplar question IDs (1-2 NSAA references)
        variation_mode: For **mathematics** and **Physics / Chemistry / Biology**: ``sibling`` or ``far``, or any
            other value (including ``base``) picks randomly between sibling and far using ``variation_weights.txt``.
        base_dir: Generator root (folder containing ``variation_weights.txt``); defaults to this package directory.
    
    Returns:
        idea_plan dictionary with required fields
    """
    subject = get_subject_from_schema(schema_id)
    mp = math_paper if subject == "mathematics" else None
    subject_prompts = get_subject_prompts(prompts, schema_id, mp)
    pcb_tmua = _subject_uses_new_tmua_pipeline(prompts, subject)

    if subject == "mathematics":
        variation_mode = _resolve_math1_variation_mode(variation_mode, base_dir)
    elif pcb_tmua:
        variation_mode = _resolve_math1_variation_mode(variation_mode, base_dir)
    elif variation_mode not in ("base", "sibling", "far"):
        variation_mode = "base"

    system_prompt = subject_prompts["designer"]
    variation_contract_injected = False
    if subject == "mathematics":
        system_prompt, variation_contract_injected = _inject_math_variation_policy(
            subject_prompts["designer"], prompts, variation_mode, mp or "Math 1"
        )
    elif pcb_tmua:
        system_prompt, variation_contract_injected = _inject_subject_variation_policy(
            subject_prompts["designer"], prompts, variation_mode, subject, None
        )

    if subject == "mathematics":
        # TMUA-style inputs: variation_seed + schema block + reference Q/S (see Math1 Designer.md)
        user = _math1_designer_user_prompt(schema_block, difficulty, exemplar_ids, variation_mode)
    elif pcb_tmua:
        user = _math1_designer_user_prompt(schema_block, difficulty, exemplar_ids, variation_mode)
    else:
        exemplar_section = ""
        if exemplar_ids:
            sample_ids = random.sample(exemplar_ids, min(len(exemplar_ids), 2))
            texts = fetch_exemplar_texts(sample_ids)
            if texts:
                exemplar_section = "\n\n# AUTHENTIC NSAA SECTION 1 MATHEMATICS REFERENCES\n"
                for i, text in enumerate(texts):
                    exemplar_section += f"Reference {i+1}:\n\"\"\"\n{text}\n\"\"\"\n\n"
                exemplar_section += "\nUse these references ONLY to calibrate stem compactness, tone, expected step-count, no-calculator engineering, and distractor structure. Do NOT copy distinctive numbers, structural fingerprints, wording, constants, or transformation chains."

        user = f"""You will receive a schema and a target difficulty.

Schema:
{schema_block}{exemplar_section}

Target difficulty: {difficulty}
(Valid labels: Easy, Medium, Hard, Extreme.)

Return exactly one idea_plan as a JSON object (required keys per your system instructions).
The idea_plan must include:
- schema_id
- variation_mode (will be set to "{variation_mode}" after generation)
- task_signature
- primary_tag
- secondary_tags
- intended_wrong_paths
- constraints_used
- idea_summary
- tool_footprint
- difficulty_rationale
- mcq_viability

No numbers. No equations. No solving.
Define ONE dominant reasoning move."""

    txt = llm.generate(
        model=models.designer,
        system_prompt=system_prompt,
        user_prompt=user,
        temperature=_designer_temperature_for_variation_mode(variation_mode),
        trace_label="Designer",
    )
    obj = safe_json_load(txt)
    if not isinstance(obj, dict) or "schema_id" not in obj:
        raise ValueError(f"Designer output invalid JSON/object. Raw output:\n{txt}")
    
    # Set variation_mode
    obj["variation_mode"] = variation_mode
    
    # Math 1 / new P-C-B TMUA packs: mode contract is in the designer system prompt when injection succeeded.
    # Legacy non-math: keep follow-up injection for sibling/far if configured.
    if variation_mode in ["sibling", "far"]:
        if not variation_contract_injected:
            obj = apply_mode_injection(llm, prompts, models, obj, variation_mode, schema_id)
    
    # Normalize schema_id
    out_schema = str(obj.get("schema_id", "")).strip()
    if schema_id not in out_schema:
        obj["_warning"] = f"Designer schema_id '{out_schema}' does not include expected '{schema_id}'."
    
    obj["_raw_text"] = txt
    return obj

def format_fixer_call(llm: LLMClient, prompts: Prompts, models: ModelsConfig,
                       question_obj: Dict[str, Any], katex_errors: Optional[List[Dict[str, Any]]] = None,
                       parse_errors: Optional[str] = None, schema_id: str = "M1",
                       math_paper: Optional[str] = None) -> Dict[str, Any]:
    """
    Format Fixer: Fix JSON + KaTeX formatting only, no math changes.
    
    Args:
        llm: LLM client
        prompts: Prompts object
        models: Models config
        question_obj: Question package with formatting errors
        katex_errors: Optional list of KaTeX errors
        parse_errors: Optional JSON parse / repair error text
        schema_id: Schema ID for subject-specific handling
    
    Returns:
        Fixed question package, or original with format_only_blocked flag if non-format issue detected
    """
    format_fixer_prompt = _resolve_format_fixer_system_prompt(prompts, schema_id, math_paper)
    if not format_fixer_prompt:
        return question_obj
    
    # Build error report
    error_report = ""
    if katex_errors:
        error_report += "KaTeX Validation Errors:\n"
        for error_info in katex_errors:
            field = error_info.get("field", "unknown")
            errors = error_info.get("errors", [])
            error_report += f"\nField: {field}\n"
            for err in errors:
                error_report += f"  - {err}\n"
    
    if parse_errors:
        error_report += f"\nJSON / parse errors:\n{parse_errors}\n"
    
    user = f"""The following is the full question package as JSON. Fix ONLY JSON validity (string escapes, commas, brackets) and KaTeX rules inside string values. Do NOT change mathematical meaning.

Display math: any line with `$$` must contain only `$$`; TeX goes on lines between opening and closing `$$`; use blank lines (double newlines in strings) before/after each display block.

implemented_question_json:
{prompt_json_dumps(question_obj)}

"""
    if error_report:
        user += f"""katex_errors:
{error_report}

"""
    if parse_errors:
        user += f"""parse_errors:
{parse_errors}

"""
    
    user += "Return exactly one JSON object with the same keys and structure as the implementer output (metadata, question, solution, distractor_map, etc.). No markdown fences."
    
    txt = llm.generate(
        model=models.implementer,  # Use implementer model for format fixing
        system_prompt=format_fixer_prompt,
        user_prompt=user,
        temperature=0.2,  # Very low temperature for precise formatting
        trace_label="Format Fixer",
    )
    
    # Check if format fixer blocked (non-format issue detected)
    if "format_only_blocked" in txt.lower() or "blocked_reason" in txt.lower():
        try:
            blocked_obj = safe_json_load(txt)
            if blocked_obj.get("format_only_blocked"):
                # Return original with blocked flag
                question_obj["_format_fixer_blocked"] = True
                question_obj["_format_fixer_reason"] = blocked_obj.get("blocked_reason", "non-format issue detected")
                return question_obj
        except:
            pass
    
    try:
        fixed_obj = safe_json_load(txt)
    except Exception as e:
        # If parsing fails, return original
        return question_obj
    
    # Normalize output
    fixed_obj = normalize_implementer_output(fixed_obj)
    
    if not isinstance(fixed_obj, dict) or "question" not in fixed_obj:
        # Invalid output, return original
        return question_obj
    
    fixed_obj["_raw_text"] = txt
    return fixed_obj


def implementer_call(
    llm: LLMClient,
    prompts: Prompts,
    models: ModelsConfig,
    idea_plan: Dict[str, Any],
    exemplar_ids: List[str] = None,
    difficulty: str = "Hard",
    math_paper: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Call Implementer to build full MCQ from idea_plan.
    
    Args:
        llm: LLM client
        prompts: Prompts object
        models: Models config
        idea_plan: Designer idea_plan
        exemplar_ids: Optional list of 1-2 NSAA Section 1 reference question IDs
    
    Returns:
        Complete question package with metadata, question, solution, distractor_map
    """
    if not isinstance(idea_plan, dict):
        raise ValueError(
            f"Implementer requires idea_plan to be a dict, got {type(idea_plan).__name__}."
        )
    # Get subject from idea_plan's schema_id
    schema_id = idea_plan.get("schema_id", "M1")
    subject = get_subject_from_schema(schema_id)
    mp = math_paper if subject == "mathematics" else None
    subject_prompts = get_subject_prompts(prompts, schema_id, mp)
    
    # Add NSAA references if available
    references_section = ""
    if exemplar_ids:
        sample_ids = random.sample(exemplar_ids, min(len(exemplar_ids), 2))
        texts = fetch_exemplar_texts(sample_ids)
        if texts:
            references_section = "\n\n# NSAA SECTION 1 MATHEMATICS REFERENCES (Calibration Anchors)\n"
            for i, text in enumerate(texts):
                references_section += f"Reference {i+1}:\n\"\"\"\n{text}\n\"\"\"\n\n"
            references_section += "Use these references ONLY to calibrate: stem compactness, tone, expected step-count, no-calculator engineering, distractor structure.\n"
            references_section += "Do NOT copy: distinctive numbers, structural fingerprints, wording, constants, transformation chains.\n"
    
    math_label = "ESAT Mathematics 1"
    if subject == "mathematics" and mp == "Math 2":
        math_label = "ESAT Mathematics 2"

    user = f"""Pipeline target difficulty: {difficulty}
(Valid labels: Easy, Medium, Hard, Extreme — calibrate insight-load and distractor quality per your system instructions.)

idea_plan (JSON):
{prompt_json_dumps(idea_plan)}{references_section}

Implement this idea_plan into a complete {math_label} multiple-choice question.
Return raw JSON only: one JSON object, no markdown fences."""
    
    txt = llm.generate(
        model=models.implementer,
        system_prompt=subject_prompts["implementer"],
        user_prompt=user,
        temperature=0.6,
        trace_label="Implementer",
    )
    try:
        obj = safe_json_load(txt)
    except Exception as e:
        err_s = str(e)
        plog(
            "implementer",
            "json_parse_failed_try_repair",
            detail={"schema_id": schema_id, "error_excerpt": err_s[:400]},
            echo=False,
        )
        repaired = repair_implementer_json_raw(
            llm, prompts, models, schema_id, mp, txt, err_s
        )
        if repaired:
            try:
                txt = strip_code_fences(repaired)
                obj = safe_json_load(txt)
            except Exception as e2:
                raise ValueError(
                    f"Implementer output failed to parse as JSON: {err_s}\n"
                    f"After repair pass: {e2}\n\nRaw output:\n{txt[:500]}..."
                ) from e2
        else:
            raise ValueError(
                f"Implementer output failed to parse as JSON: {err_s}\n\nRaw output:\n{txt[:500]}..."
            ) from e

    # Normalise common structural quirks from the Implementer
    obj = normalize_implementer_output(obj)
    
    if not isinstance(obj, dict):
        raise ValueError(f"Implementer output is not a dictionary. Got type: {type(obj)}\n\nRaw output:\n{txt[:500]}...")
    
    if "question" not in obj:
        raise ValueError(f"Implementer output missing 'question' field. Available keys: {list(obj.keys())}\n\nRaw output:\n{txt[:500]}...")
    
    if "solution" not in obj:
        raise ValueError(f"Implementer output missing 'solution' field. Available keys: {list(obj.keys())}\n\nRaw output:\n{txt[:500]}...")
    
    q_block = obj.get("question")
    if not isinstance(q_block, dict):
        raise ValueError(
            f"Implementer 'question' must be a JSON object (stem, options, …), not {type(q_block).__name__}. "
            f"Available keys: {list(obj.keys())}\n\nRaw output:\n{txt[:500]}..."
        )
    
    # Validate distractor_map exists (it's required by the prompt)
    if "distractor_map" not in obj or not isinstance(obj.get("distractor_map"), dict):
        raise ValueError(f"Implementer output missing 'distractor_map' field (required). Available keys: {list(obj.keys())}\n\nRaw output:\n{txt[:500]}...")
    
    # NEW: Validate distractor_map has content (not empty)
    distractor_map = obj.get("distractor_map", {})
    raw_opts = q_block.get("options")
    if isinstance(raw_opts, dict):
        num_options = len(raw_opts)
    elif isinstance(raw_opts, list):
        num_options = len(raw_opts)
    else:
        num_options = 0
    
    if len(distractor_map) == 0:
        raise ValueError(
            f"Implementer output has EMPTY distractor_map. This is not allowed!\n"
            f"The distractor_map must explain the reasoning error for each wrong option.\n"
            f"Question has {num_options} options but distractor_map is empty: {distractor_map}\n\n"
            f"Raw output:\n{txt[:500]}..."
        )
    
    if len(distractor_map) < 3:
        if isinstance(raw_opts, dict):
            opt_keys_dbg = list(raw_opts.keys())
        elif isinstance(raw_opts, list):
            opt_keys_dbg = [str(i) for i in range(len(raw_opts))]
        else:
            opt_keys_dbg = []
        raise ValueError(
            f"Implementer output has insufficient distractor_map entries.\n"
            f"Got {len(distractor_map)} entries, need at least 3 (for options A, B, C, D minimum).\n"
            f"Distractor map: {distractor_map}\n"
            f"Available option keys: {opt_keys_dbg}\n\n"
            f"Raw output:\n{txt[:500]}..."
        )
    
    obj["_raw_text"] = txt
    return obj

def verifier_call(llm: LLMClient, prompts: Prompts, models: ModelsConfig, question_obj: Dict[str, Any], schema_id: str, designer_plan: Optional[Dict[str, Any]] = None, exemplar_ids: Optional[List[str]] = None, math_paper: Optional[str] = None) -> Dict[str, Any]:
    """
    Call Verifier to check question validity.
    
    Args:
        llm: LLM client
        prompts: Prompts object
        models: Models config
        question_obj: Implemented question package
        schema_id: Schema ID
        designer_plan: Optional designer plan (for new Math1 pipeline)
        exemplar_ids: Optional NSAA reference question IDs
    
    Returns:
        Verifier report with verdict (PASS/FAIL) and details
    """
    subject = get_subject_from_schema(schema_id)
    pcb_pack = (getattr(prompts, "subject_new_packs", None) or {}).get(subject) or {}
    
    # Use Math 1 / Math 2 verifier when available; P/C/B use new-pack verifier when present
    verifier_prompt = None
    if subject == "mathematics":
        if math_paper == "Math 2" and getattr(prompts, "verifier_math2", None):
            verifier_prompt = prompts.verifier_math2
        elif getattr(prompts, "verifier_math1", None):
            verifier_prompt = prompts.verifier_math1
    elif (pcb_pack.get("verifier") or "").strip():
        verifier_prompt = pcb_pack["verifier"]
    if not (verifier_prompt or "").strip():
        raise ValueError(
            f"No Verifier prompt loaded for subject={subject!r}, schema_id={schema_id!r}. "
            "Expected Math1/Math2 verifier class attributes or subject_new_packs['verifier']."
        )
    
    # New JSON pipeline: designer_plan + implemented_question + optional references (Math 1/2, Physics, Chemistry, Biology)
    use_split_verifier_user = designer_plan and (
        subject == "mathematics" or _subject_uses_new_tmua_pipeline(prompts, subject)
    )
    if use_split_verifier_user:
        references_section = ""
        if exemplar_ids:
            sample_ids = random.sample(exemplar_ids, min(len(exemplar_ids), 2))
            texts = fetch_exemplar_texts(sample_ids)
            if texts:
                references_section = "\n\n# NSAA/ENGAA/ESAT REFERENCES (Optional)\n"
                for i, text in enumerate(texts):
                    references_section += f"Reference {i+1}:\n\"\"\"\n{text}\n\"\"\"\n\n"
        
        user = f"""designer_plan (JSON):
{prompt_json_dumps(designer_plan)}

implemented_question (JSON):
{prompt_json_dumps(question_obj)}
{references_section}

Verify the implemented question against the designer plan."""
    else:
        # Old pipeline: just pass question with subject
        question_with_subject = {
            "subject": subject,
            **question_obj
        }
        user = "Question package to verify (JSON):\n" + prompt_json_dumps(question_with_subject)
    
    txt = llm.generate(
        model=models.verifier,
        system_prompt=verifier_prompt,
        user_prompt=user,
        temperature=0.2,
        trace_label="Verifier",
    )
    obj = safe_json_load(txt)
    if not isinstance(obj, dict) or "verdict" not in obj:
        raise ValueError(f"Verifier output invalid JSON/object. Raw output:\n{txt}")
    obj["_raw_text"] = txt
    return obj

def style_call(
    llm: LLMClient,
    prompts: Prompts,
    models: ModelsConfig,
    question_obj: Dict[str, Any],
    schema_id: str,
    verifier_obj: Optional[Dict[str, Any]] = None,
    designer_plan: Optional[Dict[str, Any]] = None,
    exemplar_ids: Optional[List[str]] = None,
    target_difficulty: Optional[str] = None,
    math_paper: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Call Style Checker to verify authenticity and difficulty calibration.
    
    Args:
        llm: LLM client
        prompts: Prompts object
        models: Models config
        question_obj: Implemented question package
        schema_id: Schema ID
        verifier_obj: Optional verifier report (already passed)
        designer_plan: Optional designer plan (for new Math1 pipeline)
        exemplar_ids: Optional NSAA reference question IDs
    
    Returns:
        Style checker report with verdict and style score
    """
    subject = get_subject_from_schema(schema_id)
    pcb_pack = (getattr(prompts, "subject_new_packs", None) or {}).get(subject) or {}
    
    # Use Math 1 / Math 2 style checker when available; P/C/B use new-pack style when present
    style_checker_prompt = None
    if subject == "mathematics":
        if math_paper == "Math 2" and getattr(prompts, "style_checker_math2", None):
            style_checker_prompt = prompts.style_checker_math2
        elif getattr(prompts, "style_checker_math1", None):
            style_checker_prompt = prompts.style_checker_math1
    elif (pcb_pack.get("style") or pcb_pack.get("style_checker") or "").strip():
        style_checker_prompt = (pcb_pack.get("style") or pcb_pack.get("style_checker") or "").strip()

    if not style_checker_prompt:
        raise ValueError(
            f"No Style_checker prompt for subject={subject!r}. "
            "Expected Math1/Math2 style class attributes or subject_new_packs['style'] (new/ pack)."
        )
    
    # Build user prompt
    use_split_style_user = designer_plan and (
        subject == "mathematics" or _subject_uses_new_tmua_pipeline(prompts, subject)
    )
    if use_split_style_user:
        ref_title = {
            "mathematics": "NSAA SECTION 1 MATHEMATICS REFERENCES",
            "physics": "NSAA SECTION 1 PHYSICS REFERENCES",
            "chemistry": "NSAA SECTION 1 CHEMISTRY REFERENCES",
            "biology": "NSAA SECTION 1 BIOLOGY REFERENCES",
        }.get(subject, "NSAA/ENGAA/ESAT REFERENCES")
        references_section = ""
        if exemplar_ids:
            sample_ids = random.sample(exemplar_ids, min(len(exemplar_ids), 2))
            texts = fetch_exemplar_texts(sample_ids)
            if texts:
                references_section = f"\n\n# {ref_title}\n"
                for i, text in enumerate(texts):
                    references_section += f"Reference {i+1}:\n\"\"\"\n{text}\n\"\"\"\n\n"
        
        td = (target_difficulty or "").strip()
        td_line = f"\n\nPipeline target difficulty: {td}\n" if td else ""
        user = f"""designer_plan (JSON):
{prompt_json_dumps(designer_plan)}

implemented_question (JSON):
{prompt_json_dumps(question_obj)}
{references_section}
{td_line}
Check style authenticity and difficulty calibration."""
    else:
        # Old pipeline
        payload = {
            "subject": subject,
            "question": question_obj
        }
        if verifier_obj:
            payload["verifier_report"] = verifier_obj
        user = "Package to style-check (JSON):\n" + prompt_json_dumps(payload)
    
    txt = llm.generate(
        model=models.style_judge,
        system_prompt=style_checker_prompt,
        user_prompt=user,
        temperature=0.3,
        trace_label="Style Judge",
    )
    obj = safe_json_load(txt)
    if not isinstance(obj, dict) or "verdict" not in obj:
        raise ValueError(f"Style checker output invalid JSON/object. Raw output:\n{txt}")
    obj["_raw_text"] = txt
    return obj

def classifier_call(llm: LLMClient, prompts: Prompts, models: ModelsConfig, question_obj: Dict[str, Any],
                    schema_id: str, curriculum_parser) -> Dict[str, Any]:
    """
    Call the classifier AI to assign curriculum tags to a question.
    
    For Math: Returns paper (Math 1/Math 2) + tags from that paper
    For P/B/C: Returns tags only
    
    Args:
        llm: LLM client
        prompts: Prompts object
        models: Models config
        question_obj: Question package
        schema_id: Schema ID (e.g., "M1", "P3", "B1", "C1")
        curriculum_parser: CurriculumParser instance
    
    Returns:
        Dictionary with primary_tag, secondary_tags, confidence scores, and paper (for Math only)
    """
    subject_prompts = get_subject_prompts(prompts, schema_id)
    
    # Get available topics (NO SCHEMA ID - as per new requirement)
    available_topics = curriculum_parser.get_available_topics_for_schema(schema_id)

    # Format topics
    topics_text = prompt_json_dumps({
        "available_topics": [
            {
                "code": topic["code"],
                "title": topic["title"],
                "paper": topic["paper_name"]
            }
            for topic in available_topics
        ]
    })
    
    # User prompt WITHOUT schema_id
    user = f"""Available curriculum topics:
{topics_text}

Question package (JSON):
{prompt_json_dumps(question_obj)}

Analyze the question and assign appropriate curriculum tags."""

    model = getattr(models, 'classifier', None) or models.style_judge
    txt = llm.generate(
        model=model,
        system_prompt=subject_prompts["classifier"],
        user_prompt=user,
        temperature=0.3,
        trace_label="Classifier",
    )
    
    obj = safe_json_load(txt)
    
    # Validate output based on subject
    prefix = schema_id[0].upper()
    if prefix == 'M':
        # Math requires 'paper' field
        if "paper" not in obj:
            raise ValueError(f"Math classifier missing 'paper' field")
        if "primary_tag" not in obj:
            raise ValueError(f"Classifier missing 'primary_tag' field")
        
        # CRITICAL: Validate that Math classifier didn't assign Chemistry/Biology/Physics tags
        primary_tag = obj.get("primary_tag", "")
        if primary_tag and not (primary_tag.startswith("M1-") or primary_tag.startswith("M2-")):
            # Check if it's a chemistry/biology/physics tag
            if primary_tag.startswith("chemistry-") or primary_tag.startswith("biology-") or primary_tag.startswith("P-"):
                raise ValueError(f"Math schema {schema_id} classified with wrong subject tag: {primary_tag}. "
                               f"This indicates the question is actually {primary_tag.split('-')[0]}, not mathematics. "
                               f"Use a {primary_tag.split('-')[0].upper()[0]} schema instead.")
    else:
        # P/B/C only need primary_tag
        if "primary_tag" not in obj:
            raise ValueError(f"Classifier missing 'primary_tag' field")
        
        # CRITICAL: Validate that non-Math classifier assigned correct subject tag
        primary_tag = obj.get("primary_tag", "")
        expected_prefix = {
            'P': 'P-',
            'B': 'biology-',
            'C': 'chemistry-'
        }.get(prefix, '')
        
        if primary_tag and expected_prefix:
            if not primary_tag.startswith(expected_prefix):
                # Check if it's a Math tag (wrong subject)
                if primary_tag.startswith("M1-") or primary_tag.startswith("M2-"):
                    raise ValueError(f"{prefix} schema {schema_id} classified with Math tag: {primary_tag}. "
                                   f"This indicates the question is actually mathematics, not {get_subject_from_schema(schema_id)}. "
                                   f"Use an M schema instead.")
                # Check if it's a different non-Math subject
                elif primary_tag.startswith("P-") and prefix != 'P':
                    raise ValueError(f"{prefix} schema {schema_id} classified with Physics tag: {primary_tag}. "
                                   f"Use a P schema instead.")
                elif primary_tag.startswith("chemistry-") and prefix != 'C':
                    raise ValueError(f"{prefix} schema {schema_id} classified with Chemistry tag: {primary_tag}. "
                                   f"Use a C schema instead.")
                elif primary_tag.startswith("biology-") and prefix != 'B':
                    raise ValueError(f"{prefix} schema {schema_id} classified with Biology tag: {primary_tag}. "
                                   f"Use a B schema instead.")
    
    obj["_raw_text"] = txt
    return obj


def _math_tag_labeler_numeric_ok(s: str) -> bool:
    t = str(s).strip()
    return t in ("1", "2", "3", "4", "5", "6", "7")


def _map_math2_labeler_codes_to_curriculum(obj: Dict[str, Any]) -> None:
    """Tag Labeler uses '1'-'7'; curriculum uses MM1-MM7."""

    def conv(x: str) -> str:
        x = str(x).strip()
        if len(x) == 1 and x in "1234567":
            return f"MM{x}"
        return x

    if "primary_tag" in obj and obj["primary_tag"] is not None:
        obj["primary_tag"] = conv(str(obj["primary_tag"]))
    sec = obj.get("secondary_tags")
    if not isinstance(sec, list):
        return
    out = []
    for t in sec:
        if isinstance(t, dict):
            d = dict(t)
            c = d.get("code")
            if c is not None:
                d["code"] = conv(str(c))
            out.append(d)
        else:
            out.append(conv(str(t)))
    obj["secondary_tags"] = out


def _map_physics_tag_labeler_codes_to_curriculum(obj: Dict[str, Any]) -> None:
    """Tag Labeler uses '1'–'7'; curriculum uses P1–P7."""

    def conv(x: str) -> str:
        x = str(x).strip()
        if len(x) == 1 and x in "1234567":
            return f"P{x}"
        return x

    if "primary_tag" in obj and obj["primary_tag"] is not None:
        obj["primary_tag"] = conv(str(obj["primary_tag"]))
    sec = obj.get("secondary_tags")
    if not isinstance(sec, list):
        return
    out = []
    for t in sec:
        if isinstance(t, dict):
            d = dict(t)
            c = d.get("code")
            if c is not None:
                d["code"] = conv(str(c))
            out.append(d)
        else:
            out.append(conv(str(t)))
    obj["secondary_tags"] = out


def _map_biology_tag_labeler_codes_to_curriculum(obj: Dict[str, Any]) -> None:
    """Tag Labeler uses '1'–'11' (or B1–B11); curriculum uses B1–B11."""

    def conv(x: str) -> str:
        x = str(x).strip()
        if x.isdigit():
            n = int(x)
            if 1 <= n <= 11:
                return f"B{n}"
            return x
        m = re.fullmatch(r"B(1[01]|[1-9])", x, re.IGNORECASE)
        if m:
            return m.group(0).upper()
        return x

    if "primary_tag" in obj and obj["primary_tag"] is not None:
        obj["primary_tag"] = conv(str(obj["primary_tag"]))
    sec = obj.get("secondary_tags")
    if not isinstance(sec, list):
        return
    out = []
    for t in sec:
        if isinstance(t, dict):
            d = dict(t)
            c = d.get("code")
            if c is not None:
                d["code"] = conv(str(c))
            out.append(d)
        else:
            out.append(conv(str(t)))
    obj["secondary_tags"] = out


_CHEM_TAG_RE = re.compile(r"^C(1[0-6]|[1-9])$", re.IGNORECASE)


def _chemistry_tag_labeler_code_ok(s: str) -> bool:
    t = str(s).strip()
    return bool(_CHEM_TAG_RE.fullmatch(t))


def tag_labeler_call(
    llm: LLMClient,
    prompts: Prompts,
    models: ModelsConfig,
    question_obj: Dict[str, Any],
    schema_id: str,
    curriculum_parser,
    math_paper: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Tag Labeler: Post-acceptance metadata classification (non-blocking).

    Uses Math1 / Math2 Tag_Labeler when available, otherwise classifier_call.
    """
    subject = get_subject_from_schema(schema_id)

    if subject == "mathematics" and math_paper == "Math 2" and getattr(prompts, "tag_labeler_math2", None):
        user = f"""implemented_question (JSON):
{prompt_json_dumps(question_obj)}

Assign ESAT Mathematics 2 curriculum tags (primary_tag: 1-7, secondary_tags: 0-2).
Return raw JSON only (one object)."""
        model = getattr(models, "classifier", None) or models.style_judge
        txt = llm.generate(
            model=model,
            system_prompt=prompts.tag_labeler_math2,
            user_prompt=user,
            temperature=0.3,
            trace_label="Tag Labeler (Math 2)",
        )
        obj = safe_json_load(txt)
        if not isinstance(obj, dict) or "primary_tag" not in obj:
            raise ValueError(f"Tag Labeler output invalid JSON/object. Raw output:\n{txt}")
        primary_tag = str(obj.get("primary_tag", ""))
        if primary_tag and not _math_tag_labeler_numeric_ok(primary_tag):
            raise ValueError(
                f"Tag Labeler assigned invalid Math2 primary_tag: {primary_tag}. Must be 1-7."
            )
        _map_math2_labeler_codes_to_curriculum(obj)
        obj["_raw_text"] = txt
        return obj

    if subject == "mathematics" and getattr(prompts, "tag_labeler_math1", None):
        user = f"""implemented_question (JSON):
{prompt_json_dumps(question_obj)}

Assign ESAT Mathematics 1 curriculum tags (primary_tag: 1-7, secondary_tags: 0-2).
Return raw JSON only (one object)."""

        model = getattr(models, "classifier", None) or models.style_judge
        txt = llm.generate(
            model=model,
            system_prompt=prompts.tag_labeler_math1,
            user_prompt=user,
            temperature=0.3,
            trace_label="Tag Labeler",
        )

        obj = safe_json_load(txt)
        if not isinstance(obj, dict) or "primary_tag" not in obj:
            raise ValueError(f"Tag Labeler output invalid JSON/object. Raw output:\n{txt}")

        primary_tag = str(obj.get("primary_tag", ""))
        if primary_tag and not _math_tag_labeler_numeric_ok(primary_tag):
            raise ValueError(f"Tag Labeler assigned invalid Math1 primary_tag: {primary_tag}. Must be 1-7.")

        obj["_raw_text"] = txt
        return obj

    if _subject_uses_new_tmua_pipeline(prompts, subject):
        pack = (getattr(prompts, "subject_new_packs", None) or {}).get(subject) or {}
        sys_p = (pack.get("classifier") or "").strip()
        if sys_p:
            trace_names = {
                "physics": "Tag Labeler (Physics)",
                "chemistry": "Tag Labeler (Chemistry)",
                "biology": "Tag Labeler (Biology)",
            }
            user = f"""implemented_question (JSON):
{prompt_json_dumps(question_obj)}

Return raw JSON only (one object) per your system instructions."""
            model = getattr(models, "classifier", None) or models.style_judge
            txt = llm.generate(
                model=model,
                system_prompt=sys_p,
                user_prompt=user,
                temperature=0.3,
                trace_label=trace_names.get(subject, "Tag Labeler"),
            )
            obj = safe_json_load(txt)
            if not isinstance(obj, dict) or "primary_tag" not in obj:
                raise ValueError(f"Tag Labeler output invalid JSON/object. Raw output:\n{txt}")
            primary_tag = str(obj.get("primary_tag", ""))
            if subject == "physics":
                if primary_tag and not _math_tag_labeler_numeric_ok(primary_tag):
                    raise ValueError(
                        f"Tag Labeler assigned invalid Physics primary_tag: {primary_tag}. Must be 1-7."
                    )
                _map_physics_tag_labeler_codes_to_curriculum(obj)
            elif subject == "biology":
                pt = str(primary_tag).strip()
                if pt:
                    ok_bio = pt.isdigit() and 1 <= int(pt) <= 11
                    if not ok_bio:
                        ok_bio = bool(re.fullmatch(r"B(1[01]|[1-9])", pt, re.IGNORECASE))
                    if not ok_bio:
                        raise ValueError(
                            f"Tag Labeler assigned invalid Biology primary_tag: {primary_tag}. "
                            "Must be 1–11 or B1–B11."
                        )
                _map_biology_tag_labeler_codes_to_curriculum(obj)
            elif subject == "chemistry":
                if primary_tag and not _chemistry_tag_labeler_code_ok(primary_tag):
                    raise ValueError(
                        f"Tag Labeler assigned invalid Chemistry primary_tag: {primary_tag}. "
                        "Expected C1–C16."
                    )
                if primary_tag:
                    obj["primary_tag"] = str(primary_tag).strip().upper()
            obj["_raw_text"] = txt
            return obj

    return classifier_call(llm, prompts, models, question_obj, schema_id, curriculum_parser)


def _style_only_regen_model(
    models: ModelsConfig,
    verifier_report: Optional[Dict[str, Any]],
    style_report: Optional[Dict[str, Any]],
) -> str:
    """
    Pick model for implementer regeneration.

    When Verifier verdict is PASS and a style_report is present, the failure is style-only;
    use ``MODEL_IMPLEMENTER_REGEN`` if set, otherwise the Style Judge model (typically Flash).

    Set ``ESAT_STYLE_REGEN_USE_PRO=1`` to always use ``MODEL_IMPLEMENTER`` for regen.
    """
    force_pro = os.environ.get("ESAT_STYLE_REGEN_USE_PRO", "").strip().lower() in (
        "1",
        "true",
        "yes",
    )
    if force_pro:
        return models.implementer
    if not isinstance(verifier_report, dict):
        return models.implementer
    verdict = str(verifier_report.get("verdict", "")).strip().upper()
    if verdict != "PASS" or style_report is None:
        return models.implementer
    explicit = (getattr(models, "implementer_regen", None) or "").strip()
    if explicit:
        return explicit
    sj = (models.style_judge or "").strip()
    return sj or models.implementer


def describe_style_only_regen_policy(models: ModelsConfig) -> str:
    """One-line summary for UIs (env: MODEL_IMPLEMENTER_REGEN, ESAT_STYLE_REGEN_USE_PRO)."""
    force = os.environ.get("ESAT_STYLE_REGEN_USE_PRO", "").strip().lower() in (
        "1",
        "true",
        "yes",
    )
    if force:
        return (
            f"Retry regen model: always {models.implementer} (ESAT_STYLE_REGEN_USE_PRO)."
        )
    explicit = (getattr(models, "implementer_regen", None) or "").strip()
    if explicit:
        return f"Retry regen: {explicit} when Verifier PASS + Style fixable (MODEL_IMPLEMENTER_REGEN); else {models.implementer}."
    sj = (models.style_judge or "").strip() or models.implementer
    return (
        f"Retry regen: {sj} when Verifier PASS + Style fixable; "
        f"{models.implementer} when Verifier failed or no style report."
    )


def implementer_regen_call(
    llm: LLMClient,
    prompts: Prompts,
    models: ModelsConfig,
    idea_plan: Dict[str, Any],
    previous_attempt: Optional[Dict[str, Any]],
    verifier_report: Optional[Dict[str, Any]],
    style_report: Optional[Dict[str, Any]] = None,
    difficulty: str = "Hard",
    math_paper: Optional[str] = None,
    generator_base_dir: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Call Retry Controller to regenerate question implementation.

    Uses each subject's Retry_controller.md from ``by_subject_prompts/new/`` (Math1/Math2/P/C/B).
    """
    if not isinstance(idea_plan, dict):
        raise ValueError(
            f"Implementer regen requires idea_plan to be a dict, got {type(idea_plan).__name__}."
        )
    # Get subject from idea_plan's schema_id
    schema_id = idea_plan.get("schema_id", "M1")
    subject = get_subject_from_schema(schema_id)
    mp = math_paper if subject == "mathematics" else None
    pcb_pack = (getattr(prompts, "subject_new_packs", None) or {}).get(subject) or {}

    retry_prompt = None
    if subject == "mathematics":
        if mp == "Math 2" and getattr(prompts, "retry_controller_math2", None):
            retry_prompt = prompts.retry_controller_math2
        elif getattr(prompts, "retry_controller_math1", None):
            retry_prompt = prompts.retry_controller_math1
    elif (pcb_pack.get("retry") or pcb_pack.get("retry_controller") or "").strip():
        retry_prompt = (pcb_pack.get("retry") or pcb_pack.get("retry_controller") or "").strip()
    if not (retry_prompt or "").strip():
        retry_prompt = (prompts.retry_controller or "").strip()
    if not retry_prompt:
        raise ValueError(
            f"No Retry_controller prompt for subject={subject!r}, schema_id={schema_id!r}."
        )

    regen_header = ""
    root = generator_base_dir or os.path.dirname(os.path.abspath(__file__))
    if subject == "mathematics":
        sub = "Math2" if mp == "Math 2" else "Math1"
        fname = "Math2 regen header.md" if mp == "Math 2" else "Math1 regen header.md"
        regen_header_path = os.path.join(root, "by_subject_prompts", "new", sub, fname)
        if os.path.exists(regen_header_path):
            regen_header = read_text(regen_header_path)
    elif _subject_uses_new_tmua_pipeline(prompts, subject):
        folder = {"physics": "Physics", "chemistry": "Chemistry", "biology": "Biology"}[subject]
        fname = f"{folder} regen header.md"
        regen_header_path = os.path.join(root, "by_subject_prompts", "new", folder, fname)
        if os.path.exists(regen_header_path):
            regen_header = read_text(regen_header_path)
    if regen_header:
        fail_json = prompt_json_dumps(verifier_report)
        if style_report:
            fail_json = prompt_json_dumps({"verifier_report": verifier_report, "style_report": style_report})
        regen_header = (
            regen_header.replace("<FAIL_JSON>", fail_json).replace("<FAIL_YAML>", fail_json)
        )

    subject_prompts = get_subject_prompts(prompts, schema_id, mp)

    user = regen_header + "\n\n" if regen_header else ""
    user += f"Pipeline target difficulty: {difficulty}\n(Valid labels: Easy, Medium, Hard, Extreme.)\n\n"
    user += (
        retry_prompt.strip()
        + "\n\ndesigner_plan (JSON):\n"
        + prompt_json_dumps(idea_plan)
        + "\n\nprevious_implemented (JSON):\n"
        + prompt_json_dumps(previous_attempt)
        + "\n\nfail_report (JSON):\n"
        + prompt_json_dumps(verifier_report)
    )
    if style_report:
        user += "\n\nstyle_report (JSON):\n" + prompt_json_dumps(style_report)

    regen_model = _style_only_regen_model(models, verifier_report, style_report)

    txt = llm.generate(
        model=regen_model,
        system_prompt=subject_prompts["implementer"],
        user_prompt=user,
        temperature=0.6,
        trace_label="Retry controller",
    )
    try:
        obj = safe_json_load(txt)
    except Exception as e:
        err_s = str(e)
        plog(
            "implementer_regen",
            "json_parse_failed_try_repair",
            detail={"schema_id": schema_id, "error_excerpt": err_s[:400]},
            echo=False,
        )
        repaired = repair_implementer_json_raw(
            llm,
            prompts,
            models,
            schema_id,
            mp,
            txt,
            err_s,
            repair_model=regen_model,
        )
        if repaired:
            try:
                txt = strip_code_fences(repaired)
                obj = safe_json_load(txt)
            except Exception as e2:
                raise ValueError(
                    f"Implementer regen output failed to parse as JSON: {err_s}\n"
                    f"After repair pass: {e2}\n\nRaw output:\n{txt[:500]}..."
                ) from e2
        else:
            raise ValueError(
                f"Implementer regen output failed to parse as JSON: {err_s}\n\nRaw output:\n{txt[:500]}..."
            ) from e

    # Normalise common structural quirks from the Implementer
    obj = normalize_implementer_output(obj)
    
    if not isinstance(obj, dict):
        raise ValueError(f"Implementer regen output is not a dictionary. Got type: {type(obj)}\n\nRaw output:\n{txt[:500]}...")
    
    if "question" not in obj:
        raise ValueError(f"Implementer regen output missing 'question' field. Available keys: {list(obj.keys())}\n\nRaw output:\n{txt[:500]}...")
    
    if "solution" not in obj:
        raise ValueError(f"Implementer regen output missing 'solution' field. Available keys: {list(obj.keys())}\n\nRaw output:\n{txt[:500]}...")
    
    q_block_r = obj.get("question")
    if not isinstance(q_block_r, dict):
        raise ValueError(
            f"Implementer regen 'question' must be a JSON object (stem, options, …), not {type(q_block_r).__name__}. "
            f"Available keys: {list(obj.keys())}\n\nRaw output:\n{txt[:500]}..."
        )
    
    # Validate distractor_map exists (it's required by the prompt)
    if "distractor_map" not in obj or not isinstance(obj.get("distractor_map"), dict):
        raise ValueError(f"Implementer regen output missing 'distractor_map' field (required). Available keys: {list(obj.keys())}\n\nRaw output:\n{txt[:500]}...")
    
    # NEW: Validate distractor_map has content (not empty)
    distractor_map = obj.get("distractor_map", {})
    raw_opts_r = q_block_r.get("options")
    if isinstance(raw_opts_r, dict):
        num_options = len(raw_opts_r)
    elif isinstance(raw_opts_r, list):
        num_options = len(raw_opts_r)
    else:
        num_options = 0
    
    if len(distractor_map) == 0:
        raise ValueError(
            f"Implementer regen output has EMPTY distractor_map. This is not allowed!\n"
            f"The distractor_map must explain the reasoning error for each wrong option.\n"
            f"Question has {num_options} options but distractor_map is empty: {distractor_map}\n\n"
            f"Raw output:\n{txt[:500]}..."
        )
    
    if len(distractor_map) < 3:
        raise ValueError(
            f"Implementer regen output has insufficient distractor_map entries.\n"
            f"Got {len(distractor_map)} entries, need at least 3.\n"
            f"Distractor map: {distractor_map}\n\n"
            f"Raw output:\n{txt[:500]}..."
        )
    
    obj["_raw_text"] = txt
    return obj


# ---------- Controller ----------

def extract_verdict(obj: Optional[Dict[str, Any]]) -> str:
    if not isinstance(obj, dict):
        return ""
    return str(obj.get("verdict", "")).strip().upper()

def extract_severity(obj: Optional[Dict[str, Any]]) -> str:
    if not isinstance(obj, dict):
        return ""
    return str(obj.get("severity", "")).strip()

def is_fixable(severity: str) -> bool:
    """
    Verifier / style prompts use ``format_only_fixable`` for KaTeX and similar surface issues.
    The pipeline must retry (implementer regen or downstream repair), not reject immediately.
    """
    s = (severity or "").strip().lower()
    return s in ("fixable_with_regeneration", "format_only_fixable")

def is_structural(severity: str) -> bool:
    return severity == "structural_flaw"


def _rejection_verifier_detail(verifier_report: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Compact verifier outcome for console / UI (full report stays in rejected.jsonl)."""
    if not isinstance(verifier_report, dict):
        return {
            "gate": "verifier",
            "verdict": "",
            "severity": "",
            "failure_type": None,
            "reasons": [],
        }
    return {
        "gate": "verifier",
        "verdict": extract_verdict(verifier_report),
        "severity": extract_severity(verifier_report),
        "failure_type": verifier_report.get("failure_type"),
        "reasons": verifier_report.get("reasons"),
    }


def _rejection_style_detail(style_report: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    if not isinstance(style_report, dict):
        return {
            "gate": "style_checker",
            "verdict": "",
            "severity": "",
            "regen_instructions": [],
        }
    return {
        "gate": "style_checker",
        "verdict": extract_verdict(style_report),
        "severity": extract_severity(style_report),
        "regen_instructions": style_report.get("regen_instructions"),
    }


def _rejection_katex_detail(katex_errors: Any) -> Dict[str, Any]:
    return {"gate": "katex_validation", "katex_errors": katex_errors}


# ---------- KaTeX Validation and Fixing ----------

def validate_question_katex(question_obj: Dict[str, Any], schema_id: str) -> Tuple[bool, List[Dict[str, Any]]]:
    """
    Validate KaTeX formatting in all math fields of a question object.
    
    Args:
        question_obj: Question package dictionary
        schema_id: Schema ID to determine if chemistry extension is needed
        
    Returns:
        Tuple of (is_valid, list_of_errors) where each error is a dict with:
        - field: field name (e.g., "question.stem", "solution.reasoning")
        - errors: list of error strings
    """
    try:
        from katex_validator import validate_katex_formatting
    except ImportError:
        # KaTeX validator not available, skip validation
        return True, []
    
    all_errors = []
    
    # Get subject from schema_id for subject-specific validation
    subject = get_subject_from_schema(schema_id)
    # Map to validation subject (mathematics -> None for backward compatibility)
    validation_subject = subject if subject in ["physics", "chemistry", "biology"] else None
    
    # Validate question stem
    question = question_obj.get("question", {})
    if isinstance(question, dict):
        stem = question.get("stem", "")
        if stem:
            is_valid, errors = validate_katex_formatting(stem, skip_render_test=False, subject=validation_subject)
            if not is_valid:
                all_errors.append({
                    "field": "question.stem",
                    "errors": errors
                })
        
        # Validate options
        options = question.get("options", {})
        if isinstance(options, dict):
            for opt_key, opt_text in options.items():
                if opt_text:
                    is_valid, errors = validate_katex_formatting(str(opt_text), skip_render_test=False, subject=validation_subject)
                    if not is_valid:
                        all_errors.append({
                            "field": f"question.options.{opt_key}",
                            "errors": errors
                        })
    
    # Validate solution
    solution = question_obj.get("solution", {})
    if isinstance(solution, dict):
        reasoning = solution.get("reasoning", "")
        if reasoning:
            is_valid, errors = validate_katex_formatting(reasoning, skip_render_test=False, subject=validation_subject)
            if not is_valid:
                all_errors.append({
                    "field": "solution.reasoning",
                    "errors": errors
                })
        
        key_insight = solution.get("key_insight", "")
        if key_insight:
            is_valid, errors = validate_katex_formatting(key_insight, skip_render_test=False, subject=validation_subject)
            if not is_valid:
                all_errors.append({
                    "field": "solution.key_insight",
                    "errors": errors
                })
    
    # Validate distractor_map
    distractor_map = question_obj.get("distractor_map", {})
    if isinstance(distractor_map, dict):
        for opt_key, distractor_text in distractor_map.items():
            if distractor_text:
                is_valid, errors = validate_katex_formatting(str(distractor_text), skip_render_test=False, subject=validation_subject)
                if not is_valid:
                    all_errors.append({
                        "field": f"distractor_map.{opt_key}",
                        "errors": errors
                    })
    
    return len(all_errors) == 0, all_errors


def fix_katex_issues(llm: LLMClient, prompts: Prompts, models: ModelsConfig,
                    question_obj: Dict[str, Any], katex_errors: List[Dict[str, Any]],
                    schema_id: str, attempt: int, base_dir: str,
                    math_paper: Optional[str] = None) -> Dict[str, Any]:
    """
    Fix KaTeX formatting issues in a question object by prompting the LLM.
    
    Args:
        llm: LLM client
        prompts: Prompts object
        models: Models config
        question_obj: Original question object with KaTeX errors
        katex_errors: List of error dicts from validate_question_katex
        schema_id: Schema ID for subject-specific handling
        attempt: Current attempt number (for logging)
        base_dir: Base directory for loading prompts
        
    Returns:
        Fixed question object
    """
    subject = get_subject_from_schema(schema_id)
    katex_fixer_prompt = None
    if subject == "mathematics":
        if math_paper == "Math 2" and getattr(prompts, "format_fixer_math2", None):
            katex_fixer_prompt = prompts.format_fixer_math2
        elif getattr(prompts, "format_fixer_math1", None):
            katex_fixer_prompt = prompts.format_fixer_math1
    elif subject in _TMUA_PIPELINE_SUBJECTS:
        pp = (getattr(prompts, "subject_new_packs", None) or {}).get(subject) or {}
        ff = (pp.get("format_fixer") or "").strip()
        if ff:
            katex_fixer_prompt = ff
    if not katex_fixer_prompt:
        return question_obj
    
    # Format error report
    error_report = "KaTeX Validation Errors:\n"
    for error_info in katex_errors:
        field = error_info["field"]
        errors = error_info["errors"]
        error_report += f"\nField: {field}\n"
        for err in errors:
            error_report += f"  - {err}\n"
    
    # Build user prompt
    user_prompt = (
        "Original question package (JSON):\n"
        + prompt_json_dumps(question_obj)
        + "\n\n"
        + error_report
        + "\n\n"
        + "Please fix ONLY the KaTeX formatting errors listed above. "
        + "Do NOT change any mathematical content, logic, or structure. "
        + "Return the complete fixed question package as one JSON object."
    )
    
    # Call LLM with lower temperature for precision
    txt = llm.generate(
        model=models.implementer,
        system_prompt=katex_fixer_prompt,
        user_prompt=user_prompt,
        temperature=0.3,  # Lower temperature for precise formatting fixes
        trace_label="KaTeX Fixer",
    )
    
    try:
        fixed_obj = safe_json_load(txt)
    except Exception as e:
        raise ValueError(f"KaTeX fixer output failed to parse as JSON: {e}\n\nRaw output:\n{txt[:500]}...")
    
    # Normalize output (same as implementer)
    fixed_obj = normalize_implementer_output(fixed_obj)
    
    # Validate structure
    if not isinstance(fixed_obj, dict):
        raise ValueError(f"KaTeX fixer output is not a dictionary. Got type: {type(fixed_obj)}")
    
    if "question" not in fixed_obj:
        raise ValueError(f"KaTeX fixer output missing 'question' field")
    
    if "solution" not in fixed_obj:
        raise ValueError(f"KaTeX fixer output missing 'solution' field")
    
    fixed_obj["_raw_text"] = txt
    fixed_obj["_katex_fix_attempt"] = attempt
    
    return fixed_obj

def normalize_options(question_obj: Dict[str, Any]) -> Dict[str, Any]:
    """
    Ensures options dict only contains non-empty A-H keys.
    """
    raw_q = question_obj.get("question", {})
    if isinstance(raw_q, str):
        question_obj["question"] = {"stem": raw_q.strip(), "options": {}}
        return question_obj
    if not isinstance(raw_q, dict):
        question_obj["question"] = {}
        raw_q = question_obj["question"]
    q = raw_q
    opts = q.get("options", {}) if isinstance(q, dict) else {}
    if not isinstance(opts, dict):
        return question_obj
    cleaned = {}
    for k, v in opts.items():
        kk = str(k).strip()
        if kk in list("ABCDEFGH") and v is not None and str(v).strip() != "":
            cleaned[kk] = v
    q["options"] = cleaned
    question_obj["question"] = q
    return question_obj

def build_bank_item(idea_plan: Dict[str, Any], question_obj: Dict[str, Any], verifier_obj: Dict[str, Any], style_obj: Dict[str, Any],
                    schema_id: str, difficulty: str, models: ModelsConfig, attempts: int, token_usage: Optional[Dict[str, int]] = None,
                    tags: Optional[Dict[str, Any]] = None, schema_block_snapshot: Optional[str] = None) -> Dict[str, Any]:
    question_obj = normalize_options(question_obj)
    stem = question_obj.get("question", {}).get("stem", "")
    fingerprint = sha1_short(f"{schema_id}|{difficulty}|{stem}")
    item = {
        "id": f"{schema_id}-{difficulty}-{fingerprint}",
        "schema_id": schema_id,
        "difficulty": difficulty,
        "idea_plan": idea_plan,
        "question_package": question_obj,
        "verifier_report": verifier_obj,
        "style_report": style_obj,
        "models": {
            "designer": models.designer,
            "implementer": models.implementer,
            "verifier": models.verifier,
            "style_judge": models.style_judge,
        },
        "attempts": attempts,
        "created_at": datetime.datetime.now().isoformat(),
    }
    if token_usage:
        item["token_usage"] = token_usage
    if tags:
        item["tags"] = tags
    if schema_block_snapshot and str(schema_block_snapshot).strip():
        item["schema_block_snapshot"] = str(schema_block_snapshot).strip()
    return item


def extract_markdown_from_code_blocks(text: str) -> str:
    """If schemas are wrapped in ```markdown ... ```, extract inner content for parsing."""
    pattern = r"```markdown\s*\n(.*?)(?:\n---\s*\n)?```"
    matches = re.findall(pattern, text, re.DOTALL)
    if matches:
        cleaned_matches = [m.strip() for m in matches if m.strip()]
        if cleaned_matches:
            extracted = "\n\n".join(cleaned_matches)
            if extracted.strip() and "## **" in extracted:
                return extracted
    return text


def resolve_schemas_esat_path(base_dir: str) -> str:
    """Return absolute path to ``Schemas_ESAT.md`` (ESAT-only; no NSAA fallback)."""
    base_dir_path = Path(base_dir).resolve()
    scripts_dir = base_dir_path.parent
    candidates = [
        base_dir_path / "schemas" / "Schemas_ESAT.md",
        base_dir_path / "Schemas_ESAT.md",
        scripts_dir / "esat_question_generator" / "schemas" / "Schemas_ESAT.md",
    ]
    for p in candidates:
        if p.is_file():
            return str(p)
    tried = "\n  - ".join(str(p) for p in candidates)
    raise FileNotFoundError(f"Schemas_ESAT.md not found. Tried:\n  - {tried}")


def load_schemas_esat_markdown(base_dir: str) -> Tuple[str, str]:
    """Load ``(path, markdown_ready_for_parse)`` from Schemas_ESAT.md only."""
    path = resolve_schemas_esat_path(base_dir)
    raw = read_text(path)
    return path, extract_markdown_from_code_blocks(raw)


def run_once(base_dir: str, cfg: RunConfig, models: ModelsConfig, 
             callbacks: Optional[Dict[str, Callable]] = None,
             forced_schema_id: Optional[str] = None,
             curriculum_parser=None,
             math_paper: Optional[str] = None) -> Dict[str, Any]:
    """
    Optional ``callbacks`` keys include ``on_llm_prompt(label, model, system_prompt, user_prompt, temperature)``
    (fired before each Gemini attempt) for GUI prompt inspection.

    ``math_paper``: for ``M*`` schemas only, ``"Math 1"`` or ``"Math 2"`` overrides ``cfg.math_paper`` for this run.
    """
    if callbacks is None:
        callbacks = {}
    if cfg.seed is not None:
        random.seed(cfg.seed)

    _ensure_vertex_env_config()

    init_pipeline_log(base_dir)
    prompts = load_prompts(base_dir)

    schemas_path, schemas_md = load_schemas_esat_markdown(base_dir)
    plog(
        "run_once",
        "schemas_loaded",
        detail={"path": schemas_path, "forced_schema_id": forced_schema_id},
        echo=False,
    )

    schemas = parse_schemas_from_markdown(schemas_md, allow_prefixes=cfg.allow_schema_prefixes)
    if schemas and forced_schema_id:
        sample_sids = [forced_schema_id] if forced_schema_id in schemas else list(schemas.keys())[:3]
        plog(
            "run_once",
            "schema_resolve",
            detail={
                "count": len(schemas),
                "forced": forced_schema_id,
                "forced_ok": forced_schema_id in schemas,
                "sample_ids": sample_sids,
            },
            echo=False,
        )

    # Load curriculum parser if tag labeling is enabled and not already provided
    if curriculum_parser is None and cfg.enable_tag_labeling:
        try:
            from curriculum_parser import CurriculumParser
            curriculum_file = cfg.curriculum_file_path
            if curriculum_file is None:
                curriculum_file = os.path.join(base_dir, "curriculum", "ESAT_CURRICULUM.json")
            curriculum_parser = CurriculumParser(curriculum_file)
        except (ImportError, Exception) as e:
            plog(
                "run_once",
                "curriculum_parser_disabled",
                level="warning",
                detail={"error": str(e)},
                echo=True,
                spacer=True,
            )
            curriculum_parser = None

    # Configure rate limiting from environment (conservative defaults; 429 backoff also uses server retry hints).
    default_min_delay = float(os.environ.get("API_MIN_DELAY", "5.0"))
    default_rate_limit_delay = float(os.environ.get("API_RATE_LIMIT_DELAY", "35.0"))
    trace_fn = callbacks.get("on_llm_prompt") if callbacks else None
    llm = LLMClient(
        api_key="",
        min_delay=default_min_delay,
        rate_limit_delay=default_rate_limit_delay,
        prompt_trace_callback=trace_fn,
    )

    run_id = now_stamp()
    run_dir = os.path.join(base_dir, cfg.out_dir, run_id)
    ensure_dir(run_dir)

    paths = {
        "accepted": os.path.join(run_dir, "accepted.jsonl"),
        "rejected": os.path.join(run_dir, "rejected.jsonl"),
        "logs": os.path.join(run_dir, "logs.jsonl"),
        "stats": os.path.join(run_dir, "stats.json"),
    }

    stats = {
        "run_id": run_id,
        "accepted": 0,
        "rejected": 0,
        "by_schema": {},
        "failures": {},
    }

    # Generate one item per run_once; you can wrap to generate N items.
    # Use forced_schema_id if provided (for systematic generation), otherwise choose randomly
    if forced_schema_id and forced_schema_id in schemas:
        schema_id = forced_schema_id
    else:
        schema_id = choose_schema(schemas, cfg)
    schema_block = schemas[schema_id]["block"]
    exemplar_ids = schemas[schema_id].get("exemplar_ids", [])
    difficulty = choose_difficulty(cfg)
    eff_paper = effective_math_paper_for_schema(schema_id, cfg, math_paper)
    plog(
        "run_once",
        "difficulty_chosen",
        detail={
            "schema_id": schema_id,
            "difficulty": difficulty,
            "weights": dict(cfg.difficulty_weights or {}),
        },
        echo=False,
    )

    if callbacks and "on_schema_selected" in callbacks:
        callbacks["on_schema_selected"](schema_id, difficulty)

    stats["by_schema"].setdefault(schema_id, {"attempted": 0, "accepted": 0, "rejected": 0})
    stats["by_schema"][schema_id]["attempted"] += 1

    # Designer (with limited retries for malformed JSON)
    if callbacks and "on_stage_start" in callbacks:
        callbacks["on_stage_start"]("Designer", f"Designing idea for {schema_id} ({difficulty})")
    
    idea_plan = None
    designer_err = None
    for d_try in range(cfg.max_designer_retries + 1):
        try:
            if callbacks and "on_stage_progress" in callbacks:
                callbacks["on_stage_progress"]("Designer", f"Attempt {d_try + 1}/{cfg.max_designer_retries + 1}")
            # Determine variation_mode (base/sibling/far) - can be set via config or env var
            variation_mode = getattr(cfg, 'variation_mode', os.environ.get('VARIATION_MODE', 'base'))
            if variation_mode not in ['base', 'sibling', 'far']:
                variation_mode = 'base'
            
            idea_plan = designer_call(
                llm,
                prompts,
                models,
                schema_block,
                schema_id,
                difficulty,
                exemplar_ids,
                variation_mode=variation_mode,
                base_dir=base_dir,
                math_paper=eff_paper,
            )
            if callbacks and "on_stage_complete" in callbacks:
                callbacks["on_stage_complete"]("Designer", idea_plan)
            break
        except ValueError as e:
            # Check if this is a JSON parsing error
            error_str = str(e)
            is_parse_error = (
                "JSON parsing error" in error_str
                or "parsing" in error_str.lower()
            )

            designer_err = error_str
            if callbacks and "on_stage_error" in callbacks:
                callbacks["on_stage_error"]("Designer", error_str)

            log_entry = {
                "stage": "designer",
                "schema_id": schema_id,
                "difficulty": difficulty,
                "attempt": d_try + 1,
                "error": designer_err,
                "is_parse_error": is_parse_error,
            }
            dump_jsonl(paths["logs"], log_entry)

            plog(
                "run_once",
                "designer_attempt_failed",
                level="warning",
                detail={
                    "attempt": d_try + 1,
                    "max": cfg.max_designer_retries + 1,
                    "parse_error": is_parse_error,
                    "error": error_str[:800],
                    "will_retry": d_try < cfg.max_designer_retries,
                },
                echo=False,
            )
        except Exception as e:
            # Other exceptions
            designer_err = str(e)
            if callbacks and "on_stage_error" in callbacks:
                callbacks["on_stage_error"]("Designer", str(e))
            dump_jsonl(paths["logs"], {
                "stage": "designer",
                "schema_id": schema_id,
                "difficulty": difficulty,
                "attempt": d_try + 1,
                "error": designer_err,
                "is_parse_error": False,
            })
            plog(
                "run_once",
                "designer_attempt_exception",
                level="warning",
                detail={
                    "attempt": d_try + 1,
                    "error": str(e)[:800],
                    "will_retry": d_try < cfg.max_designer_retries,
                },
                echo=False,
            )
    if idea_plan is None:
        stats["rejected"] += 1
        stats["by_schema"][schema_id]["rejected"] += 1
        rejected_item = {
            "schema_id": schema_id,
            "difficulty": difficulty,
            "stage": "designer",
            "error": designer_err,
            "created_at": datetime.datetime.now().isoformat(),
            "run_id": run_id,
        }
        dump_jsonl(paths["rejected"], rejected_item)
        
        # Backup rejected question
        try:
            from backup_manager import backup_question_from_pipeline
            backup_question_from_pipeline(rejected_item, base_dir, status="rejected")
        except (ImportError, Exception):
            pass  # Non-fatal
        with open(paths["stats"], "w", encoding="utf-8") as f:
            json.dump(stats, f, ensure_ascii=False, indent=2)
        plog(
            "run_once",
            "designer_failed",
            level="error",
            detail={"schema_id": schema_id, "run_dir": run_dir, "error": designer_err or ""},
            echo=True,
            spacer=True,
        )
        return {
            "run_dir": run_dir,
            "status": "designer_failed",
            "rejection": {"gate": "designer", "error": designer_err or ""},
        }

    # Implementer + Retry controller
    previous_attempt = None
    verifier_report = None
    style_report = None

    for attempt in range(cfg.max_implementer_retries + 1):
        try:
            if attempt == 0:
                if callbacks and "on_stage_start" in callbacks:
                    callbacks["on_stage_start"]("Implementer", f"Implementing question (Attempt {attempt + 1})")
                q_pkg = implementer_call(
                    llm,
                    prompts,
                    models,
                    idea_plan,
                    exemplar_ids=exemplar_ids,
                    difficulty=difficulty,
                    math_paper=eff_paper,
                )
                if callbacks and "on_stage_complete" in callbacks:
                    callbacks["on_stage_complete"]("Implementer", q_pkg)
            else:
                if callbacks and "on_stage_start" in callbacks:
                    callbacks["on_stage_start"]("Implementer", f"Regenerating question (Attempt {attempt + 1})")
                q_pkg = implementer_regen_call(
                    llm,
                    prompts,
                    models,
                    idea_plan=idea_plan,
                    previous_attempt=previous_attempt,
                    verifier_report=verifier_report,
                    style_report=style_report,
                    difficulty=difficulty,
                    math_paper=eff_paper,
                    generator_base_dir=base_dir,
                )
                if callbacks and "on_stage_complete" in callbacks:
                    callbacks["on_stage_complete"]("Implementer", q_pkg)
            previous_attempt = q_pkg

            if callbacks and "on_stage_start" in callbacks:
                callbacks["on_stage_start"]("Verifier", "Verifying question correctness")
            verifier_report = verifier_call(
                llm,
                prompts,
                models,
                q_pkg,
                schema_id,
                designer_plan=idea_plan,
                exemplar_ids=exemplar_ids,
                math_paper=eff_paper,
            )
            v_verdict = extract_verdict(verifier_report)
            if callbacks and "on_stage_complete" in callbacks:
                callbacks["on_stage_complete"]("Verifier", verifier_report)

            dump_jsonl(paths["logs"], {
                "stage": "verifier",
                "schema_id": schema_id,
                "difficulty": difficulty,
                "attempt": attempt + 1,
                "verdict": v_verdict,
                "report": verifier_report,
            })

            if v_verdict != "PASS":
                severity = extract_severity(verifier_report)
                stats["failures"].setdefault(str(verifier_report.get("failure_type", "unknown")), 0)
                stats["failures"][str(verifier_report.get("failure_type", "unknown"))] += 1
                
                if callbacks and "on_stage_error" in callbacks:
                    failure_reasons = verifier_report.get("reasons", ["Unknown error"])
                    error_msg = f"FAILED: {', '.join(failure_reasons) if isinstance(failure_reasons, list) else str(failure_reasons)}"
                    callbacks["on_stage_error"]("Verifier", error_msg)

                if is_structural(severity):
                    # discard idea immediately
                    rejected_item = {
                        "schema_id": schema_id,
                        "difficulty": difficulty,
                        "attempt": attempt + 1,
                        "stage": "verifier",
                        "verifier_report": verifier_report,
                        "idea_plan": idea_plan,
                        "question_package": q_pkg,
                        "created_at": datetime.datetime.now().isoformat(),
                        "run_id": run_id,
                    }
                    dump_jsonl(paths["rejected"], rejected_item)
                    # Backup rejected question
                    try:
                        from backup_manager import backup_question_from_pipeline
                        backup_question_from_pipeline(rejected_item, base_dir, status="rejected")
                    except (ImportError, Exception):
                        pass
                    stats["rejected"] += 1
                    stats["by_schema"][schema_id]["rejected"] += 1
                    with open(paths["stats"], "w", encoding="utf-8") as f:
                        json.dump(stats, f, ensure_ascii=False, indent=2)
                    return {
                        "run_dir": run_dir,
                        "status": "rejected_structural_verifier",
                        "rejection": _rejection_verifier_detail(verifier_report),
                    }

                # fixable -> retry if attempts remain
                if attempt < cfg.max_implementer_retries and is_fixable(severity):
                    continue

                # fixable but out of retries OR unknown severity -> reject
                rejected_item = {
                    "schema_id": schema_id,
                    "difficulty": difficulty,
                    "attempt": attempt + 1,
                    "stage": "verifier",
                    "verifier_report": verifier_report,
                    "idea_plan": idea_plan,
                    "question_package": q_pkg,
                    "created_at": datetime.datetime.now().isoformat(),
                    "run_id": run_id,
                }
                dump_jsonl(paths["rejected"], rejected_item)
                # Backup rejected question
                try:
                    from backup_manager import backup_question_from_pipeline
                    backup_question_from_pipeline(rejected_item, base_dir, status="rejected")
                except (ImportError, Exception):
                    pass
                stats["rejected"] += 1
                stats["by_schema"][schema_id]["rejected"] += 1
                with open(paths["stats"], "w", encoding="utf-8") as f:
                    json.dump(stats, f, ensure_ascii=False, indent=2)
                return {
                    "run_dir": run_dir,
                    "status": "rejected_verifier",
                    "rejection": _rejection_verifier_detail(verifier_report),
                }

            # Style Judge
            if callbacks and "on_stage_start" in callbacks:
                callbacks["on_stage_start"]("Style Judge", "Checking exam authenticity")
            style_report = style_call(
                llm,
                prompts,
                models,
                q_pkg,
                schema_id,
                verifier_obj=verifier_report,
                designer_plan=idea_plan,
                exemplar_ids=exemplar_ids,
                target_difficulty=difficulty,
                math_paper=eff_paper,
            )
            s_verdict = extract_verdict(style_report)
            if callbacks and "on_stage_complete" in callbacks:
                callbacks["on_stage_complete"]("Style Judge", style_report)

            dump_jsonl(paths["logs"], {
                "stage": "style_checker",
                "schema_id": schema_id,
                "difficulty": difficulty,
                "attempt": attempt + 1,
                "verdict": s_verdict,
                "report": style_report,
            })

            if s_verdict != "PASS":
                severity = extract_severity(style_report)
                
                if callbacks and "on_stage_error" in callbacks:
                    failure_reasons = style_report.get("regen_instructions", ["Unknown error"])
                    error_msg = f"FAILED: {', '.join(failure_reasons) if isinstance(failure_reasons, list) else str(failure_reasons)}"
                    callbacks["on_stage_error"]("Style Judge", error_msg)

                if is_structural(severity):
                    rejected_item = {
                        "schema_id": schema_id,
                        "difficulty": difficulty,
                        "attempt": attempt + 1,
                        "stage": "style_checker",
                        "style_report": style_report,
                        "verifier_report": verifier_report,
                        "idea_plan": idea_plan,
                        "question_package": q_pkg,
                        "created_at": datetime.datetime.now().isoformat(),
                        "run_id": run_id,
                    }
                    dump_jsonl(paths["rejected"], rejected_item)
                    # Backup rejected question
                    try:
                        from backup_manager import backup_question_from_pipeline
                        backup_question_from_pipeline(rejected_item, base_dir, status="rejected")
                    except (ImportError, Exception):
                        pass
                    stats["rejected"] += 1
                    stats["by_schema"][schema_id]["rejected"] += 1
                    with open(paths["stats"], "w", encoding="utf-8") as f:
                        json.dump(stats, f, ensure_ascii=False, indent=2)
                    return {
                        "run_dir": run_dir,
                        "status": "rejected_structural_style",
                        "rejection": _rejection_style_detail(style_report),
                    }

                if attempt < cfg.max_implementer_retries and is_fixable(severity):
                    continue

                rejected_item = {
                    "schema_id": schema_id,
                    "difficulty": difficulty,
                    "attempt": attempt + 1,
                    "stage": "style_checker",
                    "style_report": style_report,
                    "verifier_report": verifier_report,
                    "idea_plan": idea_plan,
                    "question_package": q_pkg,
                    "created_at": datetime.datetime.now().isoformat(),
                    "run_id": run_id,
                }
                dump_jsonl(paths["rejected"], rejected_item)
                # Backup rejected question
                try:
                    from backup_manager import backup_question_from_pipeline
                    backup_question_from_pipeline(rejected_item, base_dir, status="rejected")
                except (ImportError, Exception):
                    pass
                stats["rejected"] += 1
                stats["by_schema"][schema_id]["rejected"] += 1
                with open(paths["stats"], "w", encoding="utf-8") as f:
                    json.dump(stats, f, ensure_ascii=False, indent=2)
                return {
                    "run_dir": run_dir,
                    "status": "rejected_style",
                    "rejection": _rejection_style_detail(style_report),
                }

            # PASS both gates -> KaTeX Validation (with retry logic)
            katex_validation_passed = False
            katex_attempt = 0
            max_katex_attempts = 3
            
            while not katex_validation_passed and katex_attempt < max_katex_attempts:
                if callbacks and "on_stage_start" in callbacks:
                    callbacks["on_stage_start"]("KaTeX Validator", f"Validating KaTeX formatting (Attempt {katex_attempt + 1}/{max_katex_attempts})")
                
                is_valid, katex_errors = validate_question_katex(q_pkg, schema_id)
                
                if is_valid:
                    katex_validation_passed = True
                    if callbacks and "on_stage_complete" in callbacks:
                        callbacks["on_stage_complete"]("KaTeX Validator", "KaTeX validation passed")
                else:
                    katex_attempt += 1
                    if katex_attempt < max_katex_attempts:
                        # Try to fix KaTeX issues
                        if callbacks and "on_stage_progress" in callbacks:
                            error_summary = f"{len(katex_errors)} field(s) with errors"
                            callbacks["on_stage_progress"]("KaTeX Validator", f"Fixing KaTeX errors: {error_summary}")
                        
                        try:
                            # Use format_fixer_call for format-only fixes (new Math1 pipeline)
                            # Check if errors are format-only (KaTeX / JSON surface)
                            is_format_only = all(
                                "katex" in str(err).lower()
                                or "json" in str(err).lower()
                                or "format" in str(err).lower()
                                for error_info in katex_errors
                                for err in error_info.get("errors", [])
                            )
                            
                            if is_format_only:
                                # Use format_fixer_call (format-only, no math changes)
                                if callbacks and "on_stage_start" in callbacks:
                                    callbacks["on_stage_start"]("Format Fixer", "Fixing JSON and KaTeX formatting only")
                                q_pkg = format_fixer_call(
                                    llm,
                                    prompts,
                                    models,
                                    q_pkg,
                                    katex_errors=katex_errors,
                                    schema_id=schema_id,
                                    math_paper=eff_paper,
                                )
                                
                                # Check if format fixer blocked (non-format issue detected)
                                if q_pkg.get("_format_fixer_blocked"):
                                    raise ValueError(f"Format Fixer blocked: {q_pkg.get('_format_fixer_reason', 'non-format issue detected')}")
                            else:
                                # Fallback to old fix_katex_issues for non-format errors
                                q_pkg = fix_katex_issues(
                                    llm,
                                    prompts,
                                    models,
                                    q_pkg,
                                    katex_errors,
                                    schema_id,
                                    katex_attempt,
                                    base_dir,
                                    math_paper=eff_paper,
                                )
                            
                            if callbacks and "on_stage_progress" in callbacks:
                                callbacks["on_stage_progress"]("KaTeX Validator", "Retrying validation after fix")
                        except Exception as e:
                            # Fix attempt failed, log and continue to next attempt or reject
                            error_str = str(e)
                            dump_jsonl(paths["logs"], {
                                "stage": "katex_fixer",
                                "schema_id": schema_id,
                                "difficulty": difficulty,
                                "attempt": katex_attempt,
                                "error": error_str,
                                "katex_errors": katex_errors
                            })
                            if callbacks and "on_stage_error" in callbacks:
                                callbacks["on_stage_error"]("KaTeX Fixer", error_str)
                    else:
                        # Max attempts reached, reject question
                        if callbacks and "on_stage_error" in callbacks:
                            error_summary = f"KaTeX validation failed after {max_katex_attempts} attempts"
                            callbacks["on_stage_error"]("KaTeX Validator", error_summary)
                        
                        rejected_item = {
                            "schema_id": schema_id,
                            "difficulty": difficulty,
                            "attempt": attempt + 1,
                            "stage": "katex_validation",
                            "katex_errors": katex_errors,
                            "verifier_report": verifier_report,
                            "style_report": style_report,
                            "idea_plan": idea_plan,
                            "question_package": q_pkg,
                            "created_at": datetime.datetime.now().isoformat(),
                            "run_id": run_id,
                        }
                        dump_jsonl(paths["rejected"], rejected_item)
                        # Backup rejected question
                        try:
                            from backup_manager import backup_question_from_pipeline
                            backup_question_from_pipeline(rejected_item, base_dir, status="rejected")
                        except (ImportError, Exception):
                            pass
                        stats["rejected"] += 1
                        stats["by_schema"][schema_id]["rejected"] += 1
                        with open(paths["stats"], "w", encoding="utf-8") as f:
                            json.dump(stats, f, ensure_ascii=False, indent=2)
                        return {
                            "run_dir": run_dir,
                            "status": "rejected_katex_validation",
                            "rejection": _rejection_katex_detail(katex_errors),
                        }
            
            if not katex_validation_passed:
                # Should not reach here, but safety check
                return {
                    "run_dir": run_dir,
                    "status": "rejected_katex_validation",
                    "rejection": {"gate": "katex_validation", "katex_errors": []},
                }
            
            # PASS KaTeX gate -> build bank item; tag then persist so accepted.jsonl matches DB/backup
            token_usage = llm.total_usage.copy() if llm.total_usage else None
            item = build_bank_item(
                idea_plan=idea_plan,
                question_obj=q_pkg,
                verifier_obj=verifier_report,
                style_obj=style_report,
                schema_id=schema_id,
                difficulty=difficulty,
                models=models,
                attempts=attempt + 1,
                token_usage=token_usage,
                tags=None,
                schema_block_snapshot=schema_block,
            )
            item["_run_id"] = run_id

            if cfg.enable_tag_labeling and curriculum_parser:
                try:
                    if callbacks and "on_stage_start" in callbacks:
                        callbacks["on_stage_start"]("Classifier Station", "Assigning curriculum tags")
                    
                    tag_result = tag_labeler_call(
                        llm,
                        prompts,
                        models,
                        q_pkg,
                        schema_id,
                        curriculum_parser,
                        math_paper=eff_paper,
                    )
                    
                    if not isinstance(tag_result, dict):
                        raise ValueError(
                            f"Tag labeler returned {type(tag_result).__name__}, expected dict."
                        )
                    
                    # Process tag_result into tags format
                    primary_tag = tag_result.get("primary_tag", "")
                    secondary_tags_list = tag_result.get("secondary_tags", [])
                    if not isinstance(secondary_tags_list, list):
                        secondary_tags_list = []
                    secondary_tags = []
                    
                    # Normalize to prefixed format if needed
                    if primary_tag and curriculum_parser:
                        normalized_primary = curriculum_parser.normalize_topic_code(primary_tag)
                        if normalized_primary:
                            primary_tag = normalized_primary
                    
                    for tag in secondary_tags_list:
                        tag_code = tag.get("code", "") if isinstance(tag, dict) else str(tag)
                        if tag_code:
                            # Normalize to prefixed format if needed
                            if curriculum_parser:
                                normalized_tag = curriculum_parser.normalize_topic_code(tag_code)
                                if normalized_tag:
                                    tag_code = normalized_tag
                            secondary_tags.append(tag_code)
                    
                    # Build confidence object
                    confidence = {
                        "primary": tag_result.get("primary_confidence", 0.0)
                    }
                    if secondary_tags_list:
                        for i, tag in enumerate(secondary_tags_list):
                            if isinstance(tag, dict):
                                confidence[tag.get("code", "")] = tag.get("confidence", 0.0)
                    
                    tags = {
                        "primary_tag": primary_tag,
                        "secondary_tags": secondary_tags,
                        "confidence": confidence,
                        "labeled_at": datetime.datetime.now().isoformat(),
                        "labeled_by": "classifier_station",
                        "reasoning": tag_result.get("reasoning", "")
                    }
                    
                    # Add paper field for Math questions
                    if "paper" in tag_result:
                        tags["paper"] = tag_result["paper"]
                    
                    # Update item with tags
                    item["tags"] = tags
                    
                    dump_jsonl(paths["logs"], {
                        "stage": "classifier_station",
                        "schema_id": schema_id,
                        "difficulty": difficulty,
                        "attempt": attempt + 1,
                        "tags": tags,
                    })
                    
                    if callbacks and "on_stage_complete" in callbacks:
                        callbacks["on_stage_complete"]("Classifier Station", tag_result)
                except Exception as e:
                    # Classifier failures should not block question generation
                    error_msg = str(e)
                    plog(
                        "run_once",
                        "classifier_failed_nonfatal",
                        level="warning",
                        detail={"schema_id": schema_id, "error": error_msg[:800]},
                        echo=False,
                    )
                    dump_jsonl(paths["logs"], {
                        "stage": "classifier_station",
                        "schema_id": schema_id,
                        "difficulty": difficulty,
                        "attempt": attempt + 1,
                        "error": error_msg,
                    })
                    if callbacks and "on_stage_error" in callbacks:
                        callbacks["on_stage_error"]("Classifier Station", error_msg)

            if eff_paper:
                item.setdefault("tags", {})
                if not isinstance(item["tags"], dict):
                    item["tags"] = {}
                item["tags"]["paper"] = eff_paper

            dump_jsonl(paths["accepted"], item)
            stats["accepted"] += 1
            stats["by_schema"][schema_id]["accepted"] += 1
            with open(paths["stats"], "w", encoding="utf-8") as f:
                json.dump(stats, f, ensure_ascii=False, indent=2)

            # Backup question (all questions, accepted and rejected)
            try:
                from backup_manager import backup_question_from_pipeline
                backup_path = backup_question_from_pipeline(item, base_dir, status="pending")
                if backup_path:
                    plog(
                        "run_once",
                        "backup_ok",
                        detail={"path": backup_path, "generation_id": item.get("id")},
                        echo=False,
                    )
            except ImportError:
                plog("run_once", "backup_skipped", detail={"reason": "backup_manager_unavailable"}, echo=False)
            except Exception as e:
                plog(
                    "run_once",
                    "backup_error",
                    level="warning",
                    detail={"error": str(e)},
                    echo=False,
                )
            
            # Sync to database (silently - no console output)
            # Only questions that pass verifier + style judge will be saved.
            # Status pending until a human approves in the review app (same as simple_generator_ui).
            try:
                from db_sync import sync_question_from_pipeline
                db_id = sync_question_from_pipeline(item, base_dir, status="pending")
                if db_id:
                    item["_db_id"] = db_id
            except ImportError:
                pass  # Silent fail
            except Exception:
                pass  # Silent fail - errors logged in db_sync.py
            
            # HTML generation disabled - questions are saved to database and shown in UI
            # No need to generate HTML files or open previews

            if callbacks and "on_success" in callbacks:
                try:
                    callbacks["on_success"](item)
                except Exception as cb_err:
                    # Presentation-only; must not retry the whole implementer loop after DB backup/sync
                    plog(
                        "run_once",
                        "on_success_callback_failed",
                        level="warning",
                        detail={"error": str(cb_err)},
                        echo=False,
                    )
                    dump_jsonl(paths["logs"], {
                        "stage": "on_success_callback",
                        "schema_id": schema_id,
                        "difficulty": difficulty,
                        "attempt": attempt + 1,
                        "error": str(cb_err),
                    })
            # Silent mode - no console output, questions saved to database
            
            out = {"run_dir": run_dir, "status": "accepted", "item_id": item["id"], "item": item}
            if eff_paper:
                out["math_paper"] = eff_paper
            return out

        except ValueError as e:
            error_msg = str(e)
            is_parse_error = (
                "JSON parsing error" in error_msg
                or "parsing" in error_msg.lower()
            )

            plog(
                "run_once",
                "implementer_value_error",
                level="warning",
                detail={
                    "attempt": attempt + 1,
                    "parse_error": is_parse_error,
                    "error": error_msg[:1200],
                    "will_retry": attempt < cfg.max_implementer_retries,
                },
                echo=False,
            )

            dump_jsonl(paths["logs"], {
                "stage": "pipeline_exception",
                "schema_id": schema_id,
                "difficulty": difficulty,
                "attempt": attempt + 1,
                "error": error_msg,
                "is_parse_error": is_parse_error,
            })
            # Treat exceptions as fixable and try again if possible
            if attempt < cfg.max_implementer_retries:
                continue
        except Exception as e:
            error_msg = str(e)
            plog(
                "run_once",
                "pipeline_exception",
                level="warning",
                detail={
                    "attempt": attempt + 1,
                    "error": error_msg[:1200],
                    "will_retry": attempt < cfg.max_implementer_retries,
                },
                echo=False,
            )

            dump_jsonl(paths["logs"], {
                "stage": "pipeline_exception",
                "schema_id": schema_id,
                "difficulty": difficulty,
                "attempt": attempt + 1,
                "error": error_msg,
                "is_parse_error": False,
            })
            # Treat exceptions as fixable and try again if possible
            if attempt < cfg.max_implementer_retries:
                continue
            stats["rejected"] += 1
            stats["by_schema"][schema_id]["rejected"] += 1
            rejected_item = {
                "schema_id": schema_id,
                "difficulty": difficulty,
                "attempt": attempt + 1,
                "stage": "exception",
                "error": str(e),
                "idea_plan": idea_plan,
                "created_at": datetime.datetime.now().isoformat(),
                "run_id": run_id,
            }
            dump_jsonl(paths["rejected"], rejected_item)
            # Backup rejected question
            try:
                from backup_manager import backup_question_from_pipeline
                backup_question_from_pipeline(rejected_item, base_dir, status="rejected")
            except (ImportError, Exception):
                pass
            with open(paths["stats"], "w", encoding="utf-8") as f:
                json.dump(stats, f, ensure_ascii=False, indent=2)
            plog(
                "run_once",
                "rejected_exception",
                level="error",
                detail={"schema_id": schema_id, "run_dir": run_dir, "error": str(e)[:800]},
                echo=True,
                spacer=True,
            )
            return {
                "run_dir": run_dir,
                "status": "rejected_exception",
                "rejection": {"gate": "pipeline_exception", "error": str(e)},
            }

    # Should never reach here
    return {"run_dir": run_dir, "status": "unknown"}


def run_many(n: int, base_dir: str, cfg: RunConfig, models: ModelsConfig) -> None:
    """
    Runs n independent items (each creates its own run directory).
    """
    for i in range(n):
        plog("run_many", "batch_item_start", detail={"i": i + 1, "n": n}, echo=False)
        print("", flush=True)
        print(f"--- Batch {i + 1}/{n} ---", flush=True)
        try:
            res = run_once(base_dir=base_dir, cfg=cfg, models=models)
            status = res.get("status", "unknown")
            if status == "accepted":
                plog(
                    "run_many",
                    "batch_item_ok",
                    detail={"i": i + 1, "n": n, "item_id": res.get("item_id")},
                    echo=True,
                )
            else:
                plog(
                    "run_many",
                    "batch_item_failed",
                    level="warning",
                    detail={"i": i + 1, "n": n, "status": status, "run_dir": res.get("run_dir")},
                    echo=True,
                )
        except Exception as e:
            plog(
                "run_many",
                "batch_item_exception",
                level="error",
                detail={"i": i + 1, "n": n, "error": str(e)[:800]},
                echo=True,
                spacer=True,
            )
            import traceback

            traceback.print_exc()


def safe_load_dotenv(filepath: str) -> bool:
    """Safely load .env file, handling encoding issues and BOM"""
    if not os.path.exists(filepath):
        return False
    
    try:
        # Read file and remove BOM if present
        with open(filepath, 'r', encoding='utf-8-sig') as f:  # utf-8-sig automatically strips BOM
            content = f.read()
        
        # Write back without BOM
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        
        # Now load it
        load_dotenv(filepath, encoding="utf-8", override=True)
        return True
    except UnicodeDecodeError:
        try:
            # Try UTF-16 LE (Windows sometimes saves as this)
            with open(filepath, 'r', encoding='utf-16-le') as f:
                content = f.read()
            # Remove BOM if present and write as UTF-8
            if content.startswith('\ufeff'):
                content = content[1:]
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            load_dotenv(filepath, encoding="utf-8", override=True)
            return True
        except Exception as e:
            # If all else fails, try without encoding specification
            try:
                load_dotenv(filepath, override=True)
                return True
            except Exception as e2:
                print(f"Warning: Could not load {filepath} due to encoding issues. Using environment variables only.")
                print(f"  Error: {e2}")
                return False
    except Exception as e:
        print(f"Warning: Could not load {filepath}: {e}")
        return False


def main():
    # Load environment variables from .env.local (handle encoding issues)
    safe_load_dotenv(".env.local")
    
    base_dir = os.path.dirname(os.path.abspath(__file__))

    # Check and display key environment variables
    cloud_project, cloud_location = _vertex_env_config()
    n_items = os.environ.get("N_ITEMS", "1")
    max_retries = os.environ.get("MAX_IMPLEMENTER_RETRIES", "2")
    schema_prefixes = os.environ.get("SCHEMA_PREFIXES", "M")
    
    print(f"Configuration loaded from .env.local:")
    print(f"  GOOGLE_CLOUD_PROJECT: {cloud_project or 'NOT SET'}")
    print(f"  GOOGLE_CLOUD_LOCATION: {cloud_location or 'NOT SET'}")
    print(f"  N_ITEMS: {n_items}")
    print(f"  MAX_IMPLEMENTER_RETRIES: {max_retries}")
    print(f"  SCHEMA_PREFIXES: {schema_prefixes}")
    _dw = difficulty_weights_from_env()
    print(
        "  Difficulty sampling weights (W_EASY/W_MED/W_HARD/W_EXTREME = relative weight; default ~5/20/55/15%): "
        f"E={_dw['Easy']:.2f} M={_dw['Medium']:.2f} H={_dw['Hard']:.2f} X={_dw['Extreme']:.2f}"
    )
    print()

    cfg = RunConfig(
        max_implementer_retries=int(max_retries),
        max_designer_retries=int(os.environ.get("MAX_DESIGNER_RETRIES", "2")),
        seed=int(os.environ["SEED"]) if os.environ.get("SEED") else None,
        difficulty_weights=difficulty_weights_from_env(),
        schema_weights=None,
        out_dir=os.environ.get("OUT_DIR", "runs"),
        allow_schema_prefixes=tuple(schema_prefixes.split(",")),
    )

    models = get_default_models_config()

    n = int(n_items)
    run_many(n=n, base_dir=base_dir, cfg=cfg, models=models)


# ---------- GUI Interface ----------


def _gui_option_like_pairs(raw: Any) -> List[Tuple[str, str]]:
    """
    Normalize ``question.options`` or ``distractor_map`` for display when the model returns
    a dict (A/B/C/...) or a list of strings / list of small dicts.
    """
    if isinstance(raw, dict):
        return sorted((str(k), str(v)) for k, v in raw.items())
    if isinstance(raw, list):
        pairs: List[Tuple[str, str]] = []
        letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        for i, entry in enumerate(raw):
            label = letters[i] if i < len(letters) else str(i + 1)
            if isinstance(entry, dict):
                k = entry.get("label") or entry.get("option") or entry.get("key") or entry.get("id") or entry.get("letter")
                k = str(k).strip() if k is not None else label
                t = entry.get("text") or entry.get("value") or entry.get("body") or entry.get("content")
                if t is None and len(entry) == 1:
                    t = next(iter(entry.values()))
                pairs.append((k, "" if t is None else str(t)))
            else:
                pairs.append((label, str(entry)))
        return pairs
    return []


def _gui_style_scores_pairs(raw: Any) -> List[Tuple[str, str]]:
    """Normalize ``style_report.scores`` when it is a dict or a list of criterion dicts."""
    if isinstance(raw, dict):
        return [(str(k), str(v)) for k, v in raw.items()]
    if isinstance(raw, list):
        out: List[Tuple[str, str]] = []
        for i, entry in enumerate(raw):
            if isinstance(entry, dict):
                k = entry.get("name") or entry.get("key") or entry.get("criterion") or f"item_{i}"
                v = entry.get("score", entry.get("value", ""))
                out.append((str(k), str(v)))
            else:
                out.append((str(i), str(entry)))
        return out
    return []


class PipelineGUI:
    """Single-question pipeline visualizer. Console output mirrors stages (terminal where you launched)."""

    # Must cover every on_stage_* name from run_once or callbacks KeyError and the UI looks "stuck".
    PIPELINE_STAGES = (
        "Designer",
        "Implementer",
        "Verifier",
        "Style Judge",
        "KaTeX Validator",
        "Format Fixer",
        "Classifier Station",
    )

    def __init__(self, root: tk.Tk, base_dir: str, cfg: RunConfig, models: ModelsConfig):
        self.root = root
        self.base_dir = base_dir
        self.cfg = cfg
        self.models = models
        self.running = False
        self._prompt_history: Dict[str, List[Dict[str, Any]]] = {s: [] for s in self.PIPELINE_STAGES}
        
        root.title("ESAT Question Generator - Pipeline Visualizer")
        root.geometry("1240x920")
        root.minsize(880, 600)

        # Outer shell: canvas + vertical scrollbar so the full page scrolls on smaller displays
        outer = ttk.Frame(root, padding=0)
        outer.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        root.columnconfigure(0, weight=1)
        root.rowconfigure(0, weight=1)
        outer.columnconfigure(0, weight=1)
        outer.rowconfigure(0, weight=1)

        self._page_canvas = tk.Canvas(outer, highlightthickness=0)
        page_vsb = ttk.Scrollbar(outer, orient=tk.VERTICAL, command=self._page_canvas.yview)
        self._page_canvas.configure(yscrollcommand=page_vsb.set)
        self._page_canvas.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        page_vsb.grid(row=0, column=1, sticky=(tk.N, tk.S))

        main_frame = ttk.Frame(self._page_canvas, padding="10")
        self._page_canvas_window = self._page_canvas.create_window((0, 0), window=main_frame, anchor=tk.NW)

        def _sync_page_scroll(_event=None):
            self._page_canvas.update_idletasks()
            self._page_canvas.configure(scrollregion=self._page_canvas.bbox("all"))

        def _sync_page_inner_width(event):
            self._page_canvas.itemconfig(self._page_canvas_window, width=event.width)

        main_frame.bind("<Configure>", lambda e: _sync_page_scroll())
        self._page_canvas.bind("<Configure>", _sync_page_inner_width)
        root.after_idle(_sync_page_scroll)

        # Control panel
        control_frame = ttk.Frame(main_frame)
        control_frame.grid(row=0, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=(0, 10))
        
        self.start_button = ttk.Button(
            control_frame, text="Generate one question (random schema)", command=self.start_generation
        )
        self.start_button.grid(row=0, column=0, padx=5)
        
        self.status_label = ttk.Label(control_frame, text="Ready", font=("Arial", 10, "bold"))
        self.status_label.grid(row=0, column=1, padx=10)
        
        # Pipeline stages
        stages_frame = ttk.LabelFrame(main_frame, text="Pipeline Stages", padding="10")
        stages_frame.grid(row=1, column=0, columnspan=2, sticky=(tk.W, tk.E, tk.N, tk.S), pady=(0, 10))
        main_frame.rowconfigure(1, weight=1)
        
        # Stage widgets
        self.stage_widgets = {}
        stages = list(self.PIPELINE_STAGES)
        
        for i, stage in enumerate(stages):
            frame = ttk.Frame(stages_frame)
            frame.grid(row=i, column=0, sticky=(tk.W, tk.E), pady=5)
            stages_frame.columnconfigure(0, weight=1)
            
            # Status indicator
            status_canvas = tk.Canvas(frame, width=20, height=20, highlightthickness=0)
            status_canvas.grid(row=0, column=0, padx=5)
            self.stage_widgets[f"{stage}_status"] = status_canvas
            self.update_stage_status(stage, "pending")
            
            # Stage label
            label = ttk.Label(frame, text=f"{stage}:", font=("Arial", 10, "bold"))
            label.grid(row=0, column=1, sticky=tk.W, padx=5)
            
            # Stage info
            info_label = ttk.Label(frame, text="Waiting...", foreground="gray")
            info_label.grid(row=0, column=2, sticky=tk.W, padx=5)
            self.stage_widgets[f"{stage}_info"] = info_label

            ttk.Button(
                frame,
                text="Prompts…",
                width=9,
                command=lambda st=stage: self._open_prompt_popup(st),
            ).grid(row=0, column=3, padx=4)
            
            # Output text area
            output_text = scrolledtext.ScrolledText(frame, height=8, width=80, wrap=tk.WORD, state=tk.DISABLED)
            output_text.grid(row=1, column=0, columnspan=4, sticky=(tk.W, tk.E), pady=5)
            self.stage_widgets[f"{stage}_output"] = output_text
        
        # Final result with tabs
        result_frame = ttk.LabelFrame(main_frame, text="Final Question", padding="10")
        result_frame.grid(row=2, column=0, columnspan=2, sticky=(tk.W, tk.E, tk.N, tk.S))
        main_frame.rowconfigure(2, weight=1)
        
        # Create notebook for tabs
        notebook = ttk.Notebook(result_frame)
        notebook.pack(fill=tk.BOTH, expand=True)
        
        # Question tab
        question_frame = ttk.Frame(notebook)
        notebook.add(question_frame, text="Question")
        self.result_text = scrolledtext.ScrolledText(question_frame, wrap=tk.WORD, state=tk.DISABLED, font=("Consolas", 10))
        self.result_text.pack(fill=tk.BOTH, expand=True)
        
        # Solution tab
        solution_frame = ttk.Frame(notebook)
        notebook.add(solution_frame, text="Solution")
        self.solution_text = scrolledtext.ScrolledText(solution_frame, wrap=tk.WORD, state=tk.DISABLED, font=("Consolas", 10))
        self.solution_text.pack(fill=tk.BOTH, expand=True)
        
        # Details tab
        details_frame = ttk.Frame(notebook)
        notebook.add(details_frame, text="Details")
        self.details_text = scrolledtext.ScrolledText(details_frame, wrap=tk.WORD, state=tk.DISABLED, font=("Consolas", 9))
        self.details_text.pack(fill=tk.BOTH, expand=True)
    
    def _console(self, message: str) -> None:
        ts = datetime.datetime.now().strftime("%H:%M:%S")
        try:
            print(f"[{ts}] [ESAT Pipeline GUI] {message}", flush=True)
        except Exception:
            pass

    @staticmethod
    def _map_trace_label_to_stage(label: str) -> str:
        """Map internal LLM trace labels onto PIPELINE_STAGES rows."""
        if label.startswith("Designer"):
            return "Designer"
        if label.startswith("Implementer") or label in ("Implementer (retry)", "Retry controller"):
            return "Implementer"
        if label == "Format Fixer":
            return "Format Fixer"
        if label == "Verifier":
            return "Verifier"
        if label == "Style Judge":
            return "Style Judge"
        if label == "KaTeX Fixer":
            return "KaTeX Validator"
        if label == "Classifier" or label.startswith("Tag Labeler"):
            return "Classifier Station"
        return "Designer"

    def _on_llm_prompt_from_worker(
        self, label: str, model: str, system_p: str, user_p: str, temp: float
    ) -> None:
        self.root.after(
            0,
            lambda l=label, m=model, sp=system_p, up=user_p, t=temp: self._record_llm_prompt(
                l, m, sp, up, t
            ),
        )

    def _record_llm_prompt(
        self, label: str, model: str, system_p: str, user_p: str, temp: float
    ) -> None:
        stage = self._map_trace_label_to_stage(label)
        self._prompt_history.setdefault(stage, []).append(
            {
                "call_label": label,
                "model": model,
                "temperature": temp,
                "system": system_p or "",
                "user": user_p or "",
            }
        )

    def _open_prompt_popup(self, stage: str) -> None:
        if not _TKINTER_AVAILABLE or messagebox is None:
            return
        hist = self._prompt_history.get(stage, [])
        if not hist:
            messagebox.showinfo(
                "Prompt trace",
                f"No LLM calls recorded for “{stage}” yet.\n\n"
                "Run a generation first. Each Gemini attempt (including retries) is logged here.",
                parent=self.root,
            )
            return

        win = tk.Toplevel(self.root)
        win.title(f"LLM prompts — {stage}")
        win.geometry("920x720")

        top = ttk.Frame(win, padding=8)
        top.pack(fill=tk.X)
        ttk.Label(top, text="Call:").pack(side=tk.LEFT)
        options = [
            f"{i + 1}. {h['call_label']} — {h['model']} (T={h['temperature']})"
            for i, h in enumerate(hist)
        ]
        var = tk.StringVar(value=options[-1])
        cb = ttk.Combobox(top, textvariable=var, values=options, width=72, state="readonly")
        cb.pack(side=tk.LEFT, padx=6, fill=tk.X, expand=True)

        nb = ttk.Notebook(win)
        nb.pack(fill=tk.BOTH, expand=True, padx=8, pady=4)
        sys_fr = ttk.Frame(nb)
        usr_fr = ttk.Frame(nb)
        nb.add(sys_fr, text="System instruction (Gemini)")
        nb.add(usr_fr, text="User content")
        stw = scrolledtext.ScrolledText(sys_fr, wrap=tk.WORD, font=("Consolas", 9))
        stw.pack(fill=tk.BOTH, expand=True)
        usw = scrolledtext.ScrolledText(usr_fr, wrap=tk.WORD, font=("Consolas", 9))
        usw.pack(fill=tk.BOTH, expand=True)

        def show_idx(idx: int) -> None:
            h = hist[idx]
            stw.configure(state=tk.NORMAL)
            stw.delete("1.0", tk.END)
            stw.insert(tk.END, h["system"])
            stw.configure(state=tk.DISABLED)
            usw.configure(state=tk.NORMAL)
            usw.delete("1.0", tk.END)
            usw.insert(tk.END, h["user"])
            usw.configure(state=tk.DISABLED)

        def on_pick(_evt: Any = None) -> None:
            sel = var.get()
            for i, opt in enumerate(options):
                if opt == sel:
                    show_idx(i)
                    return

        cb.bind("<<ComboboxSelected>>", on_pick)
        show_idx(len(hist) - 1)

        ttk.Button(win, text="Close", command=win.destroy).pack(pady=6)

    @staticmethod
    def _normalize_stage(stage: str) -> str:
        """Map internal stage names onto UI rows."""
        if stage == "KaTeX Fixer":
            return "KaTeX Validator"
        if stage == "Tag Labeler Station":
            return "Classifier Station"
        return stage

    def update_stage_status(self, stage: str, status: str):
        """Update the status indicator circle"""
        canvas = self.stage_widgets[f"{stage}_status"]
        canvas.delete("all")
        
        colors = {
            "pending": "gray",
            "running": "orange",
            "success": "green",
            "error": "red"
        }
        color = colors.get(status, "gray")
        canvas.create_oval(5, 5, 15, 15, fill=color, outline="black", width=1)
    
    def update_stage_info(self, stage: str, info: str):
        """Update the stage info label"""
        self.stage_widgets[f"{stage}_info"].config(text=info, foreground="black")
    
    def append_stage_output(self, stage: str, text: str):
        """Append text to stage output"""
        output = self.stage_widgets[f"{stage}_output"]
        output.config(state=tk.NORMAL)
        output.insert(tk.END, text + "\n")
        output.see(tk.END)
        output.config(state=tk.DISABLED)
        self.root.update_idletasks()
    
    def clear_stage_output(self, stage: str):
        """Clear stage output"""
        output = self.stage_widgets[f"{stage}_output"]
        output.config(state=tk.NORMAL)
        output.delete(1.0, tk.END)
        output.config(state=tk.DISABLED)
    
    def clear_all_results(self):
        """Clear all result tabs"""
        self.result_text.config(state=tk.NORMAL)
        self.result_text.delete(1.0, tk.END)
        self.result_text.config(state=tk.DISABLED)
        self.solution_text.config(state=tk.NORMAL)
        self.solution_text.delete(1.0, tk.END)
        self.solution_text.config(state=tk.DISABLED)
        self.details_text.config(state=tk.NORMAL)
        self.details_text.delete(1.0, tk.END)
        self.details_text.config(state=tk.DISABLED)
    
    def format_json(self, data: Any) -> str:
        """Format pipeline output for display (JSON)."""
        try:
            return prompt_json_dumps(data)
        except Exception:
            return str(data)
    
    def start_generation(self):
        """Start the generation process in a separate thread"""
        if self.running:
            return
        
        self.running = True
        self.start_button.config(state=tk.DISABLED)
        self.status_label.config(text="Running...", foreground="orange")
        self._console("Generate clicked — pipeline thread starting (keep this terminal visible).")
        
        self._prompt_history = {s: [] for s in self.PIPELINE_STAGES}

        # Clear all outputs
        for stage in self.PIPELINE_STAGES:
            self.update_stage_status(stage, "pending")
            self.update_stage_info(stage, "Waiting...")
            self.clear_stage_output(stage)
        
        # Clear all result tabs
        self.clear_all_results()
        
        # Run in separate thread
        thread = threading.Thread(target=self.run_pipeline, daemon=True)
        thread.start()
    
    def run_pipeline(self):
        """Run the pipeline with GUI callbacks"""
        callbacks = {
            "on_schema_selected": self.on_schema_selected,
            "on_stage_start": self.on_stage_start,
            "on_stage_progress": self.on_stage_progress,
            "on_stage_complete": self.on_stage_complete,
            "on_stage_error": self.on_stage_error,
            "on_success": self.on_success,
            "on_llm_prompt": self._on_llm_prompt_from_worker,
        }
        
        try:
            self._console("Calling run_once() … (first Gemini call can take 30–120+ seconds.)")
            result = run_once(self.base_dir, self.cfg, self.models, callbacks=callbacks)
            self._console(f"run_once() finished: status={result.get('status', 'unknown')!r}")
            status = result.get('status', 'unknown')
            if status == 'accepted':
                item_id = result.get('item_id', 'N/A')
                item = result.get('item')  # Get the item if available
                if item:
                    # on_success callback should have already been called, but ensure GUI updates
                    pass
                self.root.after(0, lambda: self.status_label.config(
                    text=f"Success! Question ID: {item_id}", 
                    foreground="green"
                ))
            else:
                self.root.after(0, lambda status=status: self.status_label.config(
                    text=f"Failed: {status}", 
                    foreground="red"
                ))
                # Show error in result area
                error_result = json.dumps(result, indent=2)
                def update():
                    self.result_text.config(state=tk.NORMAL)
                    self.result_text.delete(1.0, tk.END)
                    self.result_text.insert(1.0, f"Generation failed with status: {status}\n\nResult: {error_result}")
                    self.result_text.config(state=tk.DISABLED)
                self.root.after(0, update)
        except SystemExit as e:
            import traceback
            error_msg = str(e) or "SystemExit"
            tb = traceback.format_exc()
            self._console(f"SystemExit: {error_msg}")
            self._console(tb)

            def show_exit():
                self.status_label.config(text=f"Stopped: {error_msg[:70]}", foreground="red")
                self.result_text.config(state=tk.NORMAL)
                self.result_text.delete(1.0, tk.END)
                self.result_text.insert(1.0, f"{error_msg}\n\n{tb}")
                self.result_text.config(state=tk.DISABLED)

            self.root.after(0, show_exit)
        except Exception as e:
            import traceback
            error_msg = f"Exception: {str(e)}\n\n{traceback.format_exc()}"
            error_short = str(e)[:50]
            self._console(error_msg)
            self.root.after(0, lambda: (
                self.status_label.config(text=f"Error: {error_short}...", foreground="red"),
                self.result_text.config(state=tk.NORMAL),
                self.result_text.delete(1.0, tk.END),
                self.result_text.insert(1.0, error_msg),
                self.result_text.config(state=tk.DISABLED)
            ))
        finally:
            def update():
                self.start_button.config(state=tk.NORMAL)
            self.root.after(0, update)
            self.running = False
            self._console("Pipeline thread finished; button re-enabled.")
    
    def on_schema_selected(self, schema_id: str, difficulty: str):
        """Callback when schema is selected"""
        self._console(f"Schema: {schema_id} ({difficulty})")
        def update():
            self.status_label.config(
                text=f"Selected: {schema_id} ({difficulty})", foreground="blue"
            )
        self.root.after(0, update)
    
    def on_stage_start(self, stage: str, info: str):
        """Callback when a stage starts"""
        row = self._normalize_stage(stage)
        self._console(f"→ {stage} (row {row}): {info[:160]}")
        def update():
            try:
                self.update_stage_status(row, "running")
                self.update_stage_info(row, info)
                self.append_stage_output(row, f"[{datetime.datetime.now().strftime('%H:%M:%S')}] Starting: {info}")
            except KeyError:
                self._console(f"KEYERROR: no UI row for {stage!r} → {row!r}")
        self.root.after(0, update)
    
    def on_stage_progress(self, stage: str, progress: str):
        """Callback for stage progress updates"""
        row = self._normalize_stage(stage)
        self._console(f"… {stage}: {progress[:120]}")
        def update():
            try:
                self.update_stage_info(row, progress)
                self.append_stage_output(row, f"[{datetime.datetime.now().strftime('%H:%M:%S')}] {progress}")
            except KeyError:
                self._console(f"KEYERROR progress: {stage!r}")
        self.root.after(0, update)
    
    def on_stage_complete(self, stage: str, data: Any):
        """Callback when a stage completes"""
        row = self._normalize_stage(stage)
        self._console(f"✓ {stage} complete")
        def update():
            try:
                self.update_stage_status(row, "success")
                self.update_stage_info(row, "Complete")
                self.append_stage_output(row, f"[{datetime.datetime.now().strftime('%H:%M:%S')}] Completed successfully\n")
                self.append_stage_output(row, "Output:\n" + self.format_json(data))
            except KeyError:
                self._console(f"KEYERROR complete: {stage!r}")
        self.root.after(0, update)
    
    def on_stage_error(self, stage: str, error: str):
        """Callback when a stage encounters an error"""
        row = self._normalize_stage(stage)
        self._console(f"✗ {stage} ERROR: {error[:500]}")
        def update():
            try:
                self.update_stage_status(row, "error")
                self.update_stage_info(row, f"Error: {error[:50]}...")
                self.append_stage_output(row, f"[{datetime.datetime.now().strftime('%H:%M:%S')}] ERROR: {error}")
            except KeyError:
                self._console(f"KEYERROR: {stage!r}")
        self.root.after(0, update)
    
    def on_success(self, item: Dict[str, Any]):
        """Callback when question is successfully generated"""
        self._console(f"on_success: id={item.get('id', 'N/A')!r} schema={item.get('schema_id', '')!r}")
        question = item.get("question_package", {}).get("question", {})
        solution = item.get("question_package", {}).get("solution", {})
        stem = question.get("stem", "N/A") if isinstance(question, dict) else "N/A"
        options = question.get("options", {}) if isinstance(question, dict) else {}
        correct = question.get("correct_option", "N/A") if isinstance(question, dict) else "N/A"
        distractor_map = item.get("question_package", {}).get("distractor_map", {})
        option_pairs = _gui_option_like_pairs(options)
        distractor_pairs = _gui_option_like_pairs(distractor_map)
        
        # Question tab content
        question_text = f"QUESTION:\n{'='*60}\n\n{stem}\n\n"
        question_text += "OPTIONS:\n" + "="*60 + "\n"
        for opt, text in sorted(option_pairs, key=lambda p: p[0]):
            try:
                marker = " ✓ [CORRECT]" if str(opt) == str(correct) else ""
            except UnicodeEncodeError:
                marker = " [CORRECT]" if str(opt) == str(correct) else ""
            question_text += f"\n{opt}: {text}{marker}"
        question_text += f"\n\n{'='*60}\nCorrect Answer: {correct}\n"
        
        # Solution tab content
        solution_text = "SOLUTION:\n" + "="*60 + "\n\n"
        if isinstance(solution, dict):
            if solution.get("reasoning"):
                solution_text += "REASONING:\n" + "-"*60 + "\n"
                solution_text += solution.get("reasoning", "N/A") + "\n\n"
            if solution.get("key_insight"):
                solution_text += "KEY INSIGHT:\n" + "-"*60 + "\n"
                solution_text += solution.get("key_insight", "N/A") + "\n"
        elif solution:
            solution_text += "(non-dict solution payload)\n" + str(solution) + "\n"
        
        # Details tab content
        details_text = f"Question ID: {item.get('id', 'N/A')}\n"
        details_text += f"Schema: {item.get('schema_id', 'N/A')}\n"
        details_text += f"Difficulty: {item.get('difficulty', 'N/A')}\n"
        details_text += f"Attempts: {item.get('attempts', 'N/A')}\n"
        details_text += f"Created: {item.get('created_at', 'N/A')}\n\n"
        details_text += "="*60 + "\n\n"
        details_text += "DISTRACTOR ANALYSIS:\n" + "-"*60 + "\n"
        for opt, desc in sorted(distractor_pairs, key=lambda p: p[0]):
            marker = " [CORRECT]" if str(opt) == str(correct) else ""
            details_text += f"\n{opt}: {desc}{marker}\n"
        details_text += "\n" + "="*60 + "\n\n"
        details_text += "VERIFIER REPORT:\n" + "-"*60 + "\n"
        verifier = item.get("verifier_report", {})
        details_text += f"Verdict: {verifier.get('verdict', 'N/A')}\n"
        details_text += f"Confidence: {verifier.get('confidence', 'N/A')}\n"
        if verifier.get("notes"):
            details_text += "\nNotes:\n"
            for note in verifier.get("notes", []):
                details_text += f"  • {note}\n"
        details_text += "\n" + "="*60 + "\n\n"
        details_text += "STYLE REPORT:\n" + "-"*60 + "\n"
        style = item.get("style_report", {})
        details_text += f"Verdict: {style.get('verdict', 'N/A')}\n"
        score_pairs = _gui_style_scores_pairs(style.get("scores")) if isinstance(style, dict) else []
        if score_pairs:
            details_text += "\nScores:\n"
            for key, val in score_pairs:
                details_text += f"  {key}: {val}/10\n"
        if style.get("summary"):
            details_text += f"\nSummary: {style.get('summary')}\n"
        
        def update():
            # Update question tab
            self.result_text.config(state=tk.NORMAL)
            self.result_text.delete(1.0, tk.END)
            self.result_text.insert(1.0, question_text)
            self.result_text.config(state=tk.DISABLED)
            
            # Update solution tab
            self.solution_text.config(state=tk.NORMAL)
            self.solution_text.delete(1.0, tk.END)
            self.solution_text.insert(1.0, solution_text)
            self.solution_text.config(state=tk.DISABLED)
            
            # Update details tab
            self.details_text.config(state=tk.NORMAL)
            self.details_text.delete(1.0, tk.END)
            self.details_text.insert(1.0, details_text)
            self.details_text.config(state=tk.DISABLED)
        self.root.after(0, update)


def run_gui():
    """Run the GUI interface"""
    if not _TKINTER_AVAILABLE:
        print("Tkinter not available. Falling back to command-line mode.")
        main()
        return
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    qgen_root = os.path.dirname(base_dir)
    project_root = os.path.dirname(qgen_root)
    for env_path in (
        os.path.join(project_root, ".env.local"),
        os.path.join(base_dir, ".env.local"),
        ".env.local",
    ):
        if os.path.isfile(env_path):
            safe_load_dotenv(env_path)
            print(f"[ESAT Pipeline GUI] Loaded env: {env_path}", flush=True)
            break
    else:
        safe_load_dotenv(".env.local")

    project, location = _vertex_env_config()
    key_ok = bool(project and location)
    print(
        f"[ESAT Pipeline GUI] Vertex config: {'set' if key_ok else 'MISSING — set GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION in .env.local'}",
        flush=True,
    )

    # Subjects for this one-shot GUI: env SCHEMA_PREFIXES e.g. M or M,P,B,C (default M)
    _valid = {"M", "P", "B", "C"}
    _raw = os.environ.get("SCHEMA_PREFIXES", "M")
    gui_prefixes = tuple(
        p.strip().upper() for p in _raw.split(",") if p.strip() and p.strip().upper() in _valid
    )
    if not gui_prefixes:
        gui_prefixes = ("M", "P", "B", "C")
    print(f"[ESAT Pipeline GUI] Schema prefixes (random draw): {gui_prefixes}", flush=True)

    cfg = RunConfig(
        max_implementer_retries=int(os.environ.get("MAX_IMPLEMENTER_RETRIES", "2")),
        max_designer_retries=int(os.environ.get("MAX_DESIGNER_RETRIES", "2")),
        seed=None,
        difficulty_weights=difficulty_weights_from_env(),
        schema_weights=None,
        out_dir=os.environ.get("OUT_DIR", "runs"),
        allow_schema_prefixes=gui_prefixes,
    )
    
    models = get_default_models_config()
    # Override style_judge for this specific function if needed
    if os.environ.get("MODEL_STYLE"):
        models.style_judge = os.environ.get("MODEL_STYLE")
    
    root = tk.Tk()
    app = PipelineGUI(root, base_dir, cfg, models)
    root.mainloop()


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "--gui":
        run_gui()
    else:
        main()
