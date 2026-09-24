import { describe, expect, it } from "vitest";
import { subscriptionCancelsAtPeriodEnd } from "./cancellation";

const now = new Date("2026-09-25T00:00:00.000Z");

describe("subscriptionCancelsAtPeriodEnd", () => {
  it("honors the Stripe boolean", () => {
    expect(
      subscriptionCancelsAtPeriodEnd({
        status: "trialing",
        cancelAtPeriodEnd: true,
        now,
      }),
    ).toBe(true);
  });

  it("treats a future cancel_at as scheduled even when the boolean is false", () => {
    expect(
      subscriptionCancelsAtPeriodEnd({
        status: "trialing",
        cancelAtPeriodEnd: false,
        cancelAt: "2026-09-28T18:23:41.000Z",
        now,
      }),
    ).toBe(true);
  });

  it("accepts Stripe unix timestamps for cancel_at", () => {
    expect(
      subscriptionCancelsAtPeriodEnd({
        status: "active",
        cancelAtPeriodEnd: false,
        cancelAt: Math.floor(Date.parse("2026-09-28T18:23:41.000Z") / 1000),
        now,
      }),
    ).toBe(true);
  });

  it("does not flag a past cancel date or a fully ended subscription", () => {
    expect(
      subscriptionCancelsAtPeriodEnd({
        status: "trialing",
        cancelAt: "2026-09-20T00:00:00.000Z",
        now,
      }),
    ).toBe(false);
    expect(
      subscriptionCancelsAtPeriodEnd({
        status: "canceled",
        cancelAtPeriodEnd: true,
        cancelAt: "2026-09-28T18:23:41.000Z",
        now,
      }),
    ).toBe(false);
    expect(
      subscriptionCancelsAtPeriodEnd({
        status: "trialing",
        cancelAtPeriodEnd: true,
        endedAt: "2026-09-24T00:00:00.000Z",
        now,
      }),
    ).toBe(false);
  });
});
