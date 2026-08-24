import { expect, test } from "@playwright/test";

/**
 * Minimal gtag.js stand-in.
 * The app still requests the real googletagmanager URL after consent; we fulfill
 * it so collect/cookies do not depend on live Google or ad blockers.
 */
const MOCK_GTAG_JS = `
(function () {
  function sendCollect(params) {
    var q = new URLSearchParams(params).toString();
    var url = "https://www.google-analytics.com/g/collect?" + q;
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url);
    } else {
      fetch(url, { mode: "no-cors", keepalive: true }).catch(function () {});
    }
  }
  function handle() {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(arguments);
    var cmd = arguments[0];
    var a1 = arguments[1];
    var a2 = arguments[2] || {};
    if (cmd === "config") {
      document.cookie = "_ga=GA1.1.mock." + Date.now() + "; path=/";
      var suffix = String(a1 || "").replace(/^G-/, "");
      document.cookie = "_ga_" + suffix + "=GS1.1.mock; path=/";
      document.cookie = "_gcl_au=1.2.3.mock; path=/";
      return;
    }
    if (cmd === "event" && a1 === "page_view") {
      sendCollect({
        v: "2",
        tid: "G-Y7E2CJSKV0",
        en: "page_view",
        dl: a2.page_location || location.href,
        dp: a2.page_path || location.pathname,
      });
    }
  }
  var previous = window.dataLayer ? window.dataLayer.slice() : [];
  window.dataLayer = window.dataLayer || [];
  window.gtag = handle;
  for (var i = 0; i < previous.length; i++) {
    var entry = previous[i];
    if (entry && typeof entry.length === "number") {
      handle.apply(null, Array.prototype.slice.call(entry));
    }
  }
})();
`;

function isGtagRequest(url: string): boolean {
  return url.includes("googletagmanager.com/gtag/js");
}

function isCollectRequest(url: string): boolean {
  return url.includes("/g/collect");
}

function isPageViewCollect(url: string): boolean {
  return isCollectRequest(url) && url.includes("en=page_view");
}

test.describe("GA4 Consent Mode v2 initialization", () => {
  test("defaults denied, gates Google until accept, then respects reject", async ({
    page,
    context,
  }) => {
    await context.clearCookies();
    await page.addInitScript(() => {
      try {
        localStorage.removeItem("esatcamp_analytics_consent");
      } catch {
        /* ignore */
      }
    });

    let fulfilledGtag = false;
    await page.route(/googletagmanager\.com\/gtag\/js/, async (route) => {
      fulfilledGtag = true;
      await route.fulfill({
        status: 200,
        contentType: "application/javascript; charset=utf-8",
        body: MOCK_GTAG_JS,
      });
    });

    const gtagRequests: string[] = [];
    const collectRequests: string[] = [];
    const pageViewCollects: string[] = [];

    page.on("request", (request) => {
      const url = request.url();
      if (isGtagRequest(url)) gtagRequests.push(url);
      if (isCollectRequest(url)) {
        collectRequests.push(url);
        if (isPageViewCollect(url)) pageViewCollects.push(url);
      }
    });

    await page.goto("/ga-consent.html");
    await expect(page.getByTestId("cookie-banner")).toBeVisible();

    const beforeAccept = await page.evaluate(() => {
      const layer = Array.isArray(window.dataLayer) ? window.dataLayer : [];
      return {
        gtagType: typeof window.gtag,
        scriptCount: document.querySelectorAll("script[data-esatcamp-ga]").length,
        consent: layer
          .map((entry) => {
            const args = entry as {
              0?: string;
              1?: string;
              2?: Record<string, unknown>;
            };
            if (args?.[0] !== "consent") return null;
            return {
              action: String(args[1]),
              signals: { ...(args[2] || {}) },
            };
          })
          .filter(Boolean),
      };
    });

    expect(beforeAccept.gtagType).toBe("function");
    expect(beforeAccept.scriptCount).toBe(0);
    const defaultEntry = (
      beforeAccept.consent as Array<{
        action: string;
        signals: Record<string, unknown>;
      }>
    ).find((c) => c.action === "default");
    expect(defaultEntry?.signals).toMatchObject({
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });

    await page.waitForTimeout(400);
    expect(gtagRequests, "no gtag.js before consent").toEqual([]);
    expect(collectRequests, "no collect before consent").toEqual([]);

    await page.getByTestId("accept").click();

    await expect
      .poll(() => gtagRequests.some((u) => u.includes("id=G-Y7E2CJSKV0")), {
        timeout: 15_000,
      })
      .toBe(true);
    expect(fulfilledGtag, "mock gtag.js should have been served").toBe(true);

    const afterAcceptConsent = await page.evaluate(() => {
      const layer = Array.isArray(window.dataLayer) ? window.dataLayer : [];
      return layer
        .map((entry) => {
          const args = entry as {
            0?: string;
            1?: string;
            2?: Record<string, unknown>;
          };
          if (args?.[0] !== "consent" || args?.[1] !== "update") return null;
          return { ...(args[2] || {}) };
        })
        .filter(Boolean);
    });
    expect(afterAcceptConsent[0]).toEqual({
      analytics_storage: "granted",
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "denied",
    });

    await expect
      .poll(async () => {
        const state = await page.evaluate(() => ({
          gtagType: typeof window.gtag,
          cookie: document.cookie,
          dlLen: Array.isArray(window.dataLayer) ? window.dataLayer.length : -1,
        }));
        return (
          state.gtagType === "function" &&
          state.cookie.includes("_ga") &&
          pageViewCollects.length
        );
      }, { timeout: 15_000 })
      .toBeTruthy();

    expect(pageViewCollects.length).toBeGreaterThanOrEqual(1);
    // Initial path should be a single page_view.
    expect(pageViewCollects).toHaveLength(1);

    const cookies = await context.cookies();
    expect(
      cookies.some((c) => c.name === "_ga" || c.name.startsWith("_ga_")),
    ).toBe(true);

    await page.getByTestId("nav-about").click();
    await expect
      .poll(() => pageViewCollects.length, { timeout: 10_000 })
      .toBe(2);

    await page.getByTestId("nav-about").click();
    await page.waitForTimeout(800);
    expect(pageViewCollects, "one page_view per URL").toHaveLength(2);

    const beforeReject = collectRequests.length;
    await page.evaluate(() => {
      document.cookie = "_gcl_au=keep-until-reject; path=/";
      document.cookie = "_gac_GB=keep-until-reject; path=/";
    });
    await page.getByTestId("open-prefs").click();
    await page.getByTestId("reject").click();

    const afterReject = await page.evaluate(() => ({
      consent: localStorage.getItem("esatcamp_analytics_consent"),
      cookie: document.cookie,
      updates: (window.dataLayer || [])
        .map((entry) => {
          const args = entry as {
            0?: string;
            1?: string;
            2?: Record<string, unknown>;
          };
          if (args?.[0] !== "consent" || args?.[1] !== "update") return null;
          return { ...(args[2] || {}) };
        })
        .filter(Boolean),
    }));

    expect(afterReject.consent).toBe("rejected");
    expect(afterReject.updates.at(-1)).toEqual({
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    expect(afterReject.cookie.includes("_ga")).toBe(false);
    expect(afterReject.cookie.includes("_gcl_au")).toBe(false);
    expect(afterReject.cookie.includes("_gac_GB")).toBe(false);

    await page.getByTestId("track-after-reject").click();
    await page.waitForTimeout(800);
    expect(collectRequests.length).toBe(beforeReject);
  });
});
