/**
 * Wordle-style daily progress for FermiGuessr — stored in localStorage per device.
 * Logged-in users also sync to the server on completion.
 */

import type { FermiQuestion } from "@/config/fermiQuestions";
import type { FermiVerdict } from "@/lib/fermi/scoring";

export const FERMI_BEST_SCORE_KEY = "fermiBestScore";
export const FERMI_DAILY_STATE_KEY = "fermiDailyState";

export type FermiPhase = "playing" | "revealed" | "summary";

export interface StoredFermiResult {
  questionId: string;
  /** Snapshot so scheduled answers survive refresh without client bundle. */
  question?: string;
  answer?: number;
  unit?: string;
  category?: string;
  note?: string;
  guess: number;
  logErr: number;
  score: number;
  verdict: FermiVerdict;
}

export interface StoredFermiDailyState {
  dateKey: string;
  results: StoredFermiResult[];
  index: number;
  phase: FermiPhase;
  roundMode?: "scheduled" | "bank";
}

export interface HydratedFermiResult {
  question: FermiQuestion;
  guess: number;
  logErr: number;
  score: number;
  verdict: FermiVerdict;
}

export interface HydratedFermiDailyState {
  index: number;
  phase: FermiPhase;
  results: HydratedFermiResult[];
  /** Raw result count from localStorage before hydration filtering. */
  storedResultCount: number;
}

export function isFermiDailyComplete(
  state: {
    phase: FermiPhase;
    results: readonly unknown[];
    storedResultCount?: number;
  },
  roundLength: number,
): boolean {
  const count = Math.max(state.storedResultCount ?? 0, state.results.length);
  return count >= roundLength;
}

function pickQuestion(
  fromRound: FermiQuestion | undefined,
  fromStored: FermiQuestion | null,
): FermiQuestion | null {
  if (fromStored?.answer != null) return fromStored;
  if (fromRound?.answer != null) return fromRound;
  return fromStored ?? fromRound ?? null;
}

function storedToQuestion(stored: StoredFermiResult): FermiQuestion | null {
  if (!stored.questionId) return null;
  if (!stored.question || stored.answer == null) {
    if (stored.score == null || !stored.verdict) return null;
    return {
      id: stored.questionId,
      question: stored.question ?? "Today's question",
      answer: 1,
      unit: stored.unit,
      category: (stored.category ?? "everyday") as FermiQuestion["category"],
      note: stored.note,
    };
  }
  return {
    id: stored.questionId,
    question: stored.question,
    answer: stored.answer,
    unit: stored.unit,
    category: (stored.category ?? "everyday") as FermiQuestion["category"],
    note: stored.note,
  };
}

function hydrateResults(
  round: FermiQuestion[],
  stored: StoredFermiResult[],
): HydratedFermiResult[] {
  const byId = new Map(round.map((q) => [q.id, q]));
  return stored
    .map((r) => {
      const fromRound = byId.get(r.questionId);
      const fromStored = storedToQuestion(r);
      const question = pickQuestion(fromRound, fromStored);
      if (!question || r.score == null || !r.verdict) return null;
      return {
        question,
        guess: r.guess,
        logErr: r.logErr,
        score: r.score,
        verdict: r.verdict,
      };
    })
    .filter((r): r is HydratedFermiResult => r != null);
}

export function loadFermiDailyState(
  todayKey: string,
  round: FermiQuestion[],
): HydratedFermiDailyState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(FERMI_DAILY_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredFermiDailyState;
    if (parsed.dateKey !== todayKey) return null;
    return {
      index: parsed.index,
      phase: parsed.phase,
      results: hydrateResults(round, parsed.results),
      storedResultCount: parsed.results.length,
    };
  } catch {
    return null;
  }
}

export function saveFermiDailyState(
  todayKey: string,
  index: number,
  phase: FermiPhase,
  results: HydratedFermiResult[],
  roundMode?: "scheduled" | "bank",
): void {
  if (typeof window === "undefined") return;
  try {
    const existingRaw = window.localStorage.getItem(FERMI_DAILY_STATE_KEY);
    if (results.length === 0 && existingRaw) {
      const existing = JSON.parse(existingRaw) as StoredFermiDailyState;
      if (
        existing.dateKey === todayKey &&
        existing.results.length > 0 &&
        (phase === "summary" || existing.phase === "summary")
      ) {
        return;
      }
    }

    const payload: StoredFermiDailyState = {
      dateKey: todayKey,
      index,
      phase,
      roundMode,
      results: results.map((r) => ({
        questionId: r.question.id,
        question: r.question.question,
        answer: r.question.answer,
        unit: r.question.unit,
        category: r.question.category,
        note: r.question.note,
        guess: r.guess,
        logErr: r.logErr,
        score: r.score,
        verdict: r.verdict,
      })),
    };
    window.localStorage.setItem(FERMI_DAILY_STATE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota / private mode */
  }
}

export function readFermiBestScore(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(FERMI_BEST_SCORE_KEY);
    if (stored == null) return null;
    const value = Number(stored);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeFermiBestScore(score: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FERMI_BEST_SCORE_KEY, String(score));
  } catch {
    /* ignore */
  }
}
