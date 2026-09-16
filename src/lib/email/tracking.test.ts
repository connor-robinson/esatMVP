import { describe, expect, it } from "vitest";
import {
  buildTrackedClickUrl,
  createProductEmailTrackToken,
  isSafeRedirectUrl,
  normalizeExtractedUrl,
  rewriteUrlsWithTracking,
  verifyProductEmailTrackToken,
} from "@/lib/email/tracking";

describe("product email tracking tokens", () => {
  it("round-trips click tokens", () => {
    const token = createProductEmailTrackToken({
      c: "campaign-1",
      u: "user-1",
      k: "click",
      d: "https://esatcamp.com/pricing",
    });
    expect(verifyProductEmailTrackToken(token)).toEqual({
      c: "campaign-1",
      u: "user-1",
      k: "click",
      d: "https://esatcamp.com/pricing",
    });
  });

  it("rejects tampered tokens", () => {
    const token = createProductEmailTrackToken({
      c: "campaign-1",
      u: "user-1",
      k: "unsub",
    });
    expect(verifyProductEmailTrackToken(`${token}x`)).toBeNull();
  });

  it("rewrites body urls to tracked click urls", () => {
    const out = rewriteUrlsWithTracking(
      "Try https://esatcamp.com/pricing today.",
      "campaign-1",
      "user-1",
    );
    expect(out).toContain("https://esatcamp.com/api/email/c?t=");
    expect(out).toContain(" today.");
    expect(out).not.toContain("https://esatcamp.com/pricing");
    expect(
      buildTrackedClickUrl(
        "campaign-1",
        "user-1",
        "https://esatcamp.com/pricing",
      ),
    ).toContain("/api/email/c?t=");
  });

  it("normalizes trailing punctuation on urls", () => {
    expect(normalizeExtractedUrl("https://esatcamp.com/pricing.")).toBe(
      "https://esatcamp.com/pricing",
    );
  });

  it("allows only http(s) redirects", () => {
    expect(isSafeRedirectUrl("https://esatcamp.com/x")).toBe(true);
    expect(isSafeRedirectUrl("javascript:alert(1)")).toBe(false);
  });
});
