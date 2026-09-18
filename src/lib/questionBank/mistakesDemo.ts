/**
 * Localhost / ?demo=1 fixtures for Question Bank Mistakes.
 */

import { CALIBRATION_QUESTIONS } from "@/lib/calibration/config";
import type { QuestionBankQuestion } from "@/types/questionBank";
import {
  selectQbMistakeItems,
  summarizeQbMistakePool,
  type QbMistakePoolItem,
  type QbMistakeQuestionPayload,
  type QbMistakesExamFilter,
  type QbMistakesPoolMode,
  type QbMistakesSubjectFilter,
  type QbMistakesSummary,
} from "@/lib/questionBank/mistakes";

const DEMO_REVIEWED_KEY = "nocalc:qbMistakesDemoReviewed";

type DemoPoolItem = QbMistakePoolItem & { question: QuestionBankQuestion };

export function isQbMistakesDemoPreviewAllowed(hostname?: string): boolean {
  if (typeof process !== "undefined" && process.env.NODE_ENV === "production") {
    const host =
      hostname ??
      (typeof window !== "undefined" ? window.location.hostname : "");
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  }
  return true;
}

function readReviewedKeys(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.sessionStorage.getItem(DEMO_REVIEWED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function writeReviewedKeys(keys: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      DEMO_REVIEWED_KEY,
      JSON.stringify([...keys]),
    );
  } catch {
    /* ignore */
  }
}

function calibrationToQb(
  c: (typeof CALIBRATION_QUESTIONS)[number],
  index: number,
): QuestionBankQuestion {
  const options: Record<string, string> = {};
  for (const opt of c.options ?? []) {
    options[opt.label] = opt.text_markdown;
  }
  const stem = c.diagram_svg
    ? `${c.question_text_markdown}\n\n${c.diagram_svg}`
    : c.question_text_markdown;

  return {
    id: `demo-qb-mistake-${c.id || index}`,
    generation_id: "demo",
    schema_id: "demo",
    difficulty:
      c.difficulty === "accessible"
        ? "Easy"
        : c.difficulty === "difficult"
          ? "Hard"
          : "Medium",
    question_stem: stem,
    options,
    correct_option: c.correct_option,
    solution_reasoning: c.solution?.steps_markdown?.join("\n\n") ?? null,
    solution_key_insight: c.fast_insight ?? null,
    distractor_map: c.distractor_analysis ?? null,
    subjects: index % 5 === 0 ? "Paper 1" : "Math 1",
    test_type: index % 5 === 0 ? "TMUA" : "ESAT",
    primary_tag: c.primary_topic ?? null,
    secondary_tags: null,
    status: "approved",
    created_at: new Date().toISOString(),
  };
}

function buildBaseDemoPool(): DemoPoolItem[] {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const sample = CALIBRATION_QUESTIONS.slice(0, 18);

  return sample.map((c, i) => {
    const question = calibrationToQb(c, i);
    const timesWrong = 1 + (i % 4);
    const lastWrongAt = now - (i + 1) * day * 0.4;
    const testType = question.test_type === "TMUA" ? "TMUA" : "ESAT";
    const history = Array.from({ length: timesWrong }, (_, h) => ({
      at: lastWrongAt - h * day,
      source: "practice" as const,
      isCorrect: false,
      choice: "A",
      correctChoice: question.correct_option,
      timeSec: 40 + i * 5 + h * 3,
      sessionId: `demo-qb-practice-${i}-${h}`,
    }));

    return {
      key: question.id,
      questionId: question.id,
      subjects: question.subjects,
      testType,
      primaryTag: question.primary_tag,
      timesWrong,
      timesSeenInMistakes: 0,
      lastWrongAt,
      lastReviewedAt: null,
      lastMistakesOutcome: null,
      neverReviewed: true,
      history,
      question,
    };
  });
}

function applyLocalReviews(items: DemoPoolItem[]): DemoPoolItem[] {
  const reviewed = readReviewedKeys();
  if (reviewed.size === 0) return items;
  const now = Date.now();
  return items.map((item) => {
    if (!reviewed.has(item.key)) return item;
    return {
      ...item,
      neverReviewed: false,
      timesSeenInMistakes: Math.max(1, item.timesSeenInMistakes),
      lastReviewedAt: item.lastReviewedAt ?? now,
      lastMistakesOutcome: item.lastMistakesOutcome ?? "correct",
    };
  });
}

export function getQbMistakesDemoSummary(): QbMistakesSummary {
  return summarizeQbMistakePool(applyLocalReviews(buildBaseDemoPool()));
}

export function startQbMistakesDemoSession(opts: {
  mode: QbMistakesPoolMode;
  exam: QbMistakesExamFilter;
  subject?: QbMistakesSubjectFilter;
  questionCount: number;
}): QbMistakeQuestionPayload[] {
  const base = applyLocalReviews(buildBaseDemoPool());
  const selected = selectQbMistakeItems(base, {
    mode: opts.mode,
    exam: opts.exam,
    subject: opts.subject ?? "ALL",
    count: opts.questionCount,
  });
  const byId = new Map(base.map((item) => [item.questionId, item]));
  return selected
    .map((item) => {
      const full = byId.get(item.questionId);
      if (!full) return null;
      return full as QbMistakeQuestionPayload;
    })
    .filter((q): q is QbMistakeQuestionPayload => q != null);
}

export function markQbMistakesDemoReviewed(keys: string[]) {
  const reviewed = readReviewedKeys();
  for (const key of keys) reviewed.add(key);
  writeReviewedKeys(reviewed);
}

export function resetQbMistakesDemoReviews() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(DEMO_REVIEWED_KEY);
  } catch {
    /* ignore */
  }
}
