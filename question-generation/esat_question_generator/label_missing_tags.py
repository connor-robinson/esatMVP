#!/usr/bin/env python3
"""
Backfill ``primary_tag`` / ``secondary_tags`` for ESAT rows where tags are missing
(e.g. after ``revert_reclass_question_labels.py --target new`` cleared mismatched tags).

Uses the same classifier + normalization as ``batch_process_questions.stage_tag``.
Does not change ``verifier_report`` batch-processing status.

  python label_missing_tags.py --dry-run
  python label_missing_tags.py --only-schema-reclass
  python label_missing_tags.py --limit 5
  python label_missing_tags.py --id <uuid>

Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_CLOUD_PROJECT, GOOGLE_CLOUD_LOCATION

After a run, if any Physics rows still have bare digits as ``primary_tag``, run:

  python label_missing_tags.py --repair-numeric-physics
"""

from __future__ import annotations

import argparse
import os
import sys
import threading
import concurrent.futures
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

_BASE = Path(__file__).resolve().parent
if str(_BASE) not in sys.path:
    sys.path.insert(0, str(_BASE))

_env_local = _BASE / ".env.local"
if _env_local.is_file():
    try:
        from dotenv import load_dotenv

        load_dotenv(_env_local)
        load_dotenv(_BASE.parent.parent / ".env.local")
    except ImportError:
        pass

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except AttributeError:
        pass

from curriculum_parser import CurriculumParser, coerce_classifier_topic_code
from db_sync import DatabaseSync
from project import LLMClient, ModelsConfig, classifier_call, load_prompts


COLS = (
    "id, schema_id, question_stem, options, correct_option, solution_reasoning, "
    "solution_key_insight, distractor_map, idea_plan, test_type, primary_tag, "
    "secondary_tags, schema_reclass_review_tier"
)


def _is_esat_row(r: Dict[str, Any]) -> bool:
    tt = (r.get("test_type") or "").strip().upper()
    if tt == "TMUA":
        return False
    if tt in ("", "ESAT"):
        return True
    return False


def _needs_tags(r: Dict[str, Any]) -> bool:
    pt = r.get("primary_tag")
    if pt is None:
        return True
    if isinstance(pt, str) and not pt.strip():
        return True
    return False


def _row_ok(
    r: Dict[str, Any],
    *,
    only_schema_reclass: bool,
) -> bool:
    if not _is_esat_row(r):
        return False
    if not (r.get("schema_id") or "").strip():
        return False
    if only_schema_reclass and not (r.get("schema_reclass_review_tier") or "").strip():
        return False
    if not _needs_tags(r):
        return False
    return True


def fetch_rows(
    client: Any,
    table: str,
    *,
    only_schema_reclass: bool,
    limit_ids: Optional[List[str]],
    max_rows: Optional[int],
) -> List[Dict[str, Any]]:
    if limit_ids:
        want = [x.strip() for x in limit_ids if x.strip()]
        out: List[Dict[str, Any]] = []
        for uid in want:
            resp = client.table(table).select(COLS).eq("id", uid).limit(1).execute()
            batch = resp.data or []
            if not batch:
                print(f"[WARN] No row for id={uid}", file=sys.stderr)
                continue
            r = batch[0]
            if not _row_ok(r, only_schema_reclass=only_schema_reclass):
                print(
                    f"[SKIP] {uid}: not ESAT / no schema / wrong reclass filter / already tagged",
                    file=sys.stderr,
                )
                continue
            out.append(r)
        return out

    page_size = 500
    offset = 0
    out = []
    while True:
        q = (
            client.table(table)
            .select(COLS)
            .is_("primary_tag", "null")
            .order("id")
            .range(offset, offset + page_size - 1)
        )
        resp = q.execute()
        batch = resp.data or []
        for r in batch:
            if not _row_ok(r, only_schema_reclass=only_schema_reclass):
                continue
            out.append(r)
            if max_rows is not None and len(out) >= max_rows:
                return out[:max_rows]
        if len(batch) < page_size:
            break
        offset += page_size

    # Rows with empty-string primary_tag (not SQL NULL)
    offset = 0
    seen = {r.get("id") for r in out}
    while True:
        q = (
            client.table(table)
            .select(COLS)
            .eq("primary_tag", "")
            .order("id")
            .range(offset, offset + page_size - 1)
        )
        resp = q.execute()
        batch = resp.data or []
        for r in batch:
            if r.get("id") in seen:
                continue
            if not _row_ok(r, only_schema_reclass=only_schema_reclass):
                continue
            out.append(r)
            seen.add(r.get("id"))
            if max_rows is not None and len(out) >= max_rows:
                return out[:max_rows]
        if len(batch) < page_size:
            break
        offset += page_size

    return out


def build_tag_updates(
    question: Dict[str, Any],
    *,
    llm: LLMClient,
    prompts: Any,
    models: ModelsConfig,
    curriculum_parser: CurriculumParser,
) -> Tuple[Dict[str, Any], Optional[str]]:
    schema_id = (question.get("schema_id") or "").strip()
    if not schema_id:
        return {}, "Missing schema_id"

    question_package = {
        "question": {
            "stem": question.get("question_stem", ""),
            "options": question.get("options", {}) or {},
            "correct_option": question.get("correct_option", ""),
        },
        "solution": {
            "reasoning": question.get("solution_reasoning", ""),
            "key_insight": question.get("solution_key_insight", ""),
        },
        "distractor_map": question.get("distractor_map", {}) or {},
    }

    tag_result = classifier_call(
        llm,
        prompts,
        models,
        question_package,
        schema_id,
        curriculum_parser,
    )

    primary_tag = tag_result.get("primary_tag", "") or ""
    secondary_tags = tag_result.get("secondary_tags", []) or []
    tags_confidence = tag_result.get("primary_confidence", 0.0)

    if primary_tag:
        coerced = coerce_classifier_topic_code(schema_id, primary_tag)
        normalized_primary = curriculum_parser.normalize_topic_code(coerced)
        if normalized_primary:
            primary_tag = normalized_primary
        elif coerced != primary_tag:
            primary_tag = coerced

    normalized_secondary: List[str] = []
    for tag in secondary_tags:
        if isinstance(tag, dict):
            tag_code = tag.get("code", "")
        else:
            tag_code = str(tag)
        if tag_code:
            coerced = coerce_classifier_topic_code(schema_id, tag_code)
            normalized_tag = curriculum_parser.normalize_topic_code(coerced)
            if normalized_tag:
                normalized_secondary.append(normalized_tag)

    confidence_dict: Dict[str, Any] = {"primary": tags_confidence}
    if isinstance(secondary_tags, list):
        for tag in secondary_tags:
            if isinstance(tag, dict):
                tag_code = tag.get("code", "")
                tag_conf = tag.get("confidence", 0.0)
                if tag_code:
                    coerced = coerce_classifier_topic_code(schema_id, tag_code)
                    normalized_tag = curriculum_parser.normalize_topic_code(coerced)
                    if normalized_tag:
                        confidence_dict[normalized_tag] = tag_conf

    db_updates: Dict[str, Any] = {
        "primary_tag": primary_tag,
        "secondary_tags": normalized_secondary,
        "tags_confidence": confidence_dict,
        "tags_labeled_at": datetime.now().isoformat(),
        "tags_labeled_by": "label_missing_tags",
    }

    if schema_id[0].upper() == "M" and "paper" in tag_result:
        p = tag_result["paper"]
        if p in ("Math 1", "Math 2"):
            db_updates["subjects"] = p

    return db_updates, None


def repair_numeric_physics_tags(
    client: Any,
    table: str,
    curriculum_parser: CurriculumParser,
    *,
    dry_run: bool,
) -> Tuple[int, int]:
    """
    Fix rows where Physics schema has primary_tag as a bare digit (1–7) instead of P-P* prefixed codes.
    """
    page_size = 500
    offset = 0
    fixed = 0
    failed = 0
    while True:
        resp = (
            client.table(table)
            .select("id, schema_id, primary_tag, secondary_tags")
            .like("schema_id", "P_%")
            .order("id")
            .range(offset, offset + page_size - 1)
            .execute()
        )
        batch = resp.data or []
        for r in batch:
            sid = (r.get("schema_id") or "").strip()
            pt = r.get("primary_tag")
            if pt is None:
                continue
            pts = str(pt).strip()
            if len(pts) != 1 or pts not in "1234567":
                continue
            coerced = coerce_classifier_topic_code(sid, pts)
            norm = curriculum_parser.normalize_topic_code(coerced)
            if not norm:
                print(f"[WARN] Could not normalize {sid!r} primary_tag={pts!r}", file=sys.stderr)
                failed += 1
                continue
            sec = r.get("secondary_tags") or []
            new_sec: List[str] = []
            if isinstance(sec, list):
                for t in sec:
                    code = t if isinstance(t, str) else (t.get("code") if isinstance(t, dict) else "")
                    if not code:
                        continue
                    c2 = coerce_classifier_topic_code(sid, str(code))
                    n2 = curriculum_parser.normalize_topic_code(c2)
                    if n2:
                        new_sec.append(n2)
            if dry_run:
                print(f"[DRY RUN] {r.get('id')} {pts!r} -> {norm!r}")
            else:
                client.table(table).update(
                    {
                        "primary_tag": norm,
                        "secondary_tags": new_sec,
                        "tags_labeled_by": "label_missing_tags_repair_physics",
                    }
                ).eq("id", r.get("id")).execute()
            fixed += 1
        if len(batch) < page_size:
            break
        offset += page_size
    return fixed, failed


def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill curriculum tags when primary_tag is missing")
    parser.add_argument(
        "--repair-numeric-physics",
        action="store_true",
        help="Fix P_* rows whose primary_tag is a bare digit 1–7 (no LLM; DB update only)",
    )
    parser.add_argument("--dry-run", action="store_true", help="List targets only; do not call LLM or write DB")
    parser.add_argument(
        "--only-schema-reclass",
        action="store_true",
        help="Only rows with schema_reclass_review_tier set",
    )
    parser.add_argument("--limit", type=int, default=None, help="Max questions to process")
    parser.add_argument("--workers", type=int, default=4, help="Parallel LLM calls")
    parser.add_argument("--id", action="append", dest="ids", help="Process specific question UUID (repeatable)")
    args = parser.parse_args()

    db = DatabaseSync()
    if not db.enabled or not db.client:
        print("ERROR: Database sync not enabled (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)", file=sys.stderr)
        sys.exit(1)

    if args.repair_numeric_physics:
        curriculum_file = _BASE / "curriculum" / "ESAT_CURRICULUM.json"
        curriculum_parser = CurriculumParser(str(curriculum_file))
        fixed, failed = repair_numeric_physics_tags(
            db.client,
            "ai_generated_questions",
            curriculum_parser,
            dry_run=args.dry_run,
        )
        print(f"repair_numeric_physics: updated={fixed} normalize_failed={failed}")
        return

    cloud_project = (os.environ.get("GOOGLE_CLOUD_PROJECT") or "").strip()
    cloud_location = (os.environ.get("GOOGLE_CLOUD_LOCATION") or "").strip()
    if (not cloud_project or not cloud_location) and not args.dry_run:
        print("ERROR: GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION required unless --dry-run", file=sys.stderr)
        sys.exit(1)

    table = "ai_generated_questions"
    rows = fetch_rows(
        db.client,
        table,
        only_schema_reclass=args.only_schema_reclass,
        limit_ids=args.ids,
        max_rows=args.limit,
    )

    print(f"Candidates: {len(rows)}")
    for r in rows[:50]:
        sid = (r.get("schema_id") or "")[:16]
        print(f"  {r.get('id')}  schema={sid}...  tier={(r.get('schema_reclass_review_tier') or '')!r}")
    if len(rows) > 50:
        print(f"  ... and {len(rows) - 50} more")

    if args.dry_run:
        return

    llm = LLMClient(api_key="")
    prompts = load_prompts(str(_BASE))
    models = ModelsConfig(
        implementer="gemini-2.5-pro",
        classifier=os.environ.get("MODEL_CLASSIFIER", "gemini-2.5-flash"),
    )
    curriculum_file = _BASE / "curriculum" / "ESAT_CURRICULUM.json"
    curriculum_parser = CurriculumParser(str(curriculum_file))

    lock = threading.Lock()
    ok = 0
    fail = 0

    def one(q: Dict[str, Any]) -> None:
        nonlocal ok, fail
        qid = q.get("id")
        try:
            updates, err = build_tag_updates(
                q,
                llm=llm,
                prompts=prompts,
                models=models,
                curriculum_parser=curriculum_parser,
            )
            if err:
                print(f"FAIL {qid}: {err}")
                with lock:
                    fail += 1
                return
            with lock:
                db.client.table(table).update(updates).eq("id", qid).execute()
                ok += 1
            print(f"OK {qid[:8]}... primary_tag={updates.get('primary_tag')!r}")
        except Exception as e:
            print(f"FAIL {qid}: {e}")
            with lock:
                fail += 1

    if args.workers <= 1:
        for q in rows:
            one(q)
    else:
        with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as ex:
            list(ex.map(one, rows))

    print(f"Done. ok={ok} fail={fail}")


if __name__ == "__main__":
    main()
