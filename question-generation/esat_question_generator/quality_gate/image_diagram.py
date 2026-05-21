from __future__ import annotations

import json
import os
import re
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

from project import LLMClient

from .defaults import (
    IMAGE_BACKFILL_BUCKET,
    default_image_brief_model,
    default_image_fallback_model,
    default_image_integrate_model,
    default_image_model,
    default_image_verify_model,
)
from .svg_diagram import extract_json_object, parse_merged_html_delimited

TraceFn = Optional[Callable[[str], None]]
_DIR = Path(__file__).resolve().parent

_FIGURE_QG_RE = re.compile(
    r'<figure\b[^>]*class\s*=\s*["\'][^"\']*qg-diagram[^"\']*["\'][^>]*>',
    re.IGNORECASE,
)


def _load_text(name: str) -> str:
    return (_DIR / name).read_text(encoding="utf-8")


def load_image_brief_prompt() -> str:
    return _load_text("prompt_image_brief.md")


def load_image_generate_prompt() -> str:
    return _load_text("prompt_image_generate.md")


def load_image_verify_prompt() -> str:
    return _load_text("prompt_image_verify.md")


def load_image_retry_prompt() -> str:
    return _load_text("prompt_image_retry.md")


def load_image_integrate_prompt() -> str:
    return _load_text("prompt_image_integrate.md")


def existing_diagram_status(stem: str) -> Dict[str, bool]:
    s = stem or ""
    low = s.lower()
    return {
        "has_qg_figure": bool(_FIGURE_QG_RE.search(s)),
        "has_svg": "<svg" in low,
        "has_img": "<img" in low,
    }


def stem_has_existing_diagram(stem: str) -> bool:
    st = existing_diagram_status(stem)
    return st["has_qg_figure"] or st["has_svg"] or st["has_img"]


def graph_enrichment_from_row(row: Dict[str, Any]) -> Dict[str, Any]:
    payload = row.get("quality_gate_payload")
    if isinstance(payload, str):
        try:
            payload = json.loads(payload)
        except json.JSONDecodeError:
            payload = {}
    elif not isinstance(payload, dict):
        payload = {}
    ge = payload.get("graph_enrichment")
    return ge if isinstance(ge, dict) else {}


def build_brief_input(row: Dict[str, Any]) -> Dict[str, Any]:
    stem = str(row.get("question_stem") or "")
    ge = graph_enrichment_from_row(row)
    diag = existing_diagram_status(stem)
    return {
        "question_stem": stem[:16_000],
        "graph_enrichment": ge,
        "quality_gate_graph_notes": (row.get("quality_gate_graph_notes") or "").strip(),
        "subject": row.get("subjects") or row.get("subject"),
        "difficulty": row.get("difficulty"),
        "existing_diagram_status": diag,
        "quality_gate_graph_mode": row.get("quality_gate_graph_mode"),
        "quality_gate_graph_candidate": row.get("quality_gate_graph_candidate"),
    }


def build_image_brief(
    llm: Any,
    *,
    model: str,
    row: Dict[str, Any],
    trace: TraceFn = None,
) -> Tuple[Dict[str, Any], str]:
    payload = build_brief_input(row)
    user = "INPUT_JSON:\n" + json.dumps(payload, ensure_ascii=False, indent=2)
    raw = llm.generate(
        model,
        load_image_brief_prompt(),
        user,
        temperature=0.2,
        trace_label="quality_gate_image_brief",
    )
    if trace:
        try:
            trace(f"[image:brief] raw_chars={len(raw or '')}")
        except Exception:
            pass
    return extract_json_object(raw), raw


def skip_reason_from_brief(
    brief: Dict[str, Any],
    *,
    stem: str,
    allow_high_precision_image: bool,
    replace_existing_diagram: bool,
) -> Optional[str]:
    if not brief.get("should_generate"):
        return "should_generate=false"
    if str(brief.get("spoiler_risk") or "").lower() == "high":
        return "spoiler_risk=high"
    prec = str(brief.get("precision_risk") or "").lower()
    if prec == "high" and not allow_high_precision_image:
        return "precision_risk=high (use --allow-high-precision-image to override)"
    if stem_has_existing_diagram(stem) and not replace_existing_diagram:
        return "existing_diagram_present"
    return None


def resolve_auto_diagram_mode(brief: Dict[str, Any]) -> str:
    """Return ``image`` or ``svg`` for auto mode."""
    need = str(brief.get("diagram_need") or "none").lower()
    prec = str(brief.get("precision_risk") or "low").lower()
    if need in ("qualitative_graph", "geometry") and prec in ("medium", "high"):
        return "svg"
    if need in ("forces", "container", "ray", "schematic", "circuit"):
        return "image"
    if need == "geometry" and prec == "low":
        return "image"
    if need == "other" and prec in ("low", "medium"):
        return "image"
    if need == "none":
        return "skip"
    return "svg" if prec in ("medium", "high") else "image"


def render_generate_prompt(brief: Dict[str, Any]) -> str:
    """Full prompt text (for logging). Imagen API uses ``build_imagen_api_prompt``."""
    template = load_image_generate_prompt()
    brief_json = json.dumps(brief, ensure_ascii=False, indent=2)
    return template.replace("{{IMAGE_BRIEF_JSON}}", brief_json)


def build_imagen_api_prompt(brief: Dict[str, Any]) -> str:
    """Condensed Imagen prompt (style rules + brief fields; fits model limits)."""
    style_head = load_image_generate_prompt().split("{{IMAGE_BRIEF_JSON}}")[0].strip()
    lines = [
        style_head,
        "",
        "DRAW THIS EXAM DIAGRAM:",
        str(brief.get("image_brief") or "").strip(),
    ]
    req = brief.get("required_elements") or []
    if req:
        lines.append("Required elements: " + "; ".join(str(x) for x in req))
    labels = brief.get("labels_required") or []
    if labels:
        lines.append("Labels to show: " + "; ".join(str(x) for x in labels))
    meas = brief.get("measurements_required") or []
    if meas:
        lines.append("Measurements (exact): " + "; ".join(str(x) for x in meas))
    forbidden = brief.get("forbidden_elements") or []
    if forbidden:
        lines.append("Do NOT show: " + "; ".join(str(x) for x in forbidden))
    notes = str(brief.get("notes") or "").strip()
    if notes:
        lines.append("Notes: " + notes)
    text = "\n".join(lines)
    if len(text) > 3500:
        text = text[:3500] + "\n…[truncated]"
    return text


def render_retry_prompt(brief: Dict[str, Any], verification: Dict[str, Any]) -> str:
    template = load_image_retry_prompt()
    return (
        template.replace("{{IMAGE_BRIEF_JSON}}", json.dumps(brief, ensure_ascii=False, indent=2))
        .replace("{{VERIFICATION_JSON}}", json.dumps(verification, ensure_ascii=False, indent=2))
    )


def _aspect_ratio_from_brief(brief: Dict[str, Any]) -> str:
    ar = str(brief.get("aspect_ratio") or "").strip()
    if ar and re.match(r"^\d+:\d+$", ar):
        return ar
    return "4:3"


def generate_image_file(
    prompt: str,
    *,
    image_model: str,
    fallback_model: str,
    aspect_ratio: str,
    out_path: Path,
    trace: TraceFn = None,
) -> Tuple[Path, str, Dict[str, Any]]:
    from pipeline_v4.image_gen import generate_concept_image  # type: ignore

    models = [m for m in [image_model, fallback_model] if m]
    seen: set[str] = set()
    ordered: List[str] = []
    for m in models:
        if m not in seen:
            seen.add(m)
            ordered.append(m)
    last_err: Optional[Exception] = None
    for mid in ordered:
        try:
            if trace:
                trace(f"[image:generate] model={mid!r} aspect={aspect_ratio!r}")
            meta = generate_concept_image(
                prompt,
                out_path=out_path,
                model=mid,
                aspect_ratio=aspect_ratio,
            )
            return out_path, mid, meta
        except Exception as ex:
            last_err = ex
            if trace:
                trace(f"[image:generate] model={mid!r} failed: {ex}")
    raise RuntimeError(f"All image models failed: {last_err}")


def _vision_json(
    *,
    model: str,
    system: str,
    user_text: str,
    image_path: Path,
    trace_label: str,
) -> Tuple[Dict[str, Any], str]:
    try:
        from google import genai as _genai  # type: ignore
        from google.genai import types as _genai_types  # type: ignore
    except Exception as ex:
        raise RuntimeError(f"google-genai required for vision: {ex}") from ex

    from pipeline_v4.image_gen import encode_image_for_inline  # type: ignore

    project = (
        os.environ.get("GOOGLE_CLOUD_PROJECT")
        or os.environ.get("VERTEX_PROJECT")
        or ""
    ).strip()
    location = (
        os.environ.get("GOOGLE_CLOUD_LOCATION")
        or os.environ.get("VERTEX_GENAI_LOCATION")
        or "us-central1"
    ).strip()
    if location.lower() == "global" and not os.environ.get("VERTEX_GENAI_NO_GLOBAL_REMAP"):
        location = "us-central1"
    if not project:
        raise RuntimeError("GOOGLE_CLOUD_PROJECT not set for vision verification")

    mime, _b64 = encode_image_for_inline(image_path)
    img_bytes = image_path.read_bytes()
    client = _genai.Client(vertexai=True, project=project, location=location)
    parts: List[Any] = [
        _genai_types.Part.from_text(text=user_text),
        _genai_types.Part.from_bytes(data=img_bytes, mime_type=mime),
    ]
    config = _genai_types.GenerateContentConfig(
        system_instruction=system,
        temperature=0.15,
        response_mime_type="application/json",
    )
    response = client.models.generate_content(
        model=model,
        contents=[_genai_types.Content(role="user", parts=parts)],
        config=config,
    )
    raw = (getattr(response, "text", None) or "").strip()
    return extract_json_object(raw), raw


def verify_image(
    *,
    verify_model: str,
    question_stem: str,
    brief: Dict[str, Any],
    image_path: Path,
    trace: TraceFn = None,
) -> Tuple[Dict[str, Any], str]:
    user = (
        "question_stem:\n"
        + (question_stem or "")[:12_000]
        + "\n\nimage_brief_json:\n"
        + json.dumps(brief, ensure_ascii=False, indent=2)
        + "\n\nVerify the attached generated_image."
    )
    result, raw = _vision_json(
        model=verify_model,
        system=load_image_verify_prompt(),
        user_text=user,
        image_path=image_path,
        trace_label="quality_gate_image_verify",
    )
    if trace:
        try:
            trace(
                f"[image:verify] verdict={result.get('verdict')!r} "
                f"can_merge={result.get('can_merge')!r}"
            )
        except Exception:
            pass
    return result, raw


def verification_passes(verification: Dict[str, Any]) -> bool:
    verdict = str(verification.get("verdict") or "").lower()
    can_merge = verification.get("can_merge")
    return verdict == "pass" and can_merge is True


def upload_image_to_supabase(
    image_path: Path,
    *,
    question_id: str,
    client: Any,
) -> Optional[str]:
    data = image_path.read_bytes()
    suffix = image_path.suffix.lower() or ".png"
    content_type = {
        ".png": "image/png",
        ".webp": "image/webp",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
    }.get(suffix, "image/png")
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    short = uuid.uuid4().hex[:10]
    key = f"{question_id}/{stamp}_{short}{suffix}"
    try:
        client.storage.from_(IMAGE_BACKFILL_BUCKET).upload(
            path=key,
            file=data,
            file_options={
                "content-type": content_type,
                "upsert": "true",
                "cache-control": "public, max-age=31536000, immutable",
            },
        )
    except Exception as ex:
        err = str(ex)
        if "duplicate" not in err.lower() and "409" not in err:
            raise
    base = (os.environ.get("SUPABASE_URL") or "").strip().rstrip("/")
    if not base:
        return None
    return f"{base}/storage/v1/object/public/{IMAGE_BACKFILL_BUCKET}/{key}"


def integrate_image_into_stem(
    llm: Any,
    *,
    model: str,
    question_stem: str,
    image_url: str,
    brief: Dict[str, Any],
    replace_existing_diagram: bool = False,
    trace: TraceFn = None,
) -> Tuple[Optional[str], str]:
    alt_text = str(brief.get("alt_text") or "Exam diagram").strip()
    insertion_hint = str(brief.get("insertion_hint") or "").strip()
    user = (
        "question_stem:\n"
        + (question_stem or "")
        + "\n\nimage_url:\n"
        + image_url
        + "\n\nalt_text:\n"
        + alt_text
        + "\n\ninsertion_hint:\n"
        + insertion_hint
        + "\n\nimage_brief_json:\n"
        + json.dumps(brief, ensure_ascii=False, indent=2)
        + "\n\nreplacement_allowed:\n"
        + ("true" if replace_existing_diagram else "false")
        + "\n\nProduce the delimited MERGED_HTML output as specified."
    )
    raw = llm.generate(
        model,
        load_image_integrate_prompt(),
        user,
        temperature=0.25,
        trace_label="quality_gate_image_integrate",
    )
    merged = parse_merged_html_delimited(raw)
    if merged and "<img" in merged.lower():
        if trace:
            trace(f"[image:integrate] ok_llm_merge merged_chars={len(merged)}")
        return merged, raw
    fb = _fallback_merge_stem_html(
        question_stem,
        image_url=image_url,
        alt_text=alt_text,
        replace_existing=replace_existing_diagram,
    )
    if trace:
        trace(f"[image:integrate] fallback_merge merged_chars={len(fb)}")
    return fb, raw


def _fallback_merge_stem_html(
    stem: str,
    *,
    image_url: str,
    alt_text: str,
    replace_existing: bool,
) -> str:
    safe_alt = (alt_text or "Exam diagram").replace('"', "&quot;")
    safe_url = image_url.replace('"', "&quot;")
    fig = (
        '<figure class="qg-diagram" style="margin:1em 0;text-align:center;">'
        f'<img src="{safe_url}" alt="{safe_alt}" style="max-width:100%;height:auto;" />'
        "</figure>"
    )
    s = stem or ""
    if replace_existing:
        out, n = re.subn(
            r'<figure\b[^>]*class\s*=\s*["\'][^"\']*qg-diagram[^"\']*["\'][^>]*>.*?</figure>',
            fig,
            s,
            count=1,
            flags=re.IGNORECASE | re.DOTALL,
        )
        if n > 0:
            return out
    for pat in (
        r"<insert[^>]{0,200}>",
        r"\[insert[^\]]{0,200}\]",
    ):
        m = re.search(pat, s, flags=re.I)
        if m:
            return s[: m.start()] + fig + s[m.end() :]
    return s.rstrip() + ("\n\n" if s and not s.endswith("\n") else "") + fig


def run_auto_image_diagram_for_row(
    row: Dict[str, Any],
    *,
    image_model: str = "",
    brief_model: str = "",
    verify_model: str = "",
    integrate_model: str = "",
    image_fallback_model: str = "",
    dry_run: bool = False,
    max_retries: int = 1,
    allow_high_precision_image: bool = False,
    replace_existing_diagram: bool = False,
    trace: TraceFn = None,
    supabase_client: Any = None,
) -> Dict[str, Any]:
    """
    Full image backfill pipeline for one DB row.

    Returns an audit dict suitable for ``image_backfill_history.jsonl``.
    """
    def _t(msg: str) -> None:
        if trace:
            try:
                trace(msg)
            except Exception:
                pass

    qid = str(row.get("id") or "")
    stem = str(row.get("question_stem") or "")
    graph_mode = row.get("quality_gate_graph_mode") or (
        "candidate" if row.get("quality_gate_graph_candidate") else "none"
    )

    im = (image_model or "").strip() or default_image_model()
    bm = (brief_model or "").strip() or default_image_brief_model()
    vm = (verify_model or "").strip() or default_image_verify_model()
    intm = (integrate_model or "").strip() or default_image_integrate_model()
    fb = (image_fallback_model or "").strip() or default_image_fallback_model()

    audit: Dict[str, Any] = {
        "question_id": qid,
        "graph_mode": graph_mode,
        "image_model": im,
        "brief_model": bm,
        "verify_model": vm,
        "integrate_model": intm,
        "dry_run": dry_run,
        "final_status": "failed",
        "reason": "",
        "retry_attempted": False,
        "uploaded_url": None,
        "verification_verdict": None,
        "verification_issues": [],
    }

    llm = LLMClient()
    try:
        brief, _raw_brief = build_image_brief(llm, model=bm, row=row, trace=trace)
    except Exception as ex:
        audit["reason"] = f"brief_failed: {ex}"
        audit["final_status"] = "failed"
        return audit

    audit.update(
        {
            "should_generate": brief.get("should_generate"),
            "diagram_need": brief.get("diagram_need"),
            "spoiler_risk": brief.get("spoiler_risk"),
            "precision_risk": brief.get("precision_risk"),
            "image_brief": brief.get("image_brief"),
        }
    )

    skip = skip_reason_from_brief(
        brief,
        stem=stem,
        allow_high_precision_image=allow_high_precision_image,
        replace_existing_diagram=replace_existing_diagram,
    )
    if skip:
        audit["final_status"] = "skipped"
        audit["reason"] = skip
        _t(f"[image] skip {qid}: {skip}")
        return audit

    aspect = _aspect_ratio_from_brief(brief)
    gen_prompt = build_imagen_api_prompt(brief)
    _t(f"[image] imagen prompt_chars={len(gen_prompt)}")
    tmp_dir = Path(tempfile.mkdtemp(prefix="qg_image_"))
    image_path = tmp_dir / "diagram.png"

    try:
        image_path, used_model, _gen_meta = generate_image_file(
            gen_prompt,
            image_model=im,
            fallback_model=fb,
            aspect_ratio=aspect,
            out_path=image_path,
            trace=trace,
        )
        audit["image_model_used"] = used_model

        verification, _raw_v = verify_image(
            verify_model=vm,
            question_stem=stem,
            brief=brief,
            image_path=image_path,
            trace=trace,
        )
        audit["verification_verdict"] = verification.get("verdict")
        audit["verification_issues"] = verification.get("issues") or []

        attempts = 0
        while not verification_passes(verification) and attempts < max(0, int(max_retries)):
            attempts += 1
            audit["retry_attempted"] = True
            _t(f"[image] retry {attempts}/{max_retries} for {qid}")
            retry_prompt = render_retry_prompt(brief, verification)
            if verification.get("retry_prompt"):
                retry_prompt = (
                    str(verification["retry_prompt"]).strip()
                    + "\n\n"
                    + build_imagen_api_prompt(brief)
                )
            else:
                retry_prompt = build_imagen_api_prompt(brief) + "\n\nFix issues:\n" + json.dumps(
                    {
                        "issues": verification.get("issues"),
                        "missing": verification.get("missing_required_elements"),
                    },
                    ensure_ascii=False,
                )
            image_path, used_model, _ = generate_image_file(
                retry_prompt,
                image_model=im,
                fallback_model=fb,
                aspect_ratio=aspect,
                out_path=tmp_dir / f"diagram_retry_{attempts}.png",
                trace=trace,
            )
            audit["image_model_used"] = used_model
            verification, _raw_v = verify_image(
                verify_model=vm,
                question_stem=stem,
                brief=brief,
                image_path=image_path,
                trace=trace,
            )
            audit["verification_verdict"] = verification.get("verdict")
            audit["verification_issues"] = verification.get("issues") or []

        if not verification_passes(verification):
            audit["final_status"] = "failed"
            audit["reason"] = f"verification_failed: {verification.get('verdict')}"
            _t(f"[image] verify fail {qid}: {audit['reason']}")
            return audit

        if dry_run:
            audit["final_status"] = "dry_run_pass"
            audit["reason"] = "verified_ok_no_db_write"
            _t(f"[image] dry_run ok {qid} (verified, no upload/merge)")
            return audit

        if supabase_client is None:
            audit["final_status"] = "failed"
            audit["reason"] = "no_supabase_client"
            return audit

        url = upload_image_to_supabase(image_path, question_id=qid, client=supabase_client)
        if not url:
            audit["final_status"] = "failed"
            audit["reason"] = "upload_failed"
            return audit
        audit["uploaded_url"] = url

        merged, _raw_i = integrate_image_into_stem(
            llm,
            model=intm,
            question_stem=stem,
            image_url=url,
            brief=brief,
            replace_existing_diagram=replace_existing_diagram,
            trace=trace,
        )
        if not merged or "<img" not in merged.lower():
            audit["final_status"] = "failed"
            audit["reason"] = "integrate_failed"
            return audit

        audit["merged_stem"] = merged
        audit["merged_stem_chars"] = len(merged)
        audit["final_status"] = "merged"
        audit["reason"] = "ok"
        audit["verification_payload"] = verification
        audit["brief_payload"] = brief
        audit["verified_at"] = datetime.now(timezone.utc).isoformat()
        return audit
    finally:
        try:
            for p in tmp_dir.glob("*"):
                p.unlink(missing_ok=True)
            tmp_dir.rmdir()
        except OSError:
            pass
