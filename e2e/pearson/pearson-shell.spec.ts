/**
 * Static HTML fixture for Pearson shell visual / behaviour smoke tests.
 */
import { test, expect } from "@playwright/test";

test.describe("Pearson shell fixture", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/pearson-shell.html");
  });

  test("shows N of M question counter", async ({ page }) => {
    await expect(page.getByText("1 of 3")).toBeVisible();
  });

  test("Flag for Review toggles filled state", async ({ page }) => {
    const flag = page.getByRole("button", { name: /Flag for Review/i });
    await flag.click();
    await expect(flag).toHaveAttribute("data-flagged", "true");
    await flag.click();
    await expect(flag).toHaveAttribute("data-flagged", "false");
  });

  test("Unseen Content blocks Next until scrolled", async ({ page }) => {
    await page.getByRole("button", { name: /^Next/ }).click();
    await expect(page.getByRole("heading", { name: "Unseen Content" })).toBeVisible();
    await page.getByRole("button", { name: "OK" }).click();
    await expect(page.getByRole("heading", { name: "Unseen Content" })).toHaveCount(0);
  });

  test("Alt+N triggers Next when content viewed", async ({ page }) => {
    await page.evaluate(() => {
      const vp = document.querySelector("[data-testid=viewport]");
      if (vp) (vp as HTMLElement).dataset.viewed = "true";
    });
    await page.keyboard.press("Alt+n");
    await expect(page.getByText("2 of 3")).toBeVisible();
  });

  test("color scheme changes content background", async ({ page }) => {
    await page.selectOption("#colour-scheme", "black-on-light-yellow");
    const root = page.locator("[data-testid=pearson-root]");
    await expect(root).toHaveAttribute("data-colour-scheme", "black-on-light-yellow");
  });
});
