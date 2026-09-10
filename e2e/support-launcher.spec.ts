import { expect, test } from "@playwright/test";

test("opens, closes, and submits from keyboard on desktop", async ({ page }) => {
  await page.goto("/support-launcher.html");
  const help = page.getByRole("button", { name: "Help" });
  await expect(help).toBeVisible();
  await help.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "esatcamp@gmail.com" }),
  ).toHaveAttribute("href", "mailto:esatcamp@gmail.com");

  await page.getByLabel("Subject").fill("Timer issue");
  await page.getByLabel("Message").fill("It froze on question 2");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("Request received")).toBeVisible();

  await page.goto("/support-launcher.html");
  await page.getByRole("button", { name: "Help" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
});

test.describe("iPhone-sized viewport", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });

  test("keeps Help button clear of safe edges and usable", async ({ page }) => {
    await page.goto("/support-launcher.html");
    const help = page.getByRole("button", { name: "Help" });
    await expect(help).toBeVisible();
    const box = await help.boundingBox();
    expect(box).toBeTruthy();
    if (!box) return;
    const viewport = page.viewportSize();
    expect(viewport).toBeTruthy();
    if (!viewport) return;
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width - 8);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height - 8);
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);

    await help.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByLabel("Subject").fill("Mobile bug");
    await page.getByLabel("Message").fill("Hard to tap submit");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByText("Request received")).toBeVisible();
  });
});
