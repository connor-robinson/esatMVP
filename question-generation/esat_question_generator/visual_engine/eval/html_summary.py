"""Write a concise HTML contact-sheet for a Phase 2 eval run."""

from __future__ import annotations

import html
from pathlib import Path
from typing import Any


def _rel(path: str | Path, root: Path) -> str:
    try:
        return Path(path).resolve().relative_to(root.resolve()).as_posix()
    except (ValueError, OSError):
        return Path(path).as_posix()


def build_html_summary(
    cases: list[dict[str, Any]],
    out_path: Path,
    *,
    title: str = "Phase 2 Diagram Eval",
    extra_metrics: dict[str, Any] | None = None,
) -> Path:
    root = out_path.parent
    rows: list[str] = []
    for case in cases:
        qid = case.get("question_id", "?")
        mode = case.get("variation_mode", "?")
        verdict = case.get("verdict") or case.get("verifier_verdict") or "-"
        png = str(case.get("png_path") or "")
        src = str(case.get("source_path") or "")
        color = "#157347" if verdict == "PASS" else ("#b45309" if verdict == "FIX" else "#b42318")
        src_img = (
            f'<img src="{html.escape(_rel(src, root))}" alt="source">' if src and Path(src).is_file() else "<div class='missing'>no source</div>"
        )
        gen_img = (
            f'<img src="{html.escape(_rel(png, root))}" alt="generated">' if png and Path(png).is_file() else "<div class='missing'>no png</div>"
        )
        rows.append(
            f"""<article class="card">
  <h3 style="color:{color}">Q{html.escape(str(qid))} {html.escape(str(mode))} | {html.escape(str(verdict))}</h3>
  <div class="pair">{src_img}{gen_img}</div>
</article>"""
        )

    metric_bits = ""
    if extra_metrics:
        metric_bits = "<p class='metrics'>" + " | ".join(
            f"{html.escape(str(k))}: {html.escape(str(v))}" for k, v in extra_metrics.items()
        ) + "</p>"

    page = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>{html.escape(title)}</title>
  <style>
    body {{ font-family: Segoe UI, sans-serif; margin: 24px; background: #f6f6f4; color: #111; }}
    h1 {{ font-size: 20px; margin: 0 0 8px; }}
    .metrics {{ color: #444; margin: 0 0 20px; }}
    .grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(420px, 1fr)); gap: 16px; }}
    .card {{ background: #fff; padding: 12px; }}
    .card h3 {{ margin: 0 0 8px; font-size: 14px; }}
    .pair {{ display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }}
    img {{ width: 100%; height: 180px; object-fit: contain; background: #fafafa; }}
    .missing {{ height: 180px; display: flex; align-items: center; justify-content: center; color: #b42318; }}
  </style>
</head>
<body>
  <h1>{html.escape(title)} ({len(cases)} diagrams)</h1>
  {metric_bits}
  <div class="grid">
    {''.join(rows)}
  </div>
</body>
</html>
"""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(page, encoding="utf-8")
    return out_path
