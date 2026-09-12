import { describe, expect, it } from "vitest";
import {
  buildCheckoutCustomerFields,
  decideStripeCustomerLink,
  resolveUserIdFromCheckoutSession,
  resolveUserIdFromStripeMetadata,
} from "./checkoutIdentity";

describe("buildCheckoutCustomerFields", () => {
  it("uses customer when a stored Stripe Customer ID exists", () => {
    expect(buildCheckoutCustomerFields("cus_existing", "a@example.com")).toEqual({
      customer: "cus_existing",
    });
  });

  it("uses customer_email when no stored Customer ID exists", () => {
    expect(buildCheckoutCustomerFields(null, "a@example.com")).toEqual({
      customer_email: "a@example.com",
    });
  });

  it("never returns both customer and customer_email", () => {
    const withCustomer = buildCheckoutCustomerFields("cus_1", "a@example.com");
    const withEmail = buildCheckoutCustomerFields(undefined, "a@example.com");

    expect("customer" in withCustomer && "customer_email" in withCustomer).toBe(
      false,
    );
    expect("customer" in withEmail && "customer_email" in withEmail).toBe(false);
    expect(
      Object.keys(withCustomer).sort().join(","),
    ).not.toContain("customer_email");
    expect(Object.keys(withEmail)).toEqual(["customer_email"]);
  });
});

describe("resolveUserIdFromCheckoutSession", () => {
  it("prefers client_reference_id", () => {
    expect(
      resolveUserIdFromCheckoutSession({
        client_reference_id: "user-ref",
        metadata: { user_id: "user-meta", userId: "user-legacy" },
      }),
    ).toBe("user-ref");
  });

  it("falls back to metadata.user_id then userId", () => {
    expect(
      resolveUserIdFromCheckoutSession({
        client_reference_id: null,
        metadata: { user_id: "user-meta" },
      }),
    ).toBe("user-meta");
    expect(
      resolveUserIdFromCheckoutSession({
        metadata: { userId: "user-legacy" },
      }),
    ).toBe("user-legacy");
  });
});

describe("resolveUserIdFromStripeMetadata", () => {
  it("reads user_id or userId", () => {
    expect(resolveUserIdFromStripeMetadata({ user_id: "a" })).toBe("a");
    expect(resolveUserIdFromStripeMetadata({ userId: "b" })).toBe("b");
    expect(resolveUserIdFromStripeMetadata({})).toBeNull();
  });
});

describe("decideStripeCustomerLink", () => {
  it("creates a mapping when none exists", () => {
    expect(
      decideStripeCustomerLink({
        userId: "u1",
        incomingCustomerId: "cus_new",
        existingCustomerIdForUser: null,
      }),
    ).toEqual({ ok: true, action: "created" });
  });

  it("is idempotent when the same Customer ID is replayed", () => {
    expect(
      decideStripeCustomerLink({
        userId: "u1",
        incomingCustomerId: "cus_1",
        existingCustomerIdForUser: "cus_1",
      }),
    ).toEqual({ ok: true, action: "unchanged" });
  });

  it("refuses to overwrite a different existing Customer ID", () => {
    expect(
      decideStripeCustomerLink({
        userId: "u1",
        incomingCustomerId: "cus_new",
        existingCustomerIdForUser: "cus_old",
      }),
    ).toEqual({
      ok: false,
      action: "mismatch",
      existingCustomerId: "cus_old",
    });
  });

  it("refuses when the Customer ID is already linked to another user", () => {
    expect(
      decideStripeCustomerLink({
        userId: "u1",
        incomingCustomerId: "cus_shared",
        existingCustomerIdForUser: null,
        userIdAlreadyLinkedToIncoming: "u2",
      }),
    ).toEqual({
      ok: false,
      action: "already_linked",
      otherUserId: "u2",
    });
  });
});
