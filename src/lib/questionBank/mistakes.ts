/**
 * Question Bank Mistakes — pool aggregation from attempts + Mistakes sessions.
 * No new tables: incorrect attempts seed the pool; sessions with
 * source "mistakes" mark questions as reviewed.
 */

import type { QuestionBankQuestion } from "@/types/questionBank";
import { applyPublishedQuestionBankFilter } from "@/lib/questionBank/libraryFilterServer";

export const QB_MISTAKES_SESSION_SOURCE = "mistakes" as const;
export const QB_MISTAKES_SUMMARY_KIND = "mistakes" as const;

export type QbMistakesPoolMode = "unreviewed" | "most_missed" | "shuffle";

export type QbMistakesExamFilter = "ALL" | "ESAT" | "TMUA";

export const QB_MISTAKES_POOL_OPTIONS: Array<{
  id: QbMistakesPoolMode;
  label: string;
  description: string;
}> = [
  {
    id: "unreviewed",
    label: "Unreviewed",
    description: "Not opened in Mistakes yet.",
  },
  {
    id: "most_missed",
    label: "Most missed",
    description: "Highest wrong count first.",
  },
  {
    id: "shuffle",
    label: "Shuffle",
    description: "Random from the full pool.",
  },
];

export const QB_MISTAKES_EXAM_FILTERS: QbMistakesExamFilter[] = [
  "ALL",
  "ESAT",
  "TMUA",
];

export function normalizeQbMistakesPoolMode(
  mode: string | null | undefined,
): QbMistakesPoolMode {
  switch (mode) {
    case "most_missed":
      return "most_missed";
    case "shuffle":
      return "shuffle";
    case "unreviewed":
    default:
      return "unreviewed";
  }
}

export type QbMistakeHistoryEvent = {
  at: number;
  source: "practice" | "mistakes";
  isCorrect: boolean;
  choice: string | null;
  correctChoice: string | null;
  timeSec: number;
  sessionId: string;
};

export type QbMistakePoolItem = {
  key: string;
  questionId: string;
  subjects: string;
  testType: "ESAT" | "TMUA" | null;
  primaryTag: string | null;
  timesWrong: number;
  timesSeenInMistakes: number;
  lastWrongAt: number;
  lastReviewedAt: number | null;
  lastMistakesOutcome: "correct" | "wrong" | null;
  neverReviewed: boolean;
  history: QbMistakeHistoryEvent[];
};

export type QbMistakeQuestionPayload = QbMistakePoolItem & {
  question: QuestionBankQuestion;
};

export type QbMistakesSummary = {
  totalIncorrect: number;
  untouched: number;
  byExam: Record<string, number>;
};

export type QbAttemptSeed = {
  question_id: string;
  user_answer: string;
  is_correct: boolean;
  time_spent_ms: number | null;
  attempted_at: string;
  session_id: string | null;
};

export type QbSessionSeed = {
  id: string;
  source: string | null;
  summary: Record<string, unknown> | null;
};

export function isQbMistakesSession(row: QbSessionSeed): boolean {
  if ((row.source || "").trim() === QB_MISTAKES_SESSION_SOURCE) return true;
  const kind = row.summary?.kind;
  return kind === QB_MISTAKES_SUMMARY_KIND;
}

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function resolveTestType(
  subjects: string,
  testType: string | null | undefined,
): "ESAT" | "TMUA" | null {
  const upper = (testType || "").trim().toUpperCase();
  if (upper === "ESAT" || upper === "TMUA") return upper;
  const s = subjects.trim();
  if (s === "Paper 1" || s === "Paper 2") return "TMUA";
  if (
    s === "Math 1" ||
    s === "Math 2" ||
    s === "Physics" ||
    s === "Chemistry" ||
    s === "Biology"
  ) {
    return "ESAT";
  }
  return null;
}

/**
 * Build the incorrect pool from attempts + Mistakes session markers.
 * Only questions with at least one incorrect attempt are included.
 */
export function aggregateQbMistakePool(
  attempts: QbAttemptSeed[],
  sessions: QbSessionSeed[],
  questionMeta: Map<
    string,
    {
      subjects: string;
      test_type?: string | null;
      primary_tag?: string | null;
    }
  >,
): QbMistakePoolItem[] {
  const mistakesSessionIds = new Set(
    sessions.filter(isQbMistakesSession).map((s) => s.id),
  );

  const byId = new Map<string, QbMistakePoolItem>();

  const sorted = [...attempts].sort(
    (a, b) =>
      new Date(a.attempted_at).getTime() - new Date(b.attempted_at).getTime(),
  );

  for (const attempt of sorted) {
    const qid = attempt.question_id;
    if (!qid) continue;
    const at = new Date(attempt.attempted_at).getTime();
    if (!Number.isFinite(at)) continue;

    const isMistakes = !!(
      attempt.session_id && mistakesSessionIds.has(attempt.session_id)
    );
    const meta = questionMeta.get(qid);
    const subjects = meta?.subjects ?? "";
    const testType = resolveTestType(subjects, meta?.test_type ?? null);

    let item = byId.get(qid);
    if (!item) {
      item = {
        key: qid,
        questionId: qid,
        subjects,
        testType,
        primaryTag: meta?.primary_tag ?? null,
        timesWrong: 0,
        timesSeenInMistakes: 0,
        lastWrongAt: 0,
        lastReviewedAt: null,
        lastMistakesOutcome: null,
        neverReviewed: true,
        history: [],
      };
      byId.set(qid, item);
    }

    const correctChoice = null;
    item.history.push({
      at,
      source: isMistakes ? "mistakes" : "practice",
      isCorrect: attempt.is_correct,
      choice: attempt.user_answer || null,
      correctChoice,
      timeSec: Math.max(
        0,
        Math.round((attempt.time_spent_ms ?? 0) / 1000),
      ),
      sessionId: attempt.session_id || `attempt-${at}`,
    });

    if (!attempt.is_correct) {
      item.timesWrong += 1;
      item.lastWrongAt = Math.max(item.lastWrongAt, at);
    }

    if (isMistakes) {
      item.timesSeenInMistakes += 1;
      item.neverReviewed = false;
      item.lastReviewedAt =
        item.lastReviewedAt == null
          ? at
          : Math.max(item.lastReviewedAt, at);
      item.lastMistakesOutcome = attempt.is_correct ? "correct" : "wrong";
    }
  }

  // Keep only questions that were wrong at least once.
  return [...byId.values()].filter((item) => item.timesWrong > 0);
}

export function summarizeQbMistakePool(
  items: QbMistakePoolItem[],
): QbMistakesSummary {
  const byExam: Record<string, number> = { ESAT: 0, TMUA: 0 };
  let untouched = 0;
  for (const item of items) {
    if (item.neverReviewed) untouched += 1;
    if (item.testType === "ESAT") byExam.ESAT += 1;
    else if (item.testType === "TMUA") byExam.TMUA += 1;
  }
  return {
    totalIncorrect: items.length,
    untouched,
    byExam,
  };
}

function filterByExam(
  items: QbMistakePoolItem[],
  exam: QbMistakesExamFilter,
): QbMistakePoolItem[] {
  if (exam === "ALL") return items;
  return items.filter((i) => i.testType === exam);
}

export function selectQbMistakeItems(
  items: QbMistakePoolItem[],
  opts: {
    mode: QbMistakesPoolMode;
    exam: QbMistakesExamFilter;
    count: number;
  },
): QbMistakePoolItem[] {
  const filtered = filterByExam(items, opts.exam);
  if (filtered.length === 0 || opts.count <= 0) return [];
  const take = Math.min(opts.count, filtered.length);
  const mode = normalizeQbMistakesPoolMode(opts.mode);

  if (mode === "shuffle") {
    return shuffleInPlace([...filtered]).slice(0, take);
  }

  if (mode === "most_missed") {
    const sorted = [...filtered].sort((a, b) => {
      if (b.timesWrong !== a.timesWrong) return b.timesWrong - a.timesWrong;
      if (a.neverReviewed !== b.neverReviewed) {
        return a.neverReviewed ? -1 : 1;
      }
      return b.lastWrongAt - a.lastWrongAt;
    });
    return sorted.slice(0, take);
  }

  const fresh = shuffleInPlace(filtered.filter((i) => i.neverReviewed));
  const recycled = shuffleInPlace(filtered.filter((i) => !i.neverReviewed));
  return [...fresh, ...recycled].slice(0, take);
}

function normalizeQuestionRow(q: Record<string, unknown>): QuestionBankQuestion {
  return {
    ...q,
    options:
      typeof q.options === "string"
        ? JSON.parse(q.options as string)
        : (q.options as QuestionBankQuestion["options"]),
    distractor_map:
      q.distractor_map && typeof q.distractor_map === "string"
        ? JSON.parse(q.distractor_map as string)
        : (q.distractor_map as QuestionBankQuestion["distractor_map"]),
  } as QuestionBankQuestion;
}

/** Load published question rows for selected pool items (preserve order). */
export async function hydrateQbMistakeQuestions(
  supabase: { from: (table: string) => any },
  items: QbMistakePoolItem[],
): Promise<QbMistakeQuestionPayload[]> {
  const ids = items.map((i) => i.questionId);
  if (ids.length === 0) return [];

  const { data, error } = await applyPublishedQuestionBankFilter(
    supabase.from("ai_generated_questions").select("*"),
  ).in("id", ids);

  if (error || !data) return [];

  const map = new Map<string, QuestionBankQuestion>();
  for (const row of data as Record<string, unknown>[]) {
    try {
      const q = normalizeQuestionRow(row);
      map.set(q.id, q);
    } catch {
      /* skip bad row */
    }
  }

  const out: QbMistakeQuestionPayload[] = [];
  for (const item of items) {
    const question = map.get(item.questionId);
    if (!question) continue;
    const subjects = question.subjects || item.subjects;
    const testType = resolveTestType(subjects, question.test_type ?? null);
    out.push({
      ...item,
      subjects,
      testType,
      primaryTag: question.primary_tag ?? item.primaryTag,
      question,
    });
  }
  return out;
}

export function buildQbMistakesSessionSummary(opts: {
  mode: QbMistakesPoolMode;
  exam: QbMistakesExamFilter;
  questionIds: string[];
}): Record<string, unknown> {
  return {
    kind: QB_MISTAKES_SUMMARY_KIND,
    mode: opts.mode,
    exam: opts.exam,
    questionIds: opts.questionIds,
  };
}
