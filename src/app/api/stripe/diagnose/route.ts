import { NextRequest, NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/supabase/auth";
import { getStripe, getStripeKeyMeta, isStripeConfigured, resolveStripeSecretKey } from "@/lib/stripe/config";
import { getPriceIdForPlan } from "@/lib/stripe/prices";

export const dynamic = "force-dynamic";

async function verifyPrice(priceId: string | null) {
  if (!priceId) return { configured: false as const, valid: false as const };
  try {
    const price = await getStripe().prices.retrieve(priceId);
    return {
      configured: true as const,
      valid: true as const,
      id: price.id,
      active: price.active,
      currency: price.currency,
      unit_amount: price.unit_amount,
      interval: price.recurring?.interval ?? null,
    };
  } catch (err) {
    return {
      configured: true as const,
      valid: false as const,
      id: priceId,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/** Auth-gated Stripe config check — no secrets exposed. */
export async function GET(request: NextRequest) {
  const { user, error } = await requireRouteUser(request);
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keyMeta = getStripeKeyMeta();
  const { source: activeSource } = resolveStripeSecretKey();
  const legacyLive = process.env.STRIPE_SECRET_KEY_LIVE?.trim() ?? "";
  const mainKey = process.env.STRIPE_SECRET_KEY?.trim() ?? "";

  const weeklyId = getPriceIdForPlan("weekly");
  const monthlyId = getPriceIdForPlan("monthly");

  const [weekly, monthly] = isStripeConfigured()
    ? await Promise.all([verifyPrice(weeklyId), verifyPrice(monthlyId)])
    : [{ configured: Boolean(weeklyId), valid: false as const }, { configured: Boolean(monthlyId), valid: false as const }];

  const warnings: string[] = [];

  if (legacyLive && mainKey && activeSource === "STRIPE_SECRET_KEY") {
    warnings.push(
      "STRIPE_SECRET_KEY_LIVE is set but ignored. STRIPE_SECRET_KEY takes precedence. Remove _LIVE if unused to avoid confusion."
    );
  } else if (legacyLive && !mainKey) {
    warnings.push(
      "Using STRIPE_SECRET_KEY_LIVE because STRIPE_SECRET_KEY is empty. Prefer setting STRIPE_SECRET_KEY only."
    );
  }

  if (keyMeta.mode === "live" && (!weekly.valid || !monthly.valid)) {
    warnings.push(
      "Secret key is live but one or more price IDs are not found in this Stripe account. Copy price IDs from Live mode in the same Stripe account as the secret key."
    );
  }

  if (keyMeta.mode === "test") {
    warnings.push("Stripe secret key is in test mode. Checkout will show TEST MODE.");
  }

  return NextResponse.json({
    vercelEnv: process.env.VERCEL_ENV ?? null,
    stripe: {
      configured: isStripeConfigured(),
      activeKeySource: activeSource,
      activeKeyMode: keyMeta.mode,
      activeKeyPrefix: keyMeta.prefix,
      hasStripeSecretKey: Boolean(mainKey),
      hasStripeSecretKeyLive: Boolean(legacyLive),
      mainKeyMode: mainKey.startsWith("sk_live_") ? "live" : mainKey.startsWith("sk_test_") ? "test" : mainKey ? "unknown" : null,
      legacyLiveKeyMode: legacyLive.startsWith("sk_live_") ? "live" : legacyLive.startsWith("sk_test_") ? "test" : legacyLive ? "unknown" : null,
    },
    prices: { weekly, monthly },
    warnings,
  });
}
