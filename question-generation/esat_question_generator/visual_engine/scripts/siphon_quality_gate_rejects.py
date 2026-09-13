#!/usr/bin/env python3
"""Siphon bad non-diagram (none/table) pending items via ESAT quality gate.

Runs ``quality_gate.assess_question`` plus deterministic MathJax/table/syntax
checks. REJECT decisions are written to Streamlit ``review.db`` as ``rejected``.

Usage (from question-generation/esat_question_generator):

  set QUALITY_GATE_DETERMINISTIC=1
  python -u -m visual_engine.scripts.siphon_quality_gate_rejects --workers 2
  python -u -m visual_engine.scripts.siphon_quality_gate_rejects --dry-run --limit 20
"""

from __future__ import annotations

import argparse
import json
import os
import time
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from quality_gate.assess import assess_question
from quality_gate.defaults import default_sync_model, make_vertex_llm_client
from quality_gate.presentation_checks import detect_presentation_issues, has_presentation_reject
from quality_gate.schemas import effective_action
from visual_engine.review_store import DEFAULT_DB_PATH, ReviewStore

FEEDBACK_PREFIX = "[quality_gate]"
NON_DIAGRAM_TYPES = frozenset({"none", "table", "text", ""})

# Actions / outcomes that leave the pending human queue.
REJECT_ACTIONS = frozenset({"delete", "regenerate"})


def _safe_console(text: str) -> str:
    return (text or "").encode("ascii", errors="replace").decode("ascii")


def _visual_type(item: dict[str, Any]) -> str:
    try:
        source = json.loads(item.get("source_json") or "{}")
    except json.JSONDecodeError:
        source = {}
    if isinstance(source, dict):
        return str(source.get("visual_type") or "").strip().lower()
    return ""


def _parse_choices(raw: Any) -> dict[str, str]:
    if isinstance(raw, dict):
        return {str(k): str(v) for k, v in raw.items()}
    if isinstance(raw, str) and raw.strip():
        try:
            obj = json.loads(raw)
        except json.JSONDecodeError:
            return {}
        if isinstance(obj, dict):
            return {str(k): str(v) for k, v in obj.items()}
    return {}


def review_item_to_gate_row(item: dict[str, Any]) -> dict[str, Any]:
    expl = str(item.get("explanation") or "")
    insight = next((ln.strip() for ln in expl.splitlines() if ln.strip()), "")
    correct = str(item.get("correct_answer") or "").strip().upper().replace(",", " ").split()
    correct_option = correct[0] if correct else ""
    return {
        "id": item.get("question_id"),
        "subjects": item.get("subject") or "",
        "difficulty": item.get("difficulty") or "Medium",
        "primary_tag": "",
        "secondary_tags": [],
        "question_stem": item.get("stem") or "",
        "options": _parse_choices(item.get("choices_json")),
        "correct_option": correct_option,
        "solution_reasoning": expl,
        "solution_key_insight": insight,
        "distractor_map": {},
        "status": "pending",
        "test_type": "ESAT",
        "visual_type": _visual_type(item),
        "siphon_presentation_mode": True,
    }


def _select_pending_nondiagram(store: ReviewStore, *, limit: int) -> list[dict[str, Any]]:
    items = store.list_items(status_filter="pending", latest_only=True)
    selected: list[dict[str, Any]] = []
    for item in items:
        vt = _visual_type(item)
        if vt not in {"none", "table", "text", ""}:
            continue
        selected.append(item)
        if limit > 0 and len(selected) >= limit:
            break
    return selected


def _should_reject(
    *,
    presentation_issues: list[dict[str, Any]],
    result: Any | None,
    eff: str,
) -> tuple[bool, list[str]]:
    """Strict siphon: keep only clean ESAT-fit items for human review."""
    reasons: list[str] = []
    if has_presentation_reject(presentation_issues):
        reasons.extend(
            str(i.get("code") or "presentation")
            for i in presentation_issues
            if str(i.get("severity") or "") == "reject"
        )
        return True, list(dict.fromkeys(reasons))

    if result is None:
        return False, reasons

    verdict = str(getattr(result, "verdict", "") or "")
    match = str(getattr(result, "curriculum_match", "") or "")
    formatting_score = int(getattr(result, "formatting_score", 5) or 5)
    pacing = int(getattr(result, "pacing_score", 5) or 5)
    labels = [str(x) for x in (getattr(result, "disposition_labels", None) or [])]

    if eff in REJECT_ACTIONS:
        reasons.append(f"action:{eff}")
    if verdict == "Major":
        reasons.append("verdict:Major")
    if match in {"out_of_syllabus", "borderline"}:
        reasons.append(match)
    if formatting_score <= 3:
        reasons.append("formatting_score_low")
    if pacing <= 2:
        reasons.append("pacing_unfit")
    for lab in labels:
        if lab in {
            "off_syllabus",
            "too_hard",
            "formatting",
            "needs_diagram",
            "not_esat",
            "too_easy",
            "wrong_answer_key",
            "wrong_answer_key_fixed",
        }:
            reasons.append(f"label:{lab}")

    # Default bias: only leave clear Pass / in-syllabus / well-formatted items.
    keep_ok = (
        eff in {"approve", "human_review", "move_to_math2"}
        and verdict in {"Pass", "Minor"}
        and match == "in_syllabus"
        and formatting_score >= 4
        and pacing >= 3
        and not reasons
    )
    if keep_ok:
        return False, []

    if not reasons:
        reasons.append(f"not_clean_pass(eff={eff},verdict={verdict},curriculum={match})")
    return True, list(dict.fromkeys(reasons))


def _feedback(
    *,
    reasons: list[str],
    presentation_issues: list[dict[str, Any]],
    result: Any | None,
    eff: str,
) -> str:
    parts = [FEEDBACK_PREFIX, ",".join(reasons) or "reject"]
    if result is not None:
        parts.append(f"action={eff}")
        parts.append(f"verdict={getattr(result, 'verdict', '')}")
        match = getattr(result, "curriculum_match", None)
        if match:
            parts.append(f"curriculum={match}")
        reasoning = str(getattr(result, "reasoning", "") or "").strip()
        if reasoning:
            parts.append(reasoning[:400])
    else:
        msgs = [str(i.get("message") or i.get("code") or "") for i in presentation_issues[:4]]
        parts.extend([m for m in msgs if m])
    return " | ".join(parts)[:1800]


def _apply_reject(store: ReviewStore, item: dict[str, Any], feedback: str) -> None:
    qid = str(item.get("question_id") or "")
    store.set_question_status(qid, "rejected", feedback=feedback)
    diagram = item.get("diagram") or {}
    attempt_id = diagram.get("id") if isinstance(diagram, dict) else None
    if attempt_id:
        store.set_diagram_status(int(attempt_id), "rejected", feedback=feedback)


def _eval_one(item: dict[str, Any], *, model: str, llm: Any) -> dict[str, Any]:
    t0 = time.perf_counter()
    row = review_item_to_gate_row(item)
    presentation = detect_presentation_issues(row, visual_type=str(row.get("visual_type") or ""))
    result = None
    eff = ""
    raw = ""
    used_model = ""
    err = ""

    # Hard deterministic reject first (no LLM cost).
    if has_presentation_reject(presentation):
        reject, reasons = _should_reject(presentation_issues=presentation, result=None, eff="")
        return {
            "question_id": item.get("question_id"),
            "subject": item.get("subject"),
            "visual_type": row.get("visual_type"),
            "decision": "REJECT" if reject else "KEEP",
            "reasons": reasons,
            "source": "presentation",
            "eff": "",
            "verdict": "",
            "curriculum_match": "",
            "elapsed_s": round(time.perf_counter() - t0, 3),
            "error": "",
            "feedback": _feedback(
                reasons=reasons,
                presentation_issues=presentation,
                result=None,
                eff="",
            ),
            "_item": item,
        }

    try:
        result, raw, used_model = assess_question(llm, row, model=model, temperature=0.2)
        eff = effective_action(result, row=row)
        reject, reasons = _should_reject(
            presentation_issues=presentation,
            result=result,
            eff=eff,
        )
    except Exception as exc:  # noqa: BLE001
        err = str(exc)
        # Do not siphon on transient API/parser failures; leave pending.
        reject = False
        reasons = ["evaluator_error"]
        result = None
        eff = "human_review"

    return {
        "question_id": item.get("question_id"),
        "subject": item.get("subject"),
        "visual_type": row.get("visual_type"),
        "decision": "REJECT" if reject else "KEEP",
        "reasons": reasons,
        "source": "quality_gate",
        "eff": eff,
        "verdict": str(getattr(result, "verdict", "") or ""),
        "curriculum_match": str(getattr(result, "curriculum_match", "") or ""),
        "formatting_score": int(getattr(result, "formatting_score", 0) or 0) if result else None,
        "pacing": int(getattr(result, "pacing_score", 0) or 0) if result else None,
        "model": used_model,
        "elapsed_s": round(time.perf_counter() - t0, 3),
        "error": err,
        "feedback": _feedback(
            reasons=reasons,
            presentation_issues=presentation,
            result=result,
            eff=eff,
        ),
        "reasoning_excerpt": str(getattr(result, "reasoning", "") or "")[:300] if result else "",
        "_item": item,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", default=str(DEFAULT_DB_PATH))
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--workers", type=int, default=2)
    parser.add_argument("--model", default="")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--out-dir", default="")
    args = parser.parse_args()

    # Prefer deterministic prechecks during siphon.
    os.environ.setdefault("QUALITY_GATE_DETERMINISTIC", "1")
    try:
        from dotenv import load_dotenv

        here = Path(__file__).resolve()
        for env_path in (
            here.parents[4] / ".env.local",  # repo root
            here.parents[2] / ".env.local",  # esat_question_generator
            Path.cwd() / ".env.local",
        ):
            if env_path.is_file():
                load_dotenv(env_path, override=False)
    except ImportError:
        pass

    store = ReviewStore(Path(args.db))
    items = _select_pending_nondiagram(store, limit=int(args.limit or 0))
    if not items:
        print("No pending none/table questions found.", flush=True)
        return 0

    model = (args.model or default_sync_model()).strip()
    llm = make_vertex_llm_client()
    print(
        f"Quality-gate siphoning {len(items)} pending none/table items "
        f"(model={model}, workers={args.workers}, dry_run={args.dry_run})",
        flush=True,
    )

    rows: list[dict[str, Any]] = []
    decisions: Counter[str] = Counter()
    workers = max(1, int(args.workers))

    def _handle(row: dict[str, Any], idx: int) -> None:
        item = row.pop("_item")
        if row["decision"] == "REJECT" and not args.dry_run:
            _apply_reject(store, item, str(row.get("feedback") or FEEDBACK_PREFIX))
            row["applied"] = "rejected"
        else:
            row["applied"] = "none" if row["decision"] == "KEEP" else "dry_run_reject"
        decisions[row["decision"]] += 1
        rows.append(row)
        print(
            _safe_console(
                f"[{idx}/{len(items)}] {row['decision']} {row['question_id']} "
                f"src={row['source']} eff={row.get('eff')} "
                f"reasons={row.get('reasons')} ({row['elapsed_s']}s)"
            ),
            flush=True,
        )

    if workers == 1:
        for i, item in enumerate(items, 1):
            _handle(_eval_one(item, model=model, llm=llm), i)
    else:
        with ThreadPoolExecutor(max_workers=workers) as pool:
            futures = {
                pool.submit(_eval_one, item, model=model, llm=llm): item for item in items
            }
            done = 0
            for fut in as_completed(futures):
                done += 1
                _handle(fut.result(), done)

    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    out_dir = Path(args.out_dir) if args.out_dir else (
        Path(__file__).resolve().parents[1] / "eval" / "output" / f"siphon_qg_{stamp}"
    )
    out_dir.mkdir(parents=True, exist_ok=True)
    reject_n = int(decisions.get("REJECT", 0))
    report = {
        "created_at": datetime.now(timezone.utc).isoformat(),
        "db": str(Path(args.db).resolve()),
        "dry_run": bool(args.dry_run),
        "model": model,
        "n": len(rows),
        "decisions": dict(decisions),
        "reject_rate": round(reject_n / len(rows), 4) if rows else 0.0,
        "counts_after": store.counts() if not args.dry_run else None,
        "rows": rows,
    }
    (out_dir / "report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    summary = "\n".join(
        [
            "# Quality-gate non-diagram siphon",
            "",
            f"- Evaluated: **{len(rows)}** pending none/table questions",
            f"- REJECT: **{reject_n}** ({report['reject_rate']:.1%})",
            f"- KEEP (left pending): **{decisions.get('KEEP', 0)}**",
            f"- dry_run: `{args.dry_run}`",
            f"- model: `{model}`",
            "",
        ]
    )
    (out_dir / "SUMMARY.md").write_text(summary, encoding="utf-8")
    print(json.dumps({"decisions": dict(decisions), "reject_rate": report["reject_rate"], "out_dir": str(out_dir)}, indent=2), flush=True)
    print(f"Wrote {out_dir / 'SUMMARY.md'}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
