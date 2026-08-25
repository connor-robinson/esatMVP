/**
 * Partner access windows are calendar end-dates stored as end-of-day UTC
 * (e.g. 2027-10-13T23:59:59.000Z). Format in UTC so local timezones do not
 * roll the label into the next calendar day.
 */
export function endOfUtcDay(dateYmd: string): string {
  const ymd = dateYmd.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    throw new Error("Expected YYYY-MM-DD date");
  }
  return `${ymd}T23:59:59.000Z`;
}

export function formatPartnerAccessDate(
  iso: string | null | undefined,
): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return iso.slice(0, 10);
  }
}
