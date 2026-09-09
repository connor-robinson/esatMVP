import type { ExamPreference } from "@/lib/questionBank/userProgressSubjects";
import { subjectsForExamProgress } from "@/lib/questionBank/userProgressSubjects";

export const QUESTION_BANK_HOME_PROGRESS_CACHE_KEY =
  "questionBank:homeProgress.v1";

export const QUESTION_BANK_USER_PREFS_KEY = "questionBank:userPreferences";

export type HomeProgressCache = {
  attempted?: number;
  total?: number;
  bySubject?: Record<string, { attempted: number; total: number }>;
  cachedAt: number;
};

export type CachedUserPrefs = {
  exam_preference: ExamPreference;
  esat_subjects: string[];
};

const PROGRESS_CACHE_TTL_MS = 30 * 60 * 1000;

function readProgressCacheFrom(storage: Storage): HomeProgressCache | null {
  try {
    const raw = storage.getItem(QUESTION_BANK_HOME_PROGRESS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HomeProgressCache;
    if (!parsed?.bySubject || typeof parsed.cachedAt !== "number") return null;
    if (Date.now() - parsed.cachedAt > PROGRESS_CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function readHomeProgressCache(): HomeProgressCache | null {
  if (typeof window === "undefined") return null;
  return (
    readProgressCacheFrom(localStorage) ?? readProgressCacheFrom(sessionStorage)
  );
}

export function writeHomeProgressCache(data: Omit<HomeProgressCache, "cachedAt">) {
  if (typeof window === "undefined") return;
  const payload = JSON.stringify({ ...data, cachedAt: Date.now() });
  try {
    localStorage.setItem(QUESTION_BANK_HOME_PROGRESS_CACHE_KEY, payload);
  } catch {
    /* quota / private mode */
  }
  try {
    sessionStorage.setItem(QUESTION_BANK_HOME_PROGRESS_CACHE_KEY, payload);
  } catch {
    /* quota / private mode */
  }
}

export function readCachedUserPrefs(): CachedUserPrefs | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(QUESTION_BANK_USER_PREFS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      exam_preference?: string;
      esat_subjects?: string[];
    };
    const exam_preference =
      parsed.exam_preference === "ESAT" || parsed.exam_preference === "TMUA"
        ? parsed.exam_preference
        : null;
    return {
      exam_preference,
      esat_subjects: Array.isArray(parsed.esat_subjects)
        ? parsed.esat_subjects
        : [],
    };
  } catch {
    return null;
  }
}

export function writeCachedUserPrefs(prefs: CachedUserPrefs) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(QUESTION_BANK_USER_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

export function aggregateProgressForSubjects(
  bySubject: Record<string, { attempted: number; total: number }> | undefined,
  examPreference: ExamPreference,
  esatSubjects: string[],
): { attempted: number; total: number } {
  const progressSubjects = subjectsForExamProgress(examPreference, esatSubjects);
  let attempted = 0;
  let total = 0;
  for (const subject of progressSubjects) {
    const row = bySubject?.[subject];
    attempted += row?.attempted ?? 0;
    total += row?.total ?? 0;
  }
  return { attempted, total };
}
