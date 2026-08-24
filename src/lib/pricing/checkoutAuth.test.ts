import { describe, expect, it } from "vitest";
import {
  buildCheckoutSignupUrl,
  buildCheckoutSignInUrl,
  isPaidPlanId,
  pricingCheckoutRedirectPath,
} from "./checkoutAuth";

describe("checkoutAuth plan preservation", () => {
  it("recognises paid plans only", () => {
    expect(isPaidPlanId("monthly")).toBe(true);
    expect(isPaidPlanId("weekly")).toBe(true);
    expect(isPaidPlanId("season_pass")).toBe(true);
    expect(isPaidPlanId("free")).toBe(false);
    expect(isPaidPlanId(null)).toBe(false);
  });

  it("builds signup URLs with mode=signup and checkout return path", () => {
    const url = buildCheckoutSignupUrl("monthly");
    expect(url).toContain("/login?");
    expect(url).toContain("mode=signup");
    expect(url).toContain("plan=monthly");
    expect(url).toContain(
      encodeURIComponent(pricingCheckoutRedirectPath("monthly")),
    );
    expect(url).not.toContain("mode=signin");
  });

  it("keeps selected plan on sign-in helper for existing users", () => {
    const url = buildCheckoutSignInUrl("season_pass");
    expect(url).toContain("mode=signin");
    expect(url).toContain("plan=season_pass");
    expect(pricingCheckoutRedirectPath("season_pass")).toBe(
      "/pricing?checkout=season_pass",
    );
  });
});
