/**
 * Client-side A/B test variant management
 * Handles cookie storage and variant assignment
 */

'use client';

import { 
  PricingVariant, 
  PRICING_VARIANT_COOKIE, 
  PRICING_ANON_ID_COOKIE,
  generateAnonId,
  parseVariant,
  assignRandomVariant
} from './abTest';

const COOKIE_EXPIRY_DAYS = 90; // 90 days to track through signup

/**
 * Set a cookie
 */
function setCookie(name: string, value: string, days: number): void {
  const expires = new Date();
  expires.setDate(expires.getDate() + days);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

/**
 * Get a cookie value
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

/**
 * Get or create anon_id for tracking
 */
export function getOrCreateAnonId(): string {
  let anonId = getCookie(PRICING_ANON_ID_COOKIE);
  
  if (!anonId) {
    anonId = generateAnonId();
    setCookie(PRICING_ANON_ID_COOKIE, anonId, COOKIE_EXPIRY_DAYS);
  }
  
  return anonId;
}

/**
 * Get current variant from cookie
 */
export function getVariantFromCookie(): PricingVariant | null {
  const variantCookie = getCookie(PRICING_VARIANT_COOKIE);
  return parseVariant(variantCookie);
}

/**
 * Set variant in cookie
 */
export function setVariantCookie(variant: PricingVariant): void {
  setCookie(PRICING_VARIANT_COOKIE, variant, COOKIE_EXPIRY_DAYS);
}

/**
 * Get or assign variant for current user
 * Returns the variant and whether it was newly assigned
 */
export function getOrAssignVariant(): { variant: PricingVariant; isNew: boolean } {
  const existingVariant = getVariantFromCookie();
  
  if (existingVariant) {
    return { variant: existingVariant, isNew: false };
  }
  
  const newVariant = assignRandomVariant();
  setVariantCookie(newVariant);
  
  return { variant: newVariant, isNew: true };
}

/**
 * Clear variant cookies (for testing)
 */
export function clearVariantCookies(): void {
  document.cookie = `${PRICING_VARIANT_COOKIE}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`;
  document.cookie = `${PRICING_ANON_ID_COOKIE}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`;
}

/**
 * Track pricing page view
 */
export async function trackPricingView(variant: PricingVariant, userId?: string): Promise<void> {
  const anonId = getOrCreateAnonId();
  
  const params = new URLSearchParams(window.location.search);
  const payload = {
    user_id: userId || null,
    anon_id: anonId,
    variant,
    referrer: document.referrer || null,
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    utm_content: params.get('utm_content'),
    utm_term: params.get('utm_term'),
    gclid: params.get('gclid'),
    landing_page: window.location.pathname,
  };
  
  try {
    await fetch('/api/pricing/track-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('[trackPricingView]', err);
  }
}

/**
 * Track checkout attempt
 */
export async function trackCheckoutAttempt(
  variant: PricingVariant,
  planType: string,
  userId?: string
): Promise<void> {
  const anonId = getOrCreateAnonId();
  
  const params = new URLSearchParams(window.location.search);
  const payload = {
    user_id: userId || null,
    anon_id: anonId,
    variant,
    plan_type: planType,
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    referrer: document.referrer || null,
  };
  
  try {
    await fetch('/api/pricing/track-attempt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('[trackCheckoutAttempt]', err);
  }
}

/**
 * Get attribution data for checkout
 */
export function getAttributionData() {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    utm_content: params.get('utm_content'),
    utm_term: params.get('utm_term'),
    gclid: params.get('gclid'),
    referrer: document.referrer || null,
    landing_page: window.location.pathname,
  };
}
