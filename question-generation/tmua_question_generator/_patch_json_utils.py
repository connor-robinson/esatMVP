"""One-off splice: replace YAML utilities with JSON utilities in project.py."""
from pathlib import Path

path = Path(__file__).resolve().parent / "project.py"
lines = path.read_text(encoding="utf-8").splitlines(keepends=True)

start = end = None
for i, line in enumerate(lines):
    if line.startswith("def strip_code_fences"):
        start = i
    if start is not None and line.startswith("def normalize_implementer_output"):
        end = i
        break
if start is None or end is None:
    raise SystemExit(f"markers not found start={start} end={end}")

new_block = r'''def strip_code_fences(text: str) -> str:
    """
    Removes surrounding ```json / ```yaml / ``` ... ``` fences if present.
    """
    t = text.strip()
    if t.startswith("```"):
        t = re.sub(r"^```[a-zA-Z0-9_-]*\s*\n?", "", t)
        t = re.sub(r"\n?```\s*$", "", t.strip())
    return t.strip()


def prompt_json_dumps(obj: Any) -> str:
    """Pretty JSON for LLM user messages (UTF-8, stable for prompts)."""
    return json.dumps(obj, ensure_ascii=False, indent=2, default=str)


def _extract_top_json_object(s: str) -> Optional[str]:
    """Extract first balanced `{ ... }` from text (handles strings with braces)."""
    start_idx = s.find("{")
    if start_idx < 0:
        return None
    depth = 0
    in_string = False
    escape = False
    i = start_idx
    while i < len(s):
        ch = s[i]
        if in_string:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_string = False
        else:
            if ch == '"':
                in_string = True
            elif ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    return s[start_idx : i + 1]
        i += 1
    return None


def strip_markdown_formatting(text: str) -> str:
    """
    Strip markdown formatting from model output before JSON parse.
    """
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"__([^_]+)__", r"\1", text)
    text = re.sub(r"(?<!^)\*([^*\n]+)\*(?!\*)", r"\1", text, flags=re.MULTILINE)
    text = re.sub(r"(?<!^)_([^_\n]+)_(?!_)", r"\1", text, flags=re.MULTILINE)
    text = re.sub(r"^#+\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"`([^`]+)`", r"\1", text)
    text = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", text)
    text = re.sub(r"!\[([^\]]*)\]\([^\)]+\)", r"\1", text)
    return text


def strip_prompt_contamination_json(text: str) -> str:
    """If the model wrapped JSON in fences or led with prose, isolate the object."""
    m = re.search(r"```(?:json)?\s*\n(.*?)\n```", text, re.DOTALL)
    if m:
        inner = m.group(1).strip()
        if inner.startswith("{"):
            return inner
    snippet = _extract_top_json_object(text)
    if snippet:
        return snippet
    return text


def safe_json_load(text: str, strip_markdown: bool = False, strip_prompt: bool = False) -> Any:
    """
    Parse model output as JSON; strip fences; optionally strip markdown / leading prose.

    String values may contain colons, percent signs, and most Unicode; only " and \\ must be escaped in strings.
    """
    cleaned = text
    if strip_prompt:
        cleaned = strip_prompt_contamination_json(cleaned)
    if strip_markdown:
        cleaned = strip_markdown_formatting(cleaned)
    cleaned = strip_code_fences(cleaned).strip()
    if not cleaned:
        raise ValueError("JSON parse: empty input after stripping fences.")
    try:
        result = json.loads(cleaned)
    except json.JSONDecodeError as e1:
        snippet = _extract_top_json_object(cleaned)
        if snippet:
            try:
                result = json.loads(snippet)
            except json.JSONDecodeError as e2:
                preview = cleaned[:500] if len(cleaned) <= 500 else cleaned[:500] + "\n... (truncated)"
                raise ValueError(
                    f"JSON parsing error: {e1}\nExtracted object also invalid: {e2}\n\nPreview:\n{preview}"
                ) from e2
        else:
            preview = cleaned[:500] if len(cleaned) <= 500 else cleaned[:500] + "\n... (truncated)"
            raise ValueError(f"JSON parsing error: {e1}\n\nPreview:\n{preview}") from e1
    if result is None:
        raise ValueError("JSON parsed to null (invalid for pipeline).")
    return result


'''

new_lines = new_block.splitlines(keepends=True)
out = lines[:start] + new_lines + lines[end:]
path.write_text("".join(out), encoding="utf-8")
print("OK", start + 1, "->", end, "replaced; lines", len(lines), "->", len(out))
