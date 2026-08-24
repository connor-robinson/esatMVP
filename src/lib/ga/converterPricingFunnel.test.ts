/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { __resetGaQueueForTests } from "./queue";
import { __resetFunnelOnceForTests, trackEventOnce } from "./funnel";
import { trackEvent } from "./trackEvent";

function stubWindow(opts: {
  consent?: "accepted" | "rejected";
  gtag?: ReturnType<typeof vi.fn>;
}) {
  const store = new Map<string, string>();
  if (opts.consent) store.set("esatcamp_analytics_consent", opts.consent);
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    },
    sessionStorage: {
      getItem: (key: string) => store.get(`s:${key}`) ?? null,
      setItem: (key: string, value: string) => {
        store.set(`s:${key}`, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    },
    dispatchEvent: vi.fn(),
    gtag: opts.gtag,
    location: {
      origin: "https://esatcamp.com",
      hostname: "esatcamp.com",
      pathname: "/tools/score-converter",
    },
  });
  vi.stubGlobal("document", { title: "ESAT score converter" });
}

describe("converter → pricing funnel GA events", () => {
  afterEach(() => {
    __resetGaQueueForTests();
    __resetFunnelOnceForTests();
    vi.unstubAllGlobals();
  });

  it("blocks new funnel events without consent", () => {
    const gtag = vi.fn();
    stubWindow({ gtag });
    trackEvent("converter_offer_viewed", {
      exam: "NSAA",
      subject: "Physics",
      source_page: "/tools/score-converter",
    });
    trackEvent("converter_free_practice_started", {
      exam: "NSAA",
      subject: "Physics",
      source_page: "/tools/score-converter",
    });
    trackEvent("pricing_viewed", { source_page: "/tools/score-converter" });
    trackEvent("checkout_signup_required", {
      selected_plan: "monthly",
      source_page: "/pricing",
    });
    expect(gtag).not.toHaveBeenCalled();
  });

  it("sends converter_offer_viewed without marks or PII", () => {
    const gtag = vi.fn();
    stubWindow({ consent: "accepted", gtag });
    trackEvent("converter_offer_viewed", {
      exam: "NSAA",
      subject: "Physics",
      source_page: "/tools/score-converter",
      raw_mark: 18,
      email: "no@example.com",
    });
    expect(gtag).toHaveBeenCalledWith(
      "event",
      "converter_offer_viewed",
      expect.objectContaining({
        exam: "NSAA",
        subject: "Physics",
        source_page: "/tools/score-converter",
      }),
    );
    const params = gtag.mock.calls[0]![2] as Record<string, unknown>;
    expect(params.raw_mark).toBeUndefined();
    expect(params.email).toBeUndefined();
  });

  it("sends converter_free_practice_started with subject and exam", () => {
    const gtag = vi.fn();
    stubWindow({ consent: "accepted", gtag });
    trackEvent("converter_free_practice_started", {
      cta_name: "start_free_practice",
      destination: "/questions/questionbank?startSubject=Physics",
      exam: "NSAA",
      subject: "Physics",
      source_page: "/tools/score-converter",
    });
    expect(gtag).toHaveBeenCalledWith(
      "event",
      "converter_free_practice_started",
      expect.objectContaining({
        exam: "NSAA",
        subject: "Physics",
        source_page: "/tools/score-converter",
      }),
    );
  });

  it("dedupes pricing_viewed once per tab", () => {
    const gtag = vi.fn();
    stubWindow({ consent: "accepted", gtag });
    expect(
      trackEventOnce("pricing_viewed", "pricing_viewed", {
        source_page: "/tools/score-converter",
      }),
    ).toBe(true);
    expect(
      trackEventOnce("pricing_viewed", "pricing_viewed", {
        source_page: "/tools/score-converter",
      }),
    ).toBe(false);
    expect(gtag).toHaveBeenCalledTimes(1);
  });

  it("sends checkout_signup_required with selected_plan", () => {
    const gtag = vi.fn();
    stubWindow({ consent: "accepted", gtag });
    trackEvent("checkout_signup_required", {
      selected_plan: "monthly",
      source_page: "/pricing",
    });
    expect(gtag).toHaveBeenCalledWith(
      "event",
      "checkout_signup_required",
      expect.objectContaining({
        selected_plan: "monthly",
        source_page: "/pricing",
      }),
    );
  });
});
