/**
 * Pricing A/B test variants and configuration.
 * Monthly plan (£14.99, 4-day trial) is always shown as control.
 * Express Deal (£9.49, instant buy) replaces weekly and is highlighted.
 */

import { MONTHLY_PRICE_GBP } from "@/lib/stripe/best-value";

export type PricingVariant =
  | "control"
  | "express_deal";

export interface VariantConfig {
  id: PricingVariant;
  /** Whether to show the Express Deal plan */
  showExpressDeal: boolean;
  displayName: string;
  description: string;
}

export const VARIANT_CONFIGS: Record<PricingVariant, VariantConfig> = {
  'control': {
    id: 'control',
    showExpressDeal: false,
    displayName: "Control (Standard pricing)",
    description: "Monthly at £14.99 with 4-day trial, Weekly at £8",
  },
  'express_deal': {
    id: 'express_deal',
    showExpressDeal: true,
    displayName: 'Express Deal',
    description: 'Monthly at £14.99 with 4-day trial, Express Deal at £9.49 instant buy'
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
 * Randomly assign a variant (50/50 split)
 */
export function assignRandomVariant(): PricingVariant {
  return Math.random() < 0.5 ? 'control' : 'express_deal';
}

/**
 * Get variant config for display
 */
export function getVariantConfig(variant: PricingVariant): VariantConfig {
  return VARIANT_CONFIGS[variant];
}

/** Express Deal constants */
export const EXPRESS_DEAL_PRICE_GBP = 9.49;
export const EXPRESS_DEAL_ORIGINAL_PRICE_GBP = MONTHLY_PRICE_GBP;
