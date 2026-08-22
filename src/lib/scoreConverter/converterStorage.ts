import type { ConverterExam } from "@/lib/scoreConverter/esatModules";

const STORAGE_KEY = "esat-score-converter-state-v1";

export type SavedConverterState = {
  exam: ConverterExam;
  year: number;
  mode: "raw" | "scaled";
  selectedGroup?: string;
  checkedKeys: string[];
  rawByKey: Record<string, number>;
  tmuaPickMode?: "split" | "overall";
  scaledInput?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseSavedState(raw: string): SavedConverterState | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    if (
      typeof parsed.exam !== "string" ||
      typeof parsed.year !== "number" ||
      (parsed.mode !== "raw" && parsed.mode !== "scaled") ||
      !Array.isArray(parsed.checkedKeys)
    ) {
      return null;
    }
    return {
      exam: parsed.exam as ConverterExam,
      year: parsed.year,
      mode: parsed.mode,
      selectedGroup:
        typeof parsed.selectedGroup === "string" ? parsed.selectedGroup : undefined,
      checkedKeys: parsed.checkedKeys.filter((key): key is string => typeof key === "string"),
      rawByKey: isRecord(parsed.rawByKey)
        ? Object.fromEntries(
            Object.entries(parsed.rawByKey).flatMap(([key, value]) =>
              typeof value === "number" && Number.isFinite(value)
                ? [[key, value]]
                : [],
            ),
          )
        : {},
      tmuaPickMode:
        parsed.tmuaPickMode === "split" || parsed.tmuaPickMode === "overall"
          ? parsed.tmuaPickMode
          : undefined,
      scaledInput:
        typeof parsed.scaledInput === "string" ? parsed.scaledInput : undefined,
    };
  } catch {
    return null;
  }
}

export function readSavedConverterState(): SavedConverterState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return parseSavedState(raw);
  } catch {
    return null;
  }
}

export function writeSavedConverterState(state: SavedConverterState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage is optional */
  }
}

export function clearSavedConverterState(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage is optional */
  }
}

export function hasValidUrlPrefill(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  const yearParam = Number(params.get("year"));
  if (!Number.isFinite(yearParam)) return false;
  // Year alone is enough to treat the visit as a deliberate prefill and skip
  // localStorage restore. Exam/section/part may be partial or invalid.
  return true;
}
