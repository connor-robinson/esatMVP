/**
 * Access-arrangement timing helpers.
 * Profile stores has_extra_time + extra_time_percentage (default 25).
 */

import { fetchAccessArrangementPrefs } from "@/lib/papers/restBreaks";

export type ExtraTimePrefs = {
  enabled: boolean;
  percentage: number;
};

export function applyExtraTimeMinutes(
  baseMinutes: number,
  opts: ExtraTimePrefs | number,
): number {
  if (!Number.isFinite(baseMinutes) || baseMinutes <= 0) return baseMinutes;
  const percentage =
    typeof opts === "number"
      ? opts
      : opts.enabled
        ? opts.percentage
        : 0;
  if (!Number.isFinite(percentage) || percentage <= 0) return baseMinutes;
  return Math.ceil(baseMinutes * (1 + percentage / 100));
}

/** Read extra-time prefs from the profile API (client-side). */
export async function fetchExtraTimePrefs(): Promise<ExtraTimePrefs> {
  const prefs = await fetchAccessArrangementPrefs();
  return prefs.extraTime;
}
