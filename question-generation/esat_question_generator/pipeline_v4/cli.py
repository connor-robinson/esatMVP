"""Command-line entry for the V4 pipeline.

Usage examples::

    # generate one Physics question
    python -m pipeline_v4.cli --subject physics --difficulty Hard --n 1

    # diagram test mode: retry until accepted with has_visual=True (Imagen PNG by default)
    python -m pipeline_v4.cli --until-diagram --sync-db

    # force a specific Physics schema
    python -m pipeline_v4.cli --schema P_acb9793b --difficulty Medium

    # visual-prompt-only test (no question generation; just check that the
    # concept-image prompt logic enforces relations, not just style)
    python -m pipeline_v4.cli --test-concept-image-prompt

When run from the ``esat_question_generator`` folder, the script auto-detects
the generator base dir as ``Path(__file__).parent.parent``.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import traceback
from pathlib import Path
from typing import Any, Dict

# Ensure we can import sibling modules (project.py etc.) when invoked as
# `python -m pipeline_v4.cli` from the esat_question_generator folder.
_PKG_DIR = Path(__file__).resolve().parent
_GEN_DIR = _PKG_DIR.parent
if str(_GEN_DIR) not in sys.path:
    sys.path.insert(0, str(_GEN_DIR))


def _print_stage_summary(result: Dict[str, Any]) -> None:
    print()
    print(f"=== V4 result: {result.get('status')} ===")
    print(f"Run dir: {result.get('run_dir')}")
    item = result.get("item") or {}
    if item:
        print(f"Question id: {item.get('id')}")
        print(f"Schema:      {item.get('schema_id')}  Difficulty: {item.get('difficulty')}")
        print(f"Visual:      type={item.get('visual_type')} has_visual={item.get('has_visual')} answer_depends={item.get('answer_depends_on_visual')}")
    rej = result.get("rejection")
    if rej:
        print(f"Rejection:   gate={rej.get('gate')} reasons={rej.get('reasons')}")
    manifest = result.get("manifest")
    if manifest and isinstance(manifest, dict):
        print(f"Stages:      {len(manifest.get('stages') or [])}")


def _short_status(stage_dict: Dict[str, Any]) -> str:
    stage = stage_dict.get("stage", "?")
    status = stage_dict.get("status", "?")
    verdict = stage_dict.get("verdict") or ""
    if verdict:
        return f"  - {stage}: {status} ({verdict})"
    return f"  - {stage}: {status}"


def _load_repo_env_local(base_dir: str) -> None:
    """Load repo-root ``.env.local`` so image/Vertex keys work without ``--sync-db``."""
    try:
        from dotenv import load_dotenv  # type: ignore

        env_path = Path(base_dir).parent.parent / ".env.local"
        if env_path.is_file():
            load_dotenv(env_path)
    except Exception:
        pass


def _configure_run(args: argparse.Namespace, base_dir: str):
    """Shared config/models/db_sync setup for ``_cmd_run`` and ``_cmd_until_diagram``."""
    from pipeline_v4.config import V4ModelsConfig, V4RunConfig

    cfg = V4RunConfig.from_env()
    if args.prefer_visual:
        cfg.prefer_visual = True
    if args.force_visual:
        cfg.visual_route_override = str(args.force_visual).strip().lower()
    if args.no_visual:
        cfg.enable_visual_pipeline = False
    if args.no_tags:
        cfg.enable_tag_labeling = False
    if args.no_image_gen:
        cfg.enable_concept_image_generation = False
    if args.no_svg:
        cfg.enable_svg_rendering = False

    models = V4ModelsConfig.from_env()

    db_sync_fn = None
    if args.sync_db:
        try:
            from db_sync import sync_question_from_pipeline as db_sync_fn  # type: ignore
        except Exception as e:
            print(f"[warn] --sync-db requested but db_sync unavailable: {e}", flush=True)
            db_sync_fn = None

    return cfg, models, db_sync_fn


def _cmd_until_diagram(args: argparse.Namespace) -> int:
    """Retry full pipeline runs until one question is accepted **with** a diagram."""
    from pipeline_v4 import run_once_v4

    base_dir = args.base_dir or str(_GEN_DIR)
    _load_repo_env_local(base_dir)

    cfg, models, db_sync_fn = _configure_run(args, base_dir)

    # Diagram-test mode: bias toward Imagen PNG unless user passed --force-visual.
    if not args.force_visual:
        cfg.visual_route_override = "concept_image_prompt"
        cfg.prefer_visual = True

    max_attempts = max(1, int(args.max_attempts))
    print(
        f"[until-diagram] Will run up to {max_attempts} question(s) until "
        f"status=accepted and has_visual=True.",
        flush=True,
    )
    if cfg.visual_route_override:
        print(f"[until-diagram] visual_route_override={cfg.visual_route_override}", flush=True)
    if cfg.prefer_visual:
        print("[until-diagram] prefer_visual=True (router none → concept_image_prompt)", flush=True)

    for attempt in range(1, max_attempts + 1):
        print(f"\n{'=' * 60}", flush=True)
        print(f"[until-diagram] attempt {attempt}/{max_attempts}", flush=True)
        print(f"{'=' * 60}", flush=True)
        try:
            result = run_once_v4(
                base_dir=base_dir,
                forced_schema_id=args.schema,
                difficulty=args.difficulty,
                cfg=cfg,
                models=models,
                callbacks={
                    "on_stage_start": lambda stage, info: print(
                        f"[stage] {stage}: {info}", flush=True
                    ),
                    "on_stage_error": lambda stage, info: print(
                        f"[error] {stage}: {info}", flush=True
                    ),
                },
            )
        except KeyboardInterrupt:
            print("Interrupted.")
            return 130
        except Exception as e:
            print(f"[error] run_once_v4 raised: {e}")
            traceback.print_exc()
            continue

        _print_stage_summary(result)
        item = result.get("item") or {}
        status = str(result.get("status") or "")
        has_visual = bool(item.get("has_visual"))
        visual_type = item.get("visual_type") or "?"
        run_dir = result.get("run_dir") or ""

        if status == "accepted" and has_visual:
            print(
                f"\n[until-diagram] SUCCESS on attempt {attempt}: "
                f"visual_type={visual_type} run_dir={run_dir}",
                flush=True,
            )
            if db_sync_fn is not None:
                try:
                    db_id = db_sync_fn(item, base_dir, status="pending")
                    if db_id:
                        print(f"[db_sync] inserted as {db_id}", flush=True)
                        print(f"[review] open /review/{db_id}", flush=True)
                except Exception as sync_err:
                    print(f"[db_sync] error: {sync_err}", flush=True)
            return 0

        rej = result.get("rejection") or {}
        gate = rej.get("gate") or status
        reasons = rej.get("reasons") or []
        reason_txt = "; ".join(str(r) for r in reasons[:2]) if reasons else ""
        print(
            f"[until-diagram] no diagram yet: status={status} has_visual={has_visual} "
            f"visual_type={visual_type} gate={gate} {reason_txt}".strip(),
            flush=True,
        )

    print(
        f"\n[until-diagram] Gave up after {max_attempts} attempts with no accepted diagram question.",
        flush=True,
    )
    return 1


def _cmd_run(args: argparse.Namespace) -> int:
    from pipeline_v4 import run_once_v4

    base_dir = args.base_dir or str(_GEN_DIR)
    _load_repo_env_local(base_dir)

    cfg, models, db_sync_fn = _configure_run(args, base_dir)

    accepted = 0
    rejected = 0
    db_ids: list[str] = []
    for i in range(int(args.n)):
        try:
            result = run_once_v4(
                base_dir=base_dir,
                forced_schema_id=args.schema,
                difficulty=args.difficulty,
                cfg=cfg,
                models=models,
                callbacks={
                    "on_stage_start": lambda stage, info: print(f"[stage] {stage}: {info}", flush=True),
                    "on_stage_error": lambda stage, info: print(f"[error] {stage}: {info}", flush=True),
                },
            )
        except KeyboardInterrupt:
            print("Interrupted.")
            return 130
        except Exception as e:
            print(f"[error] run_once_v4 raised: {e}")
            traceback.print_exc()
            rejected += 1
            continue

        _print_stage_summary(result)

        manifest = result.get("manifest") or {}
        for s in manifest.get("stages") or []:
            print(_short_status(s))

        if result.get("status") == "accepted":
            accepted += 1
            if db_sync_fn is not None:
                item = result.get("item") or {}
                try:
                    db_id = db_sync_fn(item, base_dir, status="pending")
                    if db_id:
                        db_ids.append(db_id)
                        print(f"[db_sync] inserted as {db_id[:8]}...", flush=True)
                    else:
                        print("[db_sync] not inserted (likely already exists or did not pass gates)", flush=True)
                except Exception as sync_err:
                    print(f"[db_sync] error: {sync_err}", flush=True)
        else:
            rejected += 1

    print(f"\nDone: {accepted} accepted / {rejected} rejected")
    if db_sync_fn is not None:
        print(f"DB inserts: {len(db_ids)}")
    return 0 if accepted > 0 else 1


_DEFAULT_CONCEPT_IMAGE_BRIEF = (
    "Show a simplified exam-style person beside a trolley. A 25 kg bag of "
    "cement must rest clearly on the trolley platform, not on the ground. "
    "The trolley platform must be visibly wide enough to support the bag. "
    "Include a vertical double-headed arrow labelled 1.5 m and a horizontal "
    "double-headed arrow labelled 2.0 m. The 2.0 m horizontal arrow should "
    "appear visually longer than the 1.5 m vertical arrow, even though the "
    "diagram says [diagram not to scale]. Include only the labels: bag of "
    "cement, 25 kg, 1.5 m, 2.0 m, [diagram not to scale]."
)


def _cmd_test_concept_image_prompt(args: argparse.Namespace) -> int:
    """Pings ``Physics Concept_Image_Prompt.md`` end-to-end with a logic test."""
    from pipeline_v4.config import V4ModelsConfig
    from pipeline_v4.llm_client import V4LLMClient
    from pipeline_v4.prompt_loader import load_physics_v4_prompts
    from pipeline_v4.stages import run_concept_image_prompt, run_concept_image_verifier

    base_dir = args.base_dir or str(_GEN_DIR)
    prompts = load_physics_v4_prompts(base_dir)
    models = V4ModelsConfig.from_env()
    llm = V4LLMClient()

    dummy_implemented = {
        "metadata": {"schema_id": "P_test", "module": "physics", "target_difficulty": "Hard"},
        "question": {
            "stem": (
                "A worker uses a trolley to move a 25 kg bag of cement along a horizontal "
                "distance of 2.0 m, then raises it by 1.5 m using the trolley's lifting "
                "mechanism. [diagram not to scale]"
            ),
            "options": {"A": "...", "B": "...", "C": "...", "D": "...", "E": "...", "F": "..."},
            "correct_option": "A",
        },
        "visual_requirements": {
            "visual_need": "concept_image_only",
            "visual_role": "supportive",
            "answer_depends_on_visual": False,
            "concept_image_request": {"brief": _DEFAULT_CONCEPT_IMAGE_BRIEF},
        },
    }
    dummy_designer_plan = {
        "schema_id": "P_test",
        "module": "physics",
        "variation_mode": "SIBLING",
        "target_difficulty": "Hard",
        "idea_summary": "Work-energy with raised mass via a trolley.",
        "visual_need": "concept_image_only",
        "visual_brief": _DEFAULT_CONCEPT_IMAGE_BRIEF,
    }

    prompt_result = run_concept_image_prompt(
        llm=llm,
        prompts=prompts,
        model=models.for_stage("concept_image_prompt"),
        implemented=dummy_implemented,
        designer_plan=dummy_designer_plan,
        visual_brief=_DEFAULT_CONCEPT_IMAGE_BRIEF,
        required_labels=["bag of cement", "25 kg", "1.5 m", "2.0 m", "[diagram not to scale]"],
        forbidden_labels=[],
    )
    print("--- Concept image prompt ---")
    if not prompt_result.payload:
        print("ERROR: prompt generation failed:", prompt_result.error)
        return 2
    print(json.dumps(prompt_result.payload, ensure_ascii=False, indent=2))

    qc_result = run_concept_image_verifier(
        llm=llm,
        prompts=prompts,
        model=models.for_stage("concept_image_verifier"),
        implemented=dummy_implemented,
        concept_image_prompt=prompt_result.payload,
        image_available=False,
    )
    print("\n--- Concept image verifier (prompt-only) ---")
    if not qc_result.payload:
        print("ERROR: verifier failed:", qc_result.error)
        return 2
    print(json.dumps(qc_result.payload, ensure_ascii=False, indent=2))
    return 0


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="V4 pipeline runner (Physics).")
    p.add_argument("--subject", default="physics", help="Subject (only 'physics' supported in V4 right now).")
    p.add_argument("--difficulty", default=None, help="Easy | Medium | Hard | Extreme")
    p.add_argument("--schema", default=None, help="Force a specific schema_id (e.g. P_acb9793b).")
    p.add_argument("-n", "--n", default=1, help="Number of questions to attempt.")
    p.add_argument(
        "--until-diagram",
        action="store_true",
        help=(
            "Diagram test mode: keep generating until one run is accepted with "
            "has_visual=True (see --max-attempts). Defaults to concept_image_prompt + prefer_visual."
        ),
    )
    p.add_argument(
        "--max-attempts",
        type=int,
        default=25,
        help="Max pipeline runs for --until-diagram (default 25).",
    )
    p.add_argument(
        "--prefer-visual",
        action="store_true",
        help=(
            "If the Visual Router chooses 'none', bump to concept_image_prompt anyway "
            "(dev/testing; also V4_PREFER_VISUAL=1 in .env.local)."
        ),
    )
    p.add_argument(
        "--force-visual",
        metavar="ROUTE",
        default=None,
        choices=["concept_image_prompt", "accurate_graph_json", "accurate_schematic_json"],
        help=(
            "Always use this visual route, ignoring the router (dev/testing). "
            "concept_image_prompt is the usual choice for PNG diagrams."
        ),
    )
    p.add_argument("--no-visual", action="store_true", help="Disable the visual pipeline.")
    p.add_argument("--no-tags", action="store_true", help="Disable tag labeling.")
    p.add_argument(
        "--no-image-gen",
        action="store_true",
        help="Skip Gemini image generation (still routes + writes prompt JSON).",
    )
    p.add_argument(
        "--no-svg",
        action="store_true",
        help="Skip deterministic SVG rendering of graph_spec / schematic_spec.",
    )
    p.add_argument(
        "--sync-db",
        action="store_true",
        help="Insert accepted questions into Supabase via db_sync (loads .env.local).",
    )
    p.add_argument(
        "--base-dir",
        default=None,
        help="Override the generator base directory (defaults to the parent of pipeline_v4/).",
    )
    p.add_argument(
        "--test-concept-image-prompt",
        action="store_true",
        help="Run the visual-only smoke test using the V4 concept-image brief.",
    )
    args = p.parse_args(argv)

    if args.test_concept_image_prompt:
        return _cmd_test_concept_image_prompt(args)
    if args.until_diagram:
        if (args.subject or "").lower() != "physics":
            print("Only --subject physics is supported by V4 right now.")
            return 2
        return _cmd_until_diagram(args)
    if (args.subject or "").lower() != "physics":
        print("Only --subject physics is supported by V4 right now.")
        return 2
    return _cmd_run(args)


if __name__ == "__main__":
    raise SystemExit(main())
