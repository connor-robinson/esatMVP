"""Structured exam tables as markdown/HTML, not PNGs."""

from __future__ import annotations

import re
from typing import Any

_OPTION_LETTERS = tuple("ABCDEFGH")
_LETTER_WRAP = re.compile(r"^(?:\*{1,2}|\$)?([A-H])(?:\*{1,2}|\$)?$")
_LETTER_ROW = re.compile(r"^\|\s*(?:\*{1,2}|\$)?([A-H])(?:\*{1,2}|\$)?\s*\|")
_ROW_LABEL = re.compile(r"^(?:[A-H]\.\s*)?(?:row\s+)?([A-H])\.?$", re.I)
_CORRECT_MARK = re.compile(r"\s*\((?:correct|answer)\)\s*$", re.I)


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


def _cell_letter(cell: str) -> str | None:
    match = _LETTER_WRAP.match(str(cell).strip())
    return match.group(1) if match else None


def _first_cells_are_letters(rows: list[list[str]]) -> bool:
    letters = [_cell_letter(row[0]) for row in rows if row]
    return len(letters) >= 4 and all(letter in _OPTION_LETTERS for letter in letters)


def table_is_option_rows(table: dict[str, Any] | None) -> bool:
    data = normalize_table(table)
    if not data:
        return False
    headers = [str(h).strip() for h in data.get("row_headers") or []]
    header_letters = [_cell_letter(h) or h for h in headers]
    if len(header_letters) >= 4 and all(h in _OPTION_LETTERS and len(h) == 1 for h in header_letters):
        return True
    return _first_cells_are_letters(list(data.get("rows") or []))


def stem_has_option_table(stem: str) -> bool:
    """True when the stem table rows are themselves the A-H answer choices."""
    letters: set[str] = set()
    for line in (stem or "").splitlines():
        match = _LETTER_ROW.match(line.strip())
        if match:
            letters.add(match.group(1))
    return len(letters) >= 4


def options_are_row_placeholders(options: dict[str, str] | None) -> bool:
    if not options:
        return False
    for letter, text in options.items():
        key = str(letter).strip().upper()
        raw = _CORRECT_MARK.sub("", str(text or "")).strip()
        match = _ROW_LABEL.match(raw)
        if not match or match.group(1).upper() != key:
            return False
    return True


def option_texts_from_stem(stem: str) -> dict[str, str]:
    """Map A-H to the rest of each letter-labeled markdown table row."""
    out: dict[str, str] = {}
    for line in (stem or "").splitlines():
        stripped = line.strip()
        match = _LETTER_ROW.match(stripped)
        if not match:
            continue
        cells = [cell.strip() for cell in stripped.strip("|").split("|")]
        rest = " | ".join(cell for cell in cells[1:] if cell)
        if rest:
            out[match.group(1)] = rest
    return out


def fill_options_from_option_table(
    stem: str,
    options: dict[str, str] | None,
) -> dict[str, str]:
    """Replace 'row A' placeholders with the table row contents."""
    current = dict(options or {})
    filled = option_texts_from_stem(stem)
    if len(filled) < 4:
        return current
    if not current or options_are_row_placeholders(current):
        merged = dict(current)
        merged.update(filled)
        return merged
    return current


def should_hide_written_options(stem: str, options: dict[str, str] | None) -> bool:
    """True when the lettered table already is the option list."""
    if stem_has_option_table(stem):
        return True
    return options_are_row_placeholders(options)


def table_to_markdown(table: dict[str, Any]) -> str:
    data = normalize_table(table)
    if not data:
        return ""
    headers = list(data["headers"])
    rows = [list(r) for r in data["rows"]]
    if data["row_headers"] and not _first_cells_are_letters(rows):
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
    if data["row_headers"] and not _first_cells_are_letters(rows):
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
    option_rows = table_is_option_rows(data)
    empty_indexes = [i for i, heading in enumerate(headers) if not heading]
    if empty_indexes and not (option_rows and empty_indexes == [0] and len(headers) > 1):
        flags.append({"code": "table_heading", "message": "A table heading is empty", "severity": "flag"})
    if not option_rows and not any("/" in h or " " in h for h in headers):
        flags.append({"code": "table_units", "message": "Table headings may be missing units", "severity": "flag"})
    widths = {len(r) for r in data["rows"]}
    if widths != {len(headers)}:
        flags.append({"code": "table_shape", "message": "Table rows and headings have different widths", "severity": "reject"})
    return flags
