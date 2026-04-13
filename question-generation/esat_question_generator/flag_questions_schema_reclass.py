#!/usr/bin/env python3
"""
Flag ESAT questions when Schemas_ESAT.md / approvals moved a schema to a new subject prefix.

**Does not change** ``schema_id`` or ``subjects`` on existing rows — those stay as at generation
time (e.g. physics ``P_*``). Sets review columns so you can keep or delete the row in the app:

  ``schema_reclass_review_tier`` = ``review_needed``
  ``schema_reclass_old_id``      = same as stored ``schema_id`` (legacy id)
  ``schema_reclass_new_id``      = canonical id in Schemas_ESAT.md (e.g. ``C_*``)

New questions for the **new** id are tracked separately in DB coverage, so the generator can
fill ``C_*`` (e.g. 3 slots) while old rows remain labeled ``P_*``.

**Revert all flags (SQL or CLI):**

  migrations/clear_all_schema_reclass_flags.sql   # Supabase SQL editor
  python flag_questions_schema_reclass.py --clear-reclass-flags [--dry-run]

**Detect vs current Schemas_ESAT.md:**

  python flag_questions_schema_reclass.py --live --dry-run
  python flag_questions_schema_reclass.py --live

**Explicit pairs from approvals JSON (prefix-changing rows only):**

  python flag_questions_schema_reclass.py --approvals schema_prefix_full_approved.json

Rows whose ``schema_id`` **is** still in ``Schemas_ESAT.md`` get reclass columns **cleared**.

Writes ``reclassified_schemas_for_generation.json`` (new canonical ids to target).

Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
Migrations: migrations/add_schema_reclass_review.sql, extend_schema_reclass_tier_review_needed.sql
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

_BASE = Path(__file__).resolve().parent
if str(_BASE) not in sys.path:
    sys.path.insert(0, str(_BASE))

# DB CHECK must allow this value (see migrations/extend_schema_reclass_tier_review_needed.sql).
RECLASS_TIER_REVIEW_NEEDED = "review_needed"


def _subject_prefix(sid: str) -> str:
    if len(sid) >= 1 and sid[1:2] == "_":
        return sid[0].upper()
    return ""


def load_reclass_pairs_from_approvals(path: Path) -> List[Tuple[str, str]]:
    """Pairs (old_schema_id, new_schema_id) where subject prefix actually changed."""
    data = json.loads(path.read_text(encoding="utf-8"))
    out: List[Tuple[str, str]] = []
    for a in data.get("approvals") or []:
        old = (a.get("schema_id") or "").strip()
        new = (a.get("new_schema_id") or "").strip()
        if not old or not new:
            continue
        if _subject_prefix(old) and _subject_prefix(new) and _subject_prefix(old) != _subject_prefix(new):
            out.append((old, new))
    return out


def canonical_schema_ids(base_dir: Path) -> Set[str]:
    from project import load_schemas_esat_markdown, parse_schemas_from_markdown

    _, md = load_schemas_esat_markdown(str(base_dir.resolve()))
    schemas = parse_schemas_from_markdown(md, allow_prefixes=("M", "P", "B", "C"))
    return set(schemas.keys())


def resolve_live_reclass(sid: str, canonical: Set[str]) -> Tuple[str, Optional[str]]:
    """
    Compare ``sid`` to current schema ids in Schemas_ESAT.md.

    Returns:
      ('ok', None) — id is still valid; clear any reclass flags
      ('reclass', new_id) — stale id; single replacement in file with same suffix
      ('orphan', None) — id missing and no unique replacement (nothing to auto-label)
    """
    sid = (sid or "").strip()
    if not sid:
        return ("orphan", None)
    if sid in canonical:
        return ("ok", None)
    if len(sid) < 3 or sid[1] != "_":
        return ("orphan", None)
    suffix = sid[1:]
    candidates = [p + suffix for p in ("M", "P", "B", "C") if (p + suffix) in canonical]
    if len(candidates) == 1:
        nid = candidates[0]
        if nid != sid:
            return ("reclass", nid)
        return ("ok", None)
    return ("orphan", None)


def _get_supabase():
    try:
        from supabase import create_client
    except ImportError:
        print("Install supabase: pip install supabase", file=sys.stderr)
        return None, None

    load_dotenv_path = _BASE / ".env.local"
    if load_dotenv_path.is_file():
        try:
            from dotenv import load_dotenv

            load_dotenv(load_dotenv_path)
            load_dotenv(_BASE.parent.parent / ".env.local")
        except ImportError:
            pass

    url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY", file=sys.stderr)
        return None, None
    return create_client(url, key), "ai_generated_questions"


def fetch_all_esat_question_rows(client: Any, table: str, *, extra_cols: str = "") -> List[Dict[str, Any]]:
    """Paginate ESAT (or null test_type) rows; exclude TMUA."""
    base = "id, schema_id, idea_plan, test_type, subjects"
    cols = f"{base}, {extra_cols}" if extra_cols else base
    page = 1000
    offset = 0
    out: List[Dict[str, Any]] = []
    while True:
        resp = (
            client.table(table)
            .select(cols)
            .or_("test_type.eq.ESAT,test_type.is.null")
            .order("id")
            .range(offset, offset + page - 1)
            .execute()
        )
        batch = resp.data or []
        for r in batch:
            if (r.get("test_type") or "").upper() == "TMUA":
                continue
            out.append(r)
        if len(batch) < page:
            break
        offset += page
    return out


def run_live(args: argparse.Namespace) -> int:
    canonical = canonical_schema_ids(args.base_dir)
    print(f"Schemas_ESAT.md: {len(canonical)} schema id(s) in file.")

    client, table = _get_supabase()
    if not client:
        return 1

    rows = fetch_all_esat_question_rows(
        client,
        table,
        extra_cols="schema_reclass_review_tier, schema_reclass_old_id, schema_reclass_new_id",
    )
    print(f"ESAT questions in DB (excluding TMUA): {len(rows)}")

    n_ok = n_reclass = n_orphan = 0
    new_ids_for_gen: Set[str] = set()
    updates: List[Tuple[str, Dict[str, Any], str]] = []

    for r in rows:
        sid = (r.get("schema_id") or "").strip()
        kind, new_id = resolve_live_reclass(sid, canonical)
        if kind == "ok":
            n_ok += 1
            # Clear stale flags if any
            if (
                r.get("schema_reclass_review_tier")
                or r.get("schema_reclass_old_id")
                or r.get("schema_reclass_new_id")
            ):
                updates.append(
                    (
                        r["id"],
                        {
                            "schema_reclass_review_tier": None,
                            "schema_reclass_old_id": None,
                            "schema_reclass_new_id": None,
                        },
                        "clear",
                    )
                )
            continue
        if kind == "reclass" and new_id:
            n_reclass += 1
            new_ids_for_gen.add(new_id)
            updates.append(
                (
                    r["id"],
                    {
                        "schema_reclass_review_tier": RECLASS_TIER_REVIEW_NEEDED,
                        "schema_reclass_old_id": sid,
                        "schema_reclass_new_id": new_id,
                    },
                    f"{sid} → {new_id} ({RECLASS_TIER_REVIEW_NEEDED}; schema_id unchanged)",
                ),
            )
            continue
        n_orphan += 1

    gen_out = _BASE / "reclassified_schemas_for_generation.json"
    gen_payload = {
        "source": "live_diff_vs_Schemas_ESAT.md",
        "schemas_file": str((args.base_dir / "schemas" / "Schemas_ESAT.md").resolve()),
        "new_schema_ids": sorted(new_ids_for_gen),
        "note": "Canonical ids in Schemas_ESAT.md; existing rows keep original schema_id — review flags only.",
    }
    gen_out.write_text(json.dumps(gen_payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {gen_out.name} ({len(new_ids_for_gen)} id(s))")

    print(
        f"Summary: ok/in-file={n_ok}, reclass={n_reclass}, orphan/unmatched={n_orphan}, "
        f"db_updates={len(updates)}"
    )

    applied = 0
    for qid, payload, label in updates:
        if args.limit and applied >= args.limit:
            break
        if args.dry_run:
            print(f"  [dry-run] {qid} {label}")
            applied += 1
            continue
        try:
            client.table(table).update(payload).eq("id", qid).execute()
            applied += 1
        except Exception as e:
            print(f"ERR update {qid}: {e}", file=sys.stderr)

    print(f"{'Would apply' if args.dry_run else 'Applied'} {applied} update(s).")
    return 0


def run_approvals(args: argparse.Namespace) -> int:
    if not args.approvals or not args.approvals.is_file():
        print(f"Not found: {args.approvals}", file=sys.stderr)
        return 1

    pairs = load_reclass_pairs_from_approvals(args.approvals)
    if not pairs:
        print("No prefix-changing reclassifications in approvals file (nothing to do).")
        return 0

    old_to_new = {o: n for o, n in pairs}
    old_ids: Set[str] = set(old_to_new.keys())
    new_for_gen = sorted({old_to_new[o] for o in old_ids})

    gen_out = _BASE / "reclassified_schemas_for_generation.json"
    gen_payload = {
        "source_approvals": str(args.approvals.resolve()),
        "new_schema_ids": new_for_gen,
        "note": "Canonical ids after prefix fix; existing rows keep old schema_id with review_needed flag.",
    }
    gen_out.write_text(json.dumps(gen_payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {gen_out.name} ({len(new_for_gen)} new schema id(s))")

    client, table = _get_supabase()
    if not client:
        return 1

    old_list = sorted(old_ids)
    chunk_size = 80
    rows: List[Dict[str, Any]] = []
    for i in range(0, len(old_list), chunk_size):
        chunk = old_list[i : i + chunk_size]
        resp = client.table(table).select("id, schema_id, idea_plan, test_type, status").in_("schema_id", chunk).execute()
        part = resp.data or []
        for r in part:
            tt = (r.get("test_type") or "").upper()
            if tt and tt != "ESAT":
                continue
            rows.append(r)

    print(f"Candidates in DB (ESAT, matching old schema ids): {len(rows)}")

    updated = 0
    for r in rows:
        if args.limit and updated >= args.limit:
            break
        sid = r.get("schema_id") or ""
        new_id = old_to_new.get(sid)
        if not new_id:
            continue
        payload = {
            "schema_reclass_review_tier": RECLASS_TIER_REVIEW_NEEDED,
            "schema_reclass_old_id": sid,
            "schema_reclass_new_id": new_id,
        }
        if args.dry_run:
            print(
                f"  [dry-run] {r.get('id')} {sid} → {new_id} "
                f"tier={RECLASS_TIER_REVIEW_NEEDED} (schema_id/subjects unchanged)"
            )
            updated += 1
            continue
        try:
            client.table(table).update(payload).eq("id", r["id"]).execute()
            updated += 1
        except Exception as e:
            print(f"ERR update {r.get('id')}: {e}", file=sys.stderr)

    print(f"{'Would update' if args.dry_run else 'Updated'} {updated} question row(s).")
    return 0


def run_clear_reclass_flags(args: argparse.Namespace) -> int:
    """Set schema_reclass_* columns to NULL on all ESAT rows (does not change schema_id or subjects)."""
    client, table = _get_supabase()
    if not client:
        return 1

    rows = fetch_all_esat_question_rows(
        client,
        table,
        extra_cols="schema_reclass_review_tier, schema_reclass_old_id, schema_reclass_new_id",
    )
    to_clear = [
        r
        for r in rows
        if r.get("schema_reclass_review_tier")
        or r.get("schema_reclass_old_id")
        or r.get("schema_reclass_new_id")
    ]
    print(f"Rows with any reclass flag set: {len(to_clear)} (of {len(rows)} ESAT non-TMUA)")

    payload = {
        "schema_reclass_review_tier": None,
        "schema_reclass_old_id": None,
        "schema_reclass_new_id": None,
    }
    applied = 0
    for r in to_clear:
        if args.limit and applied >= args.limit:
            break
        qid = r["id"]
        if args.dry_run:
            print(f"  [dry-run] clear reclass flags id={qid}")
            applied += 1
            continue
        try:
            client.table(table).update(payload).eq("id", qid).execute()
            applied += 1
        except Exception as e:
            print(f"ERR update {qid}: {e}", file=sys.stderr)

    print(f"{'Would clear' if args.dry_run else 'Cleared'} {applied} row(s).")
    return 0


def main() -> int:
    p = argparse.ArgumentParser(description="Flag questions affected by schema prefix reclassification")
    p.add_argument(
        "--live",
        action="store_true",
        help="Diff each question's schema_id against current Schemas_ESAT.md (recommended)",
    )
    p.add_argument(
        "--clear-reclass-flags",
        action="store_true",
        help="Clear schema_reclass_* on all ESAT rows (revert flags only; does not change schema_id)",
    )
    p.add_argument(
        "--approvals",
        type=Path,
        default=None,
        help="*_approved.json (only if not using --live)",
    )
    p.add_argument("--dry-run", action="store_true", help="Print only; no DB writes")
    p.add_argument("--limit", type=int, default=0, help="Max DB updates (0 = no cap)")
    p.add_argument(
        "--base-dir",
        type=Path,
        default=_BASE,
        help="Generator root (Schemas_ESAT.md) for --live",
    )
    args = p.parse_args()

    if args.clear_reclass_flags:
        return run_clear_reclass_flags(args)
    if args.live:
        return run_live(args)
    if args.approvals:
        return run_approvals(args)
    print(
        "Use --clear-reclass-flags, --live (compare to Schemas_ESAT.md), or --approvals <file>.",
        file=sys.stderr,
    )
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
