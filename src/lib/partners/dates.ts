/**
 * Partner access windows are calendar end-dates stored as end-of-day UTC
 * (e.g. 2027-10-13T23:59:59.000Z). Format from the YYYY-MM-DD prefix in UTC
 * so local timezones cannot roll the label into another calendar day.
 */
export function endOfUtcDay(dateYmd: string): string {
  const ymd = dateYmd.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    throw new Error("Expected YYYY-MM-DD date");
  }
  return `${ymd}T23:59:59.000Z`;
}

export function utcCalendarDateYmd(
  iso: string | null | undefined,
): string | null {
  if (!iso) return null;
  const ymd = iso.trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? ymd : null;
}

export function formatPartnerAccessDate(
  iso: string | null | undefined,
): string {
  const ymd = utcCalendarDateYmd(iso);
  if (!ymd) return "";
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Date shown on complimentary-access success / partner banners.
 * Never fall back to Stripe/season-pass/tester expiry.
 */
export function complimentaryAccessEndIso(data: {
  partnerEndsAt?: string | null;
  accessUntil?: string | null;
  source?: string | null;
}): string | null {
  if (data.partnerEndsAt) return data.partnerEndsAt;
  if (data.source === "partner") return data.accessUntil ?? null;
  return null;
}
