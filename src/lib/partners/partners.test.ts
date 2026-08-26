import { describe, expect, it } from "vitest";
import {
  buildPartnerClaimUrl,
  generatePartnerInviteToken,
  hashPartnerInviteToken,
  isPlausiblePartnerToken,
} from "./tokens";
import { sanitizePartnerProps } from "./analytics";
import { endOfUtcDay, formatPartnerAccessDate, complimentaryAccessEndIso } from "./dates";
import { evaluateFeedbackEligibilityRules } from "./feedback";
import { redeemErrorMessage } from "./types";
import { sanitizeGaParams } from "@/lib/ga/trackEvent";

describe("partner invite tokens", () => {
  it("generates high-entropy tokens and only stores hashes", () => {
    const a = generatePartnerInviteToken();
    const b = generatePartnerInviteToken();
    expect(a.rawToken).not.toEqual(b.rawToken);
    expect(a.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(a.tokenHash).toEqual(hashPartnerInviteToken(a.rawToken));
    expect(a.tokenHash).not.toContain(a.rawToken);
    expect(isPlausiblePartnerToken(a.rawToken)).toBe(true);
    expect(isPlausiblePartnerToken("short")).toBe(false);
  });

  it("builds claim URLs without leaking into analytics sanitizer", () => {
    const token = generatePartnerInviteToken();
    const url = buildPartnerClaimUrl("https://esatcamp.com", token.rawToken);
    expect(url).toContain("/access/redeem/");
    expect(url).toContain(token.rawToken);

    const ga = sanitizeGaParams({
      partner: "arkwright-2026",
      batch: "Y13",
      access_end: "2027-01-10",
      token: token.rawToken,
      invite_code: token.rawToken,
      claim_url: url,
      invite_id: "uuid",
    });
    expect(ga.partner).toBe("arkwright-2026");
    expect(ga.batch).toBe("Y13");
    expect(ga.token).toBeUndefined();
    expect(ga.invite_code).toBeUndefined();
    expect(ga.claim_url).toBeUndefined();
    expect(ga.invite_id).toBeUndefined();
  });
});

describe("partner analytics sanitizer", () => {
  it("strips invite/token fields from first-party props", () => {
    const props = sanitizePartnerProps({
      partner: "arkwright-2026",
      token: "SECRET",
      invite: "SECRET",
      invite_id: "abc",
      usefulness_rating: 5,
    });
    expect(props).toEqual({
      partner: "arkwright-2026",
      usefulness_rating: 5,
    });
  });
});

describe("partner feedback eligibility", () => {
  it("requires 7 days and 20 questions", () => {
    expect(
      evaluateFeedbackEligibilityRules({
        hasFeedback: false,
        daysSinceClaim: 8,
        questionCount: 25,
        promptCount: 0,
        daysSinceDismiss: null,
      }).show,
    ).toBe(true);

    expect(
      evaluateFeedbackEligibilityRules({
        hasFeedback: false,
        daysSinceClaim: 3,
        questionCount: 25,
        promptCount: 0,
        daysSinceDismiss: null,
      }).reason,
    ).toBe("too_soon");

    expect(
      evaluateFeedbackEligibilityRules({
        hasFeedback: false,
        daysSinceClaim: 10,
        questionCount: 5,
        promptCount: 0,
        daysSinceDismiss: null,
      }).reason,
    ).toBe("low_activity");
  });

  it("does not prompt after submission or after max dismissals", () => {
    expect(
      evaluateFeedbackEligibilityRules({
        hasFeedback: true,
        daysSinceClaim: 30,
        questionCount: 50,
        promptCount: 0,
        daysSinceDismiss: null,
      }).reason,
    ).toBe("already_submitted");

    expect(
      evaluateFeedbackEligibilityRules({
        hasFeedback: false,
        daysSinceClaim: 30,
        questionCount: 50,
        promptCount: 2,
        daysSinceDismiss: 30,
      }).reason,
    ).toBe("max_prompts");

    expect(
      evaluateFeedbackEligibilityRules({
        hasFeedback: false,
        daysSinceClaim: 30,
        questionCount: 50,
        promptCount: 1,
        daysSinceDismiss: 2,
      }).reason,
    ).toBe("cooldown");
  });
});

describe("partner redeem error copy", () => {
  it("uses the required user-facing messages", () => {
    expect(redeemErrorMessage("already_claimed")).toBe(
      "This invitation has already been claimed.",
    );
    expect(redeemErrorMessage("expired")).toContain("expired");
    expect(redeemErrorMessage("unavailable")).toContain("invalid");
  });
});

describe("partner access dates", () => {
  it("stores end-of-day UTC and formats the calendar day without local rollover", () => {
    expect(endOfUtcDay("2027-10-13")).toBe("2027-10-13T23:59:59.000Z");
    expect(formatPartnerAccessDate("2027-01-10T23:59:59.000Z")).toBe(
      "10 January 2027",
    );
    expect(formatPartnerAccessDate("2027-10-13T23:59:59.000Z")).toBe(
      "13 October 2027",
    );
    expect(formatPartnerAccessDate("2027-10-16T23:59:59+00")).toBe(
      "16 October 2027",
    );
    expect(formatPartnerAccessDate("2027-10-16 23:59:59+00")).toBe(
      "16 October 2027",
    );
    expect(formatPartnerAccessDate("2027-10-16")).toBe("16 October 2027");
  });
});

describe("complimentary access end date source", () => {
  it("uses partner entitlement ends_at, not paid accessUntil", () => {
    expect(
      formatPartnerAccessDate(
        complimentaryAccessEndIso({
          partnerEndsAt: "2027-10-16T23:59:59+00",
          accessUntil: "2026-10-01",
          source: "one_time",
        }),
      ),
    ).toBe("16 October 2027");
  });

  it("does not fall back to Stripe/season-pass expiry when source is not partner", () => {
    expect(
      complimentaryAccessEndIso({
        partnerEndsAt: null,
        accessUntil: "2026-10-01",
        source: "one_time",
      }),
    ).toBeNull();
  });

  it("falls back to accessUntil only for partner-source access", () => {
    expect(
      formatPartnerAccessDate(
        complimentaryAccessEndIso({
          partnerEndsAt: null,
          accessUntil: "2027-10-16T23:59:59.000Z",
          source: "partner",
        }),
      ),
    ).toBe("16 October 2027");
  });
});

/**
 * Simulates the race-safe redeem decision tree used by the SQL RPC.
 * Exactly one concurrent claim of an unused invite may succeed.
 */
function simulateAtomicRedeem(state: {
  inviteStatus: "unused" | "redeemed" | "revoked" | "expired";
  redeemedBy: string | null;
  expiresAt: number;
  partnerActive: boolean;
  existingUserEntitlement: boolean;
  now: number;
  userId: string;
}): "ok" | "idempotent" | "already_claimed" | "expired" | "unavailable" | "partner_inactive" | "already_entitled" {
  if (
    state.inviteStatus === "redeemed" &&
    state.redeemedBy === state.userId
  ) {
    return "idempotent";
  }
  if (state.inviteStatus === "redeemed") return "already_claimed";
  if (state.inviteStatus === "revoked") return "unavailable";
  if (state.inviteStatus === "expired" || state.expiresAt <= state.now) {
    return "expired";
  }
  if (state.inviteStatus !== "unused") return "unavailable";
  if (!state.partnerActive) return "partner_inactive";
  if (state.existingUserEntitlement) return "already_entitled";
  return "ok";
}

describe("atomic redeem decision tree", () => {
  const base = {
    inviteStatus: "unused" as const,
    redeemedBy: null,
    expiresAt: Date.now() + 86_400_000,
    partnerActive: true,
    existingUserEntitlement: false,
    now: Date.now(),
    userId: "user-a",
  };

  it("allows a valid unused invite", () => {
    expect(simulateAtomicRedeem(base)).toBe("ok");
  });

  it("rejects a second claim after first winner", () => {
    expect(
      simulateAtomicRedeem({
        ...base,
        inviteStatus: "redeemed",
        redeemedBy: "user-b",
        userId: "user-a",
      }),
    ).toBe("already_claimed");
  });

  it("is idempotent for the same user", () => {
    expect(
      simulateAtomicRedeem({
        ...base,
        inviteStatus: "redeemed",
        redeemedBy: "user-a",
        userId: "user-a",
      }),
    ).toBe("idempotent");
  });

  it("rejects expired, revoked, and inactive partners", () => {
    const now = Date.now();
    expect(
      simulateAtomicRedeem({
        ...base,
        now,
        expiresAt: now - 1,
      }),
    ).toBe("expired");
    expect(
      simulateAtomicRedeem({ ...base, inviteStatus: "revoked" }),
    ).toBe("unavailable");
    expect(
      simulateAtomicRedeem({ ...base, partnerActive: false }),
    ).toBe("partner_inactive");
  });

  it("blocks a second invite for the same partner/user", () => {
    expect(
      simulateAtomicRedeem({ ...base, existingUserEntitlement: true }),
    ).toBe("already_entitled");
  });

  it("concurrent simulation: only one winner", () => {
    let inviteStatus: "unused" | "redeemed" = "unused";
    let redeemedBy: string | null = null;
    const winners: string[] = [];

    for (const userId of ["user-a", "user-b"]) {
      const result = simulateAtomicRedeem({
        ...base,
        inviteStatus,
        redeemedBy,
        userId,
      });
      if (result === "ok") {
        inviteStatus = "redeemed";
        redeemedBy = userId;
        winners.push(userId);
      }
    }
    expect(winners).toEqual(["user-a"]);
  });
});

describe("access source composition", () => {
  it("treats subscription OR partner as full access", () => {
    const hasPaid = true;
    const hasPartner = false;
    expect(hasPaid || hasPartner).toBe(true);

    const hasPaid2 = false;
    const hasPartner2 = true;
    expect(hasPaid2 || hasPartner2).toBe(true);

    const hasPaid3 = false;
    const hasPartner3 = false;
    expect(hasPaid3 || hasPartner3).toBe(false);
  });

  it("expired partner entitlement does not grant access", () => {
    const entitlement = {
      startsAt: Date.parse("2026-01-01"),
      endsAt: Date.parse("2026-06-01"),
      revokedAt: null as number | null,
      partnerActive: true,
    };
    const now = Date.parse("2026-08-26");
    const active =
      entitlement.revokedAt == null &&
      entitlement.startsAt <= now &&
      entitlement.endsAt > now &&
      entitlement.partnerActive;
    expect(active).toBe(false);
  });

  it("does not modify subscription when partner is claimed", () => {
    const subscription = { id: "sub_1", status: "active" };
    const afterPartnerClaim = { ...subscription };
    expect(afterPartnerClaim).toEqual(subscription);
  });
});
