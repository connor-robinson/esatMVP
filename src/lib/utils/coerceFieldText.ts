/** Coerce DB/JSON field values to a string safe for KaTeX display. */
export function coerceFieldText(value: unknown, fallback = ""): string {
  if (value == null) return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    const t = o.text ?? o.value ?? o.body ?? o.content ?? o.label;
    if (
      t != null &&
      (typeof t === "string" ||
        typeof t === "number" ||
        typeof t === "boolean")
    ) {
      return String(t);
    }
    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }
  return String(value);
}

/** Normalize option/distractor JSON objects so every value is a string. */
export function coerceStringRecord(
  raw: Record<string, unknown> | null | undefined,
): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    out[k] = coerceFieldText(v);
  }
  return out;
}
