import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  evaluatePartnerRedeemEligibility,
  isPaidAccessSource,
  partnerShortAccessLabel,
} from "./eligibility";
import { complimentaryAccessEndIso, formatPartnerAccessDate } from "./dates";
import { redeemErrorMessage } from "./types";

const ROOT = join(process.cwd(), "src");

function readSrc(...segments: string[]) {
  return readFileSync(join(ROOT, ...segments), "utf8");
}

describe("partner access claim UX copy", () => {
  it("/access shows manual code entry copy only", () => {
    const page = readSrc("app", "access", "page.tsx");
    const manual = readSrc("components", "partners", "AccessManualEntry.tsx");
    expect(page).toContain("AccessManualEntry");
    expect(manual).toContain("Access ESAT Camp");
    expect(manual).toContain(
      "Enter the access code provided by your school or programme.",
    );
    expect(manual).toContain('data-testid="access-code-input"');
    expect(manual).toContain("Continue");
  });

  it("/access/[code] does not tell the user to enter a code", () => {
    const page = readSrc("app", "access", "[code]", "page.tsx");
    const claim = readSrc("components", "partners", "AccessClaimPanel.tsx");
    expect(page).toContain("AccessClaimPanel");
    expect(claim).not.toContain(
      "Enter the access code provided by your school or programme.",
    );
    expect(claim).not.toContain('data-testid="access-code-input"');
    expect(claim).toContain("Your {shortLabel} access is ready");
    expect(claim).toContain("Claim access");
    expect(claim).toContain('data-testid="claim-access-button"');
  });

  it("logged-out claim preserves code through Google auth via claim cookie + complete", () => {
    const redeemApi = readSrc("app", "api", "access", "redeem", "route.ts");
    const complete = readSrc("app", "access", "complete", "route.ts");
    expect(redeemApi).toContain("setPartnerClaimCookie");
    expect(redeemApi).toContain("/access/complete");
    expect(complete).toContain("readPartnerClaimCookie");
    expect(complete).toContain("redeemPartnerInvite");
  });
});

describe("partner redeem eligibility (pre-consume)", () => {
  it("blocks paid users without consuming", () => {
    expect(
      evaluatePartnerRedeemEligibility({
        hasActivePaidAccess: true,
        existingPartnerEntitlement: null,
      }),
    ).toEqual({ ok: false, error: "already_paid" });
  });

  it("blocks same-partner active entitlement without consuming", () => {
    const endsAt = "2027-10-16T23:59:59.000Z";
    expect(
      evaluatePartnerRedeemEligibility({
        hasActivePaidAccess: false,
        existingPartnerEntitlement: {
          revokedAt: null,
          startsAt: "2026-01-01T00:00:00.000Z",
          endsAt,
        },
        nowMs: Date.parse("2026-08-26T12:00:00.000Z"),
      }),
    ).toEqual({
      ok: false,
      error: "already_partner_entitled",
      endsAt,
    });
  });

  it("allows eligible users so a later redeem can still consume the code", () => {
    expect(
      evaluatePartnerRedeemEligibility({
        hasActivePaidAccess: false,
        existingPartnerEntitlement: null,
      }),
    ).toEqual({ ok: true });
  });

  it("treats subscription and one_time as paid blockers; not tester/partner", () => {
    expect(isPaidAccessSource("subscription")).toBe(true);
    expect(isPaidAccessSource("one_time")).toBe(true);
    expect(isPaidAccessSource("tester")).toBe(false);
    expect(isPaidAccessSource("partner")).toBe(false);
    expect(isPaidAccessSource("none")).toBe(false);
  });

  it("SQL migration checks paid and same-partner entitlement before consume", () => {
    const sql = readFileSync(
      join(
        process.cwd(),
        "supabase/migrations/20260826164344_partner_redeem_eligibility.sql",
      ),
      "utf8",
    );
    expect(sql).toContain("_user_has_active_paid_access");
    expect(sql).toContain("already_paid");
    expect(sql).toContain("already_partner_entitled");
    expect(sql).toContain("Paid users must not consume partner codes");
    expect(sql).toContain("Paid users must not increment cohort caps");
    expect(sql).toContain("redemption_count = redemption_count + 1");
    expect(sql).toMatch(
      /Paid users must not consume partner codes[\s\S]*redeemed_at = now\(\)/,
    );
    expect(sql).toMatch(
      /Paid users must not increment cohort caps[\s\S]*redemption_count = redemption_count \+ 1/,
    );
  });
});

describe("partner short label + success date", () => {
  it("derives Arkwright from slug for claim headings", () => {
    expect(
      partnerShortAccessLabel({
        displayName: "Arkwright Engineering Scholarships",
        slug: "arkwright-2026",
      }),
    ).toBe("Arkwright");
  });

  it("success page uses authoritative partner entitlement end date", () => {
    const success = readSrc("app", "access", "success", "page.tsx");
    expect(success).toContain("partnerEndsAt");
    expect(success).toContain("complimentaryAccessEndIso");
    expect(success).toContain("Go to dashboard");
    expect(success).toContain("Your ESAT Camp access is active");
    expect(
      formatPartnerAccessDate(
        complimentaryAccessEndIso({
          partnerEndsAt: "2027-10-16T23:59:59+00",
          accessUntil: "2026-10-01T23:59:59.000Z",
          source: "one_time",
        })!,
      ),
    ).toBe("16 October 2027");
  });

  it("uses simplified invalid/expired/used copy", () => {
    expect(redeemErrorMessage("invalid_token")).toBe(
      "This access code isn't valid.",
    );
    expect(redeemErrorMessage("expired")).toBe(
      "This access code has expired.",
    );
    expect(redeemErrorMessage("already_claimed")).toBe(
      "This access code has already been used.",
    );
  });
});
