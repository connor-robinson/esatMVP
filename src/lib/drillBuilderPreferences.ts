import type { SessionLengthMode } from '@/types/core';

const STORAGE_KEY = 'drillBuilder.lengthPrefs.v1';

const QUESTION_MIN = 0;
const QUESTION_MAX = 100;
const TIME_MIN = 0;
const TIME_MAX = 180;

export interface DrillBuilderLengthPrefs {
  sessionLengthMode: SessionLengthMode;
  questionCount: number;
  timeLimitMinutes: number;
}

export const DEFAULT_DRILL_BUILDER_LENGTH_PREFS: DrillBuilderLengthPrefs = {
  sessionLengthMode: 'questions',
  questionCount: 20,
  timeLimitMinutes: 10,
};

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function parsePrefs(raw: unknown): DrillBuilderLengthPrefs | null {
  if (!raw || typeof raw !== 'object') return null;

  const data = raw as Record<string, unknown>;
  const mode = data.sessionLengthMode;
  if (mode !== 'questions' && mode !== 'time') return null;

  const questionCount = clamp(
    Number(data.questionCount),
    QUESTION_MIN,
    QUESTION_MAX,
  );
  const timeLimitMinutes = clamp(
    Number(data.timeLimitMinutes),
    TIME_MIN,
    TIME_MAX,
  );

  return {
    sessionLengthMode: mode,
    questionCount,
    timeLimitMinutes,
  };
}

export function loadDrillBuilderLengthPrefs(): DrillBuilderLengthPrefs {
  if (typeof window === 'undefined') {
    return DEFAULT_DRILL_BUILDER_LENGTH_PREFS;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DRILL_BUILDER_LENGTH_PREFS;
    const parsed = parsePrefs(JSON.parse(raw));
    return parsed ?? DEFAULT_DRILL_BUILDER_LENGTH_PREFS;
  } catch {
    return DEFAULT_DRILL_BUILDER_LENGTH_PREFS;
  }
}

export function saveDrillBuilderLengthPrefs(
  prefs: DrillBuilderLengthPrefs,
): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        sessionLengthMode: prefs.sessionLengthMode,
        questionCount: clamp(
          prefs.questionCount,
          QUESTION_MIN,
          QUESTION_MAX,
        ),
        timeLimitMinutes: clamp(
          prefs.timeLimitMinutes,
          TIME_MIN,
          TIME_MAX,
        ),
      }),
    );
  } catch {
    // ignore quota / private browsing
  }
}
