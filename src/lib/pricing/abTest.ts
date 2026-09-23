/**
 * Pricing A/B test variants and configuration.
 * Original monthly price matches the live plan in stripe/best-value.
 */

import { MONTHLY_PRICE_GBP } from "@/lib/stripe/best-value";

export type PricingVariant =
  | "3day_original"
  | "3day_discounted"
  | "nodeal_original"
  | "nodeal_discounted";

export interface VariantConfig {
  id: PricingVariant;
  trialDays: number;
  monthlyPriceGbp: number;
  displayName: string;
  description: string;
}

export const VARIANT_CONFIGS: Record<PricingVariant, VariantConfig> = {
  '3day_original': {
    id: '3day_original',
    trialDays: 3,
    monthlyPriceGbp: MONTHLY_PRICE_GBP,
    displayName: "3-day free trial",
    description: "3-day free trial, then the standard monthly price",
  },
  '3day_discounted': {
    id: '3day_discounted',
    trialDays: 3,
    monthlyPriceGbp: 9.49,
    displayName: '3-day free trial (Special offer)',
    description: '3-day free trial, then £9.49/month'
  },
  'nodeal_original': {
    id: 'nodeal_original',
    trialDays: 0,
    monthlyPriceGbp: MONTHLY_PRICE_GBP,
    displayName: "Buy now",
    description: "Pay today at the standard monthly price",
  },
  'nodeal_discounted': {
    id: 'nodeal_discounted',
    trialDays: 0,
    monthlyPriceGbp: 9.49,
    displayName: 'Buy now (Special offer)',
    description: 'Get immediate access for £9.49/month'
  }
};

export const PRICING_VARIANT_COOKIE = 'pricing_variant';
export const PRICING_ANON_ID_COOKIE = 'pricing_anon_id';

/**
 * Generate a random anon_id for cookie tracking
 */
export function generateAnonId(): string {
  return `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Parse a variant from a cookie or string
 */
export function parseVariant(value: string | null | undefined): PricingVariant | null {
  if (!value) return null;
  if (value in VARIANT_CONFIGS) {
    return value as PricingVariant;
  }
  return null;
}

/**
 * Randomly assign a variant (equal distribution)
 */
export function assignRandomVariant(): PricingVariant {
  const variants: PricingVariant[] = ['3day_original', '3day_discounted', 'nodeal_original', 'nodeal_discounted'];
  const randomIndex = Math.floor(Math.random() * variants.length);
  return variants[randomIndex]!;
}

/**
 * Get variant config for display
 */
export function getVariantConfig(variant: PricingVariant): VariantConfig {
  return VARIANT_CONFIGS[variant];
}

/**
 * Check if variant offers a trial
 */
export function hasFreeTrial(variant: PricingVariant): boolean {
  return VARIANT_CONFIGS[variant].trialDays > 0;
}

/**
 * Check if variant is discounted
 */
export function isDiscounted(variant: PricingVariant): boolean {
  return variant.includes('discounted');
}

/**
 * Get the display price for a variant
 */
export function getVariantPriceDisplay(variant: PricingVariant): string {
  const config = VARIANT_CONFIGS[variant];
  return `£${config.monthlyPriceGbp.toFixed(2)}`;
}

/**
 * Get trial copy for a variant
 */
export function getTrialCopy(variant: PricingVariant, weeksUntilExam: number): string {
  const config = VARIANT_CONFIGS[variant];
  
  if (config.trialDays > 0) {
    return `${config.trialDays}-day free trial, then ${getVariantPriceDisplay(variant)}/month`;
  }
  
  if (weeksUntilExam > 0) {
    return `${weeksUntilExam} weeks until ESAT • ${getVariantPriceDisplay(variant)}/month`;
  }
  
  return `${getVariantPriceDisplay(variant)}/month • Cancel anytime`;
}
