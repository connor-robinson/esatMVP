/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  CONSENT_MODE_ACCEPTED,
  CONSENT_MODE_DENIED,
  GCM_DEFAULT_FLAG,
  __resetConsentModeForTests,
  clearGaCookies,
  hasAnalyticsConsent,
  initGoogleConsentDefaults,
  readAnalyticsConsent,
  updateGoogleConsentMode,
  writeAnalyticsConsent,
} from "./consent";
import { sanitizeGaParams } from "./trackEvent";

function dataLayerConsentCalls(): Array<{
  command: string;
  action: string;
  signals: Record<string, unknown>;
}> {
  const layer = window.dataLayer || [];
  return layer
    .map((entry) => {
      const args = entry as { 0?: string; 1?: string; 2?: Record<string, unknown> };
      if (args?.[0] !== "consent") return null;
      return {
        command: String(args[0]),
        action: String(args[1]),
        signals: { ...(args[2] || {}) },
      };
    })
    .filter(Boolean) as Array<{
    command: string;
    action: string;
    signals: Record<string, unknown>;
  }>;
}

describe("analytics consent", () => {
  beforeEach(() => {
    __resetConsentModeForTests();
    window.localStorage.clear();
    delete (window as { gtag?: unknown }).gtag;
    delete (window as { dataLayer?: unknown }).dataLayer;
    delete (window as unknown as Record<string, unknown>)[GCM_DEFAULT_FLAG];
    Object.defineProperty(document, "cookie", {
      configurable: true,
      get: () => "",
      set: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("defaults to pending / no consent", () => {
    expect(readAnalyticsConsent()).toBe("pending");
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it("initialises Consent Mode v2 defaults as all denied without loading scripts", () => {
    const appendSpy = vi.spyOn(document.head, "appendChild");

    initGoogleConsentDefaults();

    expect(typeof window.gtag).toBe("function");
    expect(Array.isArray(window.dataLayer)).toBe(true);
    expect(
      (window as unknown as Record<string, unknown>)[GCM_DEFAULT_FLAG],
    ).toBe(true);

    const defaults = dataLayerConsentCalls().filter((c) => c.action === "default");
    expect(defaults).toHaveLength(1);
    expect(defaults[0].signals).toMatchObject(CONSENT_MODE_DENIED);
    expect(defaults[0].signals.ad_personalization).toBe("denied");

    expect(appendSpy).not.toHaveBeenCalled();
    expect(
      document.querySelectorAll('script[src*="googletagmanager.com"]').length,
    ).toBe(0);

    // Idempotent: second call does not push another default.
    initGoogleConsentDefaults();
    expect(
      dataLayerConsentCalls().filter((c) => c.action === "default"),
    ).toHaveLength(1);
  });

  it("acceptance updates Consent Mode v2 with ad_personalization denied", () => {
    initGoogleConsentDefaults();
    updateGoogleConsentMode("accepted");

    const updates = dataLayerConsentCalls().filter((c) => c.action === "update");
    expect(updates).toHaveLength(1);
    expect(updates[0].signals).toEqual(CONSENT_MODE_ACCEPTED);
    expect(updates[0].signals.analytics_storage).toBe("granted");
    expect(updates[0].signals.ad_storage).toBe("granted");
    expect(updates[0].signals.ad_user_data).toBe("granted");
    expect(updates[0].signals.ad_personalization).toBe("denied");
  });

  it("rejection and withdrawal set all four signals to denied", () => {
    initGoogleConsentDefaults();
    updateGoogleConsentMode("accepted");
    updateGoogleConsentMode("rejected");

    const updates = dataLayerConsentCalls().filter((c) => c.action === "update");
    expect(updates.at(-1)?.signals).toEqual(CONSENT_MODE_DENIED);
  });

  it("remembers accepted and rejected choices", () => {
    writeAnalyticsConsent("accepted");
    expect(readAnalyticsConsent()).toBe("accepted");
    expect(hasAnalyticsConsent()).toBe(true);
    expect(
      window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY),
    ).toBe("accepted");

    writeAnalyticsConsent("rejected");
    expect(readAnalyticsConsent()).toBe("rejected");
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it("clears _ga*, _gcl* and _gac* cookies while keeping other cookies", () => {
    const setter = vi.fn();
    Object.defineProperty(document, "cookie", {
      configurable: true,
      get: () =>
        "_ga=GA1.1.123; _ga_Y7E2CJSKV0=GS1.1.456; _gcl_au=1.2.3; _gac_GB=1.2; session=keep",
      set: setter,
    });

    clearGaCookies();

    const writes = setter.mock.calls.map((call) => String(call[0]));
    expect(writes.some((w) => w.startsWith("_ga="))).toBe(true);
    expect(writes.some((w) => w.startsWith("_ga_Y7E2CJSKV0="))).toBe(true);
    expect(writes.some((w) => w.startsWith("_gcl_au="))).toBe(true);
    expect(writes.some((w) => w.startsWith("_gac_GB="))).toBe(true);
    expect(writes.every((w) => !w.startsWith("session="))).toBe(true);
  });

  it("keeps the consent preference when clearing Google cookies", () => {
    writeAnalyticsConsent("rejected");
    clearGaCookies();
    expect(readAnalyticsConsent()).toBe("rejected");
    expect(
      window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY),
    ).toBe("rejected");
  });
});

describe("sanitizeGaParams", () => {
  it("strips personal-looking keys and emails", () => {
    expect(
      sanitizeGaParams({
        email: "a@b.com",
        page_path: "/tools/score-converter",
        note: "hello@example.com",
        count: 3,
      }),
    ).toEqual({
      page_path: "/tools/score-converter",
      count: 3,
    });
  });
});
