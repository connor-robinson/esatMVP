import { test, expect, devices } from "@playwright/test";

/**
 * Opt-in production smoke: PLAYWRIGHT_PROD_SMOKE=1 npx playwright test e2e/webkit-prod-nav-smoke.spec.ts --browser=webkit
 */
test.skip(
  !process.env.PLAYWRIGHT_PROD_SMOKE,
  "Set PLAYWRIGHT_PROD_SMOKE=1 to run against https://esatcamp.com",
);

test.use({
  ...devices["iPhone 13"],
  baseURL: "https://esatcamp.com",
});

const routes = [
  "/mental-maths/drill",
  "/past-papers/roadmap",
  "/questions",
  "/exam-tools/calibration/math-1",
];

test("anonymous WebKit navigation does not show global error screen", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));

  for (const route of routes) {
    await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(1500);
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/Something went wrong/i);
  }

  expect(
    pageErrors.filter((m) => /requestIdleCallback/i.test(m)),
  ).toHaveLength(0);
});
