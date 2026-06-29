import Stripe from "stripe";

let stripeClient: Stripe | null = null;

function readSecretKey(): string {
  return process.env.STRIPE_SECRET_KEY_LIVE ?? process.env.STRIPE_SECRET_KEY ?? "";
}

export function isStripeConfigured(): boolean {
  return Boolean(readSecretKey());
}

/** Lazy Stripe client — safe to import during Next.js build without env vars. */
export function getStripe(): Stripe {
  if (stripeClient) return stripeClient;

  const secretKey = readSecretKey();
  if (!secretKey) {
    throw new Error("[Stripe] STRIPE_SECRET_KEY not configured");
  }

  stripeClient = new Stripe(secretKey, {
    apiVersion: "2026-02-25.clover",
    appInfo: {
      name: "ESAT MVP",
      version: "0.1.0",
    },
  });

  return stripeClient;
}
