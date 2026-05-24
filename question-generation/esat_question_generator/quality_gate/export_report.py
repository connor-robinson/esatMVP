"""
Flatten assessed questions for CSV / JSONL / HTML export (Streamlit and CLI).
"""

from __future__ import annotations

import csv
import html as html_module
import io
import json
import re
from typing import Any, Dict, List, Optional

import pandas as pd

_FIGURE_BLOCK_RE = re.compile(
    r"<figure\b[^>]*>.*?</figure>",
    re.IGNORECASE | re.DOTALL,
)
_SVG_BLOCK_RE = re.compile(
    r"<svg\b[^>]*>.*?</svg>",
    re.IGNORECASE | re.DOTALL,
)
_HTML_TAG_RE = re.compile(r"<[^>]+>")
_HAS_HTML_RE = re.compile(r"<(?:p|figure|svg|div|span|br|img|table)\b", re.IGNORECASE)


def strip_html(text: str) -> str:
    """Plain-text preview: replace diagrams, strip tags, decode entities."""
    if not text:
        return ""
    t = text
    t = _FIGURE_BLOCK_RE.sub(" [diagram] ", t)
    t = _SVG_BLOCK_RE.sub(" [diagram] ", t)
    t = _HTML_TAG_RE.sub(" ", t)
    t = html_module.unescape(t)
    return re.sub(r"\s+", " ", t).strip()


def stem_for_html_embed(stem: str) -> str:
    """
    Embed stem in an HTML report. Preserves existing HTML/SVG/figures and LaTeX delimiters.
    Plain-text stems become <p> blocks without escaping math.
    """
    if not stem or not stem.strip():
        return ""
    s = stem.strip()
    if _HAS_HTML_RE.search(s):
        return s
    parts = [p.strip() for p in re.split(r"\n\s*\n", s) if p.strip()]
    if not parts:
        return f'<p style="margin:0.5em 0">{s}</p>'
    return "".join(f'<p style="margin:0.5em 0">{p}</p>' for p in parts)


def _coerce_str(val: Any) -> str:
    if val is None:
        return ""
    if isinstance(val, str):
        return val.strip()
    if isinstance(val, (int, float, bool)):
        return str(val)
    return str(val).strip()


def _parse_payload(raw: Any) -> Dict[str, Any]:
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str) and raw.strip():
        try:
            p = json.loads(raw)
            return p if isinstance(p, dict) else {}
        except json.JSONDecodeError:
            return {}
    return {}


def _join_list(val: Any, *, sep: str = ", ") -> str:
    if val is None:
        return ""
    if isinstance(val, list):
        parts = [_coerce_str(x) for x in val]
        return sep.join(x for x in parts if x)
    s = _coerce_str(val)
    if s.startswith("[") and s.endswith("]"):
        try:
            parsed = json.loads(s)
            if isinstance(parsed, list):
                return _join_list(parsed, sep=sep)
        except json.JSONDecodeError:
            pass
    return s


def _format_curriculum_flags(flags: Any) -> str:
    if not isinstance(flags, list):
        return ""
    parts: List[str] = []
    for f in flags:
        if not isinstance(f, dict):
            continue
        fid = _coerce_str(f.get("flag_id"))
        sev = _coerce_str(f.get("severity"))
        reason = _coerce_str(f.get("reason"))
        pat = _coerce_str(f.get("matched_pattern"))
        chunk = " — ".join(x for x in [fid, sev, pat, reason] if x)
        if chunk:
            parts.append(chunk)
    return " | ".join(parts)


def _scores_dict(payload: Dict[str, Any]) -> Dict[str, Any]:
    scores = payload.get("scores")
    return scores if isinstance(scores, dict) else {}


def flatten_assessed_question_row(
    row: Dict[str, Any],
    *,
    review_base: str = "",
) -> Dict[str, Any]:
    """One export record per assessed question."""
    qid = _coerce_str(row.get("id"))
    stem = _coerce_str(row.get("question_stem"))
    payload = _parse_payload(row.get("quality_gate_payload"))
    scores = _scores_dict(payload)
    cv = payload.get("curriculum_validation") if isinstance(payload.get("curriculum_validation"), dict) else {}
    fv = payload.get("formatting_validation") if isinstance(payload.get("formatting_validation"), dict) else {}
    ak = payload.get("answer_key_validation") if isinstance(payload.get("answer_key_validation"), dict) else {}
    ge = payload.get("graph_enrichment") if isinstance(payload.get("graph_enrichment"), dict) else {}
    rd = payload.get("review_disposition") if isinstance(payload.get("review_disposition"), dict) else {}

    base = (review_base or "").rstrip("/")
    review_url = f"{base}/review?id={qid}" if base and qid else ""

    db_reason = _coerce_str(row.get("quality_gate_reason"))
    ai_reasoning = _coerce_str(payload.get("reasoning")) or db_reason

    return {
        "question_id": qid,
        "subjects": _coerce_str(row.get("subjects")),
        "difficulty": _coerce_str(row.get("difficulty")),
        "primary_tag": _coerce_str(row.get("primary_tag")),
        "secondary_tags": _join_list(row.get("secondary_tags")),
        "test_type": _coerce_str(row.get("test_type")),
        "status": _coerce_str(row.get("status")),
        "media_upload_code": _coerce_str(row.get("media_upload_code")),
        "question_stem_plain": strip_html(stem),
        "question_stem_html": stem,
        "quality_gate_assessed_at": _coerce_str(row.get("quality_gate_assessed_at")),
        "quality_gate_job_id": _coerce_str(row.get("quality_gate_job_id")),
        "quality_gate_verdict": _coerce_str(row.get("quality_gate_verdict")),
        "quality_gate_action": _coerce_str(row.get("quality_gate_action")),
        "quality_gate_reason": db_reason,
        "quality_gate_model": _coerce_str(row.get("quality_gate_model")),
        "ai_reasoning": ai_reasoning,
        "exam_timing_notes": _coerce_str(payload.get("exam_timing_notes")),
        "confidence": _coerce_str(payload.get("confidence")),
        "calibration_tier": _coerce_str(row.get("quality_gate_calibration_tier") or payload.get("calibration_tier")),
        "calibration_notes": _coerce_str(
            row.get("quality_gate_calibration_notes") or payload.get("calibration_notes")
        ),
        "score_syllabus_fit": scores.get("syllabus_fit", ""),
        "score_solution_quality": scores.get("solution_quality", ""),
        "score_esat_realism_pacing": scores.get("esat_realism_pacing", ""),
        "curriculum_match": _coerce_str(cv.get("curriculum_match")),
        "syllabus_fit_score": cv.get("syllabus_fit_score", ""),
        "required_topic_codes": _join_list(cv.get("required_topic_codes")),
        "suspicious_topics": _join_list(cv.get("suspicious_topics")),
        "curriculum_reason": _coerce_str(cv.get("curriculum_reason")),
        "curriculum_flags": _format_curriculum_flags(cv.get("curriculum_flags")),
        "formatting_score": fv.get("formatting_score", ""),
        "formatting_issues": _join_list(fv.get("formatting_issues"), sep="; "),
        "formatting_reason": _coerce_str(fv.get("formatting_reason")),
        "answer_key_stored": _coerce_str(ak.get("stored_option")),
        "answer_key_true": _coerce_str(ak.get("true_option")),
        "answer_key_was_wrong": ak.get("was_wrong", ""),
        "answer_key_fix_applied": ak.get("fix_applied", ""),
        "disposition_outcome": _coerce_str(rd.get("outcome")),
        "disposition_labels": _join_list(rd.get("labels")),
        "disposition_notes": _coerce_str(rd.get("notes")),
        "graph_candidate": row.get("quality_gate_graph_candidate", ge.get("is_candidate", "")),
        "graph_mode": _coerce_str(row.get("quality_gate_graph_mode") or ge.get("mode")),
        "graph_notes": _coerce_str(row.get("quality_gate_graph_notes") or ge.get("notes_for_human")),
        "graph_suggested_stem_edits": _coerce_str(ge.get("suggested_stem_edits")),
        "diagram_backfill_kind": _coerce_str(row.get("quality_gate_diagram_backfill_kind")),
        "review_url": review_url,
    }


def build_export_dataframe(
    rows: List[Dict[str, Any]],
    *,
    review_base: str = "",
) -> pd.DataFrame:
    records = [flatten_assessed_question_row(r, review_base=review_base) for r in rows]
    return pd.DataFrame.from_records(records) if records else pd.DataFrame()


def export_csv_bytes(rows: List[Dict[str, Any]], *, review_base: str = "") -> bytes:
    """CSV with quoted fields so HTML stems are not corrupted."""
    df = build_export_dataframe(rows, review_base=review_base)
    buf = io.StringIO()
    df.to_csv(buf, index=False, quoting=csv.QUOTE_NONNUMERIC)
    return buf.getvalue().encode("utf-8-sig")


def export_jsonl_bytes(rows: List[Dict[str, Any]], *, review_base: str = "") -> bytes:
    lines = [
        json.dumps(flatten_assessed_question_row(r, review_base=review_base), ensure_ascii=False)
        for r in rows
    ]
    return ("\n".join(lines) + ("\n" if lines else "")).encode("utf-8")


_HTML_HEAD = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>{title}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"/>
<style>
  body {{ font-family: Georgia, "Times New Roman", serif; max-width: 52rem; margin: 2rem auto; padding: 0 1rem; line-height: 1.45; color: #111; }}
  h1 {{ font-size: 1.35rem; font-weight: 600; }}
  article {{ border-top: 1px solid #ccc; margin: 2rem 0; padding-top: 1.25rem; }}
  article h2 {{ font-size: 1rem; font-family: ui-sans-serif, system-ui, sans-serif; margin: 0 0 0.75rem; }}
  .meta {{ font-size: 0.8rem; font-family: ui-sans-serif, system-ui, sans-serif; color: #444; margin-bottom: 1rem; }}
  .meta dt {{ font-weight: 600; display: inline; }}
  .meta dd {{ display: inline; margin: 0 1rem 0 0.25rem; }}
  .stem {{ font-size: 1.05rem; }}
  .stem figure.qg-diagram {{ margin: 1rem 0; max-width: 100%; }}
  .stem figure.qg-diagram svg, .stem figure.qg-diagram img {{ max-width: 100%; height: auto; }}
  .notes {{ font-size: 0.85rem; font-family: ui-sans-serif, system-ui, sans-serif; background: #f6f6f6; padding: 0.75rem 1rem; border-radius: 6px; margin-top: 1rem; }}
  .notes p {{ margin: 0.35em 0; }}
</style>
</head>
<body>
<h1>{title}</h1>
<p class="meta">Exported questions with rendered stems (math + diagrams). Open this file in a browser.</p>
"""

_HTML_FOOT = """
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js"></script>
<script>
document.addEventListener("DOMContentLoaded", function () {
  if (typeof renderMathInElement === "function") {
    renderMathInElement(document.body, {
      delimiters: [
        {left: "$$", right: "$$", display: true},
        {left: "\\\\[", right: "\\\\]", display: true},
        {left: "$", right: "$", display: false},
        {left: "\\\\(", right: "\\\\)", display: false}
      ],
      throwOnError: false
    });
  }
});
</script>
</body>
</html>
"""


def _html_question_article(flat: Dict[str, Any]) -> str:
    qid = html_module.escape(str(flat.get("question_id") or ""))
    stem_html = stem_for_html_embed(str(flat.get("question_stem_html") or ""))
    meta_pairs = [
        ("Subject", flat.get("subjects")),
        ("Difficulty", flat.get("difficulty")),
        ("Tags", f"{flat.get('primary_tag') or ''} · {flat.get('secondary_tags') or ''}".strip(" ·")),
        ("Verdict", flat.get("quality_gate_verdict")),
        ("Action", flat.get("quality_gate_action")),
        ("Curriculum", flat.get("curriculum_match")),
        ("Labels", flat.get("disposition_labels")),
    ]
    meta = "".join(
        f"<dt>{html_module.escape(k)}</dt><dd>{html_module.escape(_coerce_str(v))}</dd>"
        for k, v in meta_pairs
        if _coerce_str(v)
    )
    ai = html_module.escape(_coerce_str(flat.get("ai_reasoning")))
    flags = html_module.escape(_coerce_str(flat.get("curriculum_flags")))
    url = _coerce_str(flat.get("review_url"))
    link = (
        f'<p><a href="{html_module.escape(url)}">Open in review app</a></p>'
        if url
        else ""
    )
    notes = []
    if ai:
        notes.append(f"<p><strong>AI reasoning:</strong> {ai}</p>")
    if flags:
        notes.append(f"<p><strong>Flags:</strong> {flags}</p>")
    notes_block = f'<div class="notes">{"".join(notes)}</div>' if notes else ""
    return f"""
<article id="{qid}">
  <h2>{qid}</h2>
  <dl class="meta">{meta}</dl>
  <div class="stem">{stem_html}</div>
  {notes_block}
  {link}
</article>
"""


def export_html_bytes(
    rows: List[Dict[str, Any]],
    *,
    review_base: str = "",
    title: str = "ESAT Quality Gate Export",
) -> bytes:
    """Single HTML file with rendered stems, diagrams, and KaTeX math."""
    safe_title = html_module.escape(title)
    parts = [_HTML_HEAD.format(title=safe_title)]
    for row in rows:
        flat = flatten_assessed_question_row(row, review_base=review_base)
        parts.append(_html_question_article(flat))
    parts.append(_HTML_FOOT)
    return "".join(parts).encode("utf-8")


def export_stems_html_document(
    stems: List[str],
    *,
    title: str = "ESAT Question Stems",
) -> bytes:
    """Minimal HTML export for stem-only lists (e.g. math export script)."""
    rows = [{"id": f"q{i + 1}", "question_stem": s} for i, s in enumerate(stems)]
    return export_html_bytes(rows, title=title)
