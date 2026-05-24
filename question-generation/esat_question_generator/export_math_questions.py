#!/usr/bin/env python3
"""
Export ESAT math questions from Supabase to a single text or JSONL file.

Filters rows where ``subjects`` is ``Math 1`` or ``Math 2`` (non-deleted by default).

Usage (from ``esat_question_generator/``):

  python export_math_questions.py
  python export_math_questions.py -o math_all.txt
  python export_math_questions.py --format jsonl -o math_all.jsonl
  python export_math_questions.py --include-deleted
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

_BASE = Path(__file__).resolve().parent
if str(_BASE) not in sys.path:
    sys.path.insert(0, str(_BASE))

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except AttributeError:
        pass

MATH_SUBJECTS = ("Math 1", "Math 2")

SELECT_COLS = (
    "id, generation_id, schema_id, subjects, difficulty, status, test_type, "
    "primary_tag, secondary_tags, question_stem, options, correct_option, "
    "solution_reasoning, solution_key_insight, distractor_map, "
    "quality_gate_verdict, quality_gate_action, created_at"
)


def fetch_math_rows(
    client: Any,
    *,
    include_deleted: bool,
    page_size: int = 500,
) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    offset = 0
    ps = max(50, min(page_size, 1000))
    while True:
        q = (
            client.table("ai_generated_questions")
            .select(SELECT_COLS)
            .in_("subjects", list(MATH_SUBJECTS))
            .order("id")
            .range(offset, offset + ps - 1)
        )
        if not include_deleted:
            q = q.neq("status", "deleted")
        resp = q.execute()
        batch = list(resp.data or [])
        if not batch:
            break
        out.extend(batch)
        if len(batch) < ps:
            break
        offset += ps
    return out


def _format_options(options: Any) -> str:
    if not isinstance(options, dict):
        return str(options or "")
    lines: List[str] = []
    for key in sorted(options.keys(), key=lambda k: str(k)):
        val = options.get(key)
        lines.append(f"  {key}: {val}")
    return "\n".join(lines)


def _format_secondary_tags(tags: Any) -> str:
    if tags is None:
        return ""
    if isinstance(tags, list):
        return ", ".join(str(t) for t in tags if t is not None and str(t).strip())
    return str(tags)


def row_to_text(row: Dict[str, Any], index: int) -> str:
    parts = [
        "=" * 80,
        f"Question {index}",
        "=" * 80,
        f"id: {row.get('id', '')}",
        f"generation_id: {row.get('generation_id', '')}",
        f"schema_id: {row.get('schema_id', '')}",
        f"subjects: {row.get('subjects', '')}",
        f"difficulty: {row.get('difficulty', '')}",
        f"status: {row.get('status', '')}",
        f"primary_tag: {row.get('primary_tag', '')}",
        f"secondary_tags: {_format_secondary_tags(row.get('secondary_tags'))}",
        f"quality_gate: {row.get('quality_gate_verdict') or '—'} / {row.get('quality_gate_action') or '—'}",
        "",
        "STEM",
        "-" * 40,
        str(row.get("question_stem") or "").strip(),
        "",
        "OPTIONS",
        "-" * 40,
        _format_options(row.get("options")),
        "",
        f"CORRECT: {row.get('correct_option', '')}",
        "",
        "SOLUTION",
        "-" * 40,
        str(row.get("solution_reasoning") or "").strip(),
    ]
    insight = (row.get("solution_key_insight") or "").strip()
    if insight:
        parts.extend(["", "KEY INSIGHT", "-" * 40, insight])
    parts.append("")
    return "\n".join(parts)


def write_txt(rows: List[Dict[str, Any]], path: Path) -> None:
    header = [
        f"ESAT math export — {len(rows)} question(s)",
        f"Subjects: {', '.join(MATH_SUBJECTS)}",
        "",
    ]
    body = [row_to_text(r, i + 1) for i, r in enumerate(rows)]
    path.write_text("\n".join(header + body), encoding="utf-8")


def write_jsonl(rows: List[Dict[str, Any]], path: Path) -> None:
    lines = [json.dumps(r, ensure_ascii=False) for r in rows]
    path.write_text(("\n".join(lines) + "\n") if lines else "", encoding="utf-8")


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Export ESAT math questions to one file.")
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=_BASE / "exports" / "math_questions.txt",
        help="Output path (default: exports/math_questions.txt)",
    )
    parser.add_argument(
        "--format",
        choices=("txt", "jsonl"),
        default="txt",
        help="Output format (default: txt)",
    )
    parser.add_argument(
        "--include-deleted",
        action="store_true",
        help="Include rows with status=deleted",
    )
    parser.add_argument(
        "--page-size",
        type=int,
        default=500,
        help="Supabase pagination size (default: 500)",
    )
    ns = parser.parse_args(argv)

    from quality_gate.runner import init_env
    from quality_gate.supabase_io import get_supabase

    init_env()
    client = get_supabase()
    rows = fetch_math_rows(
        client,
        include_deleted=bool(ns.include_deleted),
        page_size=max(50, int(ns.page_size)),
    )

    out = Path(ns.output).resolve()
    if ns.format == "jsonl" and out.suffix.lower() != ".jsonl":
        out = out.with_suffix(".jsonl")
    elif ns.format == "txt" and out.suffix.lower() not in (".txt", ".md"):
        if out.suffix:
            pass
        else:
            out = out.with_suffix(".txt")

    out.parent.mkdir(parents=True, exist_ok=True)
    if ns.format == "jsonl":
        write_jsonl(rows, out)
    else:
        write_txt(rows, out)

    size_kb = out.stat().st_size / 1024
    print(f"Wrote {len(rows)} math question(s) to {out} ({size_kb:.1f} KB, format={ns.format})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
