#!/usr/bin/env python3
"""Apply exact manual patches for ESAT borderline curriculum-only cohort (45 questions)."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

_BASE = Path(__file__).resolve().parent.parent
_REPO = _BASE.parent.parent
if str(_BASE) not in sys.path:
    sys.path.insert(0, str(_BASE))

from quality_gate.manual_part1_apply import BORDERLINE_45_CONFIG

DEFAULT_MANUAL = _REPO / "data" / "manual_overrides" / BORDERLINE_45_CONFIG.source_filename
DEFAULT_REPORT = _BASE / "quality_gate" / "esat_borderline_45_apply_report.json"


def main() -> int:
    _SCRIPTS = Path(__file__).resolve().parent
    if str(_SCRIPTS) not in sys.path:
        sys.path.insert(0, str(_SCRIPTS))
    from apply_esat_unassessed_manual_patches_runner import run_cohort_apply

    parser = argparse.ArgumentParser()
    parser.add_argument("--manual", default=str(DEFAULT_MANUAL))
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--question-id")
    parser.add_argument(
        "--skip-replacement-qg",
        action="store_true",
        help="Insert replacements and retire originals without LLM quality gate (not recommended).",
    )
    parser.add_argument("--report", default=str(DEFAULT_REPORT))
    args = parser.parse_args()
    if not args.dry_run and not args.apply:
        args.dry_run = True
    return run_cohort_apply(
        config=BORDERLINE_45_CONFIG,
        manual_path=Path(args.manual),
        dry_run=bool(args.dry_run and not args.apply),
        apply=bool(args.apply),
        force=bool(args.force),
        question_id=args.question_id,
        skip_replacement_qg=bool(args.skip_replacement_qg),
        report_path=Path(args.report),
    )


if __name__ == "__main__":
    raise SystemExit(main())
