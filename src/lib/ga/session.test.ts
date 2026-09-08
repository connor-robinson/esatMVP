import { describe, expect, it } from "vitest";
import { DEFAULT_GA_MEASUREMENT_ID } from "./trackEvent";
import {
  captureGaCheckoutAttribution,
  captureGaCheckoutAttributionFromCookies,
  gaSessionCookieName,
  isValidGaClientId,
  parseGaSessionCookie,
  parseGaSessionCookieValue,
  sanitizeGaSessionId,
  sanitizeGaSessionNumber,
} from "./session";

describe("GA session cookie parsing", () => {
  it("builds the measurement-specific cookie name", () => {
    expect(gaSessionCookieName("G-Y7E2CJSKV0")).toBe("_ga_Y7E2CJSKV0");
    expect(gaSessionCookieName("Y7E2CJSKV0")).toBe("_ga_Y7E2CJSKV0");
  });

  it("parses GS2.1 session cookies", () => {
    expect(
      parseGaSessionCookieValue("GS2.1.s1710000000$o2$g1$t1710000001$j10$l0$h0"),
    ).toEqual({
      ga_session_id: "1710000000",
      ga_session_number: 2,
    });
  });

  it("parses GS1.1 session cookies", () => {
    expect(
      parseGaSessionCookieValue("GS1.1.1674921196.3.1.1674921196.0.0.0"),
    ).toEqual({
      ga_session_id: "1674921196",
      ga_session_number: 3,
    });
  });

  it("reads client_id and session from a cookie header", () => {
    const header =
      "_ga=GA1.1.1111111111.2222222222; " +
      `_ga_${DEFAULT_GA_MEASUREMENT_ID.replace(/^G-/, "")}=GS2.1.s1710000000$o2$g0$t1710000001$j10$l0$h0`;
    expect(
      captureGaCheckoutAttributionFromCookies(header, DEFAULT_GA_MEASUREMENT_ID),
    ).toEqual({
      ga_client_id: "1111111111.2222222222",
      ga_session_id: "1710000000",
      ga_session_number: 2,
    });
  });

  it("returns nulls when the session cookie is missing", () => {
    expect(parseGaSessionCookie("_ga=GA1.1.1.2", DEFAULT_GA_MEASUREMENT_ID)).toEqual({
      ga_session_id: null,
      ga_session_number: null,
    });
  });
});

describe("GA id sanitizers", () => {
  it("accepts digit.digit client ids only", () => {
    expect(isValidGaClientId("123.456")).toBe(true);
    expect(isValidGaClientId("supabase.abc")).toBe(false);
    expect(isValidGaClientId("user@example.com")).toBe(false);
    expect(isValidGaClientId(null)).toBe(false);
  });

  it("rejects non-numeric session ids and emails", () => {
    expect(sanitizeGaSessionId("1710000000")).toBe("1710000000");
    expect(sanitizeGaSessionId("user@example.com")).toBeNull();
    expect(sanitizeGaSessionId("s1710000000")).toBeNull();
    expect(sanitizeGaSessionNumber(2)).toBe(2);
    expect(sanitizeGaSessionNumber("0")).toBeNull();
    expect(sanitizeGaSessionNumber("nope")).toBeNull();
  });
});

describe("captureGaCheckoutAttribution", () => {
  it("returns empty ids when analytics consent is absent", async () => {
    await expect(captureGaCheckoutAttribution()).resolves.toEqual({
      ga_client_id: null,
      ga_session_id: null,
      ga_session_number: null,
    });
  });
});
