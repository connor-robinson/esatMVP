/**
 * Shared shape for curated / generated Fermi scheduled batches (JSON + preview).
 */

export type FermiDifficulty = "standard" | "surprising" | "hard";

export type FermiBatchQuestion = {
  id: number;
  scheduledDate: string;
  isSeasonal: boolean;
  seasonalNote?: string;
  /** When set, UI can brand the day (e.g. "Halloween Edition"). */
  editionTitle?: string | null;
  /** Short hook shown in preview / generation context (Pancake Day, on-this-day…). */
  themeHook?: string | null;
  category: string;
  difficulty: FermiDifficulty;
  exact: boolean;
  question: string;
  answer: number;
  unit?: string;
  sourceUrl?: string | null;
  /** Concise Fermi-style solution for "View our solution" (required in generation). */
  sourceNote?: string;
  /** Exactly one of five per day should be true. */
  showDidYouKnow?: boolean;
  /** Concise fact card shown after that question is answered. */
  didYouKnow?: string | null;
  /** Clean public URL (no utm). */
  factSourceUrl?: string | null;
  factSourceLabel?: string | null;
};

export type FermiBatchMeta = {
  batchId: string;
  title: string;
  startDate: string;
  endDate: string;
  generatedAt?: string;
  model?: string;
};

export type FermiBatchFile = {
  meta: FermiBatchMeta;
  questions: FermiBatchQuestion[];
};

export function isFermiBatchFile(value: unknown): value is FermiBatchFile {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v.questions) && typeof v.meta === "object" && v.meta != null;
}

/** Normalize older flat arrays into batch file shape. */
export function normalizeFermiBatch(
  raw: unknown,
  fallbackMeta: FermiBatchMeta,
): FermiBatchFile {
  if (isFermiBatchFile(raw)) return raw;
  if (Array.isArray(raw)) {
    const questions = raw as FermiBatchQuestion[];
    const dates = [...new Set(questions.map((q) => q.scheduledDate))].sort();
    return {
      meta: {
        ...fallbackMeta,
        startDate: dates[0] ?? fallbackMeta.startDate,
        endDate: dates[dates.length - 1] ?? fallbackMeta.endDate,
      },
      questions,
    };
  }
  throw new Error("Invalid fermi batch JSON");
}
