"""Background worker that processes diagram-regeneration jobs queued by the
review app.

Job queue
=========

The review app's *Regenerate diagram* button writes the following row state::

    diagram_regen_status = 'queued'
    diagram_regen_user_note = <optional reviewer note>
    diagram_regen_requested_at = now()

This worker polls ``ai_generated_questions`` for ``queued`` rows in FIFO
order (``order_by diagram_regen_requested_at asc``), claims them by setting
``in_progress``, and runs::

    1. Gemini Vision analysis of (stem + current concept image + reviewer note)
       → JSON ``{"analysis": ..., "new_prompt": ...}``.
    2. Imagen generation with the rewritten prompt.
    3. Upload PNG to Supabase Storage (``question-images/diagram_regen/...``).
    4. Replace the first ``<figure class="qg-diagram"> ... </figure>`` block in
       the stem with the new figure that points at the uploaded URL.
    5. Persist: new ``question_stem``, ``diagram_regen_reason``,
       ``diagram_regen_new_prompt``, ``diagram_regen_completed_at`` and
       ``diagram_regen_status='done'``.

Run modes
=========

* ``python diagram_regen_worker.py --once`` — drain every currently queued row
  then exit. Great for cron / Vercel-cron / GitHub Actions.
* ``python diagram_regen_worker.py`` — poll forever at ``--interval`` seconds
  (default 5s). Ctrl-C to stop.

Environment
===========

Reuses everything the V4 pipeline already needs:

* ``SUPABASE_URL`` + ``SUPABASE_SERVICE_ROLE_KEY`` (for SELECT/UPDATE + Storage)
* ``GOOGLE_CLOUD_PROJECT`` (+ optional ``GOOGLE_CLOUD_LOCATION``) for Vertex
* ``MODEL_IMAGE_HIGH_QUALITY`` (default ``imagen-4.0-generate-001``)
* ``MODEL_VISION`` (default ``gemini-2.5-flash``) — Gemini model used for the
  audit. Anything vision-capable works.
"""

from __future__ import annotations

import argparse
import base64
import datetime as _dt
import json
import os
import re
import sys
import time
import traceback
import urllib.error
import urllib.request
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


def _load_env() -> None:
    """Load ``.env.local`` from the repo root (same one db_sync uses)."""
    try:
        from dotenv import load_dotenv  # type: ignore

        env_path = Path(__file__).resolve().parents[2] / ".env.local"
        if env_path.is_file():
            load_dotenv(env_path)
    except Exception:
        pass


_load_env()


try:
    from supabase import create_client  # type: ignore
except Exception as e:  # pragma: no cover
    raise SystemExit(
        "`supabase` is required. Install with `pip install supabase==2.*`.\n"
        f"Underlying import error: {e}"
    )


try:
    from google import genai as _genai  # type: ignore
    from google.genai import types as _genai_types  # type: ignore
except Exception as e:  # pragma: no cover
    raise SystemExit(
        "`google-genai` is required for Vision + Imagen. Install with "
        "`pip install google-genai`.\n"
        f"Underlying import error: {e}"
    )


# Reuse pipeline_v4 helpers when the script is run from the repo root.
_HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(_HERE))
try:
    from pipeline_v4.image_gen import generate_concept_image  # type: ignore
    from pipeline_v4.storage.supabase_assets import (  # type: ignore
        SupabaseAssetUploader,
        DEFAULT_BUCKET,
    )
except Exception as e:  # pragma: no cover
    raise SystemExit(
        "Cannot import pipeline_v4 helpers. Run this script from the "
        "`question-generation/esat_question_generator/` directory.\n"
        f"Underlying import error: {e}"
    )


SUPABASE_URL = (os.environ.get("SUPABASE_URL") or "").strip()
SUPABASE_KEY = (
    os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    or os.environ.get("SUPABASE_KEY")
    or ""
).strip()
if not SUPABASE_URL or not SUPABASE_KEY:
    raise SystemExit(
        "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set them in "
        ".env.local at the repo root (same file db_sync uses)."
    )

VISION_MODEL = (
    os.environ.get("MODEL_VISION")
    or os.environ.get("MODEL_STRUCTURED_STRONG")
    or "gemini-2.5-flash"
).strip()

GOOGLE_PROJECT = (
    os.environ.get("GOOGLE_CLOUD_PROJECT")
    or os.environ.get("VERTEX_PROJECT")
    or ""
).strip()
GOOGLE_LOCATION = (
    os.environ.get("GOOGLE_CLOUD_LOCATION")
    or os.environ.get("VERTEX_GENAI_LOCATION")
    or "us-central1"
).strip()
if GOOGLE_LOCATION.lower() == "global" and not os.environ.get("VERTEX_GENAI_NO_GLOBAL_REMAP"):
    GOOGLE_LOCATION = "us-central1"


SUPABASE = create_client(SUPABASE_URL, SUPABASE_KEY)
UPLOADER = SupabaseAssetUploader(bucket=DEFAULT_BUCKET, prefix="diagram_regen")
if not UPLOADER.enabled:
    raise SystemExit(
        "SupabaseAssetUploader failed to initialise. Confirm SUPABASE_URL + "
        "SUPABASE_SERVICE_ROLE_KEY are set and that the `question-images` "
        "bucket exists and is public."
    )

# ---------- helpers ----------

_FIGURE_RE = re.compile(
    r'<figure\s+class="qg-diagram"[^>]*>.*?</figure>',
    re.IGNORECASE | re.DOTALL,
)
_IMG_HREF_RE = re.compile(
    r'<image\s+[^>]*href="([^"]+)"',
    re.IGNORECASE,
)


def _now_iso() -> str:
    return _dt.datetime.now(_dt.timezone.utc).isoformat()


def _short_id() -> str:
    return uuid.uuid4().hex[:10]


def _extract_first_figure(stem: str) -> Tuple[Optional[str], Optional[str]]:
    """Return (figure_html, image_href) for the first ``qg-diagram`` figure.

    ``image_href`` is the URL/data-URI on the first ``<image>`` inside the SVG.
    Both may be ``None`` if no figure was found.
    """
    if not stem:
        return None, None
    m = _FIGURE_RE.search(stem)
    if not m:
        return None, None
    fig = m.group(0)
    href_match = _IMG_HREF_RE.search(fig)
    href = href_match.group(1) if href_match else None
    return fig, href


def _figure_for_url(url: str, *, alt: str = "") -> str:
    safe_alt = (alt or "").replace('"', "&quot;")
    href = url.replace('"', "&quot;")
    inner = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 420" '
        'width="600" height="420" role="img" aria-label="' + safe_alt + '">'
        '<image href="' + href + '" '
        'x="0" y="0" width="600" height="420" preserveAspectRatio="xMidYMid meet" />'
        "</svg>"
    )
    return f'<figure class="qg-diagram">{inner}</figure>'


def _replace_first_figure(stem: str, new_figure: str) -> Tuple[str, bool]:
    """Replace the first ``qg-diagram`` figure with ``new_figure``. If no
    figure exists, append the new one to the end of the stem."""
    if not stem:
        return new_figure, True
    out, n = _FIGURE_RE.subn(new_figure, stem, count=1)
    if n > 0:
        return out, True
    return stem.rstrip() + "\n\n" + new_figure + "\n", True


def _fetch_image_bytes(href: str) -> Tuple[Optional[bytes], Optional[str]]:
    """Best-effort image fetch. Returns ``(bytes, mime)`` or ``(None, None)``.

    Supports ``data:image/...;base64,...`` and public ``http(s)://`` URLs.
    """
    if not href:
        return None, None
    if href.startswith("data:"):
        try:
            head, b64 = href.split(",", 1)
            mime = "image/png"
            if ";" in head:
                mime_part = head.split(":", 1)[1].split(";", 1)[0]
                mime = mime_part or mime
            return base64.b64decode(b64), mime
        except Exception:
            return None, None
    if href.startswith("http://") or href.startswith("https://"):
        try:
            req = urllib.request.Request(
                href, headers={"User-Agent": "diagram-regen-worker/1.0"}
            )
            with urllib.request.urlopen(req, timeout=20) as r:
                data = r.read()
                mime = r.headers.get("Content-Type", "image/png").split(";")[0]
                return data, mime
        except (urllib.error.URLError, TimeoutError):
            return None, None
        except Exception:
            return None, None
    return None, None


# ---------- LLM: vision audit ----------

_VISION_SYSTEM_PROMPT = """You are auditing a Physics MCQ diagram for an
ESAT-style multiple-choice question. The diagram must obey these "Goldilocks"
rules:

1. Show only the literal apparatus / object layout described in the stem.
2. At most 3 distinct object types and at most 3 labels.
3. No force arrows, field arrows, construction arcs, or invented symbols
   unless the stem explicitly asks the candidate to consider them.
4. No mixing of apparatus + force diagram + field diagram.
5. The image must not be answer-bearing or harder to read than the stem.

You will receive:
- The current question stem (plain text + minimal HTML).
- The current diagram image.
- An optional reviewer note describing what is wrong with the current image.
- An optional V4 idea_plan summary (concept, twist, key objects).

Return EXACTLY this JSON, with no extra prose or code fences:

{
  "analysis": "Two-to-five short sentences in plain English describing why the
               current diagram fails the Goldilocks rules. Always cite at least
               one concrete defect (e.g. 'extra magnetic-field arrows', 'angle
               label invented', 'cement bag floating').",
  "new_prompt": "A self-contained Imagen prompt that produces a strictly
                 simpler replacement. State: subject objects, viewpoint,
                 background, line weight, allowed labels, explicit
                 negative-prompt items (no arrows, no field lines, no
                 construction lines, no measurement ticks unless the stem
                 asked for them). Keep below 400 words. Do NOT mention the
                 candidate, the answer, or the multiple-choice options."
}

If the current diagram is already fine and the reviewer note does not contradict
that, still produce a new_prompt that re-renders the same simple scene -- the
reviewer asked for a fresh attempt for a reason."""


def _gemini_vision_audit(
    *,
    stem: str,
    image_bytes: Optional[bytes],
    image_mime: Optional[str],
    user_note: str,
    idea_plan_brief: str,
    visual_type: str,
) -> Dict[str, Any]:
    """Run a single-shot Gemini Vision audit. Returns a dict with the model
    response. Never raises; on failure returns ``{}`` and the caller logs."""
    client = _genai.Client(
        vertexai=True, project=GOOGLE_PROJECT, location=GOOGLE_LOCATION
    )

    user_text = (
        "Stem:\n"
        + (stem or "(empty stem)").strip()
        + "\n\nReviewer note:\n"
        + (user_note or "(no note)").strip()
        + "\n\nidea_plan brief:\n"
        + (idea_plan_brief or "(none)").strip()
        + "\n\nDiagram route: "
        + (visual_type or "concept_image")
    )

    parts: List[Any] = [_genai_types.Part.from_text(text=user_text)]
    if image_bytes:
        parts.append(
            _genai_types.Part.from_bytes(
                data=image_bytes, mime_type=image_mime or "image/png"
            )
        )

    config = _genai_types.GenerateContentConfig(
        system_instruction=_VISION_SYSTEM_PROMPT,
        temperature=0.35,
        response_mime_type="application/json",
    )

    response = client.models.generate_content(
        model=VISION_MODEL,
        contents=[_genai_types.Content(role="user", parts=parts)],
        config=config,
    )
    text = (getattr(response, "text", None) or "").strip()
    if not text:
        return {}
    try:
        return json.loads(text)
    except Exception:
        # Try to extract first JSON object
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            try:
                return json.loads(text[start : end + 1])
            except Exception:
                return {"analysis": text, "new_prompt": ""}
        return {"analysis": text, "new_prompt": ""}


# ---------- job processing ----------


def _claim_one_job() -> Optional[Dict[str, Any]]:
    """Atomically claim the oldest queued row by flipping it to in_progress.

    The CHECK constraint on diagram_regen_status guarantees the value is one
    of the allowed enum members. The ``.eq('diagram_regen_status', 'queued')``
    filter on the UPDATE ensures we never claim a row twice if two workers race.
    """
    # First, find the oldest queued row id.
    sel = (
        SUPABASE.table("ai_generated_questions")
        .select("id, diagram_regen_requested_at")
        .eq("diagram_regen_status", "queued")
        .order("diagram_regen_requested_at", desc=False)
        .limit(1)
        .execute()
    )
    rows = sel.data or []
    if not rows:
        return None
    row_id = rows[0]["id"]

    # Conditional claim: only flip if still queued.
    claim = (
        SUPABASE.table("ai_generated_questions")
        .update(
            {
                "diagram_regen_status": "in_progress",
                "diagram_regen_attempts": (rows[0].get("diagram_regen_attempts") or 0) + 1,
            }
        )
        .eq("id", row_id)
        .eq("diagram_regen_status", "queued")
        .execute()
    )
    claimed = (claim.data or [])
    if not claimed:
        return None  # Another worker beat us; loop and try again.

    # Pull the full row now that we own it.
    full = (
        SUPABASE.table("ai_generated_questions")
        .select("*")
        .eq("id", row_id)
        .single()
        .execute()
    )
    return full.data


def _idea_plan_brief(idea_plan: Any) -> str:
    if not isinstance(idea_plan, dict):
        return ""
    parts: List[str] = []
    for key in ("concept", "small_twist", "stimulus_type", "primary_objects", "intended_difficulty"):
        v = idea_plan.get(key)
        if v:
            parts.append(f"{key}: {v}")
    return "\n".join(parts)[:1500]


def _process_job(row: Dict[str, Any]) -> Dict[str, Any]:
    """Process a single claimed row. Returns the patch dict to write back."""
    qid = row["id"]
    stem = row.get("question_stem") or ""
    user_note = row.get("diagram_regen_user_note") or ""
    visual_type = row.get("visual_type") or "concept_image"
    idea_plan = row.get("idea_plan")
    if isinstance(idea_plan, str):
        try:
            idea_plan = json.loads(idea_plan)
        except Exception:
            idea_plan = None
    plan_brief = _idea_plan_brief(idea_plan)

    # 1) Pull the current image off the stem.
    _figure, href = _extract_first_figure(stem)
    img_bytes, img_mime = _fetch_image_bytes(href) if href else (None, None)

    # 2) Vision audit.
    audit = _gemini_vision_audit(
        stem=stem,
        image_bytes=img_bytes,
        image_mime=img_mime,
        user_note=user_note,
        idea_plan_brief=plan_brief,
        visual_type=str(visual_type),
    )
    analysis = str(audit.get("analysis") or "").strip()
    new_prompt = str(audit.get("new_prompt") or "").strip()
    if not new_prompt:
        # If the audit failed, build a defensive prompt from user_note + stem.
        new_prompt = (
            "Brutally simple, exam-style line diagram of the apparatus described "
            "below. Black ink on white background, no shading, no perspective, "
            "no force arrows, no field lines, no construction arcs, no invented "
            "labels. Maximum 3 object types and 3 labels. Square 1:1 aspect.\n\n"
            f"Stem:\n{stem[:1200]}\n\nReviewer note:\n{user_note or '(none)'}"
        )

    # 3) Imagen generation. Save to a temp file then upload.
    tmp_dir = Path(_HERE) / "generated" / "_diagram_regen_tmp"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    short = _short_id()
    out_path = tmp_dir / f"{qid}_{short}.png"
    try:
        meta = generate_concept_image(
            new_prompt,
            out_path=out_path,
            aspect_ratio=os.environ.get("ESAT_IMAGE_ASPECT_RATIO") or "1:1",
            quality="high",
        )
    except Exception as e:
        return {
            "diagram_regen_status": "failed",
            "diagram_regen_last_error": f"Imagen error: {e}",
            "diagram_regen_reason": analysis or None,
            "diagram_regen_new_prompt": new_prompt,
            "diagram_regen_completed_at": _now_iso(),
            "updated_at": _now_iso(),
        }

    # 4) Upload + splice.
    png = out_path.read_bytes()
    uploaded = UPLOADER.upload_bytes(
        png,
        generation_id=f"{qid}/{short}",
        filename=f"diagram_regen_{short}.png",
        content_type="image/png",
    )
    if not uploaded or not uploaded.get("url"):
        return {
            "diagram_regen_status": "failed",
            "diagram_regen_last_error": "Supabase upload returned no URL",
            "diagram_regen_reason": analysis or None,
            "diagram_regen_new_prompt": new_prompt,
            "diagram_regen_completed_at": _now_iso(),
            "updated_at": _now_iso(),
        }

    new_url = uploaded["url"]
    new_fig = _figure_for_url(new_url, alt="concept_image")
    new_stem, _replaced = _replace_first_figure(stem, new_fig)

    # 5) Patch the row.
    patch: Dict[str, Any] = {
        "question_stem": new_stem,
        "has_visual": True,
        "visual_type": visual_type if visual_type and visual_type != "none" else "concept_image",
        "visual_renderer": "gemini_image_v1",
        "diagram_regen_status": "done",
        "diagram_regen_reason": analysis or None,
        "diagram_regen_new_prompt": new_prompt,
        "diagram_regen_completed_at": _now_iso(),
        "diagram_regen_last_error": None,
        "updated_at": _now_iso(),
    }

    # Best-effort append to visual_assets, leaving existing entries untouched.
    existing = row.get("visual_assets") or []
    if isinstance(existing, str):
        try:
            existing = json.loads(existing)
        except Exception:
            existing = []
    if not isinstance(existing, list):
        existing = []
    existing.append(
        {
            "kind": "concept_image_regen",
            "image_url": new_url,
            "image_key": uploaded.get("key"),
            "renderer": "gemini_image_v1",
            "qc_status": "pending",
            "qc_source": "diagram_regen_worker",
            "model": meta.get("model"),
            "duration_s": meta.get("duration_s"),
            "created_at": _now_iso(),
            "reviewer_note": user_note,
        }
    )
    patch["visual_assets"] = existing

    return patch


def _drain(max_jobs: Optional[int] = None) -> int:
    processed = 0
    while True:
        if max_jobs is not None and processed >= max_jobs:
            return processed
        row = _claim_one_job()
        if not row:
            return processed
        qid = row["id"]
        print(f"[{_now_iso()}] processing {qid}", flush=True)
        try:
            patch = _process_job(row)
        except Exception as e:
            tb = traceback.format_exc()
            print(f"[{_now_iso()}] error processing {qid}: {e}\n{tb}", flush=True)
            patch = {
                "diagram_regen_status": "failed",
                "diagram_regen_last_error": f"{e}\n{tb}"[:2000],
                "diagram_regen_completed_at": _now_iso(),
                "updated_at": _now_iso(),
            }
        SUPABASE.table("ai_generated_questions").update(patch).eq("id", qid).execute()
        status = patch.get("diagram_regen_status", "?")
        print(
            f"[{_now_iso()}] finished {qid} -> {status}",
            flush=True,
        )
        processed += 1


def main() -> None:
    ap = argparse.ArgumentParser(description="Diagram regen worker")
    ap.add_argument(
        "--once",
        action="store_true",
        help="Drain currently queued jobs once, then exit.",
    )
    ap.add_argument(
        "--interval",
        type=float,
        default=5.0,
        help="Polling interval in seconds (loop mode).",
    )
    ap.add_argument(
        "--max-jobs",
        type=int,
        default=None,
        help="Max jobs per drain cycle (default: unlimited).",
    )
    args = ap.parse_args()

    print(
        f"[{_now_iso()}] diagram regen worker starting "
        f"(vision={VISION_MODEL}, project={GOOGLE_PROJECT}, "
        f"location={GOOGLE_LOCATION})",
        flush=True,
    )

    if args.once:
        n = _drain(max_jobs=args.max_jobs)
        print(f"[{_now_iso()}] drained {n} job(s), exiting.")
        return

    try:
        while True:
            n = _drain(max_jobs=args.max_jobs)
            if n == 0:
                time.sleep(args.interval)
    except KeyboardInterrupt:
        print("\nstopped by user.")


if __name__ == "__main__":
    main()
