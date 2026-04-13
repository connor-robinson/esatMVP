"""Shared helpers for schema prefix classification (Flash)."""

from __future__ import annotations

import json
import os
import re
from pathlib import Path

_BASE = Path(__file__).resolve().parent
PROMPT_PATH = _BASE / "prompts" / "schema_prefix_classifier.md"


def load_classifier_instructions() -> str:
    if not PROMPT_PATH.is_file():
        raise FileNotFoundError(f"Missing {PROMPT_PATH}")
    return PROMPT_PATH.read_text(encoding="utf-8")


def extract_json_object(text: str) -> dict:
    """Parse model output; strip optional ```json fences."""
    s = (text or "").strip()
    if not s:
        raise ValueError("empty model response")
    fence = re.match(r"^```(?:json)?\s*([\s\S]*?)\s*```\s*$", s)
    if fence:
        s = fence.group(1).strip()
    return json.loads(s)


def call_gemini_flash(
    *,
    api_key: str,
    model: str,
    system_instruction: str,
    user_payload: str,
) -> str:
    try:
        from google import genai
    except ImportError as e:
        raise SystemExit("Install google-genai: pip install google-genai") from e

    project = (os.environ.get("GOOGLE_CLOUD_PROJECT") or "").strip()
    location = (os.environ.get("GOOGLE_CLOUD_LOCATION") or "").strip()
    if not project or not location:
        raise SystemExit("Set GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION for Vertex AI.")
    client = genai.Client(vertexai=True, project=project, location=location)
    resp = client.models.generate_content(
        model=model,
        contents=user_payload,
        config={
            "system_instruction": system_instruction,
            "temperature": 0.2,
        },
    )
    if hasattr(resp, "text") and resp.text:
        return (resp.text or "").strip()
    if hasattr(resp, "candidates") and resp.candidates:
        parts = getattr(resp.candidates[0].content, "parts", None) or []
        chunks = [getattr(p, "text", None) or "" for p in parts]
        return "".join(chunks).strip()
    raise RuntimeError("No text in Gemini response")


def build_user_payload(schema_id: str, title: str, block: str) -> str:
    return (
        f"schema_id: `{schema_id}`\n"
        f"title: {title}\n\n"
        f"--- FULL SCHEMA BLOCK (markdown) ---\n\n"
        f"{block}\n"
    )


def completed_schema_ids_from_jsonl(path: Path) -> set[str]:
    """Schema ids that already have a successful result line in a JSONL file."""
    done: set[str] = set()
    if not path.is_file():
        return done
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue
            if row.get("event") in ("run_start", "run_end"):
                continue
            if row.get("ok") is True and row.get("schema_id"):
                done.add(row["schema_id"])
    return done


def new_schema_id_from_prefix(old_id: str, new_prefix: str) -> str:
    """M_abc -> B_abc when new_prefix is B."""
    p = (new_prefix or "").strip().upper()[:1]
    if len(old_id) < 2 or old_id[1] != "_":
        return old_id
    return p + old_id[1:]


def build_final_block(
    old_block: str,
    old_id: str,
    result: dict,
) -> str:
    """
    If model supplied rewritten_block_markdown, use it (trimmed).
    Else replace `## **{old_id}.` with `## **{new_id}.` in the first heading line only.
    """
    rec = (result.get("recommended_prefix") or "M").strip().upper()[:1]
    new_id = new_schema_id_from_prefix(old_id, rec)
    rw = result.get("rewritten_block_markdown")
    if rw and str(rw).strip():
        return str(rw).strip() + ("\n" if not str(rw).endswith("\n") else "")

    old_head = f"## **{old_id}."
    new_head = f"## **{new_id}."
    if old_head in old_block:
        return old_block.replace(old_head, new_head, 1)
    return old_block


def quick_read_schema_block(block: str, *, max_chars: int = 4800, max_seen_lines: int = 14) -> str:
    """
    Short excerpt for review UI: heading, Core move, and start of Seen in / context.
    Falls back to a trimmed full block if sections are missing.
    """
    block = (block or "").strip()
    if not block:
        return "(Empty schema block.)"

    parts: list[str] = []
    for line in block.splitlines():
        s = line.strip()
        if s.startswith("## "):
            parts.append(s)
            break

    cm = re.search(
        r"\*\*Core move:\*\*\s*([\s\S]*?)(?=\n\*\*[A-Za-z][^\n]*?\*\*|\Z)",
        block,
    )
    if cm:
        body = cm.group(1).strip()
        if len(body) > 2800:
            body = body[:2799] + "…"
        parts.append("\n**Core move:**\n" + body)

    seen = re.search(
        r"\*\*Seen in / context:\*\*\s*([\s\S]*?)(?=\n\*\*Possible wrong paths:\*\*"
        r"|\n\*\*Notes for generation:\*\*|\n\*\*Exemplar questions:\*\*|\Z)",
        block,
    )
    if seen:
        slines = [ln for ln in seen.group(1).splitlines() if ln.strip()][:max_seen_lines]
        parts.append("\n**Seen in / context:**\n" + "\n".join(slines))
        if len(seen.group(1).splitlines()) > max_seen_lines:
            parts.append("…")

    out = "\n".join(parts).strip()
    if not out or (len(out) < 120 and len(block) > 400):
        # Unusual formatting: show start of raw block
        out = block[:max_chars] + ("…" if len(block) > max_chars else "")
    elif len(out) > max_chars:
        out = out[: max_chars - 1] + "…"
    return out
