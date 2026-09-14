/**
 * Pause-the-clock rest breaks (UAT-UK access arrangements).
 *
 * Real ESAT/TMUA rule: up to 3 pause-the-clock breaks per section; content is
 * hidden during a break; break time does not consume test time.
 * Practice: candidate resumes when ready (no hard minute allotment).
 */

/** UAT-UK: max 3 pause-the-clock breaks in each section of ESAT/TMUA. */
export const MAX_REST_BREAKS_PER_SECTION = 3;

export type RestBreakPrefs = {
  enabled: boolean;
};

export type AccessArrangementPrefs = {
  extraTime: {
    enabled: boolean;
    percentage: number;
  };
  restBreaks: RestBreakPrefs;
};

export function restBreaksRemaining(used: number): number {
  const safeUsed = Math.max(0, Math.floor(Number(used) || 0));
  return Math.max(0, MAX_REST_BREAKS_PER_SECTION - safeUsed);
}

export function canStartRestBreak(opts: {
  enabled: boolean;
  used: number;
  alreadyActive: boolean;
}): boolean {
  if (!opts.enabled || opts.alreadyActive) return false;
  return restBreaksRemaining(opts.used) > 0;
}

/** Shift an absolute deadline forward by pause duration (ms). */
export function extendDeadlineByPause(
  deadline: number | null | undefined,
  pauseStartedAt: number,
  resumedAt: number = Date.now(),
): number | null {
  if (deadline == null || !Number.isFinite(deadline)) return deadline ?? null;
  if (!Number.isFinite(pauseStartedAt) || !Number.isFinite(resumedAt)) {
    return deadline;
  }
  const pauseMs = Math.max(0, resumedAt - pauseStartedAt);
  return deadline + pauseMs;
}

export async function fetchAccessArrangementPrefs(): Promise<AccessArrangementPrefs> {
  try {
    const res = await fetch("/api/profile/preferences", {
      credentials: "include",
    });
    if (!res.ok) {
      return {
        extraTime: { enabled: false, percentage: 0 },
        restBreaks: { enabled: false },
      };
    }
    const data = (await res.json()) as {
      has_extra_time?: boolean | null;
      extra_time_percentage?: number | null;
      has_rest_breaks?: boolean | null;
    };
    const extraEnabled = Boolean(data.has_extra_time);
    return {
      extraTime: {
        enabled: extraEnabled,
        percentage: extraEnabled
          ? Math.max(0, Number(data.extra_time_percentage ?? 25) || 0)
          : 0,
      },
      restBreaks: { enabled: Boolean(data.has_rest_breaks) },
    };
  } catch {
    return {
      extraTime: { enabled: false, percentage: 0 },
      restBreaks: { enabled: false },
    };
  }
}

export async function fetchRestBreakPrefs(): Promise<RestBreakPrefs> {
  const prefs = await fetchAccessArrangementPrefs();
  return prefs.restBreaks;
}
