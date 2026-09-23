#!/usr/bin/env python3
"""
Backfill ``primary_tag`` / ``secondary_tags`` on ESAT ``ai_generated_questions`` rows to
prefixed curriculum codes (``M1-M4``, ``P-P3``, ``biology-B2``, …).

Fixes legacy bare labeler digits (``1``–``7``) and ``Subject - Topic title`` display strings.

  python normalize_primary_tags_backfill.py              # dry-run (default)
  python normalize_primary_tags_backfill.py --apply
  python normalize_primary_tags_backfill.py --apply --limit 50

Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see repo ``.env.local``).
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

_BASE = Path(__file__).resolve().parent
if str(_BASE) not in sys.path:
    sys.path.insert(0, str(_BASE))

from curriculum_parser import (  # noqa: E402
    CurriculumParser,
    canonicalize_esat_tag,
    canonicalize_esat_tags_list,
)


def _load_env() -> None:
    for p in (_BASE.parent.parent / ".env.local", _BASE / ".env.local"):
        if p.is_file():
            try:
                from dotenv import load_dotenv

                load_dotenv(p)
            except ImportError:
                pass
            break


def _get_client():
    try:
        from supabase import create_client
    except ImportError:
        print("Install supabase: pip install supabase", file=sys.stderr)
        return None

    _load_env()
    url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY", file=sys.stderr)
        return None
    return create_client(url, key)


def _parse_secondary(raw: Any) -> List[str]:
    if raw is None:
        return []
    if isinstance(raw, list):
        return [str(x).strip() for x in raw if x is not None and str(x).strip()]
    if isinstance(raw, str) and raw.strip():
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                return [str(x).strip() for x in parsed if str(x).strip()]
        except json.JSONDecodeError:
            return [raw.strip()]
    return []


def _tag_format_bucket(tag: str) -> str:
    t = tag.strip()
    if re.fullmatch(r"[1-7]", t):
        return "bare_digit"
    if " - " in t:
        return "subject_title"
    if re.match(r"^(M1-|M2-|P-|chemistry-|biology-)", t, re.I):
        return "prefixed_code"
    return "other"


def fetch_rows(client: Any, *, limit: Optional[int]) -> List[Dict[str, Any]]:
    cols = "id, schema_id, subjects, primary_tag, secondary_tags, test_type"
    out: List[Dict[str, Any]] = []
    offset = 0
    page = 500
    while True:
        q = (
            client.table("ai_generated_questions")
            .select(cols)
            .neq("status", "deleted")
            .or_("test_type.eq.ESAT,test_type.is.null")
            .not_.is_("primary_tag", "null")
            .order("id")
            .range(offset, offset + page - 1)
        )
        resp = q.execute()
        batch = list(resp.data or [])
        if not batch:
            break
        out.extend(batch)
        if limit and len(out) >= limit:
            return out[:limit]
        if len(batch) < page:
            break
        offset += page
    return out


def build_update(row: Dict[str, Any], parser: CurriculumParser) -> Tuple[Dict[str, Any], str]:
    qid = row.get("id")
    schema_id = str(row.get("schema_id") or "")
    subjects = str(row.get("subjects") or "")
    pt_in = row.get("primary_tag")
    sec_in = _parse_secondary(row.get("secondary_tags"))

    desired_pt = canonicalize_esat_tag(
        str(pt_in) if pt_in is not None else None,
        schema_id=schema_id,
        subjects=subjects,
        parser=parser,
    )
    desired_sec = canonicalize_esat_tags_list(
        sec_in,
        schema_id=schema_id,
        subjects=subjects,
        parser=parser,
    )

    patch: Dict[str, Any] = {}
    pt_str = str(pt_in).strip() if pt_in is not None else ""
    if desired_pt and desired_pt != pt_str:
        patch["primary_tag"] = desired_pt
    if desired_sec != sec_in:
        patch["secondary_tags"] = desired_sec if desired_sec else None

    if not patch:
        return {}, "unchanged"

    parts = []
    if "primary_tag" in patch:
        parts.append(f"primary {pt_str!r} -> {patch['primary_tag']!r}")
    if "secondary_tags" in patch:
        parts.append(f"secondary {len(sec_in)} -> {len(desired_sec)}")
    return patch, "; ".join(parts)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--apply",
        action="store_true",
        help="Write updates to Supabase (default: dry-run only)",
    )
    ap.add_argument("--limit", type=int, default=None, help="Max rows to scan")
    args = ap.parse_args()

    client = _get_client()
    if client is None:
        return 1

    parser = CurriculumParser()
    rows = fetch_rows(client, limit=args.limit)
    print(f"Scanned {len(rows)} tagged ESAT rows")

    before_buckets: Counter[str] = Counter()
    would_change = 0
    samples: List[str] = []

    for row in rows:
        pt = str(row.get("primary_tag") or "").strip()
        if pt:
            before_buckets[_tag_format_bucket(pt)] += 1
        patch, msg = build_update(row, parser)
        if patch:
            would_change += 1
            if len(samples) < 20:
                samples.append(f"  {row.get('id')}: {msg}")

    print("\nCurrent primary_tag formats:")
    for k, v in before_buckets.most_common():
        print(f"  {k}: {v}")

    print(f"\nRows needing update: {would_change}")
    for line in samples:
        print(line)
    if would_change > len(samples):
        print(f"  ... and {would_change - len(samples)} more")

    if not args.apply:
        print("\nDry-run only. Re-run with --apply to write changes.")
        return 0

    applied = 0
    errors = 0
    for row in rows:
        patch, msg = build_update(row, parser)
        if not patch:
            continue
        qid = row.get("id")
        try:
            client.table("ai_generated_questions").update(patch).eq("id", qid).execute()
            applied += 1
            print(f"  [{qid}] {msg}")
        except Exception as e:
            errors += 1
            print(f"  [{qid}] ERROR: {e}", file=sys.stderr)

    print(f"\nApplied {applied} updates ({errors} errors)")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
