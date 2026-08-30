"""Phase 2 batch evaluation harness for Diagram Designer + renderer + verifier."""

from __future__ import annotations

import argparse
import json
import sys
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# Ensure imports work when invoked as a script.
_PKG_ROOT = Path(__file__).resolve().parents[2]
if str(_PKG_ROOT) not in sys.path:
    sys.path.insert(0, str(_PKG_ROOT))

from visual_engine.diagram_designer import DiagramDesignerInput, run_diagram_designer
from visual_engine.errors import DiagramLayoutError, VisualSpecError
from visual_engine.eval.contact_sheet import build_contact_sheet
from visual_engine.eval.question_selector import EvalQuestion, download_diagram, select_eval_questions
from visual_engine.eval.report import AttemptRecord, EvalReport
from visual_engine.render_matplotlib import render_diagram
from visual_engine.visual_verifier import VisualVerifierResult, run_visual_verifier

DEFAULT_OUT = Path(__file__).resolve().parent / "output"
MAX_REPAIR_ATTEMPTS = 3
VARIATION_MODES = ("sibling", "far")


def _now_run_id() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def _write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _case_dir(out_root: Path, question_id: int, mode: str) -> Path:
    return out_root / f"q{question_id}_{mode}"


def _save_bytes(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)


def _collision_failure(exc: Exception) -> bool:
    if isinstance(exc, DiagramLayoutError):
        return True
    msg = str(exc).lower()
    return "collision" in msg or "label" in msg and "place" in msg


def _run_single_case(
    eq: EvalQuestion,
    mode: str,
    out_root: Path,
    *,
    designer_model: str | None,
    verifier_model: str | None,
    designer_thinking: str,
    verifier_thinking: str,
    skip_verifier: bool,
    max_attempts: int,
) -> tuple[list[AttemptRecord], dict[str, Any]]:
    case_root = _case_dir(out_root, eq.question_id, mode)
    case_root.mkdir(parents=True, exist_ok=True)

    meta = {
        "question_id": eq.question_id,
        "exam_name": eq.exam_name,
        "exam_year": eq.exam_year,
        "paper_name": eq.paper_name,
        "question_number": eq.question_number,
        "variation_mode": mode,
        "diagram_url": eq.diagram_url,
        "diagram_asset_id": eq.diagram_asset_id,
        "source_image_url": eq.source_image_url,
    }
    _write_json(case_root / "meta.json", meta)

    diagram_bytes = download_diagram(eq)
    source_path = case_root / "source_diagram.png"
    _save_bytes(source_path, diagram_bytes)

    records: list[AttemptRecord] = []
    repair_feedback = ""
    prior_spec: dict[str, Any] | None = None
    last_verifier: VisualVerifierResult | None = None
    gallery: dict[str, Any] = {
        "question_id": eq.question_id,
        "variation_mode": mode,
        "source_path": str(source_path),
        "png_path": "",
        "verifier_verdict": None,
    }

    for attempt in range(1, max_attempts + 1):
        attempt_dir = case_root / f"attempt_{attempt:02d}"
        attempt_dir.mkdir(parents=True, exist_ok=True)

        rec = AttemptRecord(
            question_id=eq.question_id,
            variation_mode=mode,
            exam_name=eq.exam_name,
            attempt=attempt,
            spec_valid=False,
            render_ok=False,
            collision_failure=False,
            artifact_dir=str(attempt_dir),
        )

        spec_dict: dict[str, Any] | None = None
        raw_text = ""
        designer_usage: dict[str, Any] = {}

        try:
            inp = DiagramDesignerInput(
                reference_question=eq.reference_question,
                diagram_image_bytes=diagram_bytes,
                variation_mode=mode,
                math_paper="Math 1",
                target_difficulty="Medium",
                source_question_id=str(eq.question_id),
                repair_feedback=repair_feedback,
                prior_spec=prior_spec,
            )
            designer = run_diagram_designer(
                inp,
                model=designer_model,
                thinking_level=designer_thinking,
            )
            spec_dict = designer.visual_spec
            raw_text = designer.raw_text
            designer_usage = designer.usage
            rec.spec_valid = True
            _write_json(attempt_dir / "visual_spec.json", spec_dict)
            (attempt_dir / "gemini_designer_raw.txt").write_text(raw_text, encoding="utf-8")
            _write_json(attempt_dir / "designer_usage.json", designer_usage)
        except VisualSpecError as exc:
            rec.spec_error = str(exc)
            _write_json(attempt_dir / "errors.json", {"stage": "designer", "error": rec.spec_error})
            records.append(rec)
            repair_feedback = f"Previous visual_spec failed validation: {exc}. Return a corrected full visual_spec."
            continue
        except Exception as exc:
            rec.spec_error = f"{type(exc).__name__}: {exc}"
            _write_json(
                attempt_dir / "errors.json",
                {"stage": "designer", "error": rec.spec_error, "traceback": traceback.format_exc()},
            )
            records.append(rec)
            repair_feedback = f"Designer call failed: {exc}. Return a valid visual_spec JSON."
            continue

        png_path = attempt_dir / "rendered.png"
        try:
            render_diagram(spec_dict, png_path)
            rec.render_ok = True
            gallery["png_path"] = str(png_path)
            # Also copy final path at case root for easy browsing.
            _save_bytes(case_root / "rendered.png", png_path.read_bytes())
            _write_json(case_root / "visual_spec.json", spec_dict)
        except DiagramLayoutError as exc:
            rec.render_error = str(exc)
            rec.collision_failure = True
            _write_json(
                attempt_dir / "errors.json",
                {"stage": "render", "error": rec.render_error, "collision": True},
            )
            records.append(rec)
            repair_feedback = (
                f"Renderer reported label layout failure: {exc}. "
                "Adjust label anchors/positions or reduce label count."
            )
            prior_spec = spec_dict
            continue
        except VisualSpecError as exc:
            rec.render_error = str(exc)
            _write_json(attempt_dir / "errors.json", {"stage": "render", "error": rec.render_error})
            records.append(rec)
            repair_feedback = f"Renderer rejected spec: {exc}"
            prior_spec = spec_dict
            continue
        except Exception as exc:
            rec.render_error = f"{type(exc).__name__}: {exc}"
            rec.collision_failure = _collision_failure(exc)
            _write_json(
                attempt_dir / "errors.json",
                {"stage": "render", "error": rec.render_error, "traceback": traceback.format_exc()},
            )
            records.append(rec)
            repair_feedback = f"Render failed: {exc}"
            prior_spec = spec_dict
            continue

        if skip_verifier:
            rec.verifier_verdict = "SKIP"
            records.append(rec)
            break

        try:
            verifier = run_visual_verifier(
                generated_png_bytes=png_path.read_bytes(),
                visual_spec=spec_dict,
                question_concept=eq.question_concept,
                variation_mode=mode,
                source_png_bytes=diagram_bytes,
                model=verifier_model,
                thinking_level=verifier_thinking,
            )
            last_verifier = verifier
            rec.verifier_verdict = verifier.verdict
            rec.math_incorrect = verifier.math_incorrect
            rec.too_similar_to_source = verifier.too_similar_to_source
            rec.looks_bad = verifier.looks_bad
            rec.verifier_issues = list(verifier.issues)
            _write_json(
                attempt_dir / "verifier.json",
                {
                    "verdict": verifier.verdict,
                    "issues": verifier.issues,
                    "math_incorrect": verifier.math_incorrect,
                    "too_similar_to_source": verifier.too_similar_to_source,
                    "looks_bad": verifier.looks_bad,
                    "repair_instructions": verifier.repair_instructions,
                    "model": verifier.model,
                    "usage": verifier.usage,
                },
            )
            (attempt_dir / "gemini_verifier_raw.txt").write_text(verifier.raw_text, encoding="utf-8")
        except Exception as exc:
            rec.verifier_verdict = "ERROR"
            rec.verifier_issues = [str(exc)]
            _write_json(
                attempt_dir / "errors.json",
                {"stage": "verifier", "error": str(exc), "traceback": traceback.format_exc()},
            )
            records.append(rec)
            break

        records.append(rec)
        gallery.update(
            {
                "verifier_verdict": rec.verifier_verdict,
                "math_incorrect": rec.math_incorrect,
                "too_similar_to_source": rec.too_similar_to_source,
                "looks_bad": rec.looks_bad,
                "collision_failure": rec.collision_failure,
            }
        )

        if verifier.verdict == "PASS":
            break
        if verifier.verdict == "FAIL":
            break
        if verifier.verdict == "FIX" and attempt < max_attempts:
            parts = list(verifier.issues)
            if verifier.repair_instructions:
                parts.append(verifier.repair_instructions)
            repair_feedback = "Visual verifier requested fixes:\n- " + "\n- ".join(parts)
            prior_spec = spec_dict
            continue
        break

    if last_verifier:
        _write_json(
            case_root / "verifier_final.json",
            {
                "verdict": last_verifier.verdict,
                "issues": last_verifier.issues,
                "math_incorrect": last_verifier.math_incorrect,
                "too_similar_to_source": last_verifier.too_similar_to_source,
                "looks_bad": last_verifier.looks_bad,
            },
        )

    return records, gallery


def run_eval(
    *,
    count: int = 20,
    question_ids: list[int] | None = None,
    out_dir: Path | None = None,
    designer_model: str | None = None,
    verifier_model: str | None = None,
    designer_thinking: str = "high",
    verifier_thinking: str = "medium",
    skip_verifier: bool = False,
    max_attempts: int = MAX_REPAIR_ATTEMPTS,
    dry_run: bool = False,
) -> Path:
    run_id = _now_run_id()
    out_root = (out_dir or DEFAULT_OUT) / run_id
    out_root.mkdir(parents=True, exist_ok=True)

    questions = select_eval_questions(count=count, question_ids=question_ids)
    manifest = {
        "run_id": run_id,
        "question_count": len(questions),
        "variation_modes": list(VARIATION_MODES),
        "expected_cases": len(questions) * len(VARIATION_MODES),
        "questions": [
            {
                "question_id": q.question_id,
                "exam_name": q.exam_name,
                "exam_year": q.exam_year,
                "paper_name": q.paper_name,
                "question_number": q.question_number,
                "diagram_url": q.diagram_url,
            }
            for q in questions
        ],
    }
    _write_json(out_root / "manifest.json", manifest)

    if dry_run:
        print(json.dumps(manifest, indent=2))
        return out_root

    report = EvalReport(run_id=run_id, total_cases=len(questions) * len(VARIATION_MODES))
    gallery_cases: list[dict[str, Any]] = []

    for eq in questions:
        for mode in VARIATION_MODES:
            print(f"[eval] Q{eq.question_id} mode={mode} ...", flush=True)
            recs, gallery = _run_single_case(
                eq,
                mode,
                out_root,
                designer_model=designer_model,
                verifier_model=verifier_model,
                designer_thinking=designer_thinking,
                verifier_thinking=verifier_thinking,
                skip_verifier=skip_verifier,
                max_attempts=max_attempts,
            )
            report.records.extend(recs)
            gallery_cases.append(gallery)

    report.write(out_root)
    if gallery_cases:
        sheet_path = out_root / "contact_sheet.jpg"
        build_contact_sheet(gallery_cases, sheet_path)
        print(f"contact_sheet={sheet_path}")

    print(f"report={out_root / 'report.md'}")
    return out_root


def main() -> int:
    parser = argparse.ArgumentParser(description="Phase 2 diagram eval harness (Designer + render + verifier)")
    parser.add_argument("--count", type=int, default=20, help="Number of source questions")
    parser.add_argument("--question-ids", default="", help="Comma-separated question IDs (overrides --count sampling)")
    parser.add_argument("--out-dir", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--designer-model", default="")
    parser.add_argument("--verifier-model", default="")
    parser.add_argument("--designer-thinking", default="high", choices=["low", "medium", "high"])
    parser.add_argument("--verifier-thinking", default="medium", choices=["low", "medium", "high"])
    parser.add_argument("--max-attempts", type=int, default=MAX_REPAIR_ATTEMPTS)
    parser.add_argument("--skip-verifier", action="store_true")
    parser.add_argument("--dry-run", action="store_true", help="Select questions and write manifest only")
    args = parser.parse_args()

    qids: list[int] | None = None
    if args.question_ids.strip():
        qids = [int(x.strip()) for x in args.question_ids.split(",") if x.strip()]

    run_eval(
        count=args.count,
        question_ids=qids,
        out_dir=args.out_dir,
        designer_model=args.designer_model or None,
        verifier_model=args.verifier_model or None,
        designer_thinking=args.designer_thinking,
        verifier_thinking=args.verifier_thinking,
        skip_verifier=args.skip_verifier,
        max_attempts=args.max_attempts,
        dry_run=args.dry_run,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
