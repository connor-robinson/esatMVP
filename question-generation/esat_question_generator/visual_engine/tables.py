"""Structured exam tables as markdown/HTML, not PNGs."""

from __future__ import annotations

from typing import Any


def normalize_table(raw: Any) -> dict[str, Any] | None:
    if not isinstance(raw, dict):
        return None
    headers = [str(h).strip() for h in (raw.get("headers") or raw.get("columns") or [])]
    rows = raw.get("rows") or []
    if not headers or not isinstance(rows, list) or not rows:
        return None
    clean_rows: list[list[str]] = []
    width = len(headers)
    for row in rows:
        if not isinstance(row, (list, tuple)):
            continue
        cells = [str(c).strip() for c in row]
        if len(cells) < width:
            cells.extend([""] * (width - len(cells)))
        clean_rows.append(cells[:width])
    if not clean_rows:
        return None
    row_headers = [str(h).strip() for h in (raw.get("row_headers") or []) if str(h).strip()]
    return {
        "headers": headers,
        "rows": clean_rows,
        "row_headers": row_headers,
        "title": str(raw.get("title") or "").strip(),
    }


def table_to_markdown(table: dict[str, Any]) -> str:
    data = normalize_table(table)
    if not data:
        return ""
    headers = list(data["headers"])
    rows = [list(r) for r in data["rows"]]
    if data["row_headers"]:
        headers = [""] + headers
        for i, row in enumerate(rows):
            label = data["row_headers"][i] if i < len(data["row_headers"]) else ""
            rows[i] = [label] + row
    lines = [
        "| " + " | ".join(headers) + " |",
        "| " + " | ".join("---" for _ in headers) + " |",
    ]
    for row in rows:
        lines.append("| " + " | ".join(row) + " |")
    title = data.get("title") or ""
    body = "\n".join(lines)
    return f"{title}\n\n{body}" if title else body


def table_to_html(table: dict[str, Any]) -> str:
    data = normalize_table(table)
    if not data:
        return ""
    headers = list(data["headers"])
    rows = [list(r) for r in data["rows"]]
    if data["row_headers"]:
        headers = [""] + headers
        for i, row in enumerate(rows):
            label = data["row_headers"][i] if i < len(data["row_headers"]) else ""
            rows[i] = [label] + row
    head = "".join(f"<th>{cell}</th>" for cell in headers)
    body = "".join(
        "<tr>" + "".join(f"<td>{cell}</td>" for cell in row) + "</tr>" for row in rows
    )
    title = data.get("title") or ""
    caption = f"<caption>{title}</caption>" if title else ""
    return f"<table>{caption}<thead><tr>{head}</tr></thead><tbody>{body}</tbody></table>"


def stem_has_table(stem: str) -> bool:
    text = stem or ""
    if "<table" in text.lower():
        return True
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    for i, line in enumerate(lines[:-1]):
        if "|" in line and set(lines[i + 1].replace("|", "").replace(":", "").strip()) <= {"-", " "}:
            return True
    return False


def ensure_table_in_stem(stem: str, table: dict[str, Any] | None) -> str:
    data = normalize_table(table)
    if not data:
        return stem
    if stem_has_table(stem):
        return stem
    block = table_to_markdown(data)
    stem = (stem or "").rstrip()
    return f"{stem}\n\n{block}\n" if stem else block + "\n"


def table_auto_flags(table: dict[str, Any] | None) -> list[dict[str, str]]:
    data = normalize_table(table)
    flags: list[dict[str, str]] = []
    if not data:
        return [{"code": "table_missing", "message": "visual_type is table but no usable table data", "severity": "reject"}]
    headers = data["headers"]
    if any(not h for h in headers):
        flags.append({"code": "table_heading", "message": "A table heading is empty", "severity": "flag"})
    if not any("/" in h or " " in h for h in headers):
        flags.append({"code": "table_units", "message": "Table headings may be missing units", "severity": "flag"})
    widths = {len(r) for r in data["rows"]}
    if widths != {len(headers)}:
        flags.append({"code": "table_shape", "message": "Table rows and headings have different widths", "severity": "reject"})
    return flags
