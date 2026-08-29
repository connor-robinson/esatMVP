import { describe, expect, it } from "vitest";
import {
  getMonthlyDiscountPercent,
  getMonthlyPricePerWeek,
  getMonthlyPricePence,
  MONTHLY_LIST_PRICE_GBP,
  MONTHLY_PRICE_GBP,
} from "@/lib/stripe/best-value";

describe("monthly sale pricing", () => {
  it("uses the configured sale price", () => {
    expect(MONTHLY_PRICE_GBP).toBe(14.99);
    expect(MONTHLY_LIST_PRICE_GBP).toBe(25);
    expect(getMonthlyPricePence()).toBe(1499);
  });

  it("calculates weekly equivalent from sale price", () => {
    expect(getMonthlyPricePerWeek()).toBeCloseTo(3.7475, 4);
  });

  it("rounds discount percent for display", () => {
    expect(getMonthlyDiscountPercent()).toBe(40);
  });
});
