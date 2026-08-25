import { describe, expect, it } from "vitest";
import type Stripe from "stripe";
import {
  decideCheckoutSessionCommerce,
  decideInvoicePaidCommerce,
  getInvoiceSubscriptionId,
} from "./checkoutEvents";
import { fallbackGaClientId } from "@/lib/ga/measurementProtocol";
import { isSupabaseUserUuid } from "@/lib/ga/setUserId";

function session(
  overrides: Partial<Stripe.Checkout.Session> &
    Pick<Stripe.Checkout.Session, "id" | "mode" | "payment_status">,
): Stripe.Checkout.Session {
  return {
    object: "checkout.session",
    currency: "gbp",
    amount_total: 0,
    metadata: {},
    ...overrides,
  } as Stripe.Checkout.Session;
}

function invoice(
  overrides: Partial<Stripe.Invoice> & Pick<Stripe.Invoice, "id" | "amount_paid">,
): Stripe.Invoice {
  return {
    object: "invoice",
    currency: "gbp",
    billing_reason: null,
    ...overrides,
  } as Stripe.Invoice;
}

describe("commerce event decisions", () => {
  it("emits trial_started for trialing subscription checkout", () => {
    const decision = decideCheckoutSessionCommerce(
      session({
        id: "cs_trial",
        mode: "subscription",
        payment_status: "no_payment_required",
        metadata: { planType: "monthly" },
      }),
      {
        id: "sub_1",
        status: "trialing",
        trial_start: 1,
      } as Stripe.Subscription,
    );
    expect(decision).toEqual({
      eventName: "trial_started",
      transactionId: "cs_trial",
      params: expect.objectContaining({
        transaction_id: "cs_trial",
        plan_type: "monthly",
      }),
    });
  });

  it("emits purchase for paid season pass checkout", () => {
    const decision = decideCheckoutSessionCommerce(
      session({
        id: "cs_pass",
        mode: "payment",
        payment_status: "paid",
        amount_total: 9900,
        metadata: { planType: "season_pass" },
      }),
    );
    expect(decision?.eventName).toBe("purchase");
    expect(decision?.transactionId).toBe("cs_pass");
  });

  it("does not emit purchase for zero-amount invoices", () => {
    expect(
      decideInvoicePaidCommerce(
        invoice({ id: "in_zero", amount_paid: 0, billing_reason: "subscription_create" }),
      ),
    ).toBeNull();
  });

  it("emits subscription_renewed for subscription_cycle invoices", () => {
    const decision = decideInvoicePaidCommerce(
      invoice({
        id: "in_renew",
        amount_paid: 1500,
        billing_reason: "subscription_cycle",
      }),
    );
    expect(decision?.eventName).toBe("subscription_renewed");
    expect(decision?.transactionId).toBe("in_renew");
  });

  it("emits purchase for first paid invoice after trial", () => {
    const decision = decideInvoicePaidCommerce(
      invoice({
        id: "in_first",
        amount_paid: 1500,
        billing_reason: "subscription_create",
      }),
    );
    expect(decision?.eventName).toBe("purchase");
    expect(decision?.transactionId).toBe("in_first");
  });

  it("reads subscription id from invoice parent (Stripe v20)", () => {
    const inv = invoice({
      id: "in_1",
      amount_paid: 100,
      parent: {
        type: "subscription_details",
        quote_details: null,
        subscription_details: {
          subscription: "sub_abc",
          metadata: null,
        },
      },
    } as Stripe.Invoice);
    expect(getInvoiceSubscriptionId(inv)).toBe("sub_abc");
  });
});

describe("GA identity helpers", () => {
  it("only accepts UUID user ids", () => {
    expect(
      isSupabaseUserUuid("c6495215-91df-4712-adfc-3899059217a2"),
    ).toBe(true);
    expect(isSupabaseUserUuid("user@example.com")).toBe(false);
  });

  it("builds a deterministic fallback client_id without email", () => {
    const id = fallbackGaClientId("c6495215-91df-4712-adfc-3899059217a2");
    expect(id.startsWith("supabase.")).toBe(true);
    expect(id.includes("@")).toBe(false);
  });
});
