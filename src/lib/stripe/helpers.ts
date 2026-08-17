import Stripe from "stripe";

/**
 * Convert Stripe timestamp to ISO string for Supabase
 */
export function toDateTime(timestamp: number): Date {
  return new Date(timestamp * 1000);
}

/** Safe client-facing message from Stripe / server errors during checkout. */
export function stripeErrorMessage(err: unknown): string {
  if (err instanceof Stripe.errors.StripeError) {
    return err.message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "Failed to create checkout session";
}
