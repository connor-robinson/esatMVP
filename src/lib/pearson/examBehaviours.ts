/**
 * Pure Pearson exam behaviour helpers (testable without React).
 */

import type { Letter, Question } from "@/types/papers";
import type {
  ColourSchemeId,
  ExamMode,
  PearsonAnswerMap,
  PearsonFlagMap,
  PearsonNavRow,
  PearsonViewedMap,
  PearsonVisitedMap,
  QuestionNavStatus,
  ZoomLevel,
} from "./types";
import { ZOOM_LEVELS } from "./types";
import { nextColourScheme } from "./colourSchemes";
import { startFreshModuleDeadline, unusedMsAtEnd } from "./timer";
import { isVerifiedShortcutId, matchVerifiedShortcut } from "./shortcuts";

export function emptyAnswerMap(questions: Question[]): PearsonAnswerMap {
  const map: PearsonAnswerMap = {};
  for (const q of questions) map[q.id] = null;
  return map;
}

export function emptyFlagMap(questions: Question[]): PearsonFlagMap {
  const map: PearsonFlagMap = {};
  for (const q of questions) map[q.id] = false;
  return map;
}

export function emptyBoolMap(questions: Question[]): PearsonViewedMap {
  const map: PearsonViewedMap = {};
  for (const q of questions) map[q.id] = false;
  return map;
}

/** Persist answer unless the module is completed (locked). */
export function setAnswer(
  answers: PearsonAnswerMap,
  questionId: number,
  choice: Letter | null,
  completed: boolean,
): PearsonAnswerMap {
  if (completed) return answers;
  return { ...answers, [questionId]: choice };
}

/** Toggle flag unless the module is completed (locked). */
export function toggleFlag(
  flagged: PearsonFlagMap,
  questionId: number,
  completed: boolean,
): PearsonFlagMap {
  if (completed) return flagged;
  return { ...flagged, [questionId]: !flagged[questionId] };
}

export function markVisited(
  visited: PearsonVisitedMap,
  questionId: number,
): PearsonVisitedMap {
  if (visited[questionId]) return visited;
  return { ...visited, [questionId]: true };
}

export function markViewedToEnd(
  viewedToEnd: PearsonViewedMap,
  questionId: number,
): PearsonViewedMap {
  if (viewedToEnd[questionId]) return viewedToEnd;
  return { ...viewedToEnd, [questionId]: true };
}

export function clearViewedToEnd(
  viewedToEnd: PearsonViewedMap,
  questionId: number,
): PearsonViewedMap {
  if (!viewedToEnd[questionId]) return viewedToEnd;
  return { ...viewedToEnd, [questionId]: false };
}

/**
 * Unseen Content gate (VERIFIED_ESAT handbook wording).
 * Blocks leaving a question that has not been scrolled/viewed to the end.
 */
export function needsUnseenContentWarning(
  questionId: number,
  viewedToEnd: PearsonViewedMap,
): boolean {
  return !viewedToEnd[questionId];
}

export function getQuestionNavStatus(
  questionId: number,
  answers: PearsonAnswerMap,
  visited: PearsonVisitedMap,
): QuestionNavStatus {
  if (!visited[questionId]) return "unseen";
  if (answers[questionId] != null) return "complete";
  return "incomplete";
}

export function buildNavigatorRows(
  questions: Question[],
  answers: PearsonAnswerMap,
  flagged: PearsonFlagMap,
  visited: PearsonVisitedMap,
): PearsonNavRow[] {
  return questions.map((q, index) => ({
    questionIndex: index,
    questionNumber: q.questionNumber,
    questionId: q.id,
    status: getQuestionNavStatus(q.id, answers, visited),
    flagged: Boolean(flagged[q.id]),
  }));
}

export function listFlaggedAndUnanswered(
  questions: Question[],
  answers: PearsonAnswerMap,
  flagged: PearsonFlagMap,
): { flagged: Question[]; unanswered: Question[] } {
  const flaggedQs = questions.filter((q) => flagged[q.id]);
  const unanswered = questions.filter((q) => answers[q.id] == null);
  return { flagged: flaggedQs, unanswered };
}

/** Completed lock: no further mutations after module end. */
export function assertNotCompleted(completed: boolean): boolean {
  return !completed;
}

/**
 * Simulate two sequential modules: unused time from module 1 must not extend
 * module 2 (VERIFIED_ESAT).
 */
export function simulateTwoModulesNoCarry(
  module1Start: number,
  module1End: number,
  module1DurationMs: number,
  module2Start: number,
  module2DurationMs: number,
): {
  module1UnusedMs: number;
  module2Deadline: number;
  module2DurationMs: number;
  carried: boolean;
} {
  const module1Deadline = startFreshModuleDeadline(
    module1Start,
    module1DurationMs,
  );
  const unused = unusedMsAtEnd(module1Deadline, module1End);
  const module2Deadline = startFreshModuleDeadline(
    module2Start,
    module2DurationMs,
    unused,
  );
  const expected = module2Start + module2DurationMs;
  return {
    module1UnusedMs: unused,
    module2Deadline,
    module2DurationMs: module2Deadline - module2Start,
    carried: module2Deadline !== expected,
  };
}

export function persistColourScheme(
  prev: ColourSchemeId,
  next: ColourSchemeId,
): ColourSchemeId {
  return nextColourScheme(prev, next);
}

export function stepZoom(
  current: ZoomLevel,
  direction: "in" | "out",
): ZoomLevel {
  const idx = ZOOM_LEVELS.indexOf(current);
  if (idx < 0) return 100;
  if (direction === "in") {
    return ZOOM_LEVELS[Math.min(ZOOM_LEVELS.length - 1, idx + 1)];
  }
  return ZOOM_LEVELS[Math.max(0, idx - 1)];
}

/** Strict mode: only verified shortcuts fire. */
export function resolveStrictShortcut(
  mode: ExamMode,
  e: Pick<KeyboardEvent, "altKey" | "ctrlKey" | "metaKey" | "key" | "code">,
  context?: {
    endExamDialogOpen?: boolean;
    navigatorOpen?: boolean;
    unseenContentDialogOpen?: boolean;
  },
): ReturnType<typeof matchVerifiedShortcut> {
  const matched = matchVerifiedShortcut(e, context);
  if (!matched) return null;
  if (mode === "strict-simulation" && !isVerifiedShortcutId(matched)) {
    return null;
  }
  return matched;
}

export function verifiedShortcutIdsOnly(): string[] {
  return [
    "next",
    "prev",
    "flag",
    "end-exam",
    "close",
    "yes",
    "no",
    "ok",
    "zoom-in",
    "zoom-out",
  ];
}
