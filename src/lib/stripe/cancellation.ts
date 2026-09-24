/**
 * Stripe Customer Portal cancellations on current API versions set `cancel_at`
 * to the end of the period and leave `cancel_at_period_end` false.
 * Treat either signal as a scheduled end so the profile still shows the cancel.
 */

const OPEN_STATUSES = new Set(["active", "trialing", "past_due", "paused"]);

function toMillis(value: string | number | Date | null | undefined): number | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? null : time;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return value < 1e12 ? value * 1000 : value;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function subscriptionCancelsAtPeriodEnd(input: {
  status?: string | null;
  cancelAtPeriodEnd?: boolean | null;
  cancelAt?: string | number | Date | null;
  endedAt?: string | number | Date | null;
  now?: Date;
}): boolean {
  const now = input.now ?? new Date();
  const endedAt = toMillis(input.endedAt);
  if (endedAt != null && endedAt <= now.getTime()) return false;
  if (input.status && !OPEN_STATUSES.has(input.status)) return false;
  if (input.cancelAtPeriodEnd === true) return true;

  const cancelAt = toMillis(input.cancelAt);
  if (cancelAt == null) return false;
  return cancelAt > now.getTime();
}
