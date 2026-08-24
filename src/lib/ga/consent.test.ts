import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  clearGaCookies,
  hasAnalyticsConsent,
  readAnalyticsConsent,
  writeAnalyticsConsent,
} from "./consent";
import { sanitizeGaParams } from "./trackEvent";

describe("analytics consent", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
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
      dispatchEvent: vi.fn(),
      location: { hostname: "esatcamp.com" },
    });
    vi.stubGlobal("document", {
      cookie: "",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("defaults to pending / no consent", () => {
    expect(readAnalyticsConsent()).toBe("pending");
    expect(hasAnalyticsConsent()).toBe(false);
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

  it("clears _ga and _ga_* cookies on reject path helper", () => {
    document.cookie = "_ga=GA1.1.123; _ga_Y7E2CJSKV0=GS1.1.456; session=keep";
    // jsdom-style document.cookie assignment often keeps only the last write;
    // simulate a readable cookie string instead.
    Object.defineProperty(document, "cookie", {
      configurable: true,
      get: () =>
        "_ga=GA1.1.123; _ga_Y7E2CJSKV0=GS1.1.456; session=keep",
      set: vi.fn(),
    });

    clearGaCookies();

    const setter = Object.getOwnPropertyDescriptor(document, "cookie")
      ?.set as ReturnType<typeof vi.fn>;
    const writes = setter.mock.calls.map((call) => String(call[0]));
    expect(writes.some((w) => w.startsWith("_ga="))).toBe(true);
    expect(writes.some((w) => w.startsWith("_ga_Y7E2CJSKV0="))).toBe(true);
    expect(writes.every((w) => !w.startsWith("session="))).toBe(true);
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
