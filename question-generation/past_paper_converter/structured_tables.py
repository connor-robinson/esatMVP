"""Structured table handling for past-paper screenshots."""

from __future__ import annotations

from typing import Any, Dict, List, Tuple


def _cell(value: Any) -> str:
    return str(value if value is not None else "").strip().replace("|", "\\|").replace("\n", " ")


def process_tables(parsed: Dict[str, Any], stem: str) -> Tuple[str, bool]:
    """Append complete model-transcribed tables as Markdown.

    Returns ``(stem, failed)``. Tables intentionally bypass image cropping.
    """
    if parsed.get("has_table") is not True:
        parsed["structured_tables_processed"] = 0
        return stem, False

    raw_tables = parsed.get("tables")
    if not isinstance(raw_tables, list) or not raw_tables:
        parsed["structured_tables_processed"] = 0
        return stem, True

    rendered: List[str] = []
    normalized: List[Dict[str, Any]] = []
    table_options: Dict[str, str] = {}
    for table in raw_tables:
        if not isinstance(table, dict):
            return stem, True
        headers = table.get("headers")
        rows = table.get("rows")
        if not isinstance(headers, list) or not headers or not isinstance(rows, list) or not rows:
            return stem, True
        width = len(headers)
        if width < 1 or any(not isinstance(row, list) or len(row) != width for row in rows):
            return stem, True

        clean_headers = [_cell(value) for value in headers]
        clean_rows = [[_cell(value) for value in row] for row in rows]
        caption = _cell(table.get("caption"))
        lines: List[str] = []
        if caption:
            lines.append(caption)
        lines.append("| " + " | ".join(clean_headers) + " |")
        lines.append("| " + " | ".join("---" for _ in clean_headers) + " |")
        lines.extend("| " + " | ".join(row) + " |" for row in clean_rows)
        rendered.append("\n".join(lines))
        normalized.append({"caption": caption, "headers": clean_headers, "rows": clean_rows})
        for row in clean_rows:
            letter = row[0].upper() if row else ""
            if len(letter) == 1 and "A" <= letter <= "H":
                parts = []
                for index, value in enumerate(row[1:], start=1):
                    header = clean_headers[index] if index < len(clean_headers) else ""
                    parts.append(f"{header}: {value}" if header else value)
                table_options[letter] = "; ".join(part for part in parts if part).strip()

    parsed["tables"] = normalized
    parsed["structured_tables_processed"] = len(normalized)
    parsed["structured_table_options"] = table_options
    suffix = "\n\n".join(rendered)
    return (f"{stem.rstrip()}\n\n{suffix}" if stem.strip() else suffix), False
