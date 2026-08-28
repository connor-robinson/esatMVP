/**
 * Deadline-based module timer helpers.
 *
 * VERIFIED_ESAT: modules timed separately (40 minutes); unused time does NOT
 * carry over; timer does not stop if the candidate leaves the seat.
 */

import { MODULE_DURATION_MS } from "./types";

/** Remaining milliseconds until deadline; never negative. */
export function remainingMs(deadline: number, now: number = Date.now()): number {
  return Math.max(0, deadline - now);
}

/** Format remaining time as MM:SS (never negative). */
export function formatRemainingMs(ms: number): string {
  const clamped = Math.max(0, Math.floor(ms));
  const totalSeconds = Math.floor(clamped / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** Absolute module deadline from a start timestamp. */
export function moduleDeadlineFromStart(
  startMs: number,
  durationMs: number = MODULE_DURATION_MS,
): number {
  return startMs + durationMs;
}

/** True when the module timer has reached zero. */
export function isModuleTimeExpired(
  deadline: number,
  now: number = Date.now(),
): boolean {
  return remainingMs(deadline, now) <= 0;
}

/**
 * Unused time at end of a module. Callers MUST NOT add this to a subsequent
 * module deadline (VERIFIED_ESAT: unused time does not carry over).
 */
export function unusedMsAtEnd(
  deadline: number,
  endMs: number = Date.now(),
): number {
  return remainingMs(deadline, endMs);
}

/**
 * Start a fresh module timer. Explicitly ignores any prior unused ms so
 * carry-over cannot be applied by accident.
 */
export function startFreshModuleDeadline(
  now: number = Date.now(),
  durationMs: number = MODULE_DURATION_MS,
  _priorUnusedMsIgnored?: number,
): number {
  void _priorUnusedMsIgnored;
  return moduleDeadlineFromStart(now, durationMs);
}
