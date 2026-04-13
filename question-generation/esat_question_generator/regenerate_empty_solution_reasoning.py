#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Regenerate ``solution_reasoning`` (and optionally refresh key insight / distractor text)
for Supabase rows where it is missing, using Gemini — same JSON contract as
``batch_process_questions`` (``batch_process_utils``).

Usage (from ``esat_question_generator/``):

  python regenerate_empty_solution_reasoning.py              # count only, no API
  python regenerate_empty_solution_reasoning.py --apply      # regenerate + write
  python regenerate_empty_solution_reasoning.py --apply --limit 10
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except AttributeError:
        pass

sys.path.insert(0, str(Path(__file__).resolve().parent))


def _load_env(base_dir: Path) -> None:
    try:
        from dotenv import load_dotenv
    except ImportError:
        return
    for p in (base_dir / ".env.local", base_dir / ".env", base_dir.parent.parent / ".env.local"):
        if p.is_file():
            load_dotenv(p)
            break


def _options_as_dict(options: Any) -> Dict[str, Any]:
    if isinstance(options, dict):
        return options
    if isinstance(options, list):
        letters = "ABCDEFGH"
        return {letters[i]: options[i] for i in range(min(len(options), 8))}
    return {}


def _row_needs_reasoning(row: Dict[str, Any]) -> bool:
    sr = row.get("solution_reasoning")
    return sr is None or not str(sr).strip()


def _iter_empty_reasoning(client: Any, page_size: int = 500) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    offset = 0
    while True:
        res = (
            client.table("ai_generated_questions")
            .select(
                "id,generation_id,schema_id,question_stem,options,correct_option,"
                "solution_reasoning,solution_key_insight,distractor_map"
            )
            .range(offset, offset + page_size - 1)
            .execute()
        )
        batch = res.data or []
        if not batch:
            break
        for row in batch:
            if _row_needs_reasoning(row):
                out.append(row)
        if len(batch) < page_size:
            break
        offset += page_size
    return out


SYSTEM_PROMPT = """You write worked solutions for ESAT-style multiple-choice questions (math and science).

Return ONLY a single JSON object. No markdown code fences. No text before or after.

Required output keys:
- "key_insight_hint": 1–2 sentences; a hint that helps a stuck student start, without naming the correct option or giving the final numeric answer.
- "solution_reasoning_katex": **full worked solution** — show the main steps (equations, substitutions, balances, case splits) that **lead to** the correct option. **Forbidden**: answer-only text such as just stating the final value or letter with no derivation. A reader must see *how* you reached the answer.
- "distractor_map": object with the SAME keys as input options (e.g. A,B,C,...); each value is a short string. For the correct option key, say it is the correct answer; for wrong options, name the typical mistake.

KaTeX / JSON rules (critical):
- Inline math: $...$ only. Display: $$...$$ only.
- In JSON strings, every LaTeX backslash must be doubled: \\\\frac not \\frac.
- Each $$...$$ block must have a blank line before and after inside the string.
"""


def _build_user_prompt(q: Dict[str, Any]) -> tuple[Dict[str, Any], List[str]]:
    opts = _options_as_dict(q.get("options"))
    input_data = {
        "stem": q.get("question_stem") or "",
        "options": opts,
        "correct_option": (q.get("correct_option") or "").strip().upper()[:1],
        "solution_reasoning_raw": (q.get("solution_reasoning") or "").strip(),
        "key_insight_raw": (q.get("solution_key_insight") or "").strip(),
        "distractor_map_raw": q.get("distractor_map") if isinstance(q.get("distractor_map"), dict) else {},
    }
    if not input_data["stem"].strip():
        raise ValueError("empty stem")
    if not opts:
        raise ValueError("empty options")
    co = input_data["correct_option"]
    if not co or co not in opts:
        raise ValueError(f"invalid correct_option {co!r}")
    extra = ""
    if not input_data["solution_reasoning_raw"]:
        extra = (
            "\n\nThe field solution_reasoning_raw is empty. "
            "You must solve the question from the stem and options and write solution_reasoning_katex yourself. "
            "The correct_option given is authoritative — your solution must conclude with that letter."
        )
    user = f"""Input (JSON):
{json.dumps(input_data, indent=2, ensure_ascii=False)}
{extra}

Return ONLY valid JSON with keys: key_insight_hint, solution_reasoning_katex, distractor_map
(distractor_map must include every option key: {sorted(opts.keys())})."""
    return input_data, sorted(opts.keys())


def _validate_relaxed(
    output: Dict[str, Any],
    expected_option_keys: List[str],
    skip_katex: bool = False,
) -> tuple[bool, List[str]]:
    """Enough checks to safely store: reasoning non-empty, optional KaTeX lint, distractor keys present."""
    errors: List[str] = []
    reasoning = output.get("solution_reasoning_katex", "")
    if not str(reasoning).strip():
        errors.append("empty solution_reasoning_katex")
    elif not skip_katex:
        from katex_validator import validate_katex_formatting

        ok, ke = validate_katex_formatting(reasoning, skip_render_test=True)
        if not ok:
            errors.extend(ke)
    dm = output.get("distractor_map", {})
    if not isinstance(dm, dict):
        errors.append("distractor_map not a dict")
    else:
        for k in expected_option_keys:
            if k not in dm:
                errors.append(f"missing distractor key {k}")
    return len(errors) == 0, errors


def _one_question(
    llm: Any,
    model: str,
    q: Dict[str, Any],
    max_json_retries: int = 2,
    strict_validate: bool = False,
    skip_katex: bool = False,
) -> Optional[Dict[str, Any]]:
    from batch_process_utils import (
        parse_rewriter_output,
        validate_rewriter_output,
        normalize_rewriter_output,
        map_rewriter_output_to_db,
    )

    input_data, expected_keys = _build_user_prompt(q)
    expected_option_keys = list(input_data["options"].keys())
    last_err: Optional[str] = None
    for attempt in range(max_json_retries + 1):
        retry_note = (
            f"\n\nPrevious attempt failed: {last_err}\nFix JSON escaping (double backslashes) and required keys.\n"
            if last_err
            else ""
        )
        user_prompt = f"""Input (JSON):
{json.dumps(input_data, indent=2, ensure_ascii=False)}
{retry_note}
Return ONLY valid JSON with keys: key_insight_hint, solution_reasoning_katex, distractor_map
CRITICAL: distractor_map keys must be exactly: {expected_keys}"""
        text = llm.generate(
            model=model,
            system_prompt=SYSTEM_PROMPT,
            user_prompt=user_prompt,
            temperature=0.35 if attempt == 0 else 0.2,
        )
        try:
            output = parse_rewriter_output(text, expected_option_keys)
        except (ValueError, json.JSONDecodeError) as e:
            last_err = str(e)[:400]
            continue
        if strict_validate:
            ok, errs = validate_rewriter_output(output, q)
        else:
            ok, errs = _validate_relaxed(output, expected_option_keys, skip_katex=skip_katex)
        if not ok:
            last_err = "; ".join(errs)[:400]
            continue
        out = normalize_rewriter_output(output)
        return map_rewriter_output_to_db(out)
    return None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Write updates to Supabase.")
    parser.add_argument("--limit", type=int, default=0, help="Max questions to process (0 = all).")
    parser.add_argument(
        "--delay",
        type=float,
        default=0.4,
        help="Seconds between API calls (rate pacing).",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Use full batch rewriter validation (distractor non-empty, key_insight KaTeX).",
    )
    parser.add_argument(
        "--skip-katex",
        action="store_true",
        help="Accept model output if JSON parses and distractor keys exist (no KaTeX lint).",
    )
    args = parser.parse_args()
    base_dir = Path(__file__).resolve().parent
    _load_env(base_dir)
    os.chdir(base_dir)

    from db_sync import DatabaseSync, normalize_question_math_spacing
    from project import LLMClient, get_default_models_config

    sync = DatabaseSync()
    if not sync.enabled or not sync.client:
        print("Supabase not configured.", file=sys.stderr, flush=True)
        return 1

    rows = _iter_empty_reasoning(sync.client)
    if args.limit > 0:
        rows = rows[: args.limit]
    print(f"Rows with empty solution_reasoning: {len(rows)} (processing {len(rows)}).", flush=True)

    if not args.apply:
        for row in rows:
            print(f"  {row.get('generation_id')}", flush=True)
        print(
            f"Listed {len(rows)} row(s). Run with --apply to call Gemini and update Supabase.",
            flush=True,
        )
        return 0

    cloud_project = (os.environ.get("GOOGLE_CLOUD_PROJECT") or "").strip()
    cloud_location = (os.environ.get("GOOGLE_CLOUD_LOCATION") or "").strip()
    if not cloud_project or not cloud_location:
        print("GOOGLE_CLOUD_PROJECT/GOOGLE_CLOUD_LOCATION missing.", file=sys.stderr, flush=True)
        return 1

    models = get_default_models_config()
    llm = LLMClient(api_key="")
    model = models.implementer

    ok_n = 0
    fail_n = 0
    for i, row in enumerate(rows):
        gid = row.get("generation_id", "")
        try:
            patch = _one_question(
                llm,
                model,
                row,
                strict_validate=args.strict,
                skip_katex=args.skip_katex,
            )
        except Exception as e:
            print(f"[skip] {gid}: {e}", flush=True)
            fail_n += 1
            continue
        if not patch or not (patch.get("solution_reasoning") or "").strip():
            print(f"[fail] {gid}: no patch from model", flush=True)
            fail_n += 1
            continue
        patch = normalize_question_math_spacing(
            {k: v for k, v in patch.items() if k in ("solution_reasoning", "solution_key_insight", "distractor_map")}
        )
        print(f"[ok] {gid} reasoning_len={len(patch.get('solution_reasoning') or '')}", flush=True)
        sync.client.table("ai_generated_questions").update(patch).eq("generation_id", gid).execute()
        ok_n += 1
        if args.delay > 0 and i + 1 < len(rows):
            time.sleep(args.delay)

    print(f"Done. {ok_n} updated, {fail_n} failed/skipped.", flush=True)
    return 0 if fail_n == 0 or ok_n > 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
