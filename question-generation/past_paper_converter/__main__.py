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

    revalidate_p = sub.add_parser(
        "revalidate",
        help="Re-check failed conversions without calling the model (rule-change recovery)",
    )
    revalidate_p.add_argument("--flag", required=True, help="e.g. missing_options")
    revalidate_p.add_argument("--dry-run", action="store_true")

    audit_p = sub.add_parser("audit-sequence", help="Run paper sequence audit only")
    audit_p.add_argument("--paper-id", type=int, default=None)

    place_p = sub.add_parser(
        "place-stems",
        help="Batch-decide mid-stem diagram slots (no recrop; sidecar only)",
    )
    place_scope = place_p.add_mutually_exclusive_group(required=True)
    place_scope.add_argument("--all", action="store_true", help="All stem-diagram questions")
    place_scope.add_argument("--question-id", type=int, default=None)
    place_scope.add_argument("--exam", type=str, default=None, help="ENGAA, NSAA, TMUA")
    place_p.add_argument("--limit", type=int, default=None)
    place_p.add_argument("--dry-run", action="store_true")
    place_p.add_argument(
        "--resume",
        action="store_true",
        help="Skip question ids that already have status=ok sidecars",
    )
    place_p.add_argument(
        "--force",
        action="store_true",
        help="Redo even when an ok sidecar exists",
    )
    place_p.add_argument("--model", type=str, default=None, help="Override batch model id")

    apply_p = sub.add_parser(
        "apply-stems",
        help="Apply placement sidecars into live stems (inline figures + display width)",
    )
    apply_scope = apply_p.add_mutually_exclusive_group(required=True)
    apply_scope.add_argument("--all", action="store_true", help="All stem-diagram questions")
    apply_scope.add_argument("--question-id", type=int, default=None)
    apply_scope.add_argument("--exam", type=str, default=None, help="ENGAA, NSAA, TMUA")
    apply_p.add_argument("--limit", type=int, default=None)
    apply_p.add_argument("--dry-run", action="store_true")
    apply_p.add_argument(
        "--resume",
        action="store_true",
        help="Skip sidecars that already have applyStatus=ok",
    )
    apply_p.add_argument(
        "--force",
        action="store_true",
        help="Re-apply even when applyStatus=ok",
    )

    final_p = sub.add_parser(
        "place-and-apply-stems",
        help="Run place-stems then apply-stems (final diagram layout pass)",
    )
    final_scope = final_p.add_mutually_exclusive_group(required=True)
    final_scope.add_argument("--all", action="store_true")
    final_scope.add_argument("--question-id", type=int, default=None)
    final_scope.add_argument("--exam", type=str, default=None)
    final_p.add_argument("--limit", type=int, default=None)
    final_p.add_argument("--dry-run", action="store_true")
    final_p.add_argument("--resume", action="store_true")
    final_p.add_argument("--force", action="store_true")
    final_p.add_argument("--model", type=str, default=None)

    resume_p = sub.add_parser(
        "resume-remaining",
        help="Re-run failed conversions first, then remaining image questions (force=True)",
    )
    resume_p.add_argument(
        "--workers",
        type=int,
        default=int(__import__("os").environ.get("PAST_PAPER_WORKERS", "2")),
    )

    retry_p = sub.add_parser(
        "retry-until-success",
        help="Force-retry failed conversions until they approve",
    )
    retry_p.add_argument("--question-id", type=int, action="append", default=None)
    retry_p.add_argument("--max-attempts", type=int, default=8)

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

    if args.command == "revalidate":
        from .runner import revalidate_failed_by_flag

        results = revalidate_failed_by_flag(args.flag, dry_run=args.dry_run)
        approved = sum(1 for r in results if r.get("status") == "auto_approved")
        failed = sum(1 for r in results if r.get("status") == "failed")
        print(json.dumps({"approved": approved, "failed": failed, "results": results}, indent=2))
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

    if args.command == "place-stems":
        from .place_stems import place_stems

        result = place_stems(
            all_questions=bool(getattr(args, "all", False)),
            question_id=args.question_id,
            exam_name=args.exam,
            limit=args.limit,
            dry_run=args.dry_run,
            resume=args.resume,
            force=args.force,
            model=args.model,
        )
        print(json.dumps(result, indent=2))
        if result.get("status") == "completed" and int(result.get("failed") or 0) > 0:
            return 2
        return 0

    if args.command == "apply-stems":
        from .apply_stems import apply_stems

        result = apply_stems(
            all_questions=bool(getattr(args, "all", False)),
            question_id=args.question_id,
            exam_name=args.exam,
            limit=args.limit,
            dry_run=args.dry_run,
            resume=args.resume,
            force=args.force,
        )
        print(json.dumps(result, indent=2))
        if result.get("status") == "completed" and int(result.get("failed") or 0) > 0:
            return 2
        return 0

    if args.command == "place-and-apply-stems":
        from .apply_stems import apply_stems
        from .place_stems import place_stems

        place_result = place_stems(
            all_questions=bool(getattr(args, "all", False)),
            question_id=args.question_id,
            exam_name=args.exam,
            limit=args.limit,
            dry_run=args.dry_run,
            resume=args.resume,
            force=args.force,
            model=args.model,
        )
        apply_result = apply_stems(
            all_questions=bool(getattr(args, "all", False)),
            question_id=args.question_id,
            exam_name=args.exam,
            limit=args.limit,
            dry_run=args.dry_run,
            resume=False if args.force else args.resume,
            force=args.force,
        )
        print(
            json.dumps(
                {"place": place_result, "apply": apply_result},
                indent=2,
            )
        )
        failed = int(place_result.get("failed") or 0) + int(apply_result.get("failed") or 0)
        return 2 if failed > 0 else 0

    if args.command == "resume-remaining":
        from .resume_remaining import resume_remaining

        workers = max(1, min(8, int(args.workers)))
        result = resume_remaining(workers=workers)
        print(json.dumps(result, indent=2))
        if result.get("status") == "paused_failure_spike":
            return 2
        return 0

    if args.command == "retry-until-success":
        from .retry_until_success import retry_until_success

        result = retry_until_success(
            args.question_id,
            max_attempts=args.max_attempts,
        )
        print(json.dumps(result, indent=2))
        return 0 if result.get("status") == "completed" else 2

    return 1


if __name__ == "__main__":
    raise SystemExit(main())
