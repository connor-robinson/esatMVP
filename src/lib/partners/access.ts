/**
 * Authoritative full-access resolution.
 * Paid Stripe access and partner entitlements are OR'd; neither overwrites the other.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { syncTesterProgramme } from "@/lib/tester/access";
import { createPartnerServiceClient } from "./service";
import type { AccessSource, UserAccess } from "./types";

function inferTierFromPriceId(
  priceId: string | null,
): "weekly" | "monthly" | "season_pass" | "free" {
  if (!priceId) return "free";
  const weekly = process.env.STRIPE_PRICE_WEEKLY;
  const monthly = process.env.STRIPE_PRICE_MONTHLY;
  const monthlySale = process.env.STRIPE_PRICE_MONTHLY_SALE;
  if (priceId === weekly) return "weekly";
  if (priceId === monthly || priceId === monthlySale) return "monthly";
  return "free";
}

export interface ActivePartnerEntitlement {
  entitlementId: string;
  partnerId: string;
  partnerSlug: string;
  partnerDisplayName: string;
  accessLevel: string;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  activatedAt: string | null;
  batchLabel: string | null;
}

export async function getActivePartnerEntitlement(
  service: SupabaseClient,
  userId: string,
): Promise<ActivePartnerEntitlement | null> {
  const nowIso = new Date().toISOString();
  const { data } = await service
    .from("partner_entitlements")
    .select(
      `
      id,
      partner_id,
      access_level,
      starts_at,
      ends_at,
      created_at,
      activated_at,
      partners!inner (
        id,
        slug,
        display_name,
        status,
        access_starts_at,
        access_ends_at
      ),
      partner_invites (
        label
      )
    `,
    )
    .eq("user_id", userId)
    .is("revoked_at", null)
    .lte("starts_at", nowIso)
    .gt("ends_at", nowIso)
    .eq("partners.status", "active")
    .lte("partners.access_starts_at", nowIso)
    .gt("partners.access_ends_at", nowIso)
    .order("ends_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  const partner = data.partners as unknown as {
    id: string;
    slug: string;
    display_name: string;
  };
  const invite = data.partner_invites as unknown as { label: string | null } | null;

  return {
    entitlementId: data.id as string,
    partnerId: partner.id,
    partnerSlug: partner.slug,
    partnerDisplayName: partner.display_name,
    accessLevel: data.access_level as string,
    startsAt: data.starts_at as string,
    endsAt: data.ends_at as string,
    createdAt: data.created_at as string,
    activatedAt: (data.activated_at as string | null) ?? null,
    batchLabel: invite?.label ?? null,
  };
}

export async function getUserAccess(
  userId: string,
  service: SupabaseClient = createPartnerServiceClient(),
): Promise<UserAccess> {
  const empty: UserAccess = {
    hasFullAccess: false,
    source: "none",
    tier: "free",
    partnerId: null,
    partnerSlug: null,
    partnerDisplayName: null,
    partnerBatchLabel: null,
    partnerActivated: false,
    partnerEndsAt: null,
    expiresAt: null,
  };

  try {
    // 1) Stripe subscription (unchanged behaviour)
    const { data: subs } = await service
      .from("subscriptions")
      .select(
        "id, status, current_period_end, price_id, metadata, cancel_at_period_end",
      )
      .eq("user_id", userId)
      .in("status", ["active", "trialing"])
      .order("current_period_end", { ascending: false })
      .limit(1);

    const activeSub = subs?.[0];
    if (activeSub) {
      const periodEnd = new Date(activeSub.current_period_end);
      if (periodEnd > new Date()) {
        const meta = activeSub.metadata as Record<string, unknown> | null;
        const metaPlan = meta?.planType;
        const pendingPlan =
          meta?.pending_plan === "weekly" ||
          meta?.pending_plan === "monthly" ||
          meta?.pending_plan === "season_pass"
            ? meta.pending_plan
            : null;
        const tier =
          metaPlan === "weekly" ||
          metaPlan === "monthly" ||
          metaPlan === "season_pass"
            ? metaPlan
            : inferTierFromPriceId(activeSub.price_id);

        // Still load partner attribution if present (does not change Stripe)
        const partner = await getActivePartnerEntitlement(service, userId).catch(
          () => null,
        );

        return {
          hasFullAccess: true,
          source: "subscription",
          tier,
          partnerId: partner?.partnerId ?? null,
          partnerSlug: partner?.partnerSlug ?? null,
          partnerDisplayName: partner?.partnerDisplayName ?? null,
          partnerBatchLabel: partner?.batchLabel ?? null,
          partnerActivated: Boolean(partner?.activatedAt),
          partnerEndsAt: partner?.endsAt ?? null,
          expiresAt: activeSub.current_period_end,
          subscriptionStatus: activeSub.status,
          currentPeriodEnd: activeSub.current_period_end,
          cancelAtPeriodEnd: activeSub.cancel_at_period_end === true,
          pendingPlan,
        };
      }
    }

    // 2) One-time purchase (Exam Season Pass)
    const today = new Date().toISOString().slice(0, 10);
    const { data: purchases } = await service
      .from("one_time_purchases")
      .select("access_until")
      .eq("user_id", userId)
      .gte("access_until", today)
      .order("created_at", { ascending: false })
      .limit(1);

    const validPurchase = purchases?.[0];
    if (validPurchase) {
      const accessUntil = new Date(validPurchase.access_until + "T23:59:59");
      if (accessUntil >= new Date()) {
        const partner = await getActivePartnerEntitlement(service, userId).catch(
          () => null,
        );
        return {
          hasFullAccess: true,
          source: "one_time",
          tier: "season_pass",
          partnerId: partner?.partnerId ?? null,
          partnerSlug: partner?.partnerSlug ?? null,
          partnerDisplayName: partner?.partnerDisplayName ?? null,
          partnerBatchLabel: partner?.batchLabel ?? null,
          partnerActivated: Boolean(partner?.activatedAt),
          partnerEndsAt: partner?.endsAt ?? null,
          expiresAt: validPurchase.access_until,
        };
      }
    }

    // 3) Partner entitlement
    const partner = await getActivePartnerEntitlement(service, userId);
    if (partner && partner.accessLevel === "full") {
      return {
        hasFullAccess: true,
        source: "partner",
        tier: "partner",
        partnerId: partner.partnerId,
        partnerSlug: partner.partnerSlug,
        partnerDisplayName: partner.partnerDisplayName,
        partnerBatchLabel: partner.batchLabel,
        partnerActivated: Boolean(partner.activatedAt),
        partnerEndsAt: partner.endsAt,
        expiresAt: partner.endsAt,
      };
    }

    // 4) Founding Tester Programme
    try {
      const { state } = await syncTesterProgramme(service, userId);
      const tester = {
        isMember: state.isMember,
        status: state.status,
        premiumActive: state.premiumActive,
        accessExpiresAt: state.accessExpiresAt,
      };
      if (state.premiumActive) {
        return {
          hasFullAccess: true,
          source: "tester",
          tier: "tester",
          partnerId: null,
          partnerSlug: null,
          partnerDisplayName: null,
          partnerBatchLabel: null,
          partnerActivated: false,
          partnerEndsAt: null,
          expiresAt: state.accessExpiresAt,
          tester,
        };
      }
      return { ...empty, tester };
    } catch {
      return empty;
    }
  } catch {
    return empty;
  }
}

/** Backwards-compatible boolean used by API routes. */
export async function userHasFullAccess(userId: string): Promise<boolean> {
  const access = await getUserAccess(userId);
  return access.hasFullAccess;
}

/**
 * Active paid ESAT Camp access that blocks partner-code redemption.
 * Includes Stripe subscription (active/trialing) and season-pass one-time
 * purchases. Excludes founding-tester and partner entitlements.
 */
export async function userHasActivePaidAccess(
  userId: string,
  service: SupabaseClient = createPartnerServiceClient(),
): Promise<boolean> {
  try {
    const { data: subs } = await service
      .from("subscriptions")
      .select("current_period_end")
      .eq("user_id", userId)
      .in("status", ["active", "trialing"])
      .order("current_period_end", { ascending: false })
      .limit(1);
    const sub = subs?.[0];
    if (sub && new Date(sub.current_period_end) > new Date()) {
      return true;
    }

    const today = new Date().toISOString().slice(0, 10);
    const { data: purchases } = await service
      .from("one_time_purchases")
      .select("access_until")
      .eq("user_id", userId)
      .gte("access_until", today)
      .order("created_at", { ascending: false })
      .limit(1);
    const purchase = purchases?.[0];
    if (purchase) {
      const accessUntil = new Date(purchase.access_until + "T23:59:59");
      if (accessUntil >= new Date()) return true;
    }
  } catch {
    return false;
  }
  return false;
}

export function accessSourceLabel(source: AccessSource): string {
  switch (source) {
    case "subscription":
      return "subscription";
    case "one_time":
      return "season pass";
    case "partner":
      return "partner";
    case "tester":
      return "tester";
    default:
      return "none";
  }
}
