import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/config";
import { generateReferralCode, isReferralCodeFormat } from "./codes";

const COUPON_METADATA_KIND = "feedback_referral_50";

export async function getOrCreateFeedbackReferralCoupon(
  stripe: Stripe = getStripe(),
): Promise<string> {
  const configured = process.env.STRIPE_FEEDBACK_REFERRAL_COUPON?.trim();
  if (configured) return configured;

  const existing = await stripe.coupons.list({ limit: 100 });
  const match = existing.data.find(
    (coupon) =>
      coupon.valid &&
      coupon.percent_off === 50 &&
      coupon.duration === "once" &&
      coupon.metadata?.kind === COUPON_METADATA_KIND,
  );
  if (match) return match.id;

  const created = await stripe.coupons.create({
    percent_off: 50,
    duration: "once",
    name: "Friend referral 50% off",
    metadata: { kind: COUPON_METADATA_KIND },
  });
  return created.id;
}

export async function createOneUseReferralPromotionCode(opts: {
  referrerUserId: string;
  stripe?: Stripe;
}): Promise<{ code: string; couponId: string; promotionCodeId: string }> {
  const stripe = opts.stripe ?? getStripe();
  const couponId = await getOrCreateFeedbackReferralCoupon(stripe);

  for (let attempt = 0; attempt < 6; attempt++) {
    const code = generateReferralCode();
    try {
      // Create inactive so the code cannot be typed into Stripe Checkout.
      // Checkout applies the shared coupon only after our server-side checks.
      const promo = await stripe.promotionCodes.create({
        promotion: { type: "coupon", coupon: couponId },
        code,
        max_redemptions: 1,
        active: false,
        metadata: {
          kind: COUPON_METADATA_KIND,
          referrer_user_id: opts.referrerUserId,
        },
      });
      return { code, couponId, promotionCodeId: promo.id };
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (!message.toLowerCase().includes("already exists") && attempt === 5) {
        throw err;
      }
    }
  }

  throw new Error("Could not allocate a unique referral code");
}

/** Deactivate public Stripe promotion codes so they cannot be typed in Checkout. */
export async function deactivateReferralPromotionCodes(
  promotionCodeIds: string[],
  stripe: Stripe = getStripe(),
): Promise<{ deactivated: string[]; failed: string[] }> {
  const deactivated: string[] = [];
  const failed: string[] = [];
  for (const id of promotionCodeIds) {
    if (!id) continue;
    try {
      await stripe.promotionCodes.update(id, { active: false });
      deactivated.push(id);
    } catch (err) {
      console.error("[feedback-referral] deactivate promo failed", id, err);
      failed.push(id);
    }
  }
  return { deactivated, failed };
}

let referralPromoHardenInFlight: Promise<void> | null = null;

/**
 * Deactivate every stored CAMP50 promotion code once per process.
 * Checkout applies the shared coupon after our validation instead.
 */
export async function hardenPublicReferralPromotionCodes(): Promise<void> {
  if (referralPromoHardenInFlight) return referralPromoHardenInFlight;

  referralPromoHardenInFlight = (async () => {
    const { createFeedbackReferralServiceClient } = await import(
      "./service"
    );
    const service = createFeedbackReferralServiceClient();
    const { data, error } = await service
      .from("feedback_referral_codes")
      .select("stripe_promotion_code_id");
    if (error) throw error;
    const ids = (data ?? [])
      .map((row) => row.stripe_promotion_code_id as string)
      .filter(Boolean);
    if (!ids.length) return;
    const result = await deactivateReferralPromotionCodes(ids);
    if (result.deactivated.length) {
      console.info(
        "[feedback-referral] deactivated public promotion codes",
        result.deactivated.length,
      );
    }
    if (result.failed.length) {
      console.error(
        "[feedback-referral] failed to deactivate promotion codes",
        result.failed,
      );
      // Allow retry on a later request.
      referralPromoHardenInFlight = null;
    }
  })().catch((err) => {
    referralPromoHardenInFlight = null;
    throw err;
  });

  return referralPromoHardenInFlight;
}

export async function lookupActiveReferralPromotion(code: string): Promise<{
  promotionCodeId: string;
  couponId: string;
  referrerUserId: string | null;
} | null> {
  if (!isReferralCodeFormat(code)) return null;
  const stripe = getStripe();
  const found = await stripe.promotionCodes.list({
    code,
    active: true,
    limit: 1,
  });
  const promo = found.data[0];
  if (!promo) return null;
  if (promo.max_redemptions && promo.times_redeemed >= promo.max_redemptions) {
    return null;
  }
  const coupon = promo.promotion.coupon;
  if (!coupon) return null;
  return {
    promotionCodeId: promo.id,
    couponId: typeof coupon === "string" ? coupon : coupon.id,
    referrerUserId: promo.metadata?.referrer_user_id ?? null,
  };
}

/** Read a CAMP50 code from Checkout Session discounts or legacy metadata. */
export async function resolveReferralCodeFromCheckoutSession(
  session: Stripe.Checkout.Session,
  stripe: Stripe = getStripe(),
): Promise<string | null> {
  const fromMeta = session.metadata?.referralCode?.trim();
  if (fromMeta && isReferralCodeFormat(fromMeta)) {
    return fromMeta.toUpperCase();
  }

  const full = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ["discounts.promotion_code"],
  });

  for (const entry of full.discounts ?? []) {
    const promo = entry.promotion_code;
    if (!promo) continue;
    if (typeof promo === "string") {
      try {
        const retrieved = await stripe.promotionCodes.retrieve(promo);
        const code = retrieved.code?.trim().toUpperCase() ?? "";
        if (isReferralCodeFormat(code)) return code;
      } catch {
        continue;
      }
      continue;
    }
    const code = promo.code?.trim().toUpperCase() ?? "";
    if (isReferralCodeFormat(code)) return code;
  }

  return null;
}

/**
 * If someone somehow applied their own CAMP50 code in Checkout, bill back the
 * discounted amount and clear any remaining subscription discount.
 * Primary prevention is disabling Stripe's promo field; this is the safety net.
 */
export async function clawBackSelfReferralDiscount(
  session: Stripe.Checkout.Session,
  stripe: Stripe = getStripe(),
): Promise<void> {
  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id ?? null;
  const discountAmount = session.total_details?.amount_discount ?? 0;
  const currency = session.currency ?? "gbp";

  if (customerId && discountAmount > 0) {
    try {
      await stripe.invoiceItems.create({
        customer: customerId,
        amount: discountAmount,
        currency,
        description:
          "Adjustment: friend codes cannot be used on your own account",
        metadata: {
          kind: "referral_self_use_clawback",
          checkout_session_id: session.id,
        },
      });
      const invoice = await stripe.invoices.create({
        customer: customerId,
        auto_advance: true,
        collection_method: "charge_automatically",
        metadata: {
          kind: "referral_self_use_clawback",
          checkout_session_id: session.id,
        },
      });
      const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
      if (finalized.status === "open") {
        await stripe.invoices.pay(finalized.id).catch((err) => {
          console.error(
            "[feedback-referral] self-use clawback invoice pay failed",
            err,
          );
        });
      }
    } catch (err) {
      console.error(
        "[feedback-referral] self-use clawback invoice failed",
        err,
      );
    }
  }

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null;
  if (subscriptionId) {
    try {
      await stripe.subscriptions.deleteDiscount(subscriptionId);
    } catch (err) {
      // Once coupons may already be consumed; ignore missing discount errors.
      console.warn(
        "[feedback-referral] self-use deleteDiscount skipped",
        err,
      );
    }
  }
}
