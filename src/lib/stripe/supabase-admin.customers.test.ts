import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getStripe,
  customersRetrieve,
  subscriptionsCancel,
  fromMock,
} = vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test-key";

  const customersRetrieve = vi.fn();
  const subscriptionsCancel = vi.fn();
  const fromMock = vi.fn();
  return {
    customersRetrieve,
    subscriptionsCancel,
    fromMock,
    getStripe: vi.fn(() => ({
      customers: { retrieve: customersRetrieve, list: vi.fn(), create: vi.fn() },
      subscriptions: {
        cancel: subscriptionsCancel,
        retrieve: vi.fn(),
        update: vi.fn(),
      },
      prices: { retrieve: vi.fn() },
      products: { retrieve: vi.fn() },
    })),
  };
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: fromMock }),
}));
vi.mock("@/lib/stripe/config", () => ({ getStripe }));

import {
  cancelDuplicateCheckoutSubscription,
  getStoredStripeCustomerId,
  linkStripeCustomerId,
} from "./supabase-admin";

describe("getStoredStripeCustomerId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when the user has no stored customer", async () => {
    fromMock.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
    });
    await expect(getStoredStripeCustomerId("user-1")).resolves.toBeNull();
  });

  it("returns a verified stored customer id", async () => {
    fromMock.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { stripe_customer_id: "cus_1" },
            error: null,
          }),
        }),
      }),
    });
    customersRetrieve.mockResolvedValue({ id: "cus_1", deleted: false });
    await expect(getStoredStripeCustomerId("user-1")).resolves.toBe("cus_1");
  });
});

describe("linkStripeCustomerId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("upserts when no mapping exists", async () => {
    const upsert = vi.fn(async () => ({ error: null }));
    fromMock.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
      upsert,
    }));

    const result = await linkStripeCustomerId("user-1", "cus_new");
    expect(result).toEqual({ ok: true, action: "created" });
    expect(upsert).toHaveBeenCalledWith(
      [{ id: "user-1", stripe_customer_id: "cus_new" }],
      { onConflict: "id" },
    );
  });

  it("is idempotent when the same customer is linked again", async () => {
    const upsert = vi.fn();
    let call = 0;
    fromMock.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            call += 1;
            if (call === 1) {
              return {
                data: { stripe_customer_id: "cus_1" },
                error: null,
              };
            }
            return { data: { id: "user-1" }, error: null };
          },
        }),
      }),
      upsert,
    }));

    const result = await linkStripeCustomerId("user-1", "cus_1");
    expect(result).toEqual({ ok: true, action: "unchanged" });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("does not overwrite a different existing customer id", async () => {
    const upsert = vi.fn();
    let call = 0;
    fromMock.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            call += 1;
            if (call === 1) {
              return {
                data: { stripe_customer_id: "cus_old" },
                error: null,
              };
            }
            return { data: null, error: null };
          },
        }),
      }),
      upsert,
    }));

    const result = await linkStripeCustomerId("user-1", "cus_new");
    expect(result).toEqual({
      ok: false,
      action: "mismatch",
      existingCustomerId: "cus_old",
    });
    expect(upsert).not.toHaveBeenCalled();
  });
});

describe("cancelDuplicateCheckoutSubscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cancels a newly completed subscription when another active one exists", async () => {
    fromMock.mockReturnValue({
      select: () => ({
        eq: () => ({
          in: () => ({
            neq: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: "sub_existing",
                      created: "2026-01-01T00:00:00.000Z",
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
    });
    const stripe = getStripe();
    vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue({
      id: "sub_new",
      created: Math.floor(Date.now() / 1000),
    } as never);
    subscriptionsCancel.mockResolvedValue({ id: "sub_new", status: "canceled" });

    await expect(
      cancelDuplicateCheckoutSubscription("user-1", "sub_new"),
    ).resolves.toBe(true);
    expect(subscriptionsCancel).toHaveBeenCalledWith("sub_new");
  });

  it("does nothing when there is no other active subscription", async () => {
    fromMock.mockReturnValue({
      select: () => ({
        eq: () => ({
          in: () => ({
            neq: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: async () => ({ data: null, error: null }),
                }),
              }),
            }),
          }),
        }),
      }),
    });

    await expect(
      cancelDuplicateCheckoutSubscription("user-1", "sub_new"),
    ).resolves.toBe(false);
    expect(subscriptionsCancel).not.toHaveBeenCalled();
  });
});
