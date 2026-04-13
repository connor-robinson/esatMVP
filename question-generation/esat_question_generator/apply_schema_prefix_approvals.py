#!/usr/bin/env python3
"""
Apply approved schema prefix rewrites to schemas/Schemas_ESAT.md.

  python apply_schema_prefix_approvals.py path/to/schema_prefix_full_approved.json
  python apply_schema_prefix_approvals.py approvals.json --dry-run
  python apply_schema_prefix_approvals.py approvals.json --schemas custom/Schemas_ESAT.md

Expects JSON from schema_prefix_review_ui export:
  { "source_jsonl": "...", "approvals": [ { schema_id, new_schema_id, original_block_markdown, final_block_markdown, ... }, ... ] }

Replacement: exact substring replace of original_block_markdown -> final_block_markdown (once per id).
If original_block_markdown is missing/empty, uses the current block from parsed Schemas_ESAT.md for that schema_id.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

_BASE = Path(__file__).resolve().parent
if str(_BASE) not in sys.path:
    sys.path.insert(0, str(_BASE))


def main() -> int:
    p = argparse.ArgumentParser(description="Apply schema prefix approvals to Schemas_ESAT.md")
    p.add_argument("approvals_json", type=Path, help="*_approved.json from review UI")
    p.add_argument(
        "--schemas",
        type=Path,
        default=None,
        help="Schemas_ESAT.md path (default: esat_question_generator/schemas/Schemas_ESAT.md)",
    )
    p.add_argument("--dry-run", action="store_true", help="Print actions only; do not write")
    args = p.parse_args()

    if not args.approvals_json.is_file():
        print(f"Not found: {args.approvals_json}", file=sys.stderr)
        return 1

    data = json.loads(args.approvals_json.read_text(encoding="utf-8"))
    approvals = data.get("approvals") or []
    if not approvals:
        print("No approvals in file.", file=sys.stderr)
        return 1

    from project import load_schemas_esat_markdown, parse_schemas_from_markdown

    base = str(_BASE.resolve())
    schemas_path: Path
    md: str
    if args.schemas:
        schemas_path = args.schemas.resolve()
        md = schemas_path.read_text(encoding="utf-8")
    else:
        schemas_path_str, md = load_schemas_esat_markdown(base)
        schemas_path = Path(schemas_path_str)

    parsed = parse_schemas_from_markdown(md, allow_prefixes=("M", "P", "B", "C"))

    replacements: list[tuple[str, str, str]] = []
    for a in approvals:
        sid = (a.get("schema_id") or "").strip()
        final_text = a.get("final_block_markdown")
        if not sid or final_text is None:
            print(f"Skip invalid approval row: {a!r}", file=sys.stderr)
            continue
        old = (a.get("original_block_markdown") or "").strip()
        if not old and sid in parsed:
            old = parsed[sid].get("block") or ""
        if not old:
            print(f"No original block for {sid} — re-export from review UI or fix JSON.", file=sys.stderr)
            return 1
        if old not in md:
            print(
                f"Original block for {sid} not found in {schemas_path} (file changed?)",
                file=sys.stderr,
            )
            return 1
        if md.count(old) != 1:
            print(f"Ambiguous: original block for {sid} appears {md.count(old)} times.", file=sys.stderr)
            return 1
        replacements.append((sid, old, str(final_text)))

    for sid, old, new in replacements:
        if old == new:
            print(f"[skip identical] {sid}")
            continue
        print(f"[apply] {sid} ({len(old)} -> {len(new)} chars)")
        if not args.dry_run:
            md = md.replace(old, new, 1)

    if args.dry_run:
        print(f"Dry run: would write {len(replacements)} replacement(s) to {schemas_path}")
        return 0

    schemas_path.write_text(md, encoding="utf-8")
    print(f"Wrote {schemas_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
