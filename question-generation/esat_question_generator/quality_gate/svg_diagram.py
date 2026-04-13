from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

TraceFn = Optional[Callable[[str], None]]

_DIR = Path(__file__).resolve().parent


def _use_svg_pipeline() -> bool:
    """When True (default), use scene→layout→collision→render + archetypes.

    Set env ``QUALITY_GATE_SVG_PIPELINE=0`` (or ``false`` / ``no`` / ``off``) to use
    **single-shot** generation from ``prompt_svg_diagram.md`` only (A/B or fallback).
    """
    v = (os.environ.get("QUALITY_GATE_SVG_PIPELINE") or "1").strip().lower()
    return v not in ("0", "false", "no", "off")


def _load_text(name: str) -> str:
    return (_DIR / name).read_text(encoding="utf-8")


def load_svg_archetypes() -> str:
    return _load_text("svg_archetypes.md")


def load_svg_generator_instructions() -> str:
    return _load_text("prompt_svg_diagram.md")


def load_svg_integrate_instructions() -> str:
    return _load_text("prompt_svg_integrate.md")


def load_svg_scene_prompt() -> str:
    return _load_text("prompt_svg_scene.md")


def load_svg_layout_prompt() -> str:
    return _load_text("prompt_svg_layout.md")


def load_svg_collision_prompt() -> str:
    return _load_text("prompt_svg_collision.md")


def load_svg_render_prompt() -> str:
    return _load_text("prompt_svg_render.md")


def _strip_json_fences(text: str) -> str:
    s = text.strip()
    if s.startswith("```"):
        lines = s.splitlines()
        if lines and lines[0].strip().startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        s = "\n".join(lines).strip()
    return s


def extract_json_object(text: str) -> Dict[str, Any]:
    s = _strip_json_fences(text)
    try:
        return json.loads(s)
    except json.JSONDecodeError:
        pass
    start = s.find("{")
    end = s.rfind("}")
    if start >= 0 and end > start:
        return json.loads(s[start : end + 1])
    raise ValueError("no JSON object found in model output")


def extract_raw_svg(text: str) -> Optional[str]:
    """First <svg …> … </svg> block, case-insensitive on tag names."""
    s = _strip_json_fences(text)
    low = s.lower()
    start = low.find("<svg")
    if start < 0:
        return None
    end = low.rfind("</svg>")
    if end < 0:
        return None
    end_full = end + len("</svg>")
    frag = s[start:end_full]
    if re.search(r"<script[\s>]", frag, re.I):
        return None
    return frag.strip()


def parse_merged_html_delimited(text: str) -> Optional[str]:
    if "===MERGED_HTML===" not in text:
        return None
    after = text.split("===MERGED_HTML===", 1)[1]
    if "===END===" not in after:
        return None
    inner = after.split("===END===", 1)[0].strip("\n")
    return inner.strip() if inner.strip() else None


def _fallback_merge_stem_html(stem: str, svg: str) -> str:
    """Insert figure without LLM if integration output is unusable."""
    fig = (
        '<figure class="qg-diagram" style="margin:1em 0;text-align:center;">'
        f"{svg}</figure>"
    )
    s = stem or ""
    # Replace common placeholder patterns from graph_enrichment
    for pat in (
        r"<insert[^>]{0,200}>",
        r"\[insert[^\]]{0,200}\]",
    ):
        m = re.search(pat, s, flags=re.I)
        if m:
            return s[: m.start()] + fig + s[m.end() :]
    return s.rstrip() + ("\n\n" if s and not s.endswith("\n") else "") + fig


def build_diagram_request_payload(
    question_stem: str,
    *,
    diagram_brief: str,
    required_elements: List[str],
    optional_elements: Optional[List[str]] = None,
    notes: str = "",
    output_size: str = "width ~600, height ~400 (adjust to content)",
    max_question_chars: int = 12_000,
) -> str:
    qt = question_stem or ""
    if len(qt) > max_question_chars:
        qt = qt[:max_question_chars] + "\n…[truncated]"
    payload: Dict[str, Any] = {
        "question_text": qt,
        "diagram_brief": (diagram_brief or "").strip(),
        "required_elements": list(required_elements or []),
        "optional_elements": list(optional_elements or []),
        "style_target": "TMUA-style monochrome exam diagram",
        "output_size": output_size,
        "notes": (notes or "").strip(),
    }
    return json.dumps(payload, ensure_ascii=False, indent=2)


def _json_llm(
    llm: Any,
    model: str,
    *,
    system: str,
    user: str,
    trace_label: str,
    temperature: float,
) -> Dict[str, Any]:
    raw = llm.generate(
        model,
        system,
        user,
        temperature=temperature,
        trace_label=trace_label,
    )
    return extract_json_object(raw)


def generate_svg_via_pipeline(
    llm: Any,
    *,
    model: str,
    question_stem: str,
    diagram_brief: str,
    required_elements: List[str],
    optional_elements: Optional[List[str]] = None,
    optional_notes: str = "",
    output_size: str = "600x420",
    trace: TraceFn = None,
) -> Tuple[Optional[str], str]:
    """
    Multi-phase: scene plan → layout → collision check → final SVG.
    Returns (svg_or_none, combined_raw_debug).
    """
    def _t(msg: str) -> None:
        if trace:
            try:
                trace(msg)
            except Exception:
                pass

    chunks: List[str] = []
    payload_str = build_diagram_request_payload(
        question_stem,
        diagram_brief=diagram_brief,
        required_elements=required_elements,
        optional_elements=optional_elements,
        notes=optional_notes,
        output_size=output_size,
    )
    _t(
        f"[diagram:pipeline] 1/5 scene — input stem_chars={len(question_stem or '')} "
        f"brief_chars={len(diagram_brief or '')} payload_json_chars={len(payload_str)}"
    )
    archetypes = load_svg_archetypes()
    scene_sys = load_svg_scene_prompt() + "\n\n---\n\nARCHETYPE_LIBRARY\n\n" + archetypes
    scene = _json_llm(
        llm,
        model,
        system=scene_sys,
        user="INPUT_JSON:\n" + payload_str,
        trace_label="quality_gate_svg_scene",
        temperature=0.2,
    )
    chunks.append("[scene]\n" + json.dumps(scene, ensure_ascii=False)[:6000])
    sk = list(scene.keys()) if isinstance(scene, dict) else []
    _t(f"[diagram:pipeline] 1/5 scene — output JSON top-level keys={sk[:25]}")

    layout_user = (
        "SCENE_JSON:\n"
        + json.dumps(scene, ensure_ascii=False)
        + "\n\nINPUT_JSON:\n"
        + payload_str
    )
    layout = _json_llm(
        llm,
        model,
        system=load_svg_layout_prompt(),
        user=layout_user,
        trace_label="quality_gate_svg_layout",
        temperature=0.2,
    )
    chunks.append("[layout]\n" + json.dumps(layout, ensure_ascii=False)[:8000])
    lk = list(layout.keys()) if isinstance(layout, dict) else []
    _t(f"[diagram:pipeline] 2/5 layout — output JSON top-level keys={lk[:25]}")

    layout_s = json.dumps(layout, ensure_ascii=False)
    if len(layout_s) > 28_000:
        layout_s = layout_s[:28_000] + "\n…[truncated for collision phase]"
    collision_user = (
        "SCENE_JSON:\n"
        + json.dumps(scene, ensure_ascii=False)[:8000]
        + "\n\nLAYOUT_JSON:\n"
        + layout_s
    )
    col = _json_llm(
        llm,
        model,
        system=load_svg_collision_prompt(),
        user=collision_user,
        trace_label="quality_gate_svg_collision",
        temperature=0.1,
    )
    chunks.append("[collision]\n" + json.dumps(col, ensure_ascii=False)[:4000])
    passed = col.get("passed") if isinstance(col, dict) else None
    _t(f"[diagram:pipeline] 3/5 collision — passed={passed!r}")

    final_layout: Dict[str, Any] = layout
    if isinstance(col, dict):
        if col.get("passed") is False and isinstance(col.get("revised_layout"), dict):
            final_layout = col["revised_layout"]
        elif col.get("passed") is False:
            chunks.append("[collision_warn] passed=false but no revised_layout; using original layout")

    render_user = (
        "SCENE_JSON:\n"
        + json.dumps(scene, ensure_ascii=False)[:8000]
        + "\n\nLAYOUT_JSON:\n"
        + json.dumps(final_layout, ensure_ascii=False)[:36_000]
        + "\n\nProduce the final SVG root element only."
    )
    raw_svg = llm.generate(
        model,
        load_svg_render_prompt(),
        render_user,
        temperature=0.15,
        trace_label="quality_gate_svg_render",
    )
    chunks.append("[render_raw]\n" + raw_svg[:2500])
    svg = extract_raw_svg(raw_svg)
    _t(
        f"[diagram:pipeline] 4/5 render — raw_chars={len(raw_svg or '')} "
        f"extracted_svg={'yes' if svg else 'no'} svg_chars={len(svg or '')}"
    )
    if not svg and (raw_svg or "").strip():
        _t(f"[diagram:pipeline] 4/5 render — extract_raw_svg failed; raw head:\n{(raw_svg or '')[:500]!r}")
    return svg, "\n\n".join(chunks)


def generate_svg_for_graph_candidate(
    llm: Any,
    *,
    model: str,
    question_stem: str,
    diagram_brief: str,
    required_elements: List[str],
    optional_notes: str = "",
    temperature: float = 0.25,
    trace: TraceFn = None,
) -> Tuple[Optional[str], str]:
    """
    Returns (svg_markup_or_none, raw_model_text).
    """
    def _t(msg: str) -> None:
        if trace:
            try:
                trace(msg)
            except Exception:
                pass

    system = load_svg_generator_instructions()
    user = (
        "Generate the SVG for this request JSON:\n\n"
        + build_diagram_request_payload(
            question_stem,
            diagram_brief=diagram_brief,
            required_elements=required_elements,
            notes=optional_notes,
        )
    )
    _t(f"[diagram:single_shot] input user_chars={len(user)}")
    raw = llm.generate(
        model,
        system,
        user,
        temperature=temperature,
        trace_label="quality_gate_svg_diagram",
    )
    svg = extract_raw_svg(raw)
    _t(
        f"[diagram:single_shot] output raw_chars={len(raw or '')} extracted_svg={'yes' if svg else 'no'} "
        f"svg_chars={len(svg or '')}"
    )
    if not svg and (raw or "").strip():
        _t(f"[diagram:single_shot] extract_raw_svg failed; raw head:\n{(raw or '')[:500]!r}")
    return svg, raw


def integrate_svg_into_question_stem(
    llm: Any,
    *,
    model: str,
    question_stem: str,
    svg: str,
    temperature: float = 0.35,
    trace: TraceFn = None,
) -> Tuple[Optional[str], str]:
    """
    LLM merges SVG into HTML stem using delimiter protocol.
    Returns (merged_stem_or_none, raw_text).
    """
    def _t(msg: str) -> None:
        if trace:
            try:
                trace(msg)
            except Exception:
                pass

    system = load_svg_integrate_instructions()
    user = (
        "CURRENT_QUESTION_STEM_HTML:\n"
        + (question_stem or "")
        + "\n\n---\n\nSVG_TO_EMBED_VERBATIM:\n"
        + svg
        + "\n\nProduce the delimited MERGED_HTML output as specified."
    )
    _t(
        f"[diagram:integrate] input stem_chars={len(question_stem or '')} svg_chars={len(svg or '')} "
        f"user_chars={len(user)}"
    )
    raw = llm.generate(
        model,
        system,
        user,
        temperature=temperature,
        trace_label="quality_gate_svg_integrate",
    )
    merged = parse_merged_html_delimited(raw)
    has_delim = "===MERGED_HTML===" in (raw or "")
    has_svg_in_merged = bool(merged and "<svg" in merged.lower())
    _t(
        f"[diagram:integrate] output raw_chars={len(raw or '')} has_MERGED_delimiter={has_delim} "
        f"parsed_merged_chars={len(merged or '')} parsed_has_<svg={has_svg_in_merged}"
    )
    if merged and not has_svg_in_merged:
        _t(f"[diagram:integrate] parsed merged HTML but no <svg tag; merged head:\n{(merged or '')[:400]!r}")
    if not merged and (raw or "").strip():
        _t(f"[diagram:integrate] parse_merged_html_delimited failed; raw head:\n{(raw or '')[:600]!r}")
    if merged and "<svg" in merged.lower():
        return merged, raw
    return None, raw


def run_auto_diagram_for_row(
    llm: Any,
    *,
    diagram_model: str,
    question_stem: str,
    diagram_brief: str,
    required_elements: List[str],
    optional_elements: Optional[List[str]] = None,
    trace: TraceFn = None,
) -> Tuple[Optional[str], str, str]:
    """
    Full pipeline: generate SVG, merge into stem.

    Returns (new_stem_or_none, log_summary, raw_concat_for_debug).
    """
    def _t(msg: str) -> None:
        if trace:
            try:
                trace(msg)
            except Exception:
                pass

    raw_g = ""
    svg: Optional[str] = None
    _t(f"[diagram] start model={diagram_model!r} pipeline_env={_use_svg_pipeline()!r}")
    if _use_svg_pipeline():
        try:
            svg, raw_g = generate_svg_via_pipeline(
                llm,
                model=diagram_model,
                question_stem=question_stem,
                diagram_brief=diagram_brief,
                required_elements=required_elements,
                optional_elements=optional_elements,
                trace=trace,
            )
        except Exception as ex:
            raw_g = f"[pipeline exception] {ex!s}"
            svg = None
            _t(f"[diagram:pipeline] exception: {ex!s}")
    if not svg:
        _t("[diagram] pipeline produced no SVG — trying single-shot diagram prompt")
        svg, raw_single = generate_svg_for_graph_candidate(
            llm,
            model=diagram_model,
            question_stem=question_stem,
            diagram_brief=diagram_brief,
            required_elements=required_elements,
            trace=trace,
        )
        raw_g = (raw_g + "\n---single_shot_fallback---\n" + raw_single) if raw_g else raw_single
    if not svg:
        _t("[diagram] FAILED: no extractable <svg> after pipeline + single-shot")
        return None, "svg_extraction_failed", raw_g[:8000]
    used_single_fallback = "---single_shot_fallback---" in raw_g
    svg_mode = "single_shot" if used_single_fallback else ("pipeline" if _use_svg_pipeline() else "single_shot")
    _t(f"[diagram] 5/5 integrate — using svg_mode={svg_mode!r}")
    merged, raw_i = integrate_svg_into_question_stem(
        llm,
        model=diagram_model,
        question_stem=question_stem,
        svg=svg,
        trace=trace,
    )
    if merged:
        _t(
            f"[diagram] done ok_llm_merge merged_chars={len(merged)} "
            f"stem_changed={merged != (question_stem or '')}"
        )
        return (
            merged,
            f"ok_llm_merge_svg={svg_mode}",
            raw_g[:4000] + "\n---\n" + raw_i[:2000],
        )
    fb = _fallback_merge_stem_html(question_stem, svg)
    _t(
        f"[diagram] integrate LLM returned no usable merged HTML — fallback_merge "
        f"fb_chars={len(fb)} has_<svg={'<svg' in fb.lower()}"
    )
    return (
        fb,
        f"ok_fallback_merge_svg={svg_mode}",
        raw_g[:4000] + "\n---\n" + raw_i[:2000],
    )
