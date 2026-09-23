const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

function optionValueToText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value.map(optionValueToText).filter(Boolean).join(", ");
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, nested]) => {
        const text = optionValueToText(nested);
        return text ? `${key}: ${text}` : key;
      })
      .join("\n");
  }
  return String(value);
}

function singleLetterEntry(value: unknown): [string, string] | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length !== 1) return null;
  const [key, nested] = entries[0];
  if (!/^[A-H]$/i.test(key)) return null;
  return [key.toUpperCase(), optionValueToText(nested)];
}

function parseOptionsInput(raw: unknown): unknown {
  if (typeof raw !== "string") return raw;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

/** Coerce stored options into `{ A: "...", B: "..." }` text the player can render. */
export function normalizeQuestionOptions(raw: unknown): Record<string, string> {
  const value = parseOptionsInput(raw);

  if (Array.isArray(value)) {
    const out: Record<string, string> = {};
    value.forEach((item, index) => {
      const letterEntry = singleLetterEntry(item);
      if (letterEntry) {
        out[letterEntry[0]] = letterEntry[1];
        return;
      }
      const letter = OPTION_LETTERS[index] ?? String(index + 1);
      out[letter] = optionValueToText(item);
    });
    return out;
  }

  if (value && typeof value === "object") {
    const out: Record<string, string> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      const letter = /^[A-H]$/i.test(key) ? key.toUpperCase() : key;
      out[letter] = optionValueToText(nested);
    }
    return out;
  }

  return {};
}

export function normalizeOptionalStringMap(
  raw: unknown,
): Record<string, string> | null {
  if (raw == null || raw === "") return null;
  const normalized = normalizeQuestionOptions(raw);
  return Object.keys(normalized).length > 0 ? normalized : null;
}
