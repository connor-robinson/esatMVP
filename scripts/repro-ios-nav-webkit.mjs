import { webkit, devices } from "@playwright/test";

const BASE = "https://esatcamp.com";
const ROUTES = [
  "/mental-maths/drill",
  "/past-papers/roadmap",
  "/questions",
  "/exam-tools/calibration/math-1",
  "/profile",
  "/",
];

async function run(browser, label, { device, injectStaleSW }) {
  const context = await browser.newContext({ ...devices[device] });
  const page = await context.newPage();
  const consoleMsgs = [];
  const pageErrors = [];
  const failed = [];

  page.on("console", (m) => consoleMsgs.push({ type: m.type(), text: m.text() }));
  page.on("pageerror", (e) => pageErrors.push({ message: e.message, stack: e.stack }));
  page.on("requestfailed", (r) =>
    failed.push({ url: r.url(), err: r.failure()?.errorText }),
  );

  await page.goto(BASE + ROUTES[0], {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForTimeout(2500);

  if (injectStaleSW) {
    // Same-origin SW must come from the origin. Use a data URL won't work for SW.
    // Instead, install via page.evaluate registering /sw.js if it becomes JS, else
    // simulate Cache Storage pollution with next-static-looking entries after fetch.
    await page.evaluate(async () => {
      try {
        if (!("caches" in window)) return;
        const cache = await caches.open("esat-stale-v1");
        const sample = [...document.querySelectorAll('script[src*="/_next/static/"]')]
          .map((s) => s.src)
          .slice(0, 5);
        for (const url of sample) {
          await cache.put(
            url,
            new Response("/* stale chunk */", {
              status: 200,
              headers: { "content-type": "application/javascript" },
            }),
          );
        }
        window.__cachePoison = sample;
      } catch (e) {
        window.__cachePoisonError = String(e);
      }

      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        window.__existingRegs = regs.map((r) => r.active?.scriptURL || r.scope);
      } catch (e) {
        window.__existingRegsError = String(e);
      }
    });
  }

  const swInfo = await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return { supported: false };
    const regs = await navigator.serviceWorker.getRegistrations();
    const keys = "caches" in window ? await caches.keys() : [];
    return {
      supported: true,
      controller: navigator.serviceWorker.controller
        ? navigator.serviceWorker.controller.scriptURL
        : null,
      regs: regs.map((r) => ({
        scope: r.scope,
        active: r.active?.scriptURL,
        waiting: r.waiting?.scriptURL,
        installing: r.installing?.scriptURL,
      })),
      caches: keys,
      cachePoison: window.__cachePoison || null,
      cachePoisonError: window.__cachePoisonError || null,
      existingRegs: window.__existingRegs || null,
    };
  });

  const navResults = [];
  for (const route of ROUTES) {
    const before = pageErrors.length;
    try {
      await page.goto(BASE + route, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      await page.waitForTimeout(2000);
      const bodyText = await page.locator("body").innerText().catch(() => "");
      const hasError = /Something went wrong/i.test(bodyText);
      navResults.push({
        route,
        hasError,
        title: await page.title(),
        url: page.url(),
        newPageErrors: pageErrors.slice(before).map((e) => e.message),
      });
    } catch (e) {
      navResults.push({ route, crash: String(e) });
    }
  }

  // Client navigations via in-app links (more realistic for App Router chunk loads)
  const clientNav = [];
  try {
    await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60_000 });
    await page.waitForTimeout(1500);
    for (const href of [
      "/mental-maths/drill",
      "/past-papers/roadmap",
      "/questions",
      "/exam-tools/calibration/math-1",
    ]) {
      const before = pageErrors.length;
      const clicked = await page
        .locator(`a[href="${href}"], a[href^="${href}?"]`)
        .first()
        .click({ timeout: 5000 })
        .then(() => true)
        .catch(() => false);
      if (!clicked) {
        await page.evaluate((h) => {
          const a = document.createElement("a");
          a.href = h;
          a.textContent = "nav";
          document.body.appendChild(a);
          a.click();
        }, href);
      }
      await page.waitForTimeout(2500);
      const bodyText = await page.locator("body").innerText().catch(() => "");
      clientNav.push({
        href,
        clicked,
        url: page.url(),
        hasError: /Something went wrong/i.test(bodyText),
        newPageErrors: pageErrors.slice(before).map((e) => e.message),
      });
    }
  } catch (e) {
    clientNav.push({ crash: String(e) });
  }

  const out = {
    label,
    swInfo,
    navResults,
    clientNav,
    pageErrors: pageErrors.slice(0, 25),
    failedSample: failed
      .filter((f) => /_next|sw\.js|chunk/i.test(f.url))
      .slice(0, 40),
    goTrue: consoleMsgs.filter((m) => /GoTrueClient|Multiple/i.test(m.text)).slice(0, 8),
    chunkRelated: [
      ...pageErrors.filter((e) => /ChunkLoad|loading chunk/i.test(e.message)),
      ...consoleMsgs.filter((m) => /ChunkLoad|loading chunk/i.test(m.text)),
    ].slice(0, 10),
    swRelatedConsole: consoleMsgs
      .filter((m) => /service worker|sw\.js|MIME|Failed to register/i.test(m.text))
      .slice(0, 15),
    consoleErrors: consoleMsgs.filter((m) => m.type === "error").slice(0, 20),
  };

  await context.close();
  return out;
}

const browser = await webkit.launch();
const results = [];
results.push(
  await run(browser, "webkit-desktop-fresh", {
    device: "Desktop Safari",
    injectStaleSW: false,
  }),
);
results.push(
  await run(browser, "webkit-iphone-fresh", {
    device: "iPhone 13",
    injectStaleSW: false,
  }),
);
results.push(
  await run(browser, "webkit-desktop-cache-poison", {
    device: "Desktop Safari",
    injectStaleSW: true,
  }),
);
console.log(JSON.stringify(results, null, 2));
await browser.close();
