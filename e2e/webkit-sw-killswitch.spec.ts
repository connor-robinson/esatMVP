import { test, expect } from "@playwright/test";
import path from "path";
import { readFileSync } from "fs";

const SW_SOURCE = readFileSync(
  path.resolve(__dirname, "../public/sw.js"),
  "utf8",
);

test("WebKit: stale SW cache is cleared by kill-switch without touching paper-assets", async ({
  page,
}) => {
  await page.route("**/sw.js**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/javascript; charset=utf-8",
      body: SW_SOURCE,
    });
  });

  await page.goto("/ga-consent.html");

  const result = await page.evaluate(async () => {
    const cache = await caches.open("esat-stale-v1");
    await cache.put(
      "/_next/static/chunks/fake.js",
      new Response("stale", {
        headers: { "content-type": "application/javascript" },
      }),
    );
    await caches.open("paper-assets-v1");

    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
    await new Promise((r) => setTimeout(r, 800));

    const regs = await navigator.serviceWorker.getRegistrations();
    const keys = await caches.keys();
    return {
      regCount: regs.length,
      keys,
    };
  });

  expect(result.keys).not.toContain("esat-stale-v1");
  expect(result.keys).toContain("paper-assets-v1");
  // Kill-switch unregisters itself. Controlled pages may keep a controller
  // until the next navigation, but getRegistrations() should be empty.
  expect(result.regCount).toBe(0);

  await page.reload({ waitUntil: "domcontentloaded" });
  const afterRegs = await page.evaluate(async () => {
    const regs = await navigator.serviceWorker.getRegistrations();
    return {
      controller: navigator.serviceWorker.controller?.scriptURL ?? null,
      regCount: regs.length,
      keys: await caches.keys(),
    };
  });
  expect(afterRegs.regCount).toBe(0);
  expect(afterRegs.controller).toBeNull();
  expect(afterRegs.keys).toContain("paper-assets-v1");
  expect(afterRegs.keys).not.toContain("esat-stale-v1");
});
