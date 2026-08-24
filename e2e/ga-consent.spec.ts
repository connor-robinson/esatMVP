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
    var cmd = arguments[0];
    var a1 = arguments[1];
    var a2 = arguments[2] || {};
    if (cmd === "config") {
      document.cookie = "_ga=GA1.1.mock." + Date.now() + "; path=/";
      var suffix = String(a1 || "").replace(/^G-/, "");
      document.cookie = "_ga_" + suffix + "=GS1.1.mock; path=/";
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

test.describe("GA4 consent initialization", () => {
  test("gates Google until accept, then sends collect and respects reject", async ({
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

    await page.waitForTimeout(400);
    expect(gtagRequests, "no gtag before consent").toEqual([]);
    expect(collectRequests, "no collect before consent").toEqual([]);
    expect(await page.locator(`script[data-esatcamp-ga]`).count()).toBe(0);
    expect(await page.evaluate(() => typeof window.gtag)).toBe("undefined");

    await page.getByTestId("accept").click();

    await expect
      .poll(() => gtagRequests.some((u) => u.includes("id=G-Y7E2CJSKV0")), {
        timeout: 15_000,
      })
      .toBe(true);
    expect(fulfilledGtag, "mock gtag.js should have been served").toBe(true);

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
    await page.getByTestId("open-prefs").click();
    await page.getByTestId("reject").click();
    await page.getByTestId("track-after-reject").click();
    await page.waitForTimeout(800);
    expect(collectRequests.length).toBe(beforeReject);
  });
});
