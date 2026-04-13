#!/usr/bin/env python3
"""
Phase 1: Random batch test — classify ESAT schema prefixes with Gemini Flash.

  python schema_prefix_test_run.py
  python schema_prefix_test_run.py --batch-size 25 --seed 42
  python schema_prefix_test_run.py --dry-run   # load & sample only, no API
  python schema_prefix_test_run.py --review-only   # open review UI on default/output JSONL (no API)
  python schema_prefix_test_run.py --review   # after a normal run, open schema_prefix_review_ui

Loads Vertex config from .env.local (same as rest of generator).
Writes JSONL: default schema_prefix_test_run.jsonl next to this script (each row includes `block` for review UI).

Env:
  SCHEMA_PREFIX_MODEL   default gemini-2.0-flash
  SCHEMA_PREFIX_SLEEP_S delay between calls (default 0.35)
"""

from __future__ import annotations

import argparse
import json
import os
import random
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

# UTF-8 console on Windows
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
    extract_json_object,
    load_classifier_instructions,
)


def _launch_review_ui(jsonl: Path) -> None:
    script = _BASE / "schema_prefix_review_ui.py"
    subprocess.Popen(
        [sys.executable, str(script), "--live", str(jsonl.resolve())],
        cwd=str(_BASE),
        close_fds=True,
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Test-run schema prefix classification (Flash)")
    parser.add_argument(
        "--batch-size",
        type=int,
        default=20,
        help="Number of random schemas to classify (default 20)",
    )
    parser.add_argument("--seed", type=int, default=None, help="RNG seed for reproducible sample")
    parser.add_argument(
        "--output",
        type=Path,
        default=_BASE / "schema_prefix_test_run.jsonl",
        help="Output JSONL path",
    )
    parser.add_argument(
        "--base-dir",
        type=Path,
        default=_BASE,
        help="esat_question_generator directory (contains schemas/Schemas_ESAT.md)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Parse schemas and print sample ids only; no API calls",
    )
    parser.add_argument(
        "--review",
        action="store_true",
        help="After a successful classify run, open schema_prefix_review_ui.py on the output JSONL",
    )
    parser.add_argument(
        "--review-only",
        action="store_true",
        help="Open the review UI on --output JSONL and exit (no Gemini calls)",
    )
    args = parser.parse_args()

    load_dotenv(args.base_dir / ".env.local")
    load_dotenv(args.base_dir.parent.parent / ".env.local")

    out_path = args.output.resolve()
    if args.review_only:
        if not out_path.is_file():
            print(f"--review-only: file not found: {out_path}", file=sys.stderr)
            return 1
        print(f"Opening review UI: {out_path}")
        _launch_review_ui(out_path)
        return 0

    from project import load_schemas_esat_markdown, parse_schemas_from_markdown

    schemas_path, md = load_schemas_esat_markdown(str(args.base_dir.resolve()))
    schemas = parse_schemas_from_markdown(md, allow_prefixes=("M", "P", "B", "C"))
    all_ids = sorted(schemas.keys())
    n = len(all_ids)
    if n == 0:
        print("No schemas parsed.", file=sys.stderr)
        return 1

    k = min(max(1, args.batch_size), n)
    rng = random.Random(args.seed)
    sampled = rng.sample(all_ids, k)

    print(f"Schemas file: {schemas_path}")
    print(f"Total schemas: {n}  |  Sample size: {k}  |  seed={args.seed!r}")
    print(f"Sampled ids: {', '.join(sampled[:8])}{' …' if len(sampled) > 8 else ''}")
    print(f"Output: {args.output.resolve()}")

    if args.dry_run:
        for sid in sampled:
            print(f"  {sid}  —  {schemas[sid].get('title', '')[:60]}")
        if args.review:
            print("--review ignored with --dry-run", file=sys.stderr)
        return 0

    cloud_project = os.environ.get("GOOGLE_CLOUD_PROJECT", "").strip()
    cloud_location = os.environ.get("GOOGLE_CLOUD_LOCATION", "").strip()
    if not cloud_project or not cloud_location:
        print("ERROR: GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION not set", file=sys.stderr)
        return 1

    model = (os.environ.get("SCHEMA_PREFIX_MODEL") or "gemini-2.0-flash").strip()
    sleep_s = float(os.environ.get("SCHEMA_PREFIX_SLEEP_S") or "0.35")

    system_instruction = load_classifier_instructions()

    args.output.parent.mkdir(parents=True, exist_ok=True)
    meta = {
        "event": "run_start",
        "ts": datetime.now(timezone.utc).isoformat(),
        "schemas_file": schemas_path,
        "total_schemas": n,
        "batch_size": k,
        "seed": args.seed,
        "model": model,
        "sampled_schema_ids": sampled,
    }
    with open(args.output, "w", encoding="utf-8") as out:
        out.write(json.dumps(meta, ensure_ascii=False) + "\n")

    ok = 0
    err = 0
    for i, schema_id in enumerate(sampled):
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

        print(f"[{i+1}/{k}] {schema_id} … ", end="", flush=True)
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
            print(f"→ {ch}  change_needed={need}")
        except Exception as e:
            record["ok"] = False
            record["error"] = str(e)
            err += 1
            print(f"ERR: {e}")

        with open(args.output, "a", encoding="utf-8") as out:
            out.write(json.dumps(record, ensure_ascii=False) + "\n")

        if i + 1 < k and sleep_s > 0:
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

    print(f"\nDone. ok={ok}  errors={err}  → {args.output}")
    if args.review and err == 0 and out_path.is_file():
        print(f"Opening review UI: {out_path}")
        _launch_review_ui(out_path)
    return 0 if err == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
