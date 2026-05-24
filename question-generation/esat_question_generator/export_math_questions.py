#!/usr/bin/env python3
"""
Export ESAT math question stems from Supabase to a single text or JSONL file.

Filters rows where ``subjects`` is ``Math 1`` or ``Math 2`` (non-deleted by default).

Usage (from ``esat_question_generator/``):

  python export_math_questions.py
  python export_math_questions.py -o math_stems.txt
  python export_math_questions.py --format jsonl -o math_stems.jsonl
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
SELECT_COLS = "question_stem"


def fetch_math_stems(
    client: Any,
    *,
    include_deleted: bool,
    page_size: int = 500,
) -> List[str]:
    out: List[str] = []
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
        for row in batch:
            stem = str(row.get("question_stem") or "").strip()
            if stem:
                out.append(stem)
        if len(batch) < ps:
            break
        offset += ps
    return out


def write_txt(stems: List[str], path: Path) -> None:
    path.write_text("\n\n---\n\n".join(stems) + ("\n" if stems else ""), encoding="utf-8")


def write_jsonl(stems: List[str], path: Path) -> None:
    lines = [json.dumps({"question_stem": s}, ensure_ascii=False) for s in stems]
    path.write_text(("\n".join(lines) + "\n") if lines else "", encoding="utf-8")


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Export ESAT math question stems to one file.")
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
    stems = fetch_math_stems(
        client,
        include_deleted=bool(ns.include_deleted),
        page_size=max(50, int(ns.page_size)),
    )

    out = Path(ns.output).resolve()
    if ns.format == "jsonl" and out.suffix.lower() != ".jsonl":
        out = out.with_suffix(".jsonl")
    elif ns.format == "txt" and out.suffix.lower() not in (".txt", ".md") and not out.suffix:
        out = out.with_suffix(".txt")

    out.parent.mkdir(parents=True, exist_ok=True)
    if ns.format == "jsonl":
        write_jsonl(stems, out)
    else:
        write_txt(stems, out)

    size_kb = out.stat().st_size / 1024
    print(f"Wrote {len(stems)} math stem(s) to {out} ({size_kb:.1f} KB, format={ns.format})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
