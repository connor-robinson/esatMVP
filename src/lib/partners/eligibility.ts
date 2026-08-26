/**
 * Short brand label for partner claim headings, e.g. "Arkwright".
 */
export function partnerShortAccessLabel(opts: {
  displayName: string;
  slug?: string | null;
}): string {
  const slug = (opts.slug || "").trim();
  if (slug) {
    const head = slug.split(/[-_]/)[0] || "";
    if (head.length >= 3) {
      return head.charAt(0).toUpperCase() + head.slice(1).toLowerCase();
    }
  }
  const first = opts.displayName.trim().split(/\s+/)[0];
  return first || opts.displayName;
}

/**
 * Pure eligibility gate used by tests and documented as the RPC order of checks.
 * SQL enforces the same rules before consuming invites / cohort caps.
 */
export type PartnerRedeemEligibility =
  | { ok: true }
  | {
      ok: false;
      error: "already_paid" | "already_partner_entitled" | "already_entitled";
      endsAt?: string;
    };

export function evaluatePartnerRedeemEligibility(opts: {
  hasActivePaidAccess: boolean;
  existingPartnerEntitlement: null | {
    revokedAt: string | null;
    startsAt: string;
    endsAt: string;
  };
  nowMs?: number;
}): PartnerRedeemEligibility {
  if (opts.hasActivePaidAccess) {
    return { ok: false, error: "already_paid" };
  }
  const existing = opts.existingPartnerEntitlement;
  if (!existing) return { ok: true };
  const now = opts.nowMs ?? Date.now();
  const active =
    !existing.revokedAt &&
    new Date(existing.startsAt).getTime() <= now &&
    new Date(existing.endsAt).getTime() > now;
  if (active) {
    return {
      ok: false,
      error: "already_partner_entitled",
      endsAt: existing.endsAt,
    };
  }
  return { ok: false, error: "already_entitled" };
}

/** Paid sources that block partner redeem. Tester is excluded. */
export function isPaidAccessSource(
  source: string | null | undefined,
): boolean {
  return source === "subscription" || source === "one_time";
}
