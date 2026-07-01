/** UTC midnight for a given instant. */
export function startOfUTCDay(date: Date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Days since Unix epoch (UTC). Stable global day index. */
export function daysSinceEpoch(date: Date = new Date()): number {
  return Math.floor(startOfUTCDay(date).getTime() / 86_400_000);
}

/** `YYYY-MM-DD` in UTC — used as a localStorage key for daily progress. */
export function utcDateKey(date: Date = new Date()): string {
  const d = startOfUTCDay(date);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Milliseconds until the next UTC midnight (next daily puzzle). */
export function msUntilNextUtcReset(now: Date = new Date()): number {
  const nextDay = new Date(startOfUTCDay(now).getTime() + 86_400_000);
  return Math.max(0, nextDay.getTime() - now.getTime());
}

/** Human-readable countdown, e.g. "Resets in 4 hours 32 minutes". */
export function formatDailyResetCountdown(ms: number): string {
  const totalMinutes = Math.max(1, Math.ceil(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `Resets in ${minutes} minute${minutes === 1 ? "" : "s"}`;
  }
  if (minutes === 0) {
    return `Resets in ${hours} hour${hours === 1 ? "" : "s"}`;
  }
  return `Resets in ${hours} hour${hours === 1 ? "" : "s"} ${minutes} minute${minutes === 1 ? "" : "s"}`;
}
