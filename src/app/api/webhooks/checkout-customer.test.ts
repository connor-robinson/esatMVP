import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { NextRequest } from "next/server";

const {
  isStripeConfigured,
  getStripe,
  constructEvent,
  linkStripeCustomerId,
  manageSubscriptionStatusChange,
  cancelDuplicateCheckoutSubscription,
  upsertOneTimePurchase,
  finalizeSeasonPassSubscription,
  handleCheckoutSessionCompletedCommerce,
  handleInvoicePaidCommerce,
  handleSubscriptionDeletedCommerce,
  markReferralCodeRedeemed,
  resolveReferralCodeFromCheckoutSession,
  upsertProductRecord,
  upsertPriceRecord,
  deleteProductRecord,
  deletePriceRecord,
} = vi.hoisted(() => ({
  isStripeConfigured: vi.fn(() => true),
  constructEvent: vi.fn(),
  linkStripeCustomerId: vi.fn(),
  manageSubscriptionStatusChange: vi.fn(),
  cancelDuplicateCheckoutSubscription: vi.fn(async () => false),
  upsertOneTimePurchase: vi.fn(),
  finalizeSeasonPassSubscription: vi.fn(),
  handleCheckoutSessionCompletedCommerce: vi.fn(),
  handleInvoicePaidCommerce: vi.fn(),
  handleSubscriptionDeletedCommerce: vi.fn(),
  markReferralCodeRedeemed: vi.fn(),
  resolveReferralCodeFromCheckoutSession: vi.fn(async () => null),
  upsertProductRecord: vi.fn(),
  upsertPriceRecord: vi.fn(),
  deleteProductRecord: vi.fn(),
  deletePriceRecord: vi.fn(),
  getStripe: vi.fn(() => ({
    webhooks: { constructEvent },
    subscriptions: {
      retrieve: vi.fn(),
    },
    checkout: {
      sessions: {
        retrieve: vi.fn(),
      },
    },
  })),
}));

vi.mock("@/lib/stripe/config", () => ({
  getStripe,
  isStripeConfigured,
}));
vi.mock("@/lib/stripe/supabase-admin", () => ({
  upsertProductRecord,
  upsertPriceRecord,
  deleteProductRecord,
  deletePriceRecord,
  manageSubscriptionStatusChange,
  upsertOneTimePurchase,
  finalizeSeasonPassSubscription,
  linkStripeCustomerId,
  cancelDuplicateCheckoutSubscription,
}));
vi.mock("@/lib/stripe/checkoutEvents", () => ({
  handleCheckoutSessionCompletedCommerce,
  handleInvoicePaidCommerce,
  handleSubscriptionDeletedCommerce,
}));
vi.mock("@/lib/feedbackReferral/service", () => ({
  markReferralCodeRedeemed,
}));
vi.mock("@/lib/feedbackReferral/stripe", () => ({
  resolveReferralCodeFromCheckoutSession,
}));

import { POST } from "@/app/api/webhooks/route";

const USER_ID = "c6495215-91df-4712-adfc-3899059217a2";

function checkoutCompletedEvent(
  sessionOverrides: Partial<Stripe.Checkout.Session> = {},
): Stripe.Event {
  const session = {
    id: "cs_test_1",
    object: "checkout.session",
    mode: "subscription",
    status: "complete",
    payment_status: "no_payment_required",
    customer: "cus_new_from_checkout",
    subscription: "sub_new",
    client_reference_id: USER_ID,
    metadata: {
      userId: USER_ID,
      user_id: USER_ID,
      planType: "monthly",
    },
    ...sessionOverrides,
  } as Stripe.Checkout.Session;

  return {
    id: "evt_1",
    object: "event",
    type: "checkout.session.completed",
    data: { object: session },
  } as Stripe.Event;
}

describe("checkout.session.completed customer linking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    isStripeConfigured.mockReturnValue(true);
    linkStripeCustomerId.mockResolvedValue({ ok: true, action: "created" });
    cancelDuplicateCheckoutSubscription.mockResolvedValue(false);
    manageSubscriptionStatusChange.mockResolvedValue(undefined);
    handleCheckoutSessionCompletedCommerce.mockResolvedValue(undefined);
  });

  it("stores session.customer against the resolved user", async () => {
    constructEvent.mockReturnValue(checkoutCompletedEvent());

    const req = new NextRequest("http://localhost/api/webhooks", {
      method: "POST",
      body: "{}",
      headers: { "stripe-signature": "sig" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    expect(linkStripeCustomerId).toHaveBeenCalledWith(
      USER_ID,
      "cus_new_from_checkout",
    );
    expect(manageSubscriptionStatusChange).toHaveBeenCalledWith(
      "sub_new",
      "cus_new_from_checkout",
      true,
      { fallbackUserId: USER_ID },
    );
    expect(handleCheckoutSessionCompletedCommerce).toHaveBeenCalled();
  });

  it("is idempotent on webhook replay", async () => {
    constructEvent.mockReturnValue(checkoutCompletedEvent());
    linkStripeCustomerId.mockResolvedValue({ ok: true, action: "unchanged" });

    const req = () =>
      new NextRequest("http://localhost/api/webhooks", {
        method: "POST",
        body: "{}",
        headers: { "stripe-signature": "sig" },
      });

    expect((await POST(req())).status).toBe(200);
    expect((await POST(req())).status).toBe(200);
    expect(linkStripeCustomerId).toHaveBeenCalledTimes(2);
    expect(manageSubscriptionStatusChange).toHaveBeenCalledTimes(2);
  });

  it("continues safely when an existing-customer mismatch is reported", async () => {
    constructEvent.mockReturnValue(checkoutCompletedEvent());
    linkStripeCustomerId.mockResolvedValue({
      ok: false,
      action: "mismatch",
      existingCustomerId: "cus_old",
    });

    const res = await POST(
      new NextRequest("http://localhost/api/webhooks", {
        method: "POST",
        body: "{}",
        headers: { "stripe-signature": "sig" },
      }),
    );
    expect(res.status).toBe(200);
    expect(manageSubscriptionStatusChange).toHaveBeenCalled();
    expect(handleCheckoutSessionCompletedCommerce).toHaveBeenCalled();
  });

  it("resolves the user from metadata.user_id when client_reference_id is missing", async () => {
    constructEvent.mockReturnValue(
      checkoutCompletedEvent({
        client_reference_id: null,
        metadata: { user_id: USER_ID, planType: "monthly" },
      }),
    );

    await POST(
      new NextRequest("http://localhost/api/webhooks", {
        method: "POST",
        body: "{}",
        headers: { "stripe-signature": "sig" },
      }),
    );

    expect(linkStripeCustomerId).toHaveBeenCalledWith(
      USER_ID,
      "cus_new_from_checkout",
    );
  });
});
