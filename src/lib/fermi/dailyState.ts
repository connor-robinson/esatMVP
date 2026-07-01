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
}

export function isFermiDailyComplete(
  state: { phase: FermiPhase; results: readonly unknown[] },
  roundLength: number,
): boolean {
  return state.phase === "summary" && state.results.length >= roundLength;
}

function hydrateResults(
  round: FermiQuestion[],
  stored: StoredFermiResult[],
): HydratedFermiResult[] {
  const byId = new Map(round.map((q) => [q.id, q]));
  return stored
    .map((r) => {
      const question = byId.get(r.questionId);
      if (!question) return null;
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
): void {
  if (typeof window === "undefined") return;
  try {
    const payload: StoredFermiDailyState = {
      dateKey: todayKey,
      index,
      phase,
      results: results.map((r) => ({
        questionId: r.question.id,
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
