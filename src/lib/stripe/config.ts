import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export type StripeKeySource = "STRIPE_SECRET_KEY" | "STRIPE_SECRET_KEY_LIVE" | "none";

function trimEnv(value: string | undefined): string {
  return value?.trim() ?? "";
}

function keyMode(key: string): "live" | "test" | "unknown" {
  if (key.startsWith("sk_live_")) return "live";
  if (key.startsWith("sk_test_")) return "test";
  return "unknown";
}

/**
 * Pick the Stripe secret key.
 * STRIPE_SECRET_KEY is primary; STRIPE_SECRET_KEY_LIVE is legacy fallback only.
 * (Previously _LIVE took precedence and could silently override a correct sk_live STRIPE_SECRET_KEY.)
 */
export function resolveStripeSecretKey(): { key: string; source: StripeKeySource } {
  const main = trimEnv(process.env.STRIPE_SECRET_KEY);
  const live = trimEnv(process.env.STRIPE_SECRET_KEY_LIVE);

  if (main) return { key: main, source: "STRIPE_SECRET_KEY" };
  if (live) return { key: live, source: "STRIPE_SECRET_KEY_LIVE" };
  return { key: "", source: "none" };
}

export function getStripeKeyMeta() {
  const { key, source } = resolveStripeSecretKey();
  return {
    source,
    mode: keyMode(key),
    prefix: key ? `${key.slice(0, 12)}…` : null,
  };
}

export function isStripeConfigured(): boolean {
  return Boolean(resolveStripeSecretKey().key);
}

/** Lazy Stripe client - safe to import during Next.js build without env vars. */
export function getStripe(): Stripe {
  if (stripeClient) return stripeClient;

  const { key } = resolveStripeSecretKey();
  if (!key) {
    throw new Error("[Stripe] STRIPE_SECRET_KEY not configured");
  }

  stripeClient = new Stripe(key, {
    apiVersion: "2026-02-25.clover",
    appInfo: {
      name: "ESAT MVP",
      version: "0.1.0",
    },
  });

  return stripeClient;
}
