/**
 * Official UAT-UK ESAT windows for 2027 entry
 * (https://esat-tmua.ac.uk/deadlines/).
 *
 * Worldwide (except China / Hong Kong / Macau): every day in the window.
 * China / Hong Kong / Macau: ESAT only on 12–13 Oct or 6 Jan.
 * We expose the full worldwide window so candidates can pick their booked day.
 */

export type EsatSittingId = "october" | "january";

export type EsatSitting = {
  id: EsatSittingId;
  label: string;
  /** Inclusive YYYY-MM-DD range. */
  startIso: string;
  endIso: string;
};

export const ESAT_SITTINGS: readonly EsatSitting[] = [
  {
    id: "october",
    label: "October 2026",
    startIso: "2026-10-12",
    endIso: "2026-10-16",
  },
  {
    id: "january",
    label: "January 2027",
    startIso: "2027-01-04",
    endIso: "2027-01-08",
  },
] as const;

export const DEFAULT_ESAT_DATE_ISO = ESAT_SITTINGS[0].startIso;

const STORAGE_KEY = "esat-days-until-date";

function parseIsoDate(iso: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  return {
    y: Number(match[1]),
    m: Number(match[2]),
    d: Number(match[3]),
  };
}

/** Local calendar midnight for an ISO date string. */
export function localDateFromIso(iso: string): Date | null {
  const parts = parseIsoDate(iso);
  if (!parts) return null;
  return new Date(parts.y, parts.m - 1, parts.d);
}

export function formatIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** All calendar days in a sitting, inclusive. */
export function daysInSitting(sitting: EsatSitting): string[] {
  const start = localDateFromIso(sitting.startIso);
  const end = localDateFromIso(sitting.endIso);
  if (!start || !end) return [];
  const out: string[] = [];
  const cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    out.push(formatIso(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

/** Every bookable day across published sittings, in order. */
export function allEsatDateIsos(): string[] {
  return ESAT_SITTINGS.flatMap((sitting) => daysInSitting(sitting));
}

export function isValidEsatDate(dateIso: string): boolean {
  return allEsatDateIsos().includes(dateIso);
}

/** Whole local calendar days from today to target (0 on the day). */
export function daysUntilIso(dateIso: string, now = new Date()): number {
  const target = localDateFromIso(dateIso);
  if (!target) return 0;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function formatDayLabel(dateIso: string): string {
  const date = localDateFromIso(dateIso);
  if (!date) return dateIso;
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function loadStoredEsatDate(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { dateIso?: unknown };
    if (typeof parsed.dateIso !== "string") return null;
    if (!isValidEsatDate(parsed.dateIso)) return null;
    return parsed.dateIso;
  } catch {
    return null;
  }
}

export function saveStoredEsatDate(dateIso: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ dateIso }));
  } catch {
    // ignore quota / private mode
  }
}
