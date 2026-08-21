/**
 * Deterministic daily Fermi question selection.
 *
 * Everyone worldwide gets the same five questions on a given UTC day.
 * Questions are drawn from the bank in a fixed order and never repeat
 * until the full pool has been used (then the cycle restarts).
 */

import { FERMI_QUESTIONS, type FermiQuestion } from "@/config/fermiQuestions";
import { daysSinceEpoch } from "@/lib/fermi/dates";

export const FERMI_DAILY_ROUND_SIZE = 5;

/** Stable bank order - do not shuffle; day index picks the slice. */
const ORDERED_BANK: FermiQuestion[] = [...FERMI_QUESTIONS].sort((a, b) =>
  a.id.localeCompare(b.id),
);

const DAYS_PER_CYCLE = Math.ceil(ORDERED_BANK.length / FERMI_DAILY_ROUND_SIZE);

/** Running puzzle number shown in the UI (1-based, never resets). */
export function getDailyPuzzleNumber(date: Date = new Date()): number {
  return daysSinceEpoch(date) + 1;
}

/** Today's five questions - identical for every player on the same UTC day. */
export function getDailyFermiQuestions(date: Date = new Date()): FermiQuestion[] {
  const day = daysSinceEpoch(date);
  const dayInCycle = day % DAYS_PER_CYCLE;
  const start = dayInCycle * FERMI_DAILY_ROUND_SIZE;
  return ORDERED_BANK.slice(start, start + FERMI_DAILY_ROUND_SIZE);
}
