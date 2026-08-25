import { describe, expect, it } from "vitest";
import {
  parseFirstTouchBody,
  sanitizeAnonId,
  sanitizeGaClientId,
  sanitizeGclid,
  sanitizeLandingPath,
  sanitizeReferrer,
  sanitizeUtm,
  parseGaClientIdFromCookie,
} from "./capture";

describe("attribution sanitize", () => {
  it("accepts path-only landing pages", () => {
    expect(sanitizeLandingPath("/tools/score-converter?x=1#y")).toBe(
      "/tools/score-converter",
    );
    expect(sanitizeLandingPath("https://evil.com")).toBeNull();
    expect(sanitizeLandingPath("user@example.com")).toBeNull();
  });

  it("sanitizes referrers to origin+path", () => {
    expect(
      sanitizeReferrer("https://google.com/search?q=esat"),
    ).toBe("https://google.com/search");
    expect(sanitizeReferrer("not-a-url")).toBe("not-a-url");
  });

  it("rejects email-like utm values", () => {
    expect(sanitizeUtm("google")).toBe("google");
    expect(sanitizeUtm("a@b.com")).toBeNull();
  });

  it("validates gclid and ga client id formats", () => {
    expect(sanitizeGclid("Cj0KCQ")).toBe("Cj0KCQ");
    expect(sanitizeGclid("bad value")).toBeNull();
    expect(sanitizeGaClientId("123.456")).toBe("123.456");
    expect(sanitizeGaClientId("abc")).toBeNull();
  });

  it("parses _ga cookie into client_id", () => {
    expect(
      parseGaClientIdFromCookie("_ga=GA1.1.1111111111.2222222222; other=1"),
    ).toBe("1111111111.2222222222");
  });

  it("validates anon ids", () => {
    expect(sanitizeAnonId("anon_abc-123")).toBe("anon_abc-123");
    expect(sanitizeAnonId("user_1")).toBeNull();
  });

  it("parses a valid first-touch body", () => {
    const parsed = parseFirstTouchBody({
      anon_id: "anon_test123",
      first_landing_page: "/pricing",
      referrer: "https://google.com/",
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: "brand",
      gclid: "abc",
      ga_client_id: "1.2",
      first_touch_at: "2026-08-21T12:00:00.000Z",
    });
    expect(parsed).toMatchObject({
      anon_id: "anon_test123",
      first_landing_page: "/pricing",
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: "brand",
      gclid: "abc",
      ga_client_id: "1.2",
    });
  });
});
