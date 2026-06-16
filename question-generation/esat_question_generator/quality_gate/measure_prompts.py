#!/usr/bin/env python3
"""Print Quality Gate prompt file sizes and estimated input tokens per question."""

from __future__ import annotations

import json
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

_QG = Path(__file__).resolve().parent


def _est_tokens(chars: int) -> int:
    return max(1, chars // 4)


def _size(path: Path) -> dict:
    if not path.is_file():
        return {"path": str(path), "chars": 0, "est_tokens": 0, "missing": True}
    text = path.read_text(encoding="utf-8")
    return {"path": str(path.name), "chars": len(text), "est_tokens": _est_tokens(len(text))}


def main() -> int:
    from dotenv import load_dotenv

    load_dotenv(_ROOT.parent.parent / ".env.local")
    load_dotenv(_ROOT / ".env.local")

    from quality_gate.assess import build_assessment_system_user_prompts, load_rubric_markdown
    from quality_gate.defaults import use_full_rubric
    from quality_gate.supabase_io import fetch_cohort_page, get_supabase
    from quality_gate.schemas import CohortFilters
    from project import load_prompts

    print("=== Quality Gate prompt files ===\n")
    files = [
        _QG / "prompt.md",
        _QG / "prompt_compact.md",
        _QG / "prompt_svg_diagram.md",
        _QG / "prompt_image_brief.md",
        _QG / "prompt_image_verify.md",
        _QG / "prompt_image_integrate.md",
        _QG / "prompt_image_retry.md",
    ]
    for p in files:
        s = _size(p)
        print(f"  {s['path']}: {s['chars']:,} chars (~{s['est_tokens']:,} tokens)")

  # Tag relabel uses legacy Tag_Labeler from by_subject_prompts
    tag_len = 0
    try:
        prompts = load_prompts(str(_ROOT))
        tag = getattr(prompts, "classifier", "") or getattr(prompts, "tag_labeler_math1", "") or ""
        tag_len = len(tag or "")
        print(f"  Tag_Labeler.md (classifier): {tag_len:,} chars (~{_est_tokens(tag_len):,} tokens)")
    except Exception as e:
        print(f"  Tag_Labeler.md: (could not load: {e})")

    rubric_mode = "full prompt.md" if use_full_rubric() else "compact prompt_compact.md (default)"
    rubric = load_rubric_markdown()
    print(f"\nActive rubric: {rubric_mode} — {len(rubric):,} chars (~{_est_tokens(len(rubric)):,} tokens)")

    print("\n=== Per-question scoring (assess_question) ===\n")
    try:
        client = get_supabase()
        rows = fetch_cohort_page(
            client, filters=CohortFilters(test_type="ESAT", only_unassessed=True), limit=5, offset=0
        )
    except Exception as e:
        print(f"  (no DB sample: {e})")
        rows = []

    if rows:
        sys_chars = []
        usr_chars = []
        for row in rows[:5]:
            sys_p, usr_p = build_assessment_system_user_prompts(row)
            sys_chars.append(len(sys_p))
            usr_chars.append(len(usr_p))
        avg_sys = sum(sys_chars) // len(sys_chars)
        avg_usr = sum(usr_chars) // len(usr_chars)
        print(f"  Sample n={len(sys_chars)} unassessed ESAT rows:")
        print(f"    system (preamble + rubric): ~{avg_sys:,} chars (~{_est_tokens(avg_sys):,} tokens)")
        print(f"    user (question JSON):       ~{avg_usr:,} chars (~{_est_tokens(avg_usr):,} tokens)")
        print(f"    total input per score:      ~{avg_sys + avg_usr:,} chars (~{_est_tokens(avg_sys + avg_usr):,} tokens)")
        print(f"    + tag relabel (if bad tags): +1 call, ~{_est_tokens(tag_len):,} system tokens + question package")
    else:
        preamble = (
            "You are an expert ESAT item reviewer. Follow the rubric exactly. "
            "The question is a standalone exam item — do NOT use or infer any generation schema; "
            "judge only the stem, options, solution, tags, and official curriculum snapshot. "
        )
        est_sys = len(preamble) + len(rubric) + 800
        print(f"  Estimated system: ~{est_sys:,} chars (~{_est_tokens(est_sys):,} tokens)")
        print(f"  Typical user payload: ~3,500–5,500 chars (~900–1,400 tokens)")

    print("\n=== Vertex limit context (gemini-2.5-flash, Standard PayGo) ===\n")
    print("  Documented org baseline (Tier 1): ~2,000,000 input TPM for Flash family.")
    print("  429 'Resource exhausted' = shared pool contention / burst, not a fixed daily cap.")
    print("  At ~3,000 input tokens/question and 8s spacing: ~22 questions/min → ~66k TPM (usually fine).")
    print("  Retries (5×) on 429 multiply load — pacing env vars reduce this.\n")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
