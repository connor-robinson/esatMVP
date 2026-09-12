import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireRouteUser,
  isStripeConfigured,
  createOrRetrieveCustomer,
  billingPortalCreate,
  getStripe,
} = vi.hoisted(() => {
  const billingPortalCreate = vi.fn();
  return {
    requireRouteUser: vi.fn(),
    isStripeConfigured: vi.fn(() => true),
    createOrRetrieveCustomer: vi.fn(async () => "cus_existing_paid"),
    billingPortalCreate,
    getStripe: vi.fn(() => ({
      billingPortal: { sessions: { create: billingPortalCreate } },
    })),
  };
});

vi.mock("@/lib/supabase/auth", () => ({ requireRouteUser }));
vi.mock("@/lib/stripe/config", () => ({ getStripe, isStripeConfigured }));
vi.mock("@/lib/stripe/supabase-admin", () => ({ createOrRetrieveCustomer }));
vi.mock("@/lib/seo/config", () => ({
  resolveAppSiteUrl: () => "https://example.com",
}));

import { POST } from "@/app/api/stripe/create-portal-link/route";

describe("POST /api/stripe/create-portal-link", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isStripeConfigured.mockReturnValue(true);
    requireRouteUser.mockResolvedValue({
      user: { id: "user-1", email: "paid@example.com" },
      error: null,
    });
    createOrRetrieveCustomer.mockResolvedValue("cus_existing_paid");
    billingPortalCreate.mockResolvedValue({
      url: "https://billing.stripe.com/session/test",
    });
  });

  it("still opens the Billing Portal for an existing Stripe customer", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/stripe/create-portal-link", {
        method: "POST",
      }),
    );
    expect(res.status).toBe(200);
    expect(createOrRetrieveCustomer).toHaveBeenCalledWith(
      "user-1",
      "paid@example.com",
    );
    expect(billingPortalCreate).toHaveBeenCalledWith({
      customer: "cus_existing_paid",
      return_url: "https://example.com/profile",
    });
    const body = await res.json();
    expect(body.url).toContain("billing.stripe.com");
  });
});
