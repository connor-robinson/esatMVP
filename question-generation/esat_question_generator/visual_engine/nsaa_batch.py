"""Generate NSAA-sourced sibling/far questions into the review queue.

Example:

    python -m visual_engine.nsaa_batch --n 10
    python -m visual_engine.nsaa_batch --subject chemistry --n 10
    python -m visual_engine.nsaa_batch --subject biology --diagrams-only --n 5
    python -m visual_engine.nsaa_batch --dry-run
"""

from __future__ import annotations

import argparse
import json
import sys
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

_PKG_ROOT = Path(__file__).resolve().parent.parent
_QGEN_ROOT = _PKG_ROOT.parent
if str(_PKG_ROOT) not in sys.path:
    sys.path.insert(0, str(_PKG_ROOT))
if str(_QGEN_ROOT) not in sys.path:
    sys.path.insert(0, str(_QGEN_ROOT))

from visual_engine.auto_checks import has_reject, run_auto_checks
from visual_engine.diagram_designer import DiagramDesignerInput
from visual_engine.eval.question_selector import (
    EvalQuestion,
    download_diagram,
    paper_subject,
    select_nsaa_diagram_questions,
    select_nsaa_subject_questions,
)
from visual_engine.generation import GenerationResult, generate_diagram, regenerate_diagram
from visual_engine.question_designer import (
    NSAA_DIAGRAM_MODEL,
    RENDERED_VISUAL_TYPES,
    NsaaQuestionDesign,
    NsaaQuestionDesignerInput,
    run_nsaa_question_designer,
    visual_type_of,
)
from visual_engine.render_matplotlib import render_diagram
from visual_engine.review_store import ReviewStore
from visual_engine.science_visuals import apparatus_spec, chem_structure_spec, pedigree_spec
from visual_engine.subject_review import run_subject_verifier, verdict_is_pass
from visual_engine.tables import (
    ensure_table_in_stem,
    fill_options_from_option_table,
    table_auto_flags,
)

ARTIFACTS = Path(__file__).resolve().parent / "review_data" / "artifacts"
STATUS_PATH = Path(__file__).resolve().parent / "review_data" / "nsaa_batch_status.json"
PIPELINE = "nsaa"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def nsaa_question_id(source_id: int | str) -> str:
    return f"nsaa-{source_id}"


def review_subject(eq: EvalQuestion) -> str:
    sub = paper_subject(eq.paper_name, eq.part_name)
    return {"chemistry": "Chemistry", "biology": "Biology"}.get(sub, "NSAA")


def _designer_subject(eq: EvalQuestion) -> str:
    return paper_subject(eq.paper_name, eq.part_name)


def _save_source_image(eq: EvalQuestion, out_dir: Path) -> Path | None:
    source_png = out_dir / "source_diagram.png"
    if source_png.is_file():
        return source_png
    url = str(eq.diagram_url or eq.source_image_url or "").strip()
    if not url:
        return None
    try:
        source_png.write_bytes(download_diagram(eq) if eq.diagram_url else download_image_url(url))
        return source_png
    except Exception:
        return None


def download_image_url(url: str) -> bytes:
    from past_paper_converter.export_questions import download_image

    return download_image(url)


def _result_from_spec(
    *,
    question_id: str,
    spec: dict[str, Any],
    out_dir: Path,
    attempt: int,
    choices: dict[str, str],
    correct_answer: str,
    parent_attempt_id: int | None = None,
) -> GenerationResult:
    attempt_dir = out_dir / f"attempt_{attempt:02d}"
    attempt_dir.mkdir(parents=True, exist_ok=True)
    spec_path = attempt_dir / "visual_spec.json"
    spec_path.write_text(json.dumps(spec, ensure_ascii=False, indent=2), encoding="utf-8")
    png_path = attempt_dir / "rendered.png"
    result = GenerationResult(question_id=question_id, attempt=attempt, ok=False, parent_attempt_id=parent_attempt_id)
    try:
        render_diagram(spec, png_path)
        (out_dir / "rendered.png").write_bytes(png_path.read_bytes())
        (out_dir / "visual_spec.json").write_text(spec_path.read_text(encoding="utf-8"), encoding="utf-8")
        result.ok = True
        result.spec = spec
        result.png_path = png_path
        result.spec_path = spec_path
    except Exception as exc:
        result.error = f"{type(exc).__name__}: {exc}"
        result.spec = spec
        result.spec_path = spec_path
        if png_path.is_file():
            result.png_path = png_path
            try:
                (out_dir / "rendered.png").write_bytes(png_path.read_bytes())
                (out_dir / "visual_spec.json").write_text(spec_path.read_text(encoding="utf-8"), encoding="utf-8")
            except OSError:
                pass
    result.auto_flags = run_auto_checks(
        png_path=result.png_path,
        spec=result.spec,
        render_error=result.error,
        collision_failure="collision" in result.error.lower() or "label" in result.error.lower(),
        choices=choices,
        correct_answer=correct_answer,
        diagram_required=True,
    )
    return result


def _write_status(payload: dict[str, Any]) -> None:
    STATUS_PATH.parent.mkdir(parents=True, exist_ok=True)
    STATUS_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _load_env() -> None:
    from visual_engine.llm import _load_env as load_diagram_env

    load_diagram_env()


def _parse_options(raw: Any) -> dict[str, str]:
    if isinstance(raw, dict):
        return {str(k).strip().upper(): str(v) for k, v in raw.items() if str(v).strip()}
    return {}


def attach_source_options(questions: list[EvalQuestion]) -> dict[int, dict[str, str]]:
    """Best-effort options from live questions / conversions. Empty if DB unavailable."""
    if not questions:
        return {}
    try:
        from past_paper_converter.db import make_client
    except Exception:
        return {}
    ids = [eq.question_id for eq in questions]
    by_id: dict[int, dict[str, str]] = {}
    try:
        client = make_client()
        for i in range(0, len(ids), 100):
            chunk = ids[i : i + 100]
            rows = (
                client.table("questions")
                .select("id, options")
                .in_("id", chunk)
                .execute()
                .data
                or []
            )
            for row in rows:
                opts = _parse_options(row.get("options"))
                if opts:
                    by_id[int(row["id"])] = opts
            conv_rows = (
                client.table("question_conversions")
                .select("question_id, options, status")
                .in_("question_id", chunk)
                .eq("status", "auto_approved")
                .execute()
                .data
                or []
            )
            for row in conv_rows:
                qid = int(row["question_id"])
                if qid in by_id:
                    continue
                opts = _parse_options(row.get("options"))
                if opts:
                    by_id[qid] = opts
    except Exception:
        return by_id
    return by_id


def already_generated_ids(store: ReviewStore) -> set[int]:
    found: set[int] = set()
    for item in store.list_items(status_filter="all", latest_only=True, pipeline=PIPELINE):
        qid = str(item.get("question_id") or "")
        if qid.startswith("nsaa-"):
            try:
                found.add(int(qid.split("-", 1)[1]))
            except ValueError:
                continue
        source = {}
        try:
            source = json.loads(item.get("source_json") or "{}")
        except json.JSONDecodeError:
            source = {}
        raw = source.get("source_question_id")
        if raw is not None:
            try:
                found.add(int(raw))
            except (TypeError, ValueError):
                pass
    return found


def _idea_plan_for_diagram(design: NsaaQuestionDesign) -> dict[str, Any]:
    plan = dict(design.idea_plan or {})
    plan["new_question"] = {
        "stem": design.stem,
        "options": design.options,
        "correct_option": design.correct_option,
    }
    plan["variation_mode"] = design.variation_mode
    if plan.get("visual_type") == "graph" and not plan.get("graph_preset"):
        plan["graph_preset"] = "science_xy"
    return plan


def _enqueue(
    store: ReviewStore,
    *,
    question_id: str,
    design: NsaaQuestionDesign,
    source: dict[str, Any],
    png_path: str,
    spec_path: str,
    spec: dict[str, Any] | None,
    source_image_path: str,
    auto_flags: list[dict[str, Any]],
    attempt: int = 1,
    parent_attempt_id: int | None = None,
    previous_attempt_ids: list[int] | None = None,
    original_spec: dict[str, Any] | None = None,
    subject: str = "NSAA",
    diagram_required: bool = True,
) -> None:
    q_status = "needs_edit" if has_reject(auto_flags) else "pending"
    store.upsert_question(
        question_id=question_id,
        subject=subject,
        topic=design.variation_mode,
        variation_mode=design.variation_mode,
        difficulty=design.difficulty,
        stem=design.stem,
        choices=design.options,
        correct_answer=design.correct_option,
        explanation=design.explanation,
        diagram_required=diagram_required,
        diagram_status="pending" if diagram_required else "none",
        question_status=q_status,
        auto_flags=auto_flags,
        source=source,
    )
    store.add_diagram_attempt(
        question_id=question_id,
        attempt=attempt,
        image_path=png_path,
        spec_path=spec_path,
        source_image_path=source_image_path,
        original_spec=original_spec or spec or {},
        generation_spec=spec or {},
        status="pending",
        parent_attempt_id=parent_attempt_id,
        previous_attempt_ids=previous_attempt_ids,
    )


def generate_one(
    eq: EvalQuestion,
    *,
    store: ReviewStore,
    source_options: dict[str, str] | None = None,
    model: str = NSAA_DIAGRAM_MODEL,
    thinking_level: str = "high",
    repair_feedback: str = "",
    prior_question: dict[str, Any] | None = None,
    parent_attempt_id: int | None = None,
    previous_attempt_ids: list[int] | None = None,
    attempt: int = 1,
    mix_hint: str = "",
    require_rendered_visual: bool = False,
) -> dict[str, Any]:
    qid = nsaa_question_id(eq.question_id)
    out_dir = ARTIFACTS / qid
    out_dir.mkdir(parents=True, exist_ok=True)
    source_png = _save_source_image(eq, out_dir)
    designer_subject = _designer_subject(eq)
    review_sub = review_subject(eq)

    q_inp = NsaaQuestionDesignerInput(
        source_question_id=str(eq.question_id),
        reference_question=eq.reference_question,
        reference_options=source_options or {},
        diagram_image_path=source_png,
        exam_year=eq.exam_year,
        paper_name=eq.paper_name,
        question_number=eq.question_number,
        subject=designer_subject,
        repair_feedback=repair_feedback,
        prior_question=prior_question,
        mix_hint=mix_hint,
    )
    design = run_nsaa_question_designer(q_inp, model=model, thinking_level=thinking_level)
    (out_dir / "question_design.json").write_text(
        json.dumps(design.raw, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    if design.skip:
        return {
            "status": "skipped",
            "question_id": qid,
            "source_question_id": eq.question_id,
            "skip_reason": design.skip_reason,
            "model": design.model,
        }

    visual_type = visual_type_of(design.idea_plan)
    if designer_subject == "mathematics" and not visual_type:
        visual_type = "graph"
    if require_rendered_visual and visual_type not in RENDERED_VISUAL_TYPES:
        return {
            "status": "skipped",
            "question_id": qid,
            "source_question_id": eq.question_id,
            "skip_reason": f"diagrams-only batch skipped visual_type {visual_type or 'none'}",
            "visual_type": visual_type or "none",
            "model": design.model,
        }
    table = design.idea_plan.get("table") if isinstance(design.idea_plan.get("table"), dict) else None
    if visual_type == "table" or table:
        design.stem = ensure_table_in_stem(design.stem, table)
        design.idea_plan["visual_type"] = visual_type or "table"
    design.options = fill_options_from_option_table(design.stem, design.options)

    diagram_required = visual_type in {"graph", "chem_structure", "apparatus", "bio_diagram", "pedigree"}
    source_image_path = str(source_png) if source_png else ""
    result: GenerationResult | None = None
    auto_flags: list[dict[str, Any]] = []

    if visual_type in {"none", "table", ""}:
        auto_flags = table_auto_flags(table) if visual_type == "table" else []
        result = GenerationResult(question_id=qid, attempt=attempt, ok=True, parent_attempt_id=parent_attempt_id)
        result.auto_flags = auto_flags
    elif visual_type == "chem_structure":
        spec = chem_structure_spec(
            design.idea_plan.get("chem_structure") or {},
            source_question_id=qid,
            variation_mode=design.variation_mode,
        )
        result = _result_from_spec(
            question_id=qid,
            spec=spec,
            out_dir=out_dir,
            attempt=attempt,
            choices=design.options,
            correct_answer=design.correct_option,
            parent_attempt_id=parent_attempt_id,
        )
        auto_flags = result.auto_flags
    elif visual_type == "apparatus":
        spec = apparatus_spec(
            design.idea_plan.get("apparatus") or {},
            source_question_id=qid,
            variation_mode=design.variation_mode,
        )
        result = _result_from_spec(
            question_id=qid,
            spec=spec,
            out_dir=out_dir,
            attempt=attempt,
            choices=design.options,
            correct_answer=design.correct_option,
            parent_attempt_id=parent_attempt_id,
        )
        auto_flags = result.auto_flags
    elif visual_type == "pedigree":
        spec = pedigree_spec(
            design.idea_plan.get("pedigree") or {},
            source_question_id=qid,
            variation_mode=design.variation_mode,
        )
        result = _result_from_spec(
            question_id=qid,
            spec=spec,
            out_dir=out_dir,
            attempt=attempt,
            choices=design.options,
            correct_answer=design.correct_option,
            parent_attempt_id=parent_attempt_id,
        )
        auto_flags = result.auto_flags
    else:
        idea_plan = _idea_plan_for_diagram(design)
        idea_plan["original_stem"] = eq.reference_question
        d_inp = DiagramDesignerInput(
            reference_question=design.stem,
            diagram_image_path=source_png,
            subject=designer_subject if designer_subject in {"chemistry", "biology"} else "mathematics",
            math_paper="NSAA",
            target_difficulty=design.difficulty,
            variation_mode=design.variation_mode,
            idea_plan=idea_plan,
            source_question_id=qid,
        )
        result = generate_diagram(
            d_inp,
            out_dir,
            attempt=attempt,
            designer_model=model,
            thinking_level=thinking_level,
            choices=design.options,
            correct_answer=design.correct_option,
            parent_attempt_id=parent_attempt_id,
        )
        auto_flags = result.auto_flags
        if has_reject(result.auto_flags) and result.spec and attempt == 1:
            critique = "\n".join(f"- {f.get('message')}" for f in result.auto_flags)
            result2 = regenerate_diagram(
                d_inp,
                out_dir,
                critique=critique,
                prior_spec=result.spec,
                attempt=2,
                designer_model=model,
                thinking_level=thinking_level,
                choices=design.options,
                correct_answer=design.correct_option,
                parent_attempt_id=parent_attempt_id,
            )
            result = result2
            auto_flags = result2.auto_flags
            attempt = 2

    verifier: dict[str, Any] = {}
    if designer_subject in {"chemistry", "biology"}:
        image_bytes = None
        png = result.png_path if result else None
        if png and Path(png).is_file():
            image_bytes = Path(png).read_bytes()
        try:
            verifier = run_subject_verifier(
                subject=designer_subject,
                stem=design.stem,
                options=design.options,
                correct_option=design.correct_option,
                explanation=design.explanation,
                idea_plan=design.idea_plan,
                image_bytes=image_bytes,
                model=model,
            )
            (out_dir / "verifier.json").write_text(
                json.dumps(verifier, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            if not verdict_is_pass(verifier):
                auto_flags = list(auto_flags) + [
                    {
                        "code": "verifier_fail",
                        "message": str(verifier.get("notes") or verifier.get("reasons") or "Verifier FAIL"),
                        "severity": "reject",
                    }
                ]
        except Exception as exc:
            verifier = {"verdict": "ERROR", "notes": f"{type(exc).__name__}: {exc}"}
            auto_flags = list(auto_flags) + [
                {
                    "code": "verifier_error",
                    "message": str(exc),
                    "severity": "flag",
                }
            ]

    source = _source_payload(eq, design, source_image_path, model)
    source["visual_type"] = visual_type or "none"
    source["subject"] = designer_subject
    source["verifier"] = verifier
    _enqueue(
        store,
        question_id=qid,
        design=design,
        source=source,
        png_path=str(result.png_path or "") if result else "",
        spec_path=str(result.spec_path or "") if result else "",
        spec=result.spec if result else None,
        source_image_path=source_image_path,
        auto_flags=auto_flags,
        attempt=attempt,
        parent_attempt_id=parent_attempt_id,
        previous_attempt_ids=previous_attempt_ids,
        original_spec=result.spec if result else None,
        subject=review_sub,
        diagram_required=diagram_required,
    )
    return {
        "status": "generated",
        "question_id": qid,
        "source_question_id": eq.question_id,
        "variation_mode": design.variation_mode,
        "visual_type": visual_type or "none",
        "subject": designer_subject,
        "attempt": attempt,
        "reject": has_reject(auto_flags),
        "verifier": verifier.get("verdict"),
        "error": result.error if result else "",
        "model": model,
    }


def _source_payload(eq: EvalQuestion, design: NsaaQuestionDesign, source_image_path: str, model: str) -> dict[str, Any]:
    return {
        "pipeline": PIPELINE,
        "source_question_id": eq.question_id,
        "exam_name": eq.exam_name,
        "exam_year": eq.exam_year,
        "paper_name": eq.paper_name,
        "part_name": eq.part_name,
        "question_number": eq.question_number,
        "source_stem": eq.reference_question,
        "variation_mode": design.variation_mode,
        "mode_reason": design.mode_reason,
        "source_image_path": source_image_path,
        "idea_plan": design.idea_plan,
        "visual_type": visual_type_of(design.idea_plan) or "none",
        "diagram_model": model,
        "question_model": design.model or model,
    }


def _looks_like_diagram_stem(stem: str) -> bool:
    low = (stem or "").lower()
    hints = (
        "graph",
        "diagram",
        "figure",
        "pedigree",
        "family tree",
        "structural formula",
        "displayed formula",
        "the curve",
        "axes",
        "labelled",
        "schematic",
    )
    return any(hint in low for hint in hints)


def _mix_hint(subject: str, counts: dict[str, int], *, diagrams_only: bool = False) -> str:
    if diagrams_only:
        return (
            "This batch is for reviewing rendered diagrams only. "
            "Set idea_plan.visual_type to graph, chem_structure, apparatus, bio_diagram, or pedigree. "
            "Do not use none or table. "
            "For graphs, set graph_preset to one of cartesian, science_xy, log_x, signed_y, multi_series. "
            "For chem_structure, provide SMILES only (no hand-placed atoms). "
            "For apparatus, list reusable components (beaker, conical_flask, test_tube, gas_jar, delivery_tube, bunsen, stand). "
            "If the source cannot support a genuine diagram, set skip true."
        )
    if subject == "chemistry":
        wants = [
            ("none", 4, "plain-text or calculation questions (visual_type none)"),
            ("table", 2, "table questions"),
            ("chem_structure", 1, "one SMILES structural-formula question"),
            ("apparatus", 1, "one apparatus diagram from the SVG component library"),
        ]
        extra = "Also include formula/equation-heavy stems using \\ce{} when the source supports it."
    elif subject == "biology":
        wants = [
            ("none", 4, "plain-text questions (visual_type none)"),
            ("table", 1, "one table"),
            ("graph", 2, "graphs"),
            ("pedigree", 1, "one pedigree"),
            ("bio_diagram", 1, "one simple labelled schematic"),
        ]
        extra = ""
    else:
        return ""
    missing = [label for key, n, label in wants if counts.get(key, 0) < n]
    if not missing:
        return extra
    return (
        "This batch still needs: "
        + "; ".join(missing)
        + ". Use those formats only when the source question genuinely supports them. "
        + extra
    ).strip()


def _eval_from_source_json(source: dict[str, Any], fallback_qid: str) -> EvalQuestion:
    raw_id = source.get("source_question_id") or fallback_qid.replace("nsaa-", "")
    return EvalQuestion(
        question_id=int(raw_id),
        exam_name=str(source.get("exam_name") or "NSAA"),
        exam_year=int(source.get("exam_year") or 0),
        paper_name=str(source.get("paper_name") or ""),
        question_number=int(source.get("question_number") or 0),
        question_stem=str(source.get("source_stem") or ""),
        diagram_url="",
        diagram_asset_id="diagram_0",
        source_image_url="",
        part_name=str(source.get("part_name") or ""),
    )


def generate_from_input(
    *,
    store: ReviewStore,
    stem: str,
    subject: str,
    options: dict[str, str] | None = None,
    source_image_bytes: bytes | None = None,
    model: str = NSAA_DIAGRAM_MODEL,
) -> dict[str, Any]:
    """Run the existing NSAA designer + renderer from a pasted stem and optional source image."""
    _load_env()
    wanted = (subject or "biology").strip().lower()
    if wanted not in {"mathematics", "chemistry", "biology"}:
        raise ValueError("subject must be mathematics, chemistry, or biology")
    if not stem.strip():
        raise ValueError("stem is empty")
    qid_num = 900_000_000 + (int(datetime.now(timezone.utc).timestamp()) % 1_000_000)
    part = {"chemistry": "Chemistry", "biology": "Biology"}.get(wanted, "Mathematics")
    eq = EvalQuestion(
        question_id=qid_num,
        exam_name="NSAA",
        exam_year=0,
        paper_name="Section 1",
        question_number=0,
        question_stem=stem.strip(),
        diagram_url="",
        diagram_asset_id="",
        source_image_url="",
        part_name=part,
    )
    out_dir = ARTIFACTS / nsaa_question_id(qid_num)
    out_dir.mkdir(parents=True, exist_ok=True)
    if source_image_bytes:
        (out_dir / "source_diagram.png").write_bytes(source_image_bytes)
    return generate_one(
        eq,
        store=store,
        source_options=options or {},
        model=model,
        mix_hint=_mix_hint(wanted, {}, diagrams_only=True),
        require_rendered_visual=True,
    )


def regenerate_nsaa_question(
    store: ReviewStore,
    item: dict[str, Any],
    *,
    feedback: str = "",
    model: str = NSAA_DIAGRAM_MODEL,
) -> dict[str, Any]:
    """Re-run question designer + diagram from the original NSAA source."""
    source = {}
    try:
        source = json.loads(item.get("source_json") or "{}")
    except json.JSONDecodeError:
        source = {}
    if str(source.get("pipeline") or "") != PIPELINE:
        raise ValueError("This item is not an NSAA-sourced question")
    eq = _eval_from_source_json(source, str(item.get("question_id") or ""))
    source_png = Path(source.get("source_image_path") or item.get("diagram", {}).get("source_image_path") or "")
    if source_png.is_file() and not (ARTIFACTS / nsaa_question_id(eq.question_id) / "source_diagram.png").is_file():
        dest = ARTIFACTS / nsaa_question_id(eq.question_id) / "source_diagram.png"
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(source_png.read_bytes())
    prior = {
        "stem": item.get("stem") or "",
        "options": json.loads(item.get("choices_json") or "{}") if isinstance(item.get("choices_json"), str) else (item.get("choices") or {}),
        "correct_option": item.get("correct_answer") or "",
        "explanation": item.get("explanation") or "",
        "variation_mode": item.get("variation_mode") or item.get("topic") or "",
    }
    diagram = item.get("diagram") or {}
    attempt = int(diagram.get("attempt") or 1) + 1
    parent_id = diagram.get("id")
    rec = generate_one(
        eq,
        store=store,
        repair_feedback=feedback,
        prior_question=prior,
        model=model,
        parent_attempt_id=int(parent_id) if parent_id else None,
        previous_attempt_ids=[int(parent_id)] if parent_id else None,
        attempt=attempt,
    )
    if rec.get("status") == "skipped":
        raise ValueError(rec.get("skip_reason") or "Designer skipped this source")
    if rec.get("status") == "error":
        raise ValueError(rec.get("error") or "NSAA regenerate failed")
    return rec


def run_batch(
    *,
    n: int | None = None,
    question_ids: list[int] | None = None,
    dry_run: bool = False,
    force: bool = False,
    math_only: bool = True,
    subject: str = "mathematics",
    model: str = NSAA_DIAGRAM_MODEL,
    diagrams_only: bool = False,
) -> dict[str, Any]:
    _load_env()
    store = ReviewStore()
    wanted = (subject or "mathematics").strip().lower()
    if wanted in {"chemistry", "biology"}:
        selected = select_nsaa_subject_questions(
            subject=wanted,
            count=None if not question_ids else len(question_ids),
            question_ids=question_ids,
            require_diagram=diagrams_only,
        )
    else:
        selected = select_nsaa_diagram_questions(
            count=None if not question_ids else len(question_ids),
            question_ids=question_ids,
            math_only=math_only,
        )
    done = set() if force else already_generated_ids(store)
    remaining = [eq for eq in selected if eq.question_id not in done]
    if diagrams_only:
        remaining.sort(
            key=lambda eq: (
                0 if _looks_like_diagram_stem(eq.question_stem) else 1,
                eq.question_id,
            )
        )
    if n is not None and not diagrams_only:
        remaining = remaining[: max(0, n)]
    elif n is not None and diagrams_only:
        remaining = remaining[: max(n * 6, n)]
    target = n if n is not None else len(remaining)
    summary: dict[str, Any] = {
        "status": "running",
        "pipeline": PIPELINE,
        "model": model,
        "subject": wanted,
        "diagrams_only": diagrams_only,
        "selected": len(selected),
        "already_done": len(done),
        "queued": len(remaining),
        "target": target,
        "ids": [eq.question_id for eq in remaining],
        "generated": 0,
        "skipped": 0,
        "errors": 0,
        "visual_type_counts": {},
        "results": [],
        "started_at": _now(),
    }
    _write_status(summary)
    if dry_run:
        summary["status"] = "dry_run"
        _write_status(summary)
        return summary

    options_by_id = attach_source_options(remaining)
    results: list[dict[str, Any]] = []
    mix_counts: dict[str, int] = {}
    for i, eq in enumerate(remaining, start=1):
        if diagrams_only and summary["generated"] >= target:
            break
        print(f"[NSAA] {i}/{len(remaining)} source {eq.question_id} ({eq.exam_year} {eq.paper_name} Q{eq.question_number})", flush=True)
        try:
            rec = generate_one(
                eq,
                store=store,
                source_options=options_by_id.get(eq.question_id) or {},
                model=model,
                mix_hint=_mix_hint(wanted, mix_counts, diagrams_only=diagrams_only),
                require_rendered_visual=diagrams_only,
            )
        except Exception as exc:
            rec = {
                "status": "error",
                "source_question_id": eq.question_id,
                "error": f"{type(exc).__name__}: {exc}",
            }
            print(f"  error: {exc}", flush=True)
            traceback.print_exc()
        results.append(rec)
        if rec.get("status") == "generated":
            summary["generated"] += 1
            vtype = str(rec.get("visual_type") or "none")
            mix_counts[vtype] = mix_counts.get(vtype, 0) + 1
            print(f"  {rec.get('variation_mode')} {vtype} -> {rec.get('question_id')}", flush=True)
        elif rec.get("status") == "skipped":
            summary["skipped"] += 1
            print(f"  skip: {rec.get('skip_reason')}", flush=True)
        else:
            summary["errors"] += 1
        summary["visual_type_counts"] = mix_counts
        summary["results"] = results
        summary["counts"] = store.counts()
        _write_status(summary)

    summary["status"] = "completed"
    summary["finished_at"] = _now()
    summary["counts"] = store.counts()
    summary["visual_type_counts"] = mix_counts
    _write_status(summary)
    return summary


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate NSAA sibling/far questions for review")
    parser.add_argument("--n", type=int, default=None, help="Max new questions to generate")
    parser.add_argument("--ids", default="", help="Comma-separated source question IDs")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--force", action="store_true", help="Regenerate even if already queued")
    parser.add_argument("--include-non-math", action="store_true", help="Do not prefilter to math-looking stems")
    parser.add_argument(
        "--subject",
        default="mathematics",
        choices=["mathematics", "chemistry", "biology"],
        help="NSAA source subject. chemistry/biology include plain-text questions.",
    )
    parser.add_argument(
        "--diagrams-only",
        action="store_true",
        help="Only keep questions that render a graph, structure, pedigree, or schematic. Skip plain text and tables.",
    )
    parser.add_argument("--model", default=NSAA_DIAGRAM_MODEL)
    args = parser.parse_args()
    ids = [int(part.strip()) for part in args.ids.split(",") if part.strip()]
    result = run_batch(
        n=args.n,
        question_ids=ids or None,
        dry_run=args.dry_run,
        force=args.force,
        math_only=not args.include_non_math,
        subject=args.subject,
        model=args.model,
        diagrams_only=args.diagrams_only,
    )
    print(json.dumps({k: v for k, v in result.items() if k != "results"}, indent=2))
    if result.get("results"):
        print(json.dumps(result["results"], indent=2))
    return 0 if result.get("status") in {"completed", "dry_run"} else 1


if __name__ == "__main__":
    raise SystemExit(main())
