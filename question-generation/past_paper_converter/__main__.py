"""CLI entrypoint for past paper image-to-text conversion."""

from __future__ import annotations

import argparse
import json
import sys


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Past paper image → KaTeX text converter")
    sub = parser.add_subparsers(dest="command", required=True)

    run_p = sub.add_parser("run", help="Run conversion pipeline")
    run_p.add_argument("--paper-id", type=int, default=None)
    run_p.add_argument("--exam", type=str, default=None, help="ENGAA, NSAA, TMUA")
    run_p.add_argument("--question-id", type=int, default=None)
    run_p.add_argument("--limit", type=int, default=None)
    run_p.add_argument("--dry-run", action="store_true")
    run_p.add_argument("--force", action="store_true")
    run_p.add_argument("--batch-api", action="store_true", dest="batch_api")

    requeue_p = sub.add_parser("requeue", help="Re-process failed conversions by flag")
    requeue_p.add_argument("--flag", required=True, help="e.g. katex_errors, missing_options")
    requeue_p.add_argument("--dry-run", action="store_true")

    audit_p = sub.add_parser("audit-sequence", help="Run paper sequence audit only")
    audit_p.add_argument("--paper-id", type=int, default=None)

    args = parser.parse_args(argv)

    if args.command == "run":
        from .runner import run_conversion

        results = run_conversion(
            paper_id=args.paper_id,
            exam_name=args.exam,
            question_id=args.question_id,
            limit=args.limit,
            dry_run=args.dry_run,
            force=args.force,
            use_batch=args.batch_api,
        )
        print(json.dumps(results, indent=2))
        failed = sum(1 for r in results if r.get("status") == "failed")
        print(f"\nDone: {len(results)} processed, {failed} failed", file=sys.stderr)
        return 0

    if args.command == "requeue":
        from .runner import requeue_by_flag

        results = requeue_by_flag(args.flag, dry_run=args.dry_run)
        print(json.dumps(results, indent=2))
        return 0

    if args.command == "audit-sequence":
        from .db import fetch_paper_ids
        from .sequence_audit import audit_all_papers, audit_paper_sequence

        if args.paper_id:
            audits = [audit_paper_sequence(args.paper_id)]
        else:
            audits = audit_all_papers(fetch_paper_ids())
        print(json.dumps(audits, indent=2))
        return 0

    return 1


if __name__ == "__main__":
    raise SystemExit(main())
