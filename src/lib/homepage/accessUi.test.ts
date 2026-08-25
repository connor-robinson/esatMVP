import { describe, expect, it } from "vitest";
import { resolveHomepageUserState } from "./userState";
import { buildUpgradePrompt } from "./upgradePrompt";
import {
  hasUnlockedProductAccess,
  shouldShowPaywallUi,
  shouldSuppressTesterChrome,
} from "@/lib/subscription/accessUi";
import { getTesterNavAction } from "@/lib/tester/checkpoint";
import type { TesterState } from "@/lib/tester/types";

function testerState(partial: Partial<TesterState>): TesterState {
  return {
    isMember: true,
    status: "stage_1_expired",
    currentStage: 1,
    premiumActive: false,
    accessExpiresAt: null,
    msRemaining: null,
    meaningfulSessionsCompleted: 0,
    sessionsRequiredForNext: 1,
    nextAction: "complete_stage_1_feedback",
    nextRewardLabel: "7 more days",
    checkpointDue: "stage_1",
    foundingDiscountEligible: false,
    foundingDiscountPercent: null,
    eligibleToJoin: false,
    config: {
      stage_1_hours: 48,
      stage_2_days: 7,
      stage_3_days: 30,
      stage_3_approval_mode: "auto",
      meaningful_session_min_seconds: 120,
      meaningful_session_min_questions: 5,
      offer_to_paid_users: false,
      founding_discount_percent: 50,
      founding_discount_code: null,
    },
    ...partial,
  };
}

describe("access UI helpers", () => {
  it("treats partner full access like unlocked product access", () => {
    expect(
      hasUnlockedProductAccess({
        hasFullAccess: true,
        source: "partner",
        tier: "partner",
      }),
    ).toBe(true);
    expect(
      shouldShowPaywallUi({
        hasFullAccess: true,
        source: "partner",
        tier: "partner",
      }),
    ).toBe(false);
    expect(
      shouldSuppressTesterChrome({
        hasFullAccess: true,
        source: "partner",
        tier: "partner",
      }),
    ).toBe(true);
  });

  it("still shows paywall for free users", () => {
    expect(
      shouldShowPaywallUi({ hasFullAccess: false, source: "none", tier: "free" }),
    ).toBe(true);
    expect(
      shouldSuppressTesterChrome({
        hasFullAccess: false,
        source: "none",
        tier: "free",
      }),
    ).toBe(false);
  });
});

describe("resolveHomepageUserState with partner access", () => {
  it("returns premium for partner tier even with expired tester membership", () => {
    expect(
      resolveHomepageUserState({
        isLoggedIn: true,
        hasFullAccess: true,
        tier: "partner",
        tester: testerState({ status: "stage_1_expired", premiumActive: false }),
      }),
    ).toBe("premium");
  });

  it("returns premium for subscription tier", () => {
    expect(
      resolveHomepageUserState({
        isLoggedIn: true,
        hasFullAccess: true,
        tier: "monthly",
        tester: null,
      }),
    ).toBe("premium");
  });

  it("keeps tester_expired when access is only from expired tester", () => {
    expect(
      resolveHomepageUserState({
        isLoggedIn: true,
        hasFullAccess: false,
        tier: "free",
        tester: testerState({ status: "stage_1_expired", premiumActive: false }),
      }),
    ).toBe("tester_expired");
  });
});

describe("upgrade prompt with full access", () => {
  it("returns null when hasFullAccess is true", () => {
    expect(
      buildUpgradePrompt({
        userState: "premium",
        hasFullAccess: true,
        summary: null,
      }),
    ).toBeNull();
  });
});

describe("getTesterNavAction with partner suppress", () => {
  it("hides Upgrade for free when hasFullAccess", () => {
    expect(
      getTesterNavAction(null, true, true).show,
    ).toBe(false);
  });

  it("shows Upgrade for free for signed-in free users", () => {
    const action = getTesterNavAction(null, false, true);
    expect(action.show).toBe(true);
    expect(action.label).toBe("Upgrade for free");
  });

  it("hides Continue programme when partner chrome is suppressed", () => {
    const state = testerState({
      status: "stage_1_expired",
      nextAction: "complete_stage_1_feedback",
      checkpointDue: "stage_1",
    });
    const withoutSuppress = getTesterNavAction(state, true, true);
    expect(withoutSuppress.show).toBe(true);
    expect(withoutSuppress.label).toBe("Continue programme");

    const withSuppress = getTesterNavAction(state, true, true, {
      suppressTesterChrome: true,
    });
    expect(withSuppress.show).toBe(false);
  });
});
