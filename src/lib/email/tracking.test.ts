import { describe, expect, it } from "vitest";
import {
  buildTrackedClickUrl,
  buildTrackedOpenPixelUrl,
  buildTrackedProductEmailHtml,
  createProductEmailTrackToken,
  isSafeRedirectUrl,
  normalizeExtractedUrl,
  rewriteHtmlHrefsWithTracking,
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

  it("round-trips open tokens", () => {
    const token = createProductEmailTrackToken({
      c: "campaign-1",
      u: "user-1",
      k: "open",
    });
    expect(verifyProductEmailTrackToken(token)).toEqual({
      c: "campaign-1",
      u: "user-1",
      k: "open",
      d: undefined,
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

  it("rewrites html hrefs and injects open pixel", () => {
    const html = buildTrackedProductEmailHtml({
      html: `<html><body><a href="https://esatcamp.com/esat-mock-tests">Go</a><a href="{{{RESEND_UNSUBSCRIBE_URL}}}">Unsub</a></body></html>`,
      campaignId: "campaign-1",
      recipientId: "user-1",
    });
    expect(html).toContain("/api/email/c?t=");
    expect(html).toContain("/api/email/o?t=");
    expect(html).toContain("/email/unsubscribe?t=");
    expect(html).not.toContain("{{{RESEND_UNSUBSCRIBE_URL}}}");
    expect(html).not.toContain('href="https://esatcamp.com/esat-mock-tests"');
    expect(buildTrackedOpenPixelUrl("campaign-1", "user-1")).toContain(
      "/api/email/o?t=",
    );
  });

  it("skips already-tracked hrefs", () => {
    const tracked = buildTrackedClickUrl(
      "campaign-1",
      "user-1",
      "https://esatcamp.com/x",
    );
    const out = rewriteHtmlHrefsWithTracking(
      `<a href="${tracked}">x</a>`,
      "campaign-1",
      "user-1",
    );
    expect(out).toContain(tracked);
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
