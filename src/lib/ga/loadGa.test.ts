/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetGaLoaderForTests,
  GA_SCRIPT_ATTR,
  isGaStubReady,
  loadGoogleAnalytics,
} from "./loadGa";
import { __resetGaQueueForTests, flushGaQueue } from "./queue";
import { trackPageView } from "./trackEvent";

const MEASUREMENT_ID = "G-Y7E2CJSKV0";

describe("loadGoogleAnalytics", () => {
  beforeEach(() => {
    __resetGaLoaderForTests();
    __resetGaQueueForTests();
    document.head.innerHTML = "";
    document.body.innerHTML = "";
    window.localStorage.clear();
    delete (window as { gtag?: unknown }).gtag;
    delete (window as { dataLayer?: unknown }).dataLayer;
    delete (window as unknown as Record<string, unknown>)[
      `ga-disable-${MEASUREMENT_ID}`
    ];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates dataLayer + gtag and queues js/config before the external script loads", async () => {
    const appendSpy = vi.spyOn(document.head, "appendChild");

    const pending = loadGoogleAnalytics(MEASUREMENT_ID);

    expect(isGaStubReady()).toBe(true);
    expect(Array.isArray(window.dataLayer)).toBe(true);
    expect(typeof window.gtag).toBe("function");
    expect(
      (window as unknown as Record<string, boolean>)[
        `ga-disable-${MEASUREMENT_ID}`
      ],
    ).toBe(false);

    const script = document.querySelector(
      `script[${GA_SCRIPT_ATTR}="${MEASUREMENT_ID}"]`,
    ) as HTMLScriptElement | null;
    expect(script).not.toBeNull();
    expect(script?.src).toContain(
      `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`,
    );
    expect(appendSpy).toHaveBeenCalled();

    // dataLayer should already contain js + config (Arguments objects)
    expect(window.dataLayer!.length).toBeGreaterThanOrEqual(2);

    script?.onload?.(new Event("load"));
    await pending;
  });

  it("loads the external script only once", async () => {
    const first = loadGoogleAnalytics(MEASUREMENT_ID);
    const second = loadGoogleAnalytics(MEASUREMENT_ID);
    expect(first).toBe(second);

    const scripts = document.querySelectorAll(
      `script[${GA_SCRIPT_ATTR}="${MEASUREMENT_ID}"]`,
    );
    expect(scripts).toHaveLength(1);

    (scripts[0] as HTMLScriptElement).onload?.(new Event("load"));
    await first;
  });

  it("flushes a queued page_view after the stub is installed", async () => {
    window.localStorage.setItem("esatcamp_analytics_consent", "accepted");
    const pushes: unknown[] = [];

    // Start page view before loader — should queue.
    trackPageView("/tools/score-converter");

    const pending = loadGoogleAnalytics(MEASUREMENT_ID);
    // Stub is ready; queue should flush into dataLayer via real gtag.
    flushGaQueue();

    // Intercept further pushes by wrapping gtag
    const original = window.gtag!;
    window.gtag = function wrapped() {
      // eslint-disable-next-line prefer-rest-params
      pushes.push(arguments);
      // eslint-disable-next-line prefer-rest-params
      return original.apply(null, arguments as unknown as []);
    };

    // The initial trackPageView should already have been flushed into dataLayer
    const pageViews = (window.dataLayer || []).filter((entry) => {
      const args = entry as { 0?: string; 1?: string };
      return args?.[0] === "event" && args?.[1] === "page_view";
    });
    expect(pageViews.length).toBe(1);

    const script = document.querySelector(
      `script[${GA_SCRIPT_ATTR}="${MEASUREMENT_ID}"]`,
    ) as HTMLScriptElement;
    script.onload?.(new Event("load"));
    await pending;
  });
});
