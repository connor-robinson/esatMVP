/**
 * Where a past-paper / mock sitting was started from.
 * Persisted on paper_sessions.entry_source.
 */

export const PAPER_SESSION_ENTRY_SOURCES = [
  "past_papers",
  "esat_mock_tests",
  "library",
  "compare",
  "plan",
  "other",
] as const;

export type PaperSessionEntrySource =
  (typeof PAPER_SESSION_ENTRY_SOURCES)[number];

export const PAPER_SESSION_ENTRY_SOURCE_LABELS: Record<
  PaperSessionEntrySource,
  string
> = {
  past_papers: "Past papers hub",
  esat_mock_tests: "ESAT mock tests page",
  library: "Library",
  compare: "Compare",
  plan: "Plan",
  other: "Other",
};

export function isPaperSessionEntrySource(
  value: unknown,
): value is PaperSessionEntrySource {
  return (
    typeof value === "string" &&
    (PAPER_SESSION_ENTRY_SOURCES as readonly string[]).includes(value)
  );
}

/**
 * Infer source for older sittings that predate entry_source.
 * Catalog uses "ESAT CAMP …" session names; hub uses "ESAT 2026 - …".
 */
export function inferMockEntrySource(input: {
  entrySource?: string | null;
  sessionName?: string | null;
}): PaperSessionEntrySource | "unknown" {
  if (isPaperSessionEntrySource(input.entrySource)) return input.entrySource;
  const name = (input.sessionName ?? "").trim();
  if (name.startsWith("ESAT CAMP ")) return "esat_mock_tests";
  if (name.startsWith("Compare")) return "compare";
  if (/^ESAT \d{4}/.test(name)) return "past_papers";
  return "unknown";
}
