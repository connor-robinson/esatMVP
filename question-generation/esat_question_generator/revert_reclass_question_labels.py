#!/usr/bin/env python3
"""
Revert schema_id, subjects, and curriculum tags for ESAT questions flagged by
schema reclassification.

Which schema id to align to:

  --target old   (default) Use ``schema_reclass_old_id`` — labels as when the row was
                 flagged (generation-time id on the question).
  --target new   Use ``schema_reclass_new_id`` — labels matching the **current**
                 Schemas_ESAT.md canonical id (e.g. MD moved C_* → P_* and you want
                 Physics subjects/tags on the row).

Use ``--also-fix-canonical-ids-from-approvals`` if some rows had ``schema_id``
updated to the **new** id in the approvals file and you need to roll back to the **old** id.

Does not clear schema_reclass_* review columns (unless you do so separately).

  python revert_reclass_question_labels.py --dry-run
  python revert_reclass_question_labels.py --target new
  python revert_reclass_question_labels.py --also-fix-canonical-ids-from-approvals schema_prefix_full_approved.json

Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (see .env.local).
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

_BASE = Path(__file__).resolve().parent
if str(_BASE) not in sys.path:
    sys.path.insert(0, str(_BASE))


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


def _parse_idea(raw: Any) -> Dict[str, Any]:
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        try:
            import json

            o = json.loads(raw)
            return o if isinstance(o, dict) else {}
        except json.JSONDecodeError:
            return {}
    return {}


def paper_id_from_schema_prefix(schema_id: str) -> Optional[str]:
    """Curriculum paper_id for first letter of hash-style schema id (same as db_sync)."""
    if not schema_id:
        return None
    c = schema_id[0].upper()
    if c == "M":
        return None  # math: need Math 1 / 2 from idea_plan
    if c == "P":
        return "physics"
    if c == "C":
        return "chemistry"
    if c == "B":
        return "biology"
    return None


def subjects_from_schema(schema_id: str, idea: Dict[str, Any]) -> str:
    """Mirror db_sync subjects for ESAT rows."""
    paper = idea.get("paper") or idea.get("math_paper")
    if not schema_id:
        return "Math 1"
    first = schema_id[0].upper()
    if first == "M":
        if paper == "Math 2" or str(paper).replace(" ", "") == "Math2":
            return "Math 2"
        if paper == "Math 1" or str(paper).replace(" ", "") == "Math1":
            return "Math 1"
        return "Math 1"
    if first == "P":
        return "Physics"
    if first == "C":
        return "Chemistry"
    if first == "B":
        return "Biology"
    return "Math 1"


def curriculum_paper_id_for_tags(schema_id: str, idea: Dict[str, Any]) -> Optional[str]:
    """paper_id string used by CurriculumParser.map_tag_code_to_text."""
    if not schema_id:
        return "math1"
    first = schema_id[0].upper()
    if first == "M":
        p = idea.get("paper") or idea.get("math_paper")
        s = str(p) if p is not None else ""
        if "2" in s and "Math" in s:
            return "math2"
        return "math1"
    if first == "P":
        return "physics"
    if first == "C":
        return "chemistry"
    if first == "B":
        return "biology"
    return None


def _tag_matches_expected_subject(tag: str, schema_prefix: str) -> bool:
    """False if tag is clearly for a different ESAT subject than schema_prefix."""
    t = (tag or "").strip()
    if not t:
        return True
    sp = schema_prefix.upper()
    low = t.lower()
    # Prefixed codes from classifier
    if t.startswith("M1-") or t.startswith("M2-"):
        return sp == "M"
    if t.startswith("P-"):
        return sp == "P"
    if t.startswith("chemistry-"):
        return sp == "C"
    if t.startswith("biology-"):
        return sp == "B"
    # Display titles from map_tag_code_to_text
    if low.startswith("physics") or "physics -" in low[:40]:
        return sp == "P"
    if low.startswith("chemistry") or "chemistry -" in low[:40]:
        return sp == "C"
    if low.startswith("biology") or "biology -" in low[:40]:
        return sp == "B"
    if "mathematics" in low[:30] or low.startswith("math"):
        return sp == "M"
    # Numeric legacy tag labeler 1–7 (ambiguous) — assume OK if prefix matches pipeline
    if re.fullmatch(r"[1-9]|1[01]", t):
        return True
    return True


def remap_one_tag(
    tag: Optional[str],
    paper_id: str,
    parser: Any,
) -> Optional[str]:
    """Map stored tag (code or title) to display text for the given curriculum paper."""
    if not tag or not str(tag).strip():
        return None
    t = str(tag).strip()
    norm = parser.normalize_topic_code(t)
    if norm:
        mapped = parser.map_tag_code_to_text(norm, paper_id)
        if mapped and mapped != t:
            return mapped
        if mapped:
            return mapped
    # Exact title match in this paper
    p = parser.papers_by_id.get(paper_id)
    if p:
        for topic in p.get("topics", []):
            if topic.get("title", "").strip() == t:
                code = topic.get("code", "")
                if code:
                    pc = parser._get_prefixed_code(paper_id, code)  # noqa: SLF001
                    return parser.map_tag_code_to_text(pc, paper_id)
    return t


def fetch_flagged_rows(
    client: Any,
    table: str,
    limit_ids: Optional[List[str]],
    generation_id_contains: Optional[str],
) -> List[Dict[str, Any]]:
    cols = (
        "id, schema_id, subjects, primary_tag, secondary_tags, idea_plan, test_type, "
        "schema_reclass_review_tier, schema_reclass_old_id, schema_reclass_new_id"
    )
    page_size = 1000
    offset = 0
    out: List[Dict[str, Any]] = []
    while True:
        resp = (
            client.table(table)
            .select(cols)
            .or_("test_type.eq.ESAT,test_type.is.null")
            .order("id")
            .range(offset, offset + page_size - 1)
            .execute()
        )
        batch = resp.data or []
        for r in batch:
            if (r.get("test_type") or "").upper() == "TMUA":
                continue
            if not (r.get("schema_reclass_review_tier") or "").strip():
                continue
            if generation_id_contains:
                blob = f"{r.get('generation_id', '')}{r.get('id', '')}"
                if generation_id_contains.upper() not in blob.upper():
                    continue
            out.append(r)
        if len(batch) < page_size:
            break
        offset += page_size

    if limit_ids:
        want = {x.strip() for x in limit_ids if x.strip()}
        out = [r for r in out if r.get("id") in want]
    return out


def load_new_to_old_from_approvals(path: Path) -> Dict[str, str]:
    """Map new_schema_id -> schema_id for prefix-changing approval rows."""
    data = json.loads(path.read_text(encoding="utf-8"))
    out: Dict[str, str] = {}
    for a in data.get("approvals") or []:
        old = (a.get("schema_id") or "").strip()
        new = (a.get("new_schema_id") or "").strip()
        if not old or not new or old == new:
            continue
        o0, n0 = old[0].upper(), new[0].upper()
        if len(old) > 2 and old[1] == "_" and len(new) > 2 and new[1] == "_" and o0 != n0:
            out[new] = old
    return out


def fetch_rows_with_schema_ids(
    client: Any,
    table: str,
    schema_ids: List[str],
    extra_filter_generation_contains: Optional[str],
) -> List[Dict[str, Any]]:
    cols = (
        "id, generation_id, schema_id, subjects, primary_tag, secondary_tags, idea_plan, test_type, "
        "schema_reclass_review_tier, schema_reclass_old_id, schema_reclass_new_id"
    )
    out: List[Dict[str, Any]] = []
    chunk = 40
    for i in range(0, len(schema_ids), chunk):
        part = schema_ids[i : i + chunk]
        resp = client.table(table).select(cols).in_("schema_id", part).execute()
        for r in resp.data or []:
            if (r.get("test_type") or "").upper() == "TMUA":
                continue
            if extra_filter_generation_contains:
                gid = (r.get("generation_id") or "") + (r.get("id") or "")
                if extra_filter_generation_contains.upper() not in gid.upper():
                    continue
            out.append(r)
    return out


def build_update(
    row: Dict[str, Any],
    parser: Any,
    forced_old_sid: Optional[str] = None,
    *,
    target: str = "old",
) -> Tuple[Dict[str, Any], str]:
    """
    target:
      old — align to schema_reclass_old_id (or forced_old_sid / schema_id).
      new — align to schema_reclass_new_id when set (canonical id in Schemas_ESAT.md).
    """
    if forced_old_sid:
        old_sid = forced_old_sid.strip()
    elif target == "new":
        old_sid = (row.get("schema_reclass_new_id") or "").strip() or (
            row.get("schema_reclass_old_id") or ""
        ).strip() or (row.get("schema_id") or "").strip()
    else:
        old_sid = (row.get("schema_reclass_old_id") or "").strip() or (
            row.get("schema_id") or ""
        ).strip()
    cur_sid = (row.get("schema_id") or "").strip()

    if not old_sid or len(old_sid) < 3 or old_sid[1] != "_":
        return {}, "skip: no usable schema_reclass_old_id / hash schema_id"

    prefix = old_sid[0].upper()
    idea = _parse_idea(row.get("idea_plan"))
    subjects = subjects_from_schema(old_sid, idea)
    cpaper = curriculum_paper_id_for_tags(old_sid, idea)
    if not cpaper:
        return {}, "skip: could not resolve curriculum paper"

    notes: List[str] = []
    pt_in = row.get("primary_tag")
    st = row.get("secondary_tags")
    sec_list: List[str] = []
    if isinstance(st, list):
        sec_list = [str(x) for x in st if x is not None]
    elif isinstance(st, str) and st.strip():
        try:
            import json

            parsed = json.loads(st)
            if isinstance(parsed, list):
                sec_list = [str(x) for x in parsed]
        except json.JSONDecodeError:
            sec_list = []

    final: Dict[str, Any] = {}
    if cur_sid != old_sid:
        final["schema_id"] = old_sid
    if (row.get("subjects") or "") != subjects:
        final["subjects"] = subjects

    # Primary tag: drop if clearly wrong subject; else remap for curriculum paper
    desired_pt: Optional[str] = None
    if pt_in is not None and str(pt_in).strip():
        if not _tag_matches_expected_subject(str(pt_in), prefix):
            desired_pt = None
            notes.append("cleared primary_tag (wrong subject)")
        else:
            desired_pt = remap_one_tag(str(pt_in), cpaper, parser)
            if desired_pt != str(pt_in).strip():
                notes.append("primary_tag remapped")
    if desired_pt != row.get("primary_tag"):
        final["primary_tag"] = desired_pt

    # Secondary tags: keep only matching subject, then remap
    desired_sec: List[str] = []
    for s in sec_list:
        if _tag_matches_expected_subject(s, prefix):
            desired_sec.append(remap_one_tag(s, cpaper, parser) or s)
        else:
            notes.append("dropped secondary (wrong subject)")
    row_sec = row.get("secondary_tags")
    row_list = row_sec if isinstance(row_sec, list) else None
    if sec_list:
        if desired_sec != (list(row_list) if row_list else []):
            final["secondary_tags"] = desired_sec if desired_sec else None
    elif row_list:
        final["secondary_tags"] = None

    if not final:
        return {}, "no changes needed"

    detail = "; ".join(notes) if notes else (
        "aligned to schema_reclass_new_id (canonical)"
        if target == "new"
        else "aligned to schema_reclass_old_id (generation id at flag time)"
    )
    return final, detail


def _apply_updates(
    client: Any,
    table: str,
    rows: List[Dict[str, Any]],
    parser: Any,
    dry_run: bool,
    forced_old_by_id: Optional[Dict[str, str]] = None,
    target: str = "old",
) -> Tuple[int, int]:
    """Returns (applied, skipped)."""
    n_apply = 0
    n_skip = 0
    forced_old_by_id = forced_old_by_id or {}
    for r in rows:
        qid = r.get("id")
        fid = forced_old_by_id.get(str(qid))
        upd, msg = build_update(r, parser, forced_old_sid=fid, target=target)
        if not upd:
            print(f"  [{qid}] {msg}")
            n_skip += 1
            continue
        print(f"  [{qid}] {msg} -> {upd}")
        if not dry_run:
            try:
                client.table(table).update(upd).eq("id", qid).execute()
                n_apply += 1
            except Exception as e:
                print(f"    ERR: {e}", file=sys.stderr)
        else:
            n_apply += 1
    return n_apply, n_skip


def main() -> int:
    ap = argparse.ArgumentParser(description="Revert labels for schema-reclass-flagged ESAT questions")
    ap.add_argument("--dry-run", action="store_true", help="Print planned updates only")
    ap.add_argument(
        "--id",
        action="append",
        dest="ids",
        metavar="UUID",
        help="Only process this question id (repeatable). Default: all flagged rows.",
    )
    ap.add_argument(
        "--generation-id-contains",
        type=str,
        default=None,
        help="Only rows whose generation_id or id contains this substring (case-insensitive).",
    )
    ap.add_argument(
        "--also-fix-canonical-ids-from-approvals",
        type=Path,
        metavar="JSON",
        help="Also fix rows whose schema_id was updated to new_schema_id (from approvals); "
        "restore schema_id/subjects/tags from the original prefix.",
    )
    ap.add_argument(
        "--target",
        choices=("old", "new"),
        default="old",
        help="Which reclass column drives the restored schema_id/subjects/tags (see docstring).",
    )
    args = ap.parse_args()

    from curriculum_parser import CurriculumParser

    parser = CurriculumParser()
    client, table = _get_supabase()
    if not client:
        return 1

    total_apply = 0
    total_skip = 0

    rows = fetch_flagged_rows(client, table, args.ids, args.generation_id_contains)
    print(f"Rows with schema_reclass_review_tier set (ESAT, non-TMUA): {len(rows)}")
    a, s = _apply_updates(client, table, rows, parser, args.dry_run, target=args.target)
    total_apply += a
    total_skip += s

    if args.also_fix_canonical_ids_from_approvals and args.also_fix_canonical_ids_from_approvals.is_file():
        new_to_old = load_new_to_old_from_approvals(args.also_fix_canonical_ids_from_approvals)
        if not new_to_old:
            print("No prefix-changing pairs in approvals file.")
        else:
            print(
                f"\nAlso fixing rows with canonical new schema_id ({len(new_to_old)} id mappings)…"
            )
            rows2 = fetch_rows_with_schema_ids(
                client,
                table,
                list(new_to_old.keys()),
                args.generation_id_contains,
            )
            print(f"  Found {len(rows2)} row(s) with those schema_id values.")
            forced: Dict[str, str] = {}
            for r in rows2:
                sid = (r.get("schema_id") or "").strip()
                if sid in new_to_old:
                    forced[str(r.get("id"))] = new_to_old[sid]
            a2, s2 = _apply_updates(
                client,
                table,
                rows2,
                parser,
                args.dry_run,
                forced_old_by_id=forced,
                target=args.target,
            )
            total_apply += a2
            total_skip += s2

    print(f"\nDone: would apply / applied {total_apply}, skipped {total_skip}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
