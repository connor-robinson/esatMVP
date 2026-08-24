import { afterEach, describe, expect, it, vi } from "vitest";
import { __resetGaQueueForTests } from "./queue";
import { flushGaQueue, trackEvent, trackPageView } from "./trackEvent";

function stubWindow(opts: {
  consent?: "accepted" | "rejected";
  gtag?: ReturnType<typeof vi.fn>;
}) {
  const store = new Map<string, string>();
  if (opts.consent) store.set("esatcamp_analytics_consent", opts.consent);
  const gtag = opts.gtag;
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    },
    dispatchEvent: vi.fn(),
    gtag,
    location: { origin: "https://esatcamp.com", hostname: "esatcamp.com" },
  });
  vi.stubGlobal("document", { title: "Score converter" });
}

describe("GA tracking consent gate", () => {
  afterEach(() => {
    __resetGaQueueForTests();
    vi.unstubAllGlobals();
  });

  it("does not call gtag before consent", () => {
    const gtag = vi.fn();
    stubWindow({ gtag });
    trackPageView("/tools/score-converter");
    trackEvent("cta_clicked", { placement: "hero" });
    expect(gtag).not.toHaveBeenCalled();
  });

  it("does not call gtag when analytics is rejected", () => {
    const gtag = vi.fn();
    stubWindow({ consent: "rejected", gtag });
    trackPageView("/tools/score-converter");
    expect(gtag).not.toHaveBeenCalled();
  });

  it("sends a single page_view event after acceptance", () => {
    const gtag = vi.fn();
    stubWindow({ consent: "accepted", gtag });
    trackPageView("/tools/score-converter");
    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag).toHaveBeenCalledWith("event", "page_view", {
      page_path: "/tools/score-converter",
      page_location: "https://esatcamp.com/tools/score-converter",
      page_title: "Score converter",
    });
  });

  it("queues calls until gtag is ready, then flushes once", () => {
    stubWindow({ consent: "accepted" });
    trackPageView("/about");
    const gtag = vi.fn();
    window.gtag = gtag;
    flushGaQueue();
    expect(gtag).toHaveBeenCalledTimes(1);
    flushGaQueue();
    expect(gtag).toHaveBeenCalledTimes(1);
  });
});
