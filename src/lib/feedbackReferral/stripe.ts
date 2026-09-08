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
      const promo = await stripe.promotionCodes.create({
        coupon: couponId,
        code,
        max_redemptions: 1,
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
  const couponId =
    typeof promo.coupon === "string" ? promo.coupon : promo.coupon.id;
  return {
    promotionCodeId: promo.id,
    couponId,
    referrerUserId: promo.metadata?.referrer_user_id ?? null,
  };
}
