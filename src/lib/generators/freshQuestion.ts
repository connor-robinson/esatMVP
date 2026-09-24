import type { GeneratedQuestion } from "@/types/core";

const STORAGE_KEY = "mentalMaths:recentQuestionKeys";
const MAX_RECENT = 240;
const SAMPLE_ATTEMPTS = 28;

export type RepeatableQuestion = {
  topicId?: string;
  variantId?: string;
  question: string;
};

/** Stable identity for "have we already shown this prompt?". */
export function questionRepeatKey(question: RepeatableQuestion): string {
  const stem = question.question.replace(/\s+/g, " ").trim();
  return `${question.topicId ?? ""}|${question.variantId ?? ""}|${stem}`;
}

export function readRecentQuestionKeys(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((item): item is string => typeof item === "string"));
  } catch {
    return new Set();
  }
}

export function rememberQuestionKeys(keys: Iterable<string>): void {
  if (typeof window === "undefined") return;
  try {
    const next = [...readRecentQuestionKeys()];
    for (const key of keys) {
      if (!key) continue;
      const existing = next.indexOf(key);
      if (existing >= 0) next.splice(existing, 1);
      next.push(key);
    }
    const trimmed = next.slice(-MAX_RECENT);
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * Draw until the prompt is new for this session and, when possible, new since
 * the last drills in this tab. If the pool is smaller than the session, repeats
 * start only after every distinct prompt has already been used.
 */
export function pickFreshQuestion(
  make: () => GeneratedQuestion,
  sessionQuestions: readonly RepeatableQuestion[],
  recentKeys: Set<string> = readRecentQuestionKeys(),
): GeneratedQuestion {
  const sessionBlocked = new Set(sessionQuestions.map(questionRepeatKey));

  let last: GeneratedQuestion | null = null;
  for (let i = 0; i < SAMPLE_ATTEMPTS; i += 1) {
    const question = make();
    last = question;
    const key = questionRepeatKey(question);
    if (!sessionBlocked.has(key) && !recentKeys.has(key)) {
      sessionBlocked.add(key);
      recentKeys.add(key);
      rememberQuestionKeys([key]);
      return question;
    }
  }

  for (let i = 0; i < SAMPLE_ATTEMPTS; i += 1) {
    const question = make();
    last = question;
    const key = questionRepeatKey(question);
    if (!sessionBlocked.has(key)) {
      sessionBlocked.add(key);
      rememberQuestionKeys([key]);
      return question;
    }
  }

  return last ?? make();
}
