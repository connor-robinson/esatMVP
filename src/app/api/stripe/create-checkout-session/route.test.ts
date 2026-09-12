import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireRouteUser,
  isStripeConfigured,
  getStripe,
  getStripeKeyMeta,
  getStoredStripeCustomerId,
  supabaseFrom,
  resolveMonthlyStripePrice,
  getPriceIdForPlan,
  resolveAppSiteUrl,
  getSeasonPassPrice,
  customersCreate,
  checkoutSessionsCreate,
  subscriptionsList,
  pricesRetrieve,
} = vi.hoisted(() => {
  const checkoutSessionsCreate = vi.fn();
  const customersCreate = vi.fn();
  const subscriptionsList = vi.fn();
  const pricesRetrieve = vi.fn();
  const supabaseFrom = vi.fn();

  return {
    requireRouteUser: vi.fn(),
    isStripeConfigured: vi.fn(() => true),
    getStripeKeyMeta: vi.fn(() => ({ mode: "test" })),
    getStoredStripeCustomerId: vi.fn(),
    resolveMonthlyStripePrice: vi.fn(),
    getPriceIdForPlan: vi.fn(),
    resolveAppSiteUrl: vi.fn(() => "https://example.com"),
    getSeasonPassPrice: vi.fn(() => 99),
    customersCreate,
    checkoutSessionsCreate,
    subscriptionsList,
    pricesRetrieve,
    supabaseFrom,
    getStripe: vi.fn(() => ({
      customers: { create: customersCreate },
      checkout: { sessions: { create: checkoutSessionsCreate } },
      subscriptions: { list: subscriptionsList },
      prices: { retrieve: pricesRetrieve },
    })),
  };
});

vi.mock("@/lib/supabase/auth", () => ({ requireRouteUser }));
vi.mock("@/lib/stripe/config", () => ({
  getStripe,
  getStripeKeyMeta,
  isStripeConfigured,
}));
vi.mock("@/lib/stripe/supabase-admin", () => ({
  getStoredStripeCustomerId,
  supabaseAdmin: { from: supabaseFrom },
  createOrRetrieveCustomer: vi.fn(async () => {
    throw new Error("createOrRetrieveCustomer should not be called from checkout");
  }),
}));
vi.mock("@/lib/stripe/prices", () => ({
  resolveMonthlyStripePrice,
  getPriceIdForPlan,
}));
vi.mock("@/lib/seo/config", () => ({ resolveAppSiteUrl }));
vi.mock("@/lib/stripe/best-value", () => ({
  getSeasonPassPrice,
  SEASON_PASS_ACCESS_UNTIL_LABEL: "31 Oct 2026",
}));

import { POST } from "@/app/api/stripe/create-checkout-session/route";

const USER = {
  id: "c6495215-91df-4712-adfc-3899059217a2",
  email: "student@example.com",
};

function mockNoActiveSubscription() {
  supabaseFrom.mockImplementation((table: string) => {
    if (table === "subscriptions") {
      return {
        select: () => ({
          eq: () => ({
            in: () => ({
              limit: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
            limit: async () => ({ data: [], error: null }),
          }),
        }),
      };
    }
    throw new Error(`unexpected table ${table}`);
  });
}

function mockActiveSubscription() {
  supabaseFrom.mockImplementation((table: string) => {
    if (table === "subscriptions") {
      return {
        select: () => ({
          eq: () => ({
            in: () => ({
              limit: () => ({
                maybeSingle: async () => ({
                  data: { id: "sub_existing" },
                  error: null,
                }),
              }),
            }),
            limit: async () => ({ data: [{ id: "sub_existing" }], error: null }),
          }),
        }),
      };
    }
    throw new Error(`unexpected table ${table}`);
  });
}

describe("POST /api/stripe/create-checkout-session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isStripeConfigured.mockReturnValue(true);
    requireRouteUser.mockResolvedValue({ user: USER, error: null });
    getStoredStripeCustomerId.mockResolvedValue(null);
    resolveMonthlyStripePrice.mockResolvedValue("price_monthly");
    getPriceIdForPlan.mockReturnValue("price_weekly");
    pricesRetrieve.mockResolvedValue({ id: "price_monthly" });
    subscriptionsList.mockResolvedValue({ data: [] });
    checkoutSessionsCreate.mockResolvedValue({
      url: "https://checkout.stripe.com/test",
    });
    mockNoActiveSubscription();
  });

  it("does not call stripe.customers.create for a new user", async () => {
    const req = new NextRequest("http://localhost/api/stripe/create-checkout-session", {
      method: "POST",
      body: JSON.stringify({ planType: "monthly" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(customersCreate).not.toHaveBeenCalled();
  });

  it("uses customer_email for a new user", async () => {
    const req = new NextRequest("http://localhost/api/stripe/create-checkout-session", {
      method: "POST",
      body: JSON.stringify({ planType: "monthly" }),
    });

    await POST(req);

    expect(checkoutSessionsCreate).toHaveBeenCalledTimes(1);
    const args = checkoutSessionsCreate.mock.calls[0][0];
    expect(args.customer_email).toBe(USER.email);
    expect(args.customer).toBeUndefined();
  });

  it("uses customer for an existing Stripe customer", async () => {
    getStoredStripeCustomerId.mockResolvedValue("cus_existing");

    const req = new NextRequest("http://localhost/api/stripe/create-checkout-session", {
      method: "POST",
      body: JSON.stringify({ planType: "monthly" }),
    });

    await POST(req);

    const args = checkoutSessionsCreate.mock.calls[0][0];
    expect(args.customer).toBe("cus_existing");
    expect(args.customer_email).toBeUndefined();
  });

  it("never sends customer and customer_email together", async () => {
    getStoredStripeCustomerId.mockResolvedValue("cus_existing");
    await POST(
      new NextRequest("http://localhost/api/stripe/create-checkout-session", {
        method: "POST",
        body: JSON.stringify({ planType: "monthly" }),
      }),
    );
    const withCustomer = checkoutSessionsCreate.mock.calls[0][0];
    expect(withCustomer.customer).toBeDefined();
    expect(withCustomer.customer_email).toBeUndefined();

    checkoutSessionsCreate.mockClear();
    getStoredStripeCustomerId.mockResolvedValue(null);
    await POST(
      new NextRequest("http://localhost/api/stripe/create-checkout-session", {
        method: "POST",
        body: JSON.stringify({ planType: "monthly" }),
      }),
    );
    const withEmail = checkoutSessionsCreate.mock.calls[0][0];
    expect(withEmail.customer_email).toBeDefined();
    expect(withEmail.customer).toBeUndefined();
  });

  it("sets payment_method_collection to always", async () => {
    await POST(
      new NextRequest("http://localhost/api/stripe/create-checkout-session", {
        method: "POST",
        body: JSON.stringify({ planType: "monthly" }),
      }),
    );
    expect(checkoutSessionsCreate.mock.calls[0][0].payment_method_collection).toBe(
      "always",
    );
  });

  it("attaches user id metadata and client_reference_id", async () => {
    await POST(
      new NextRequest("http://localhost/api/stripe/create-checkout-session", {
        method: "POST",
        body: JSON.stringify({ planType: "monthly" }),
      }),
    );
    const args = checkoutSessionsCreate.mock.calls[0][0];
    expect(args.client_reference_id).toBe(USER.id);
    expect(args.metadata.userId).toBe(USER.id);
    expect(args.metadata.user_id).toBe(USER.id);
    expect(args.subscription_data.metadata.userId).toBe(USER.id);
    expect(args.subscription_data.metadata.user_id).toBe(USER.id);
    expect(args.mode).toBe("subscription");
  });

  it("offers a trial for first-time monthly checkout", async () => {
    await POST(
      new NextRequest("http://localhost/api/stripe/create-checkout-session", {
        method: "POST",
        body: JSON.stringify({ planType: "monthly" }),
      }),
    );
    expect(
      checkoutSessionsCreate.mock.calls[0][0].subscription_data.trial_period_days,
    ).toBe(4);
  });

  it("blocks checkout when the user already has an active subscription", async () => {
    mockActiveSubscription();
    const res = await POST(
      new NextRequest("http://localhost/api/stripe/create-checkout-session", {
        method: "POST",
        body: JSON.stringify({ planType: "monthly" }),
      }),
    );
    expect(res.status).toBe(409);
    expect(checkoutSessionsCreate).not.toHaveBeenCalled();
    expect(customersCreate).not.toHaveBeenCalled();
  });
});
