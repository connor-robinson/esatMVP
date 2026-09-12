/**
 * Access-arrangement timing helpers.
 * Profile stores has_extra_time + extra_time_percentage (default 25).
 */

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
  try {
    const res = await fetch("/api/profile/preferences", {
      credentials: "include",
    });
    if (!res.ok) return { enabled: false, percentage: 0 };
    const data = (await res.json()) as {
      has_extra_time?: boolean | null;
      extra_time_percentage?: number | null;
    };
    const enabled = Boolean(data.has_extra_time);
    const percentage = enabled
      ? Math.max(0, Number(data.extra_time_percentage ?? 25) || 0)
      : 0;
    return { enabled, percentage };
  } catch {
    return { enabled: false, percentage: 0 };
  }
}
