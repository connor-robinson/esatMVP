import type { SupabaseClient } from "@supabase/supabase-js";
import { trackEvent } from "@/lib/ga/trackEvent";
import type { RedeemSuccess } from "./types";

/** First-party + GA4 partner funnel events. Never include tokens or invite IDs. */

export async function logPartnerEvent(
  service: SupabaseClient,
  opts: {
    partnerId: string;
    userId?: string | null;
    entitlementId?: string | null;
    event: string;
    properties?: Record<string, string | number | boolean | null>;
  },
): Promise<void> {
  const properties = sanitizePartnerProps(opts.properties);
  try {
    await service.from("partner_analytics_events").insert({
      partner_id: opts.partnerId,
      user_id: opts.userId ?? null,
      entitlement_id: opts.entitlementId ?? null,
      event: opts.event,
      properties,
    });
  } catch {
    /* non-fatal */
  }
}

export function sanitizePartnerProps(
  props?: Record<string, string | number | boolean | null | undefined>,
): Record<string, string | number | boolean> {
  if (!props) return {};
  const blocked =
    /^(token|invite|invite_?id|invite_?code|claim_?url|email|name|raw)/i;
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(props)) {
    if (blocked.test(key)) continue;
    if (value === null || value === undefined) continue;
    if (typeof value === "string" && value.length > 100) {
      out[key] = value.slice(0, 100);
    } else {
      out[key] = value;
    }
  }
  return out;
}

export function trackPartnerInviteRedeemedGa(result: RedeemSuccess): void {
  trackEvent("partner_invite_redeemed", {
    partner: result.partnerSlug,
    batch: result.batchLabel,
    access_end: result.endsAt.slice(0, 10),
  });
}

export function trackPartnerUserActivatedGa(opts: {
  partnerSlug: string;
  batchLabel?: string | null;
}): void {
  trackEvent("partner_user_activated", {
    partner: opts.partnerSlug,
    batch: opts.batchLabel ?? undefined,
  });
}

export function trackPartnerFeedbackSubmittedGa(opts: {
  partnerSlug: string;
  usefulnessRating: number;
  recommendationRating: number | null;
}): void {
  trackEvent("partner_feedback_submitted", {
    partner: opts.partnerSlug,
    usefulness_rating: opts.usefulnessRating,
    recommendation_rating: opts.recommendationRating,
  });
}

/**
 * Activation = first calibration completion OR >= 10 practice questions.
 * Fires once per entitlement (DB unique index + activated_at).
 */
export async function maybeMarkPartnerActivation(
  service: SupabaseClient,
  userId: string,
): Promise<void> {
  const nowIso = new Date().toISOString();
  const { data: entitlements } = await service
    .from("partner_entitlements")
    .select(
      `
      id,
      partner_id,
      activated_at,
      partners!inner ( slug, status ),
      partner_invites ( label )
    `,
    )
    .eq("user_id", userId)
    .is("revoked_at", null)
    .lte("starts_at", nowIso)
    .gt("ends_at", nowIso)
    .is("activated_at", null);

  if (!entitlements?.length) return;

  const [{ count: attemptCount }, calibLegacy, calibAttempt] = await Promise.all([
    service
      .from("question_bank_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    service
      .from("calibration_results")
      .select("id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle(),
    service
      .from("calibration_attempts")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "completed")
      .limit(1)
      .maybeSingle(),
  ]);

  const activated =
    Boolean(calibLegacy.data) ||
    Boolean(calibAttempt.data) ||
    (attemptCount ?? 0) >= 10;
  if (!activated) return;

  for (const row of entitlements) {
    const { data: updated } = await service
      .from("partner_entitlements")
      .update({ activated_at: nowIso })
      .eq("id", row.id)
      .is("activated_at", null)
      .select("id")
      .maybeSingle();

    if (!updated) continue;

    const partner = row.partners as unknown as { slug: string };
    const invite = row.partner_invites as unknown as { label: string | null } | null;

    await logPartnerEvent(service, {
      partnerId: row.partner_id as string,
      userId,
      entitlementId: row.id as string,
      event: "partner_user_activated",
      properties: {
        partner: partner.slug,
        batch: invite?.label ?? null,
      },
    });
  }
}
