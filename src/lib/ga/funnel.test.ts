/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetGaQueueForTests } from "./queue";
import { __resetFunnelOnceForTests, trackEventOnce } from "./funnel";
import { trackEvent } from "./trackEvent";

function stubWindow(opts: {
  consent?: "accepted" | "rejected";
  gtag?: ReturnType<typeof vi.fn>;
  path?: string;
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
        store.delete(`s:${key}`);
      },
    },
    dispatchEvent: vi.fn(),
    gtag: opts.gtag,
    location: {
      origin: "https://esatcamp.com",
      hostname: "esatcamp.com",
      pathname: opts.path ?? "/tools/score-converter",
    },
  });
  vi.stubGlobal("document", { title: "ESAT score converter" });
}

describe("funnel events", () => {
  afterEach(() => {
    __resetGaQueueForTests();
    __resetFunnelOnceForTests();
    vi.unstubAllGlobals();
  });

  it("blocks funnel events without consent", () => {
    const gtag = vi.fn();
    stubWindow({ gtag });
    trackEvent("score_conversion_completed", {
      exam: "NSAA",
      paper_year: 2023,
      section: "multi",
      subject: "Maths|Physics",
      converter_page: "/tools/score-converter",
    });
    trackEvent("converter_cta_click", {
      cta_name: "try_question_bank",
      destination: "/questions/questionbank",
      exam: "NSAA",
      converter_page: "/tools/score-converter",
    });
    trackEvent("sign_up_started", {
      source_page: "/tools/score-converter",
      signup_method: "google",
    });
    trackEvent("begin_checkout", { plan_type: "monthly", currency: "GBP" });
    expect(gtag).not.toHaveBeenCalled();
  });

  it("sends score_conversion_completed with coarse params only", () => {
    const gtag = vi.fn();
    stubWindow({ consent: "accepted", gtag });
    trackEvent("score_conversion_completed", {
      exam: "NSAA",
      paper_year: 2023,
      section: "Section 1: Part A (Maths & Physics)",
      subject: "Maths & Physics",
      converter_page: "/tools/score-converter",
      email: "should@not.send",
      raw_mark: 18,
    });
    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag).toHaveBeenCalledWith(
      "event",
      "score_conversion_completed",
      expect.objectContaining({
        exam: "NSAA",
        paper_year: 2023,
        section: "Section 1: Part A (Maths & Physics)",
        subject: "Maths & Physics",
        converter_page: "/tools/score-converter",
      }),
    );
    const params = gtag.mock.calls[0]![2] as Record<string, unknown>;
    expect(params.email).toBeUndefined();
    expect(params.raw_mark).toBeUndefined();
  });

  it("allows repeated genuine score conversions", () => {
    const gtag = vi.fn();
    stubWindow({ consent: "accepted", gtag });
    trackEvent("score_conversion_completed", {
      exam: "TMUA",
      paper_year: 2024,
      section: "Paper 1",
      subject: "Mathematical Thinking",
      converter_page: "/tools/score-converter/tmua",
    });
    trackEvent("score_conversion_completed", {
      exam: "TMUA",
      paper_year: 2024,
      section: "Paper 1",
      subject: "Mathematical Thinking",
      converter_page: "/tools/score-converter/tmua",
    });
    expect(gtag).toHaveBeenCalledTimes(2);
  });

  it("dedupes once-keyed events such as calibration_started / sign_up", () => {
    const gtag = vi.fn();
    stubWindow({ consent: "accepted", gtag });
    expect(
      trackEventOnce("calibration_started:abc", "calibration_started", {
        module: "math-1",
        source_page: "/tools/score-converter",
      }),
    ).toBe(true);
    expect(
      trackEventOnce("calibration_started:abc", "calibration_started", {
        module: "math-1",
        source_page: "/tools/score-converter",
      }),
    ).toBe(false);
    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag).toHaveBeenCalledWith(
      "event",
      "calibration_started",
      expect.objectContaining({
        module: "math-1",
        source_page: "/tools/score-converter",
      }),
    );
  });

  it("does not enqueue once-events without consent", () => {
    const gtag = vi.fn();
    stubWindow({ gtag });
    expect(
      trackEventOnce("sign_up:user1", "sign_up", { method: "google" }),
    ).toBe(false);
    stubWindow({ consent: "accepted", gtag });
    // Previous once-key must not have been reserved without consent.
    expect(
      trackEventOnce("sign_up:user1", "sign_up", {
        method: "google",
        source_page: "/pricing",
      }),
    ).toBe(true);
    expect(gtag).toHaveBeenCalledWith(
      "event",
      "sign_up",
      expect.objectContaining({ method: "google", source_page: "/pricing" }),
    );
  });

  it("sends recommended ecommerce purchase params after payment", () => {
    const gtag = vi.fn();
    stubWindow({ consent: "accepted", gtag });
    trackEvent("purchase", {
      transaction_id: "cs_test_123",
      value: 49.0,
      currency: "GBP",
      plan_type: "season_pass",
    });
    expect(gtag).toHaveBeenCalledWith(
      "event",
      "purchase",
      expect.objectContaining({
        transaction_id: "cs_test_123",
        value: 49,
        currency: "GBP",
      }),
    );
  });

  it("sends begin_checkout only via trackEvent (caller gates on Stripe URL)", () => {
    const gtag = vi.fn();
    stubWindow({ consent: "accepted", gtag });
    trackEvent("begin_checkout", { plan_type: "monthly", currency: "GBP" });
    expect(gtag).toHaveBeenCalledWith(
      "event",
      "begin_checkout",
      expect.objectContaining({ plan_type: "monthly", currency: "GBP" }),
    );
  });
});

describe("funnel source helpers", () => {
  beforeEach(() => {
    __resetFunnelOnceForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("remembers and reads source page without query strings", async () => {
    stubWindow({ consent: "accepted" });
    const {
      rememberGaSourcePage,
      readGaSourcePage,
      markConverterResultSeen,
      hasSeenConverterResult,
      readLastConverterExam,
    } = await import("./funnel");

    rememberGaSourcePage("/tools/score-converter?x=1#y");
    expect(readGaSourcePage()).toBe("/tools/score-converter");
    markConverterResultSeen("ENGAA");
    expect(hasSeenConverterResult()).toBe(true);
    expect(readLastConverterExam()).toBe("ENGAA");
  });
});
