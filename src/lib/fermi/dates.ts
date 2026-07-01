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
