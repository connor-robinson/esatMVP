import type { FreeTierPreviewSubject } from "@/lib/questionBank/freeTierQuestions";
import { FREE_TIER_PREVIEW_SUBJECTS } from "@/lib/questionBank/freeTierQuestions";

export const QUESTION_BANK_FREE_TIER_HOME_CACHE_KEY =
  "questionBank:freeTierHome.v1";

export type FreeTierHomeSubjectCache = {
  attemptedCount: number;
  remaining: number;
  isExhausted: boolean;
};

export type FreeTierHomeCache = {
  bySubject: Record<FreeTierPreviewSubject, FreeTierHomeSubjectCache>;
  anyPreviewAvailable: boolean;
  cachedAt: number;
};

const TTL_MS = 30 * 60 * 1000;

export function readFreeTierHomeCache(): FreeTierHomeCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(QUESTION_BANK_FREE_TIER_HOME_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FreeTierHomeCache;
    if (!parsed?.bySubject || typeof parsed.cachedAt !== "number") return null;
    if (Date.now() - parsed.cachedAt > TTL_MS) return null;
    for (const subject of FREE_TIER_PREVIEW_SUBJECTS) {
      if (!parsed.bySubject[subject]) return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeFreeTierHomeCache(
  data: Omit<FreeTierHomeCache, "cachedAt">,
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      QUESTION_BANK_FREE_TIER_HOME_CACHE_KEY,
      JSON.stringify({ ...data, cachedAt: Date.now() }),
    );
  } catch {
    /* ignore */
  }
}
