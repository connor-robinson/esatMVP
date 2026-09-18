/**
 * Localhost / ?demo=1 fixtures for Past Papers Mistakes.
 * Bundled mock stems labeled as ENGAA / NSAA / TMUA for UI preview.
 */

import { ESAT_CAMP_MOCK_MODULES } from "@/data/esatCampMocks";
import {
  getEsatCampMockQuestions,
  mockQuestionToPaperQuestion,
  paperIdForEsatCampMockModule,
} from "@/lib/papers/esatCampMocks";
import {
  mistakePoolKey,
  normalizeMistakeSubject,
  selectMistakeItems,
  summarizeMistakePool,
  type MistakeQuestionPayload,
  type MistakesExamFilter,
  type MistakesPoolMode,
  type MistakesSubjectFilter,
  type MistakesSummary,
  type MistakePoolItem,
} from "@/lib/papers/mistakes";
import type { ExamName, Letter } from "@/types/papers";

const DEMO_REVIEWED_KEY = "nocalc:mistakesDemoReviewed";
const DEMO_EXAMS: ExamName[] = ["ENGAA", "NSAA", "TMUA"];

export function isMistakesDemoPreviewAllowed(hostname?: string): boolean {
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

function buildBaseDemoPool(): MistakePoolItem[] {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const modules = ESAT_CAMP_MOCK_MODULES.slice(0, 3);
  const items: MistakePoolItem[] = [];

  modules.forEach((mockModule, moduleIndex) => {
    const paperId = paperIdForEsatCampMockModule(mockModule.id);
    const examName = DEMO_EXAMS[moduleIndex % DEMO_EXAMS.length];
    const sample = mockModule.questions.slice(0, 6);
    sample.forEach((q, i) => {
      const question = mockQuestionToPaperQuestion(mockModule, q);
      const timesWrong = 1 + ((moduleIndex + i) % 4);
      const lastWrongAt = now - (i + moduleIndex + 1) * day * (0.5 + i * 0.25);
      const correctChoice = (
        question.answerLetter || "A"
      ).toUpperCase() as Letter;
      const key = mistakePoolKey({
        paperId,
        paperName: question.paperName,
        paperVariant: mockModule.title || mockModule.paperName,
        questionNumber: question.questionNumber,
      });

      items.push({
        key,
        paperId,
        paperName: question.paperName,
        paperVariant: mockModule.title || "Demo paper",
        examName,
        subject: normalizeMistakeSubject(mockModule.subject),
        questionNumber: question.questionNumber,
        questionId: question.id,
        timesWrong,
        timesSeenInMistakes: 0,
        lastWrongAt,
        lastReviewedAt: null,
        lastMistakesOutcome: null,
        neverReviewed: true,
        history: Array.from({ length: timesWrong }, (_, h) => ({
          at: lastWrongAt - h * day,
          source: "paper" as const,
          isCorrect: false,
          choice: (["A", "B", "C", "D"] as Letter[])[(i + h) % 4],
          correctChoice,
          timeSec: 45 + i * 12 + h * 5,
          sessionName: `Demo sitting ${h + 1}`,
          sessionId: `demo-paper-${moduleIndex}-${i}-${h}`,
        })),
      });
    });
  });

  if (items.length >= 4) {
    const correct2 = items[2].history[0]?.correctChoice ?? ("A" as Letter);
    items[2] = {
      ...items[2],
      neverReviewed: false,
      timesSeenInMistakes: 1,
      lastReviewedAt: now - day,
      lastMistakesOutcome: "correct",
      history: [
        {
          at: now - day,
          source: "mistakes",
          isCorrect: true,
          choice: correct2,
          correctChoice: correct2,
          timeSec: 50,
          sessionName: "[Mistakes] Demo prior",
          sessionId: "demo-mistakes-prior-1",
        },
        ...items[2].history,
      ],
    };
    const correct3 = items[3].history[0]?.correctChoice ?? ("B" as Letter);
    items[3] = {
      ...items[3],
      neverReviewed: false,
      timesSeenInMistakes: 2,
      timesWrong: items[3].timesWrong + 1,
      lastReviewedAt: now - 3 * 60 * 60 * 1000,
      lastMistakesOutcome: "wrong",
      history: [
        {
          at: now - 3 * 60 * 60 * 1000,
          source: "mistakes",
          isCorrect: false,
          choice: "A",
          correctChoice: correct3,
          timeSec: 70,
          sessionName: "[Mistakes] Demo bounce",
          sessionId: "demo-mistakes-bounce-1",
        },
        ...items[3].history,
      ],
    };
  }

  return items;
}

function applyLocalReviews(items: MistakePoolItem[]): MistakePoolItem[] {
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

function hydrateDemoItem(item: MistakePoolItem): MistakeQuestionPayload | null {
  if (item.paperId == null) return null;
  const questions = getEsatCampMockQuestions(item.paperId, {
    includeDisabled: true,
  });
  const question = questions.find(
    (q) => q.questionNumber === item.questionNumber,
  );
  if (!question) return null;
  return {
    ...item,
    questionId: question.id,
    paperName: item.paperName || question.paperName,
    question: {
      ...question,
      examName: item.examName as ExamName,
    },
  };
}

export function getMistakesDemoSummary(): MistakesSummary {
  return summarizeMistakePool(applyLocalReviews(buildBaseDemoPool()));
}

export function startMistakesDemoSession(opts: {
  mode: MistakesPoolMode;
  exam: MistakesExamFilter;
  subject?: MistakesSubjectFilter;
  questionCount: number;
}): MistakeQuestionPayload[] {
  const pool = applyLocalReviews(buildBaseDemoPool());
  const selected = selectMistakeItems(pool, {
    mode: opts.mode,
    exam: opts.exam,
    subject: opts.subject ?? "ALL",
    count: opts.questionCount,
  });
  return selected
    .map(hydrateDemoItem)
    .filter((q): q is MistakeQuestionPayload => q != null);
}

export function markMistakesDemoReviewed(keys: string[]) {
  const reviewed = readReviewedKeys();
  for (const key of keys) reviewed.add(key);
  writeReviewedKeys(reviewed);
}

export function resetMistakesDemoReviews() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(DEMO_REVIEWED_KEY);
  } catch {
    /* ignore */
  }
}
