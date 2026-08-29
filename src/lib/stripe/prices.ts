/**
 * Exam Season Pass price selection based on purchase date
 * Now - 1 April: £74
 * 1 April - 15 May: £84
 * 16 May - 10 June: £94
 */

import type Stripe from "stripe";
import { getMonthlyPricePence } from "@/lib/stripe/best-value";

const SEASON_PASS_CUTOFFS = [
  { until: new Date("2026-04-01"), priceIdEnv: "STRIPE_PRICE_SEASON_74" },
  { until: new Date("2026-05-16"), priceIdEnv: "STRIPE_PRICE_SEASON_84" },
  { until: new Date("2026-06-10"), priceIdEnv: "STRIPE_PRICE_SEASON_94" },
] as const;

function readPriceEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

export function getSeasonPassPriceId(): string | null {
  const now = new Date();
  for (const { until, priceIdEnv } of SEASON_PASS_CUTOFFS) {
    if (now < until) {
      return readPriceEnv(priceIdEnv);
    }
  }
  return null;
}

export function getPriceIdForPlan(planType: "weekly" | "monthly" | "season_pass"): string | null {
  switch (planType) {
    case "weekly":
      return readPriceEnv("STRIPE_PRICE_WEEKLY");
    case "monthly":
      return readPriceEnv("STRIPE_PRICE_MONTHLY_SALE") ?? readPriceEnv("STRIPE_PRICE_MONTHLY");
    case "season_pass":
      return getSeasonPassPriceId();
    default:
      return null;
  }
}

/**
 * Resolves the Stripe price ID for monthly checkout at the current sale price.
 * Reuses an existing active price when possible; otherwise creates one on the monthly product.
 */
export async function resolveMonthlyStripePrice(
  stripe: Stripe,
): Promise<string | null> {
  const configuredSaleId = readPriceEnv("STRIPE_PRICE_MONTHLY_SALE");
  if (configuredSaleId) {
    return configuredSaleId;
  }

  const listPriceId = readPriceEnv("STRIPE_PRICE_MONTHLY");
  if (!listPriceId) return null;

  const salePence = getMonthlyPricePence();
  const listPrice = await stripe.prices.retrieve(listPriceId);
  if (listPrice.unit_amount === salePence) {
    return listPriceId;
  }

  const productId =
    typeof listPrice.product === "string"
      ? listPrice.product
      : listPrice.product.id;

  const existing = await stripe.prices.list({
    product: productId,
    active: true,
    limit: 100,
  });

  const match = existing.data.find(
    (price) =>
      price.unit_amount === salePence &&
      price.recurring?.interval === "month" &&
      price.currency === "gbp",
  );
  if (match) return match.id;

  const created = await stripe.prices.create({
    product: productId,
    currency: "gbp",
    unit_amount: salePence,
    recurring: { interval: "month" },
    metadata: { planType: "monthly", sale: "true" },
  });

  return created.id;
}
