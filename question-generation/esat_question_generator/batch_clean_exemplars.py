#!/usr/bin/env python3
"""
Batch-review exemplar extracts linked to Schemas_ESAT.md using a cheap Gemini model.

For each unique exemplar question_id:
  - "remove"  → rare: only when nothing exam-like can be implied (see SYSTEM_PROMPT); drops exemplar lines from Schemas_ESAT.md
  - "rewrite" → messy extract but a real (even partial) question: replace `questions_queue.text` in nsaa_state.db
  - "keep"    → usable as-is, including incomplete but intelligible items → no change

Default is report-only (JSONL + summary). Use --apply to write DB + schema file (after backup).
Use --show-text for test runs: prints initial DB extract and rewrite text side-by-side.

Environment:
  GOOGLE_CLOUD_PROJECT + GOOGLE_CLOUD_LOCATION required
  MODEL_EXEMPLAR_CLEANER  default gemini-2.5-flash (2.0-flash-lite is 404 for many new keys)
  GEMINI_MIN_DELAY   optional pacing between calls (default 0.35 for this script)
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import sqlite3
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

# Run from esat_question_generator/
_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

from project import (  # noqa: E402
    LLMClient,
    load_schemas_esat_markdown,
    parse_schemas_from_markdown,
    resolve_schemas_esat_path,
    safe_load_dotenv,
)


def _db_path(base_dir: str) -> Path:
    qgen_root = Path(base_dir).resolve().parent
    return qgen_root / "schema_generator" / "restructure" / "nsaa_state.db"


def fetch_text_map(db_file: Path, ids: List[str]) -> Dict[str, str]:
    if not db_file.is_file():
        return {}
    conn = sqlite3.connect(str(db_file))
    cur = conn.cursor()
    out: Dict[str, str] = {}
    chunk = 400
    for i in range(0, len(ids), chunk):
        part = ids[i : i + chunk]
        ph = ",".join("?" * len(part))
        cur.execute(f"SELECT question_id, text FROM questions_queue WHERE question_id IN ({ph})", part)
        for qid, text in cur.fetchall():
            out[str(qid)] = text or ""
    conn.close()
    return out


def update_question_text(db_file: Path, question_id: str, new_text: str) -> None:
    conn = sqlite3.connect(str(db_file))
    cur = conn.cursor()
    cur.execute(
        "UPDATE questions_queue SET text = ?, ts_updated = CURRENT_TIMESTAMP WHERE question_id = ?",
        (new_text, question_id),
    )
    if cur.rowcount == 0:
        conn.close()
        raise RuntimeError(f"No row updated for question_id={question_id!r} (missing from DB?)")
    conn.commit()
    conn.close()


def collect_exemplar_ids(schemas: Dict[str, Dict[str, Any]]) -> Tuple[Set[str], Dict[str, List[str]]]:
    """Return unique ids and mapping id -> list of schema_ids that reference it."""
    unique: Set[str] = set()
    by_schema: Dict[str, List[str]] = {}
    for sid, meta in schemas.items():
        eids = meta.get("exemplar_ids") or []
        by_schema[sid] = list(eids)
        for eid in eids:
            eid = (eid or "").strip()
            if eid:
                unique.add(eid)
    return unique, by_schema


def _extract_json_object(raw: str) -> Dict[str, Any]:
    s = raw.strip()
    fence = re.match(r"^```(?:json)?\s*\n?(.*?)\n?```\s*$", s, re.DOTALL | re.IGNORECASE)
    if fence:
        s = fence.group(1).strip()
    m = re.search(r"\{[\s\S]*\}\s*$", s)
    if not m:
        raise ValueError("No JSON object in model output")
    return json.loads(m.group(0))


SYSTEM_PROMPT = """You clean exemplar items used to calibrate an exam-question generator.

The text is often from PDF extraction and may be broken. **Bias heavily toward keep and rewrite;
use remove only rarely** when nothing exam-like can be recovered.

Priority order: **rewrite** (fix messy extract) > **keep** (already usable) > **remove** (last resort).

**keep** — Use when the extract is already OK as a reference, including **incomplete** extracts
where a **question is clearly asked or partly asked** and a reader can tell what the item is about
(even if options or the end of the stem are missing). If it is rough but understandable, prefer keep.

**rewrite** — Use when the content is **clearly an exam-style question** (or fragment of one) but
OCR/layout/typos hurt readability. Produce a faithful cleaned plain-text version: preserve meaning,
numbers, any visible options, and structure; fix line breaks and obvious OCR errors; you may
lightly normalize wording **only** where needed for clarity. **Do not invent** a new problem,
new data, or missing options you cannot infer from the text. If the extract is incomplete but a
real question is implied, you may **rewrite to a minimal faithful version** that states what was
asked and what remains in the extract (do not fabricate the missing tail).

**remove** — Use **only** when the text **cannot** reasonably be read as an exam question or
stem+task: e.g. pure cover pages, **only** generic instructions with no item, blank/no-content
stubs, standalone periodic tables / data sheets with **no** question tied to them, answer-key
rows with **no** question text, or noise where **no** sensible question can be implied. If *any*
exam-like ask is present or strongly implied from context, **do not remove** — choose keep or
rewrite instead.

Respond with ONE JSON object only, no markdown:
{"action":"keep"|"remove"|"rewrite","reason":"brief","cleaned_text":""}

Rules:
- For keep or remove, use "cleaned_text": "".
- For rewrite, "cleaned_text" must be the full replacement text for the question item.
- When unsure between remove and (keep|rewrite), choose **keep** or **rewrite**, not remove.
"""


def classify_exemplar(
    llm: LLMClient,
    model: str,
    question_id: str,
    text: str,
    max_chars: int,
) -> Dict[str, Any]:
    body = text if len(text) <= max_chars else text[:max_chars] + "\n\n[TRUNCATED_FOR_MODEL]"
    user = f"question_id: {question_id}\n\n---EXTRACT---\n{body}\n---END---"
    raw = llm.generate(
        model=model,
        system_prompt=SYSTEM_PROMPT,
        user_prompt=user,
        temperature=0.15,
        trace_label="exemplar_clean",
    )
    obj = _extract_json_object(raw)
    action = str(obj.get("action", "")).strip().lower()
    if action not in ("keep", "remove", "rewrite"):
        raise ValueError(f"Invalid action {action!r}")
    cleaned = obj.get("cleaned_text")
    if cleaned is None:
        cleaned = ""
    if action != "rewrite":
        cleaned = ""
    elif not str(cleaned).strip():
        raise ValueError("rewrite requires non-empty cleaned_text")
    return {
        "action": action,
        "reason": str(obj.get("reason", "")).strip(),
        "cleaned_text": str(cleaned),
    }


def exemplar_line_regex(question_id: str) -> re.Pattern:
    return re.compile(rf"^[ \t]*-\s*`{re.escape(question_id)}`:[^\n]*\n?", re.MULTILINE)


def strip_exemplar_lines(raw_md: str, question_ids: Set[str]) -> str:
    out = raw_md
    for qid in sorted(question_ids, key=len, reverse=True):
        out = exemplar_line_regex(qid).sub("", out)
    return out


def _print_text_block(label: str, body: str, max_chars: int) -> None:
    """Print a labeled block; max_chars 0 = print full body."""
    print(f"  --- {label} ({len(body)} chars) ---")
    if max_chars > 0 and len(body) > max_chars:
        print(body[:max_chars])
        print(f"  ... [{len(body) - max_chars} more chars omitted; use --show-text-max 0 for full]")
    else:
        print(body)


def main() -> None:
    parser = argparse.ArgumentParser(description="Batch AI clean / cull Schemas_ESAT exemplars")
    parser.add_argument(
        "--base-dir",
        default=str(_SCRIPT_DIR),
        help="esat_question_generator directory (default: script dir)",
    )
    parser.add_argument(
        "--prefixes",
        default="M,P,B,C",
        help="Comma-separated schema id prefixes to scan (default M,P,B,C)",
    )
    parser.add_argument("--limit", type=int, default=0, help="Max distinct exemplar IDs (0 = all)")
    parser.add_argument(
        "--model",
        default=os.environ.get("MODEL_EXEMPLAR_CLEANER", "gemini-2.5-flash"),
        help="Gemini model id (default gemini-2.5-flash; gemini-2.0-flash-lite often 404 for new API keys)",
    )
    parser.add_argument("--max-chars", type=int, default=24000, help="Max extract chars sent to the model")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Apply changes: backup Schemas_ESAT.md, strip removed exemplar lines, UPDATE questions_queue text for rewrites",
    )
    parser.add_argument("--only-ids", default="", help="Comma-separated question_ids to process (debug)")
    parser.add_argument(
        "--show-text",
        action="store_true",
        help="Print initial DB extract and, for rewrites, the model's cleaned_text (good for test runs)",
    )
    parser.add_argument(
        "--show-text-max",
        type=int,
        default=4000,
        help="Max chars printed per block with --show-text (0 = no truncation)",
    )
    args = parser.parse_args()

    safe_load_dotenv(".env.local")
    safe_load_dotenv("../.env.local")
    cloud_project = os.environ.get("GOOGLE_CLOUD_PROJECT", "").strip()
    cloud_location = os.environ.get("GOOGLE_CLOUD_LOCATION", "").strip()
    if not cloud_project or not cloud_location:
        raise SystemExit("Set GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION (e.g. in .env.local).")

    base_dir = os.path.abspath(args.base_dir)
    prefixes = tuple(p.strip().upper() for p in args.prefixes.split(",") if p.strip())

    _, schemas_md = load_schemas_esat_markdown(base_dir)
    schemas = parse_schemas_from_markdown(schemas_md, allow_prefixes=prefixes)
    unique_ids, _ = collect_exemplar_ids(schemas)
    if args.only_ids.strip():
        filter_set = {x.strip() for x in args.only_ids.split(",") if x.strip()}
        unique_ids = unique_ids & filter_set
    ids_sorted = sorted(unique_ids)
    if args.limit and args.limit > 0:
        ids_sorted = ids_sorted[: args.limit]

    db_file = _db_path(base_dir)
    text_map = fetch_text_map(db_file, ids_sorted)

    run_dir = Path(base_dir) / "runs" / f"exemplar_clean_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    run_dir.mkdir(parents=True, exist_ok=True)
    report_path = run_dir / "report.jsonl"

    min_delay = float(os.environ.get("GEMINI_MIN_DELAY", "0.35"))
    llm = LLMClient(api_key="", min_delay=min_delay, rate_limit_delay=8.0)

    to_remove: Set[str] = set()
    to_rewrite: Dict[str, str] = {}
    errors: List[Dict[str, Any]] = []

    print(f"[exemplar_clean] Schemas loaded: {len(schemas)}  Unique exemplar IDs: {len(ids_sorted)}")
    print(f"[exemplar_clean] DB: {db_file}  exists={db_file.is_file()}")
    print(f"[exemplar_clean] Model: {args.model}  apply={args.apply}  report: {report_path}")

    for i, qid in enumerate(ids_sorted, 1):
        text = text_map.get(qid, "")
        rec: Dict[str, Any] = {
            "question_id": qid,
            "db_hit": bool(text),
            "text_len": len(text),
        }
        if not text.strip():
            rec["action"] = "skip"
            rec["reason"] = "missing_or_empty_in_db"
            with open(report_path, "a", encoding="utf-8") as f:
                f.write(json.dumps(rec, ensure_ascii=False) + "\n")
            print(f"  [{i}/{len(ids_sorted)}] {qid} SKIP (no DB text)")
            continue
        try:
            decision = classify_exemplar(llm, args.model, qid, text, args.max_chars)
            rec.update(decision)
            if decision["action"] == "remove":
                to_remove.add(qid)
            elif decision["action"] == "rewrite":
                to_rewrite[qid] = decision["cleaned_text"]
        except Exception as e:
            rec["action"] = "error"
            rec["error"] = str(e)
            errors.append({"question_id": qid, "error": str(e)})
        with open(report_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
        print(f"  [{i}/{len(ids_sorted)}] {qid} -> {rec.get('action')}")
        if args.show_text:
            cap = max(0, args.show_text_max)
            act = rec.get("action")
            print(f"  ========== {qid} ==========")
            if act == "error":
                print(f"  reason: {rec.get('error', '')}")
                _print_text_block("initial (from DB)", text, cap)
            elif act == "skip":
                print("  (no DB text)")
            else:
                if rec.get("reason"):
                    print(f"  model reason: {rec['reason']}")
                _print_text_block("initial (from DB)", text, cap)
                if act == "rewrite" and rec.get("cleaned_text"):
                    _print_text_block("rewrite (would save to DB)", rec["cleaned_text"], cap)
                elif act == "remove":
                    print("  (remove → exemplar line(s) dropped from Schemas_ESAT.md on --apply)")
                elif act == "keep":
                    print("  (keep → no file/DB change)")
            print(f"  ========== end {qid} ==========\n")
        time.sleep(0)

    summary = {
        "ts": datetime.now().isoformat(),
        "model": args.model,
        "apply": args.apply,
        "total": len(ids_sorted),
        "remove_count": len(to_remove),
        "rewrite_count": len(to_rewrite),
        "error_count": len(errors),
        "remove_ids": sorted(to_remove),
        "rewrite_ids": sorted(to_rewrite.keys()),
        "errors": errors,
    }
    (run_dir / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")

    if not args.apply:
        print(f"[exemplar_clean] Report-only done. Remove={len(to_remove)} rewrite={len(to_rewrite)} errors={len(errors)}")
        print("  Re-run with --apply to update Schemas_ESAT.md and nsaa_state.db")
        return

    schema_path = Path(resolve_schemas_esat_path(base_dir))
    backup = run_dir / f"Schemas_ESAT.md.bak"
    shutil.copy2(schema_path, backup)
    raw = schema_path.read_text(encoding="utf-8")
    new_raw = strip_exemplar_lines(raw, to_remove)
    if new_raw != raw:
        schema_path.write_text(new_raw, encoding="utf-8")
        print(f"[exemplar_clean] Removed exemplar lines for {len(to_remove)} ids; backup -> {backup}")

    for qid, new_text in to_rewrite.items():
        update_question_text(db_file, qid, new_text)
    if to_rewrite:
        print(f"[exemplar_clean] Updated DB text for {len(to_rewrite)} ids")

    print(f"[exemplar_clean] Apply complete. Summary: {run_dir / 'summary.json'}")


if __name__ == "__main__":
    main()
