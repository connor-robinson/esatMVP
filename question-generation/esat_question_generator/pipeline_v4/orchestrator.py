"""V4 orchestrator (clean core).

Public entry point: :func:`run_once_v4`.

Returns the same envelope shape as the legacy ``project.run_once`` so the
existing Tkinter UI worker can swap call sites with a single env flag::

    {
        "run_dir": "...",     # absolute path to the V4 run folder
        "status": "accepted" | "rejected_*" | "designer_failed" | ...,
        "item": {...},        # only for accepted (matches build_bank_item shape)
        "rejection": {...},   # only for rejected_* / designer_failed
        "math_paper": None,   # always None for Physics
        "pipeline": "v4",
    }
"""

from __future__ import annotations

import datetime
import os
import random
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

from .config import V4ModelsConfig, V4RunConfig, subject_from_schema_id
from .llm_client import V4LLMClient, GeminiQuotaExhaustedError
from .prompt_loader import PhysicsV4Prompts, load_physics_v4_prompts, load_schemas_for_physics
from .renderers import render_graph_svg, render_schematic_svg
from .schemas import StageResult, VisualAssetRecord
from .stem_splice import (
    splice_concept_image_into_stem,
    splice_graph_svg_into_stem,
    splice_schematic_svg_into_stem,
)
from .storage import RunStore, build_manifest, create_run_store, get_uploader
from .validators import deterministic_validate
from .stages import (
    run_designer,
    run_idea_judge,
    run_implementer,
    run_implementer_regen,
    run_verifier,
    run_style_checker,
    run_visual_router,
    run_graph_spec,
    run_schematic_spec,
    run_concept_image_prompt,
    run_concept_image_verifier,
    run_concept_image_regen,
    run_tag_labeler,
)


# -------------- helpers --------------

_FORCEABLE_VISUAL_ROUTES = frozenset(
    {"concept_image_prompt", "accurate_graph_json", "accurate_schematic_json"}
)


def _apply_visual_route_bias(
    route: str,
    cfg: V4RunConfig,
    router_payload: Optional[Dict[str, Any]],
) -> str:
    """Apply ``cfg.prefer_visual`` / ``cfg.visual_route_override`` after the LLM router.

    V5 prompts default to ``none``; these knobs exist for local testing and review-app
    diagram QA. The original router verdict is preserved on the payload for auditing.
    """
    original = (route or "none").strip().lower()
    final = original
    reason: Optional[str] = None

    override = (cfg.visual_route_override or "").strip().lower()
    if override and override in _FORCEABLE_VISUAL_ROUTES:
        final = override
        reason = f"forced to {override} (router chose {original})"
    elif cfg.prefer_visual and original == "none":
        final = "concept_image_prompt"
        reason = "prefer_visual bumped none → concept_image_prompt"

    if reason and router_payload is not None:
        router_payload["visual_route_original"] = original
        router_payload["visual_route"] = final
        router_payload["visual_route_override_reason"] = reason

    return final


def _pick_difficulty(weights: Optional[Dict[str, float]]) -> str:
    if not weights:
        return random.choice(["Easy", "Medium", "Hard", "Extreme"])
    diffs = list(weights.keys())
    w = [max(0.0, float(weights[d])) for d in diffs]
    s = sum(w)
    if s <= 0:
        return random.choice(["Easy", "Medium", "Hard", "Extreme"])
    return random.choices(diffs, weights=w, k=1)[0]


def _pick_schema(
    schemas: Dict[str, Dict[str, Any]],
    forced: Optional[str],
    allow_prefix: str = "P",
) -> Optional[str]:
    if forced and forced in schemas:
        return forced
    candidates = [s for s in schemas.keys() if str(s).upper().startswith(allow_prefix)]
    if not candidates:
        return None
    return random.choice(candidates)


def _is_pass(stage: StageResult) -> bool:
    return stage.status == "pass" and (stage.verdict in (None, "PASS"))


def _verdict(stage: StageResult) -> str:
    return (stage.verdict or "").upper()


def _emit(callbacks: Optional[Dict[str, Callable]], event: str, *args) -> None:
    if not callbacks:
        return
    cb = callbacks.get(event)
    if not cb:
        return
    try:
        cb(*args)
    except Exception:
        pass


# -------------- public entry shape --------------

class V4Result(dict):
    """Just an annotated dict so callers can do ``result["status"]``."""


def run_once_v4(
    *,
    base_dir: str,
    forced_schema_id: Optional[str] = None,
    difficulty: Optional[str] = None,
    cfg: Optional[V4RunConfig] = None,
    models: Optional[V4ModelsConfig] = None,
    callbacks: Optional[Dict[str, Callable]] = None,
    reference_question: Optional[str] = None,
    reference_solution: Optional[str] = None,
) -> V4Result:
    """Generate one Physics question end-to-end with the V4 pipeline."""

    cfg = cfg or V4RunConfig.from_env()
    models = models or V4ModelsConfig.from_env()
    if cfg.seed is not None:
        random.seed(cfg.seed)

    callbacks = callbacks or {}

    prompts = load_physics_v4_prompts(base_dir)
    schemas = load_schemas_for_physics(base_dir)

    schema_id = _pick_schema(schemas, forced_schema_id, allow_prefix="P")
    if not schema_id:
        return V4Result(
            run_dir="",
            status="schema_failed",
            rejection={"gate": "setup", "error": "No Physics schemas found."},
            pipeline="v4",
        )

    schema_block = schemas[schema_id].get("block", "")
    chosen_difficulty = (difficulty or _pick_difficulty(cfg.difficulty_weights)).strip().title()
    if chosen_difficulty not in ("Easy", "Medium", "Hard", "Extreme"):
        chosen_difficulty = "Hard"

    _emit(callbacks, "on_schema_selected", schema_id, chosen_difficulty)

    store = create_run_store(base_dir, subject="physics", status="pending")
    llm = V4LLMClient(prompt_trace=callbacks.get("on_llm_prompt"))
    # Lazy-init the asset uploader. ``enabled`` will be False when SUPABASE_URL
    # is missing -- the orchestrator silently falls back to inline base64 then.
    uploader = get_uploader() if cfg.enable_asset_upload else None
    upload_generation_id: Optional[str] = None  # set once we know the question id

    stage_records: List[Dict[str, Any]] = []
    retry_counts: Dict[str, int] = {}
    model_trace: Dict[str, str] = {}

    def record(stage_result: StageResult) -> None:
        stage_records.append(stage_result.to_dict())
        if stage_result.model:
            model_trace[stage_result.stage] = stage_result.model
        store.write_json(f"{stage_result.stage}.json", stage_result.to_dict())

    def reject(gate: str, reasons: List[str], extra: Optional[Dict[str, Any]] = None) -> V4Result:
        manifest = build_manifest(
            qid=store.qid,
            schema_id=schema_id,
            difficulty=chosen_difficulty,
            status="rejected",
            failure_gate=gate,
            failure_reasons=reasons,
            model_trace=model_trace,
            retry_counts=retry_counts,
            stages=stage_records,
            extra=extra,
        )
        store.write_json("manifest.json", manifest)
        return V4Result(
            run_dir=str(store.root),
            status=f"rejected_{gate}",
            rejection={"gate": gate, "reasons": reasons, **(extra or {})},
            pipeline="v4",
            math_paper=None,
        )

    # =========================================================
    # 1. Designer
    # =========================================================
    _emit(callbacks, "on_stage_start", "Designer", f"Designing idea for {schema_id} ({chosen_difficulty})")
    designer_result: Optional[StageResult] = None
    for d_attempt in range(cfg.max_designer_retries + 1):
        designer_result = run_designer(
            llm=llm,
            prompts=prompts,
            model=models.for_stage("designer"),
            schema_id=schema_id,
            schema_block=schema_block,
            difficulty=chosen_difficulty,
            variation_mode=cfg.variation_mode,
            reference_question=reference_question,
            reference_solution=reference_solution,
        )
        designer_result.attempts = d_attempt + 1
        record(designer_result)
        if designer_result.status != "error" and designer_result.payload:
            break
        _emit(callbacks, "on_stage_error", "Designer", designer_result.error or "JSON parse")
    if not designer_result or not designer_result.payload:
        return reject("designer", [designer_result.error if designer_result else "no designer output"])
    designer_plan = designer_result.payload
    _emit(callbacks, "on_stage_complete", "Designer", designer_plan)

    # =========================================================
    # 2. Idea Judge
    # =========================================================
    _emit(callbacks, "on_stage_start", "Idea Judge", "Gating designer plan")
    judge_result = run_idea_judge(
        llm=llm,
        prompts=prompts,
        model=models.for_stage("idea_judge"),
        designer_plan=designer_plan,
        target_difficulty=chosen_difficulty,
        schema_block=schema_block,
        reference_question=reference_question,
        reference_solution=reference_solution,
    )
    record(judge_result)
    if _verdict(judge_result) == "FAIL":
        _emit(callbacks, "on_stage_error", "Idea Judge", judge_result.payload)
        # Optionally retry designer once if budget allows.
        retry_counts["designer_after_idea_judge"] = 0
        if cfg.max_idea_judge_retries > 0:
            _emit(callbacks, "on_stage_start", "Designer", "Regenerating idea after Idea Judge FAIL")
            designer_result2 = run_designer(
                llm=llm,
                prompts=prompts,
                model=models.for_stage("designer"),
                schema_id=schema_id,
                schema_block=schema_block,
                difficulty=chosen_difficulty,
                variation_mode=cfg.variation_mode,
                reference_question=reference_question,
                reference_solution=reference_solution,
                temperature=0.85,
            )
            designer_result2.attempts = (designer_result.attempts or 1) + 1
            record(designer_result2)
            if designer_result2.payload:
                designer_plan = designer_result2.payload
                retry_counts["designer_after_idea_judge"] = 1
                judge_result2 = run_idea_judge(
                    llm=llm,
                    prompts=prompts,
                    model=models.for_stage("idea_judge"),
                    designer_plan=designer_plan,
                    target_difficulty=chosen_difficulty,
                    schema_block=schema_block,
                    reference_question=reference_question,
                    reference_solution=reference_solution,
                )
                record(judge_result2)
                if _verdict(judge_result2) != "PASS":
                    return reject("idea_judge", [str(judge_result2.payload)])
            else:
                return reject("designer", [designer_result2.error or "no designer output"])
        else:
            return reject("idea_judge", [str(judge_result.payload)])
    elif _verdict(judge_result) != "PASS":
        return reject("idea_judge", [judge_result.error or "Idea Judge produced no verdict."])

    _emit(callbacks, "on_stage_complete", "Idea Judge", judge_result.payload)

    # =========================================================
    # 3-6. Implementer -> Deterministic -> Verifier -> Style (retry loop)
    # =========================================================
    implemented: Optional[Dict[str, Any]] = None
    verifier_payload: Dict[str, Any] = {}
    style_payload: Dict[str, Any] = {}
    last_fail_report: Optional[Dict[str, Any]] = None
    previous_implemented: Optional[Dict[str, Any]] = None

    for attempt in range(cfg.max_implementer_retries + 1):
        # 3. Implementer (first attempt) or regen
        if attempt == 0:
            _emit(callbacks, "on_stage_start", "Implementer", f"Implementing question (attempt {attempt + 1})")
            impl_result = run_implementer(
                llm=llm,
                prompts=prompts,
                model=models.for_stage("implementer"),
                designer_plan=designer_plan,
                difficulty=chosen_difficulty,
                schema_block=schema_block,
                reference_question=reference_question,
                reference_solution=reference_solution,
            )
        else:
            _emit(callbacks, "on_stage_start", "Implementer", f"Regenerating (attempt {attempt + 1})")
            impl_result = run_implementer_regen(
                llm=llm,
                prompts=prompts,
                model=models.for_stage("implementer_regen"),
                designer_plan=designer_plan,
                previous_attempt=previous_implemented or {},
                fail_report=last_fail_report or {},
                difficulty=chosen_difficulty,
                schema_block=schema_block,
            )
        impl_result.attempts = attempt + 1
        retry_counts["implementer"] = attempt
        record(impl_result)
        if not impl_result.payload:
            last_fail_report = {"stage": "implementer", "error": impl_result.error or "no JSON"}
            previous_implemented = previous_implemented or {}
            continue

        implemented = impl_result.payload
        previous_implemented = implemented
        _emit(callbacks, "on_stage_complete", "Implementer", implemented)

        # 4. Deterministic validator (no LLM)
        det_report = deterministic_validate(implemented)
        det_stage = StageResult(
            stage="deterministic_validator",
            status="pass" if det_report.ok else "fail",
            payload=det_report.to_dict(),
            attempts=attempt + 1,
        )
        record(det_stage)
        if not det_report.ok:
            _emit(callbacks, "on_stage_error", "Deterministic Validator", det_report.summary)
            last_fail_report = {
                "stage": "deterministic_validator",
                "deterministic_errors": det_report.errors,
                "deterministic_warnings": det_report.warnings,
                "severity": "format_only_fixable",
            }
            if attempt < cfg.max_implementer_retries:
                continue
            return reject(
                "deterministic_validator",
                [e.get("message", "") for e in det_report.errors],
                {"errors": det_report.errors},
            )

        # 5. Verifier (LLM)
        _emit(callbacks, "on_stage_start", "Verifier", "Verifying physics correctness")
        verifier_result = run_verifier(
            llm=llm,
            prompts=prompts,
            model=models.for_stage("verifier"),
            designer_plan=designer_plan,
            implemented=implemented,
            reference_question=reference_question,
            reference_solution=reference_solution,
        )
        verifier_result.attempts = attempt + 1
        record(verifier_result)
        if _verdict(verifier_result) != "PASS":
            _emit(callbacks, "on_stage_error", "Verifier", verifier_result.payload)
            severity = ""
            if isinstance(verifier_result.payload, dict):
                severity = str(verifier_result.payload.get("severity", "")).lower()
            last_fail_report = {
                "stage": "verifier",
                "verifier_report": verifier_result.payload or {"error": verifier_result.error},
            }
            if severity in ("structural", "off_syllabus", "multiple_correct_answers") and attempt > 0:
                return reject("verifier_structural", ["Structural verifier failure."], {"report": verifier_result.payload})
            if attempt < cfg.max_implementer_retries:
                continue
            return reject("verifier", ["Verifier FAIL after retries"], {"report": verifier_result.payload})
        verifier_payload = verifier_result.payload or {}
        _emit(callbacks, "on_stage_complete", "Verifier", verifier_payload)

        # 6. Style Checker (LLM)
        _emit(callbacks, "on_stage_start", "Style Checker", "Authenticity + selectivity gate")
        style_result = run_style_checker(
            llm=llm,
            prompts=prompts,
            model=models.for_stage("style_checker"),
            designer_plan=designer_plan,
            implemented=implemented,
            verifier_report=verifier_payload,
            target_difficulty=chosen_difficulty,
            reference_question=reference_question,
            reference_solution=reference_solution,
        )
        style_result.attempts = attempt + 1
        record(style_result)
        if _verdict(style_result) != "PASS":
            _emit(callbacks, "on_stage_error", "Style Checker", style_result.payload)
            last_fail_report = {
                "stage": "style_checker",
                "style_report": style_result.payload or {"error": style_result.error},
                "verifier_report": verifier_payload,
            }
            if attempt < cfg.max_implementer_retries:
                continue
            return reject("style_checker", ["Style FAIL after retries"], {"report": style_result.payload})
        style_payload = style_result.payload or {}
        _emit(callbacks, "on_stage_complete", "Style Checker", style_payload)
        break

    if implemented is None:
        return reject("implementer", [last_fail_report.get("error", "no output") if last_fail_report else "no output"])

    # =========================================================
    # 7-9. Visual routing + visual generation/verification
    # =========================================================
    has_visual = False
    visual_type = "none"
    answer_depends_on_visual = False
    visual_assets: List[VisualAssetRecord] = []

    if cfg.enable_visual_pipeline:
        _emit(callbacks, "on_stage_start", "Visual Router", "Choosing visual route")
        router_result = run_visual_router(
            llm=llm,
            prompts=prompts,
            model=models.for_stage("visual_router"),
            designer_plan=designer_plan,
            implemented=implemented,
        )
        record(router_result)
        route = (router_result.payload or {}).get("visual_route", "none") if router_result.payload else "none"
        answer_depends_on_visual = bool((router_result.payload or {}).get("answer_depends_on_visual", False))
        route = _apply_visual_route_bias(route, cfg, router_result.payload)
        _emit(callbacks, "on_stage_complete", "Visual Router", {"route": route})

        if route == "unsupported_visual_dependency":
            return reject(
                "unsupported_visual",
                ["Router flagged the visual requirement as unsupported."],
                {"router": router_result.payload},
            )
        elif route == "accurate_graph_json":
            _emit(callbacks, "on_stage_start", "Graph Spec", "Producing deterministic graph JSON")
            graph_result = run_graph_spec(
                llm=llm,
                prompts=prompts,
                model=models.for_stage("graph_spec"),
                implemented=implemented,
                designer_plan=designer_plan,
            )
            record(graph_result)
            graph_spec_payload = graph_result.payload or {}
            spec_path = None
            svg_path = None
            graph_id = None
            graphs_for_db: Dict[str, Any] = {}
            if graph_spec_payload:
                spec_path = store.write_json("graph_spec.json", graph_spec_payload)
                graph_id = (
                    graph_spec_payload.get("graph_id")
                    or (graph_spec_payload.get("ids") or [None])[0]
                    or "g1"
                )
                graphs_for_db[str(graph_id)] = graph_spec_payload
                svg_url: str = ""
                if cfg.enable_svg_rendering:
                    try:
                        svg = render_graph_svg(graph_spec_payload)
                        svg_path = store.write_asset_text("graph.svg", svg)
                        # Best-effort upload to the public ``question-images`` bucket.
                        if uploader and uploader.enabled:
                            up = uploader.upload_bytes(
                                svg.encode("utf-8"),
                                generation_id=store.qid,
                                filename="graph.svg",
                                content_type="image/svg+xml",
                            )
                            if up:
                                svg_url = up["url"]
                        # Splice the SVG into the stem so the reviewer shows it.
                        # We inline the SVG (cheap, ~5 KB) even when also uploaded;
                        # the URL is recorded on the asset record for downstream use.
                        stem = implemented.get("question", {}).get("stem", "")
                        new_stem, replaced = splice_graph_svg_into_stem(
                            stem,
                            graph_id=str(graph_id),
                            svg=svg,
                            caption=graph_spec_payload.get("title", ""),
                        )
                        if replaced:
                            implemented.setdefault("question", {})["stem_before_visual"] = stem
                            implemented["question"]["stem"] = new_stem
                    except Exception as render_err:
                        _emit(
                            callbacks,
                            "on_stage_error",
                            "Graph SVG Renderer",
                            {"error": str(render_err)},
                        )
                visual_assets.append(
                    VisualAssetRecord(
                        kind="graph_spec",
                        spec_path=str(spec_path) if spec_path else "",
                        image_paths=[svg_url] if svg_url else ([str(svg_path)] if svg_path else []),
                        renderer="deterministic_graph_renderer_v1" if svg_path else "spec_only",
                        qc_status="pending",
                        answer_bearing=True,
                    )
                )
            # Visual verifier (deterministic linkage + LLM)
            _emit(callbacks, "on_stage_start", "Graph Visual Verifier", "Auditing graph linkage")
            # Re-run deterministic visual linkage with the spec now that we have it.
            re_det = deterministic_validate(
                implemented,
                graph_spec=graph_spec_payload,
            )
            record(
                StageResult(
                    stage="visual_linkage_validator",
                    status="pass" if re_det.ok else "fail",
                    payload=re_det.to_dict(),
                )
            )
            if not re_det.ok:
                return reject("visual_linkage", [e.get("message", "") for e in re_det.errors], {"errors": re_det.errors})
            has_visual = True
            visual_type = "accurate_graph_json"

        elif route == "accurate_schematic_json":
            _emit(callbacks, "on_stage_start", "Schematic Spec", "Producing simple schematic JSON")
            sch_result = run_schematic_spec(
                llm=llm,
                prompts=prompts,
                model=models.for_stage("schematic_spec"),
                implemented=implemented,
                designer_plan=designer_plan,
            )
            record(sch_result)
            sch_payload = sch_result.payload or {}
            spec_path = None
            svg_path = None
            if sch_payload:
                spec_path = store.write_json("schematic_spec.json", sch_payload)
                svg_url = ""
                if cfg.enable_svg_rendering:
                    try:
                        svg = render_schematic_svg(sch_payload)
                        svg_path = store.write_asset_text("schematic.svg", svg)
                        if uploader and uploader.enabled:
                            up = uploader.upload_bytes(
                                svg.encode("utf-8"),
                                generation_id=store.qid,
                                filename="schematic.svg",
                                content_type="image/svg+xml",
                            )
                            if up:
                                svg_url = up["url"]
                        diagram_id = (
                            sch_payload.get("diagram_id")
                            or sch_payload.get("schematic_id")
                            or "d1"
                        )
                        stem = implemented.get("question", {}).get("stem", "")
                        new_stem, replaced = splice_schematic_svg_into_stem(
                            stem,
                            diagram_id=str(diagram_id),
                            svg=svg,
                            caption=sch_payload.get("title", ""),
                        )
                        if replaced:
                            implemented.setdefault("question", {})["stem_before_visual"] = stem
                            implemented["question"]["stem"] = new_stem
                    except Exception as render_err:
                        _emit(
                            callbacks,
                            "on_stage_error",
                            "Schematic SVG Renderer",
                            {"error": str(render_err)},
                        )
                visual_assets.append(
                    VisualAssetRecord(
                        kind="schematic_spec",
                        spec_path=str(spec_path) if spec_path else "",
                        image_paths=[svg_url] if svg_url else ([str(svg_path)] if svg_path else []),
                        renderer="deterministic_schematic_renderer_v1" if svg_path else "spec_only",
                        qc_status="pending",
                        answer_bearing=True,
                    )
                )
            re_det = deterministic_validate(
                implemented,
                schematic_spec=sch_payload,
            )
            record(
                StageResult(
                    stage="visual_linkage_validator",
                    status="pass" if re_det.ok else "fail",
                    payload=re_det.to_dict(),
                )
            )
            if not re_det.ok:
                return reject("visual_linkage", [e.get("message", "") for e in re_det.errors], {"errors": re_det.errors})
            has_visual = True
            visual_type = "accurate_schematic_json"

        elif route == "concept_image_prompt":
            _emit(callbacks, "on_stage_start", "Concept Image Prompt", "Generating image prompt JSON")
            cip_result = run_concept_image_prompt(
                llm=llm,
                prompts=prompts,
                model=models.for_stage("concept_image_prompt"),
                implemented=implemented,
                designer_plan=designer_plan,
                visual_brief=(designer_plan.get("visual_brief") or ""),
            )
            record(cip_result)
            image_paths: List[str] = []
            image_urls: List[str] = []
            image_gen_error: Optional[str] = None
            generated_image_path: Optional[Path] = None
            generated_image_url: str = ""
            if cip_result.payload:
                store.write_json("concept_image_prompt.json", cip_result.payload)

                # Step 1: try to actually generate the image with Gemini/Imagen.
                if cfg.enable_concept_image_generation:
                    try:
                        from .image_gen import generate_concept_image

                        prompt_text = (
                            cip_result.payload.get("image_prompt")
                            or cip_result.payload.get("prompt")
                            or cip_result.payload.get("description")
                            or ""
                        )
                        if isinstance(prompt_text, dict):
                            # Some prompt-pack variants wrap text as {"text": "..."}.
                            prompt_text = prompt_text.get("text", "") or ""
                        if prompt_text:
                            out_img = store.assets_dir / "concept_image_v1.png"
                            _emit(callbacks, "on_stage_start", "Concept Image Generation", "Calling Gemini image model")
                            meta = generate_concept_image(
                                prompt_text,
                                out_path=out_img,
                                quality="high",
                            )
                            generated_image_path = out_img
                            image_paths.append(str(out_img))
                            # Upload PNG to public bucket so we can reference it by URL
                            # rather than base64-embedding it in the question_stem.
                            if uploader and uploader.enabled:
                                up = uploader.upload_file(
                                    out_img,
                                    generation_id=store.qid,
                                    filename="concept_image_v1.png",
                                    content_type="image/png",
                                )
                                if up:
                                    generated_image_url = up["url"]
                                    image_urls.append(generated_image_url)
                                    _emit(
                                        callbacks,
                                        "on_stage_start",
                                        "Concept Image Upload",
                                        {"url": generated_image_url},
                                    )
                            store.write_json(
                                "concept_image_generation.json",
                                {
                                    "meta": meta,
                                    "prompt_used": prompt_text,
                                    "public_url": generated_image_url or None,
                                },
                            )
                        else:
                            image_gen_error = "empty_prompt"
                    except Exception as gen_err:
                        image_gen_error = str(gen_err)
                        _emit(
                            callbacks,
                            "on_stage_error",
                            "Concept Image Generation",
                            {"error": image_gen_error},
                        )

                # Step 2: Verifier (with image bytes if we have them).
                _emit(callbacks, "on_stage_start", "Concept Image Verifier", "Auditing prompt + image")
                qc = run_concept_image_verifier(
                    llm=llm,
                    prompts=prompts,
                    model=models.for_stage("concept_image_verifier"),
                    implemented=implemented,
                    concept_image_prompt=cip_result.payload,
                    image_available=bool(generated_image_path),
                )
                record(qc)
                regens = 0
                for r in range(cfg.max_concept_image_regens):
                    if _verdict(qc) != "REGENERATE":
                        break
                    regens += 1
                    regen = run_concept_image_regen(
                        llm=llm,
                        prompts=prompts,
                        model=models.for_stage("concept_image_regen"),
                        concept_image_prompt=cip_result.payload,
                        concept_image_verifier_report=qc.payload or {},
                    )
                    record(regen)
                    if regen.payload:
                        store.write_json(f"concept_image_regen_{regens}.json", regen.payload)
                        cip_result.payload.update(regen.payload)
                    # Regenerate the image with the refined prompt.
                    if cfg.enable_concept_image_generation:
                        try:
                            from .image_gen import generate_concept_image

                            refined_prompt = (
                                cip_result.payload.get("image_prompt")
                                or cip_result.payload.get("prompt")
                                or cip_result.payload.get("description")
                                or ""
                            )
                            if isinstance(refined_prompt, dict):
                                refined_prompt = refined_prompt.get("text", "") or ""
                            if refined_prompt:
                                out_img = store.assets_dir / f"concept_image_v{regens + 1}.png"
                                meta = generate_concept_image(
                                    refined_prompt,
                                    out_path=out_img,
                                    quality="high",
                                )
                                generated_image_path = out_img
                                image_paths.append(str(out_img))
                                if uploader and uploader.enabled:
                                    up = uploader.upload_file(
                                        out_img,
                                        generation_id=store.qid,
                                        filename=f"concept_image_v{regens + 1}.png",
                                        content_type="image/png",
                                    )
                                    if up:
                                        generated_image_url = up["url"]
                                        image_urls.append(generated_image_url)
                                store.write_json(
                                    f"concept_image_generation_v{regens + 1}.json",
                                    {
                                        "meta": meta,
                                        "prompt_used": refined_prompt,
                                        "public_url": generated_image_url or None,
                                    },
                                )
                        except Exception as gen_err:
                            image_gen_error = str(gen_err)
                    qc = run_concept_image_verifier(
                        llm=llm,
                        prompts=prompts,
                        model=models.for_stage("concept_image_verifier"),
                        implemented=implemented,
                        concept_image_prompt=cip_result.payload,
                        image_available=bool(generated_image_path),
                        previous_feedback=qc.payload or {},
                    )
                    record(qc)
                retry_counts["concept_image_regen"] = regens
                final_qc_status = (
                    "pass"
                    if _verdict(qc) == "PASS"
                    else ("delete" if _verdict(qc) == "DELETE" else "regenerate")
                )

                # V5.2: concept images are supportive metadata only — not inline exam diagrams.
                if (
                    cfg.splice_concept_image_into_stem
                    and generated_image_path
                    and final_qc_status == "pass"
                ):
                    try:
                        stem = implemented.get("question", {}).get("stem", "")
                        new_stem, replaced = splice_concept_image_into_stem(
                            stem,
                            image_url=generated_image_url or None,
                            image_path=generated_image_path
                            if not generated_image_url
                            else None,
                            placeholder_id="img1",
                            alt=cip_result.payload.get("alt_text", "")
                            or cip_result.payload.get("caption", "")
                            or "concept image",
                        )
                        if replaced:
                            implemented.setdefault("question", {})[
                                "stem_before_visual"
                            ] = stem
                            implemented["question"]["stem"] = new_stem
                    except Exception as splice_err:
                        _emit(
                            callbacks,
                            "on_stage_error",
                            "Concept Image Splice",
                            {"error": str(splice_err)},
                        )

                # Prefer canonical bucket URLs over local Windows paths when both exist.
                stored_paths = image_urls if image_urls else image_paths
                visual_assets.append(
                    VisualAssetRecord(
                        kind="concept_image",
                        spec_path=str(store.root / "concept_image_prompt.json"),
                        image_paths=stored_paths,
                        renderer=(
                            "gemini_image_v1"
                            if generated_image_path
                            else ("image_gen_failed" if image_gen_error else "spec_only")
                        ),
                        qc_status=final_qc_status,
                        qc_source="concept_image_verifier.json",
                        answer_bearing=False,
                    )
                )
                has_visual = bool(generated_image_path)
                visual_type = "concept_image" if generated_image_path else "concept_image_prompt"
                if final_qc_status == "delete":
                    # Per spec: discard the asset but keep the question if it
                    # still works without the visual (concept-image is illustrative).
                    has_visual = False
                    visual_type = "none"

    # =========================================================
    # 10. Tag labeler
    # =========================================================
    tags_payload: Optional[Dict[str, Any]] = None
    if cfg.enable_tag_labeling:
        _emit(callbacks, "on_stage_start", "Tag Labeler", "Assigning curriculum tags")
        tag_result = run_tag_labeler(
            llm=llm,
            prompts=prompts,
            model=models.for_stage("tag_labeler"),
            base_dir=base_dir,
            question_pkg=implemented,
            schema_id=schema_id,
        )
        record(tag_result)
        if tag_result.payload:
            tags_payload = tag_result.payload
        _emit(callbacks, "on_stage_complete", "Tag Labeler", tags_payload)

    # =========================================================
    # 11. Build accepted item (same shape as project.build_bank_item)
    # =========================================================
    try:
        from project import build_bank_item  # type: ignore
        from project import ModelsConfig as LegacyModelsConfig  # type: ignore
    except Exception as e:
        return reject("save", [f"Cannot import build_bank_item: {e}"])

    legacy_models = LegacyModelsConfig(
        designer=models.for_stage("designer"),
        implementer=models.for_stage("implementer"),
        verifier=models.for_stage("verifier"),
        style_judge=models.for_stage("style_checker"),
    )

    item = build_bank_item(
        idea_plan=designer_plan,
        question_obj=implemented,
        verifier_obj=verifier_payload,
        style_obj=style_payload,
        schema_id=schema_id,
        difficulty=chosen_difficulty,
        models=legacy_models,
        attempts=int(retry_counts.get("implementer", 0)) + 1,
        token_usage=llm.total_usage or None,
        tags=tags_payload,
        schema_block_snapshot=schema_block,
    )

    # Annotate the bank item so the UI can tell V4 questions apart.
    item["pipeline"] = "v4"
    item["has_visual"] = has_visual
    item["visual_type"] = visual_type
    item["answer_depends_on_visual"] = answer_depends_on_visual

    # Surface the original stem (pre-splice) and the assets we produced so
    # db_sync / backup_manager can persist them without poking around in the
    # run folder.
    pre_splice_stem = (
        implemented.get("question", {}).get("stem_before_visual")
        if isinstance(implemented, dict) else None
    )
    if pre_splice_stem:
        item["question_stem_before_auto_diagram"] = pre_splice_stem
    if visual_assets:
        item["visual_assets"] = [a.to_dict() for a in visual_assets]
    # Persist the graph_spec / schematic_spec JSON in a shape compatible with
    # the existing ``graphs`` jsonb column (``{graph_id: spec}``).
    graphs_field: Dict[str, Any] = {}
    for asset in visual_assets:
        if asset.kind in ("graph_spec", "schematic_spec") and asset.spec_path:
            try:
                import json as _json
                with open(asset.spec_path, "r", encoding="utf-8") as f:
                    spec = _json.load(f)
                key = (
                    spec.get("graph_id")
                    or spec.get("diagram_id")
                    or spec.get("schematic_id")
                    or ("g1" if asset.kind == "graph_spec" else "d1")
                )
                graphs_field[str(key)] = spec
            except Exception:
                pass
    if graphs_field:
        item["graphs"] = graphs_field

    # Persist the bank item alongside the manifest so the run folder is
    # self-contained even before db_sync runs.
    store.write_json("question.json", item)

    manifest = build_manifest(
        qid=store.qid,
        schema_id=schema_id,
        difficulty=chosen_difficulty,
        status="accepted",
        has_visual=has_visual,
        visual_type=visual_type,
        answer_depends_on_visual=answer_depends_on_visual,
        assets=[a.to_dict() for a in visual_assets],
        model_trace=model_trace,
        retry_counts=retry_counts,
        stages=stage_records,
    )
    store.write_json("manifest.json", manifest)

    return V4Result(
        run_dir=str(store.root),
        status="accepted",
        item=item,
        manifest=manifest,
        pipeline="v4",
        math_paper=None,
    )
