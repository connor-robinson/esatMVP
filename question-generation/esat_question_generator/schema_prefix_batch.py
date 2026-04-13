#!/usr/bin/env python3
"""
Full (or partial) batch: classify every schema in Schemas_ESAT.md with resume support.

  python schema_prefix_batch.py --output schema_prefix_full.jsonl
    → writes run_start, opens review UI (--live), runs classifier in a background thread until done.

  python schema_prefix_batch.py --no-ui   # classifier only, no window
  python schema_prefix_batch.py --resume schema_prefix_full.jsonl   # skip completed ids
  python schema_prefix_batch.py --limit 50   # cap work items (testing)

Each record includes `block` (full markdown) for the review UI.

Env: same as schema_prefix_test_run.py (GOOGLE_CLOUD_PROJECT, GOOGLE_CLOUD_LOCATION, SCHEMA_PREFIX_MODEL, SCHEMA_PREFIX_SLEEP_S).
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

_BASE = Path(__file__).resolve().parent
if str(_BASE) not in sys.path:
    sys.path.insert(0, str(_BASE))

from dotenv import load_dotenv

from schema_prefix_common import (
    build_user_payload,
    call_gemini_flash,
    completed_schema_ids_from_jsonl,
    extract_json_object,
    load_classifier_instructions,
)


def _launch_review_ui(jsonl: Path) -> None:
    script = _BASE / "schema_prefix_review_ui.py"
    subprocess.Popen(
        [sys.executable, str(script), "--live", str(jsonl.resolve())],
        cwd=str(_BASE),
    )


def main() -> int:
    p = argparse.ArgumentParser(description="Full schema prefix batch with resume")
    p.add_argument(
        "--output",
        type=Path,
        default=_BASE / "schema_prefix_full.jsonl",
        help="JSONL output path (append mode when resuming)",
    )
    p.add_argument(
        "--base-dir",
        type=Path,
        default=_BASE,
        help="esat_question_generator root",
    )
    p.add_argument(
        "--resume",
        type=Path,
        default=None,
        help="Existing JSONL to read completed schema_ids from (skip those)",
    )
    p.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Max schemas to process this run (0 = no cap)",
    )
    p.add_argument(
        "--no-ui",
        action="store_true",
        help="Do not open the review UI (classifier only)",
    )
    args = p.parse_args()

    load_dotenv(args.base_dir / ".env.local")
    load_dotenv(args.base_dir.parent.parent / ".env.local")

    from project import load_schemas_esat_markdown, parse_schemas_from_markdown

    schemas_path, md = load_schemas_esat_markdown(str(args.base_dir.resolve()))
    schemas = parse_schemas_from_markdown(md, allow_prefixes=("M", "P", "B", "C"))
    all_ids = sorted(schemas.keys())
    n = len(all_ids)
    if n == 0:
        print("No schemas parsed.", file=sys.stderr)
        return 1

    resume_path = args.resume or args.output
    done = completed_schema_ids_from_jsonl(resume_path)
    todo = [sid for sid in all_ids if sid not in done]
    if args.limit and args.limit > 0:
        todo = todo[: args.limit]

    print(f"Schemas file: {schemas_path}")
    print(f"Total: {n}  |  Already done: {len(done)}  |  This run: {len(todo)}")
    print(f"Output: {args.output.resolve()}")

    model = (os.environ.get("SCHEMA_PREFIX_MODEL") or "gemini-2.0-flash").strip()
    sleep_s = float(os.environ.get("SCHEMA_PREFIX_SLEEP_S") or "0.35")
    system_instruction = load_classifier_instructions()

    new_file = not args.output.is_file() or args.output.stat().st_size == 0
    if new_file:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        meta = {
            "event": "run_start",
            "ts": datetime.now(timezone.utc).isoformat(),
            "mode": "full_batch",
            "schemas_file": schemas_path,
            "total_schemas": n,
            "resume_from": str(resume_path),
            "already_completed": len(done),
            "this_run_count": len(todo),
            "model": model,
        }
        with open(args.output, "w", encoding="utf-8") as out:
            out.write(json.dumps(meta, ensure_ascii=False) + "\n")
    else:
        print(f"Appending to existing file: {args.output}")

    if not args.no_ui:
        print("Opening review UI (live updates)…", flush=True)
        _launch_review_ui(args.output)

    if not todo:
        print("Nothing to classify — all schemas already in JSONL (or empty list). Review UI can still open for approvals.")
        return 0

    cloud_project = os.environ.get("GOOGLE_CLOUD_PROJECT", "").strip()
    cloud_location = os.environ.get("GOOGLE_CLOUD_LOCATION", "").strip()
    if not cloud_project or not cloud_location:
        print("ERROR: GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION not set", file=sys.stderr)
        return 1

    thread_errors = {"n": 0}

    def run_loop() -> None:
        ok = err = 0
        total = len(todo)
        for i, schema_id in enumerate(todo):
            data = schemas[schema_id]
            title = data.get("title") or ""
            block = data.get("block") or ""
            current_prefix = schema_id[0].upper() if schema_id else "?"

            user_payload = build_user_payload(schema_id, title, block)
            record: dict = {
                "schema_id": schema_id,
                "title": title,
                "block": block,
                "current_prefix": current_prefix,
                "ts": datetime.now(timezone.utc).isoformat(),
                "model": model,
            }

            print(f"[{i+1}/{total}] {schema_id} … ", end="", flush=True)
            try:
                raw = call_gemini_flash(
                    api_key="",
                    model=model,
                    system_instruction=system_instruction,
                    user_payload=user_payload,
                )
                record["raw_response_preview"] = (raw[:500] + "…") if len(raw) > 500 else raw
                parsed = extract_json_object(raw)
                record["result"] = parsed
                record["ok"] = True
                ok += 1
                ch = parsed.get("recommended_prefix", "?")
                need = parsed.get("prefix_change_needed") or parsed.get("misnamed")
                print(f"→ {ch}  change={need}")
            except Exception as e:
                record["ok"] = False
                record["error"] = str(e)
                err += 1
                print(f"ERR: {e}")

            with open(args.output, "a", encoding="utf-8") as out:
                out.write(json.dumps(record, ensure_ascii=False) + "\n")

            if i + 1 < total and sleep_s > 0:
                time.sleep(sleep_s)

        summary = {
            "event": "run_end",
            "ts": datetime.now(timezone.utc).isoformat(),
            "ok": ok,
            "errors": err,
            "output": str(args.output.resolve()),
        }
        with open(args.output, "a", encoding="utf-8") as out:
            out.write(json.dumps(summary, ensure_ascii=False) + "\n")

        print(f"\nClassifier finished. ok={ok}  errors={err}", flush=True)
        thread_errors["n"] = err

    worker = threading.Thread(target=run_loop, name="schema_prefix_classifier", daemon=False)
    worker.start()
    worker.join()
    return 0 if thread_errors["n"] == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
