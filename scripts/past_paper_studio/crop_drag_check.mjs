/**
 * Verifies the studio crop editor with real pointer drags.
 *
 * Start the studio first:
 *   python -m scripts.past_paper_studio.server --port 8790 --no-browser
 * Then:
 *   node scripts/past_paper_studio/crop_drag_check.mjs [questionId]
 *
 * Nothing is saved: the run always cancels out of the modal.
 */

import { chromium } from "@playwright/test";

const BASE = process.env.STUDIO_URL || "http://127.0.0.1:8790";
const QUESTION_ID = process.argv[2] || "2119";
const CHANNEL = process.env.PLAYWRIGHT_CHANNEL || "chrome";

const results = [];
function check(label, passed, detail = "") {
  results.push({ label, passed, detail });
  console.log(`  [${passed ? "ok" : "FAIL"}] ${label}${detail ? ` — ${detail}` : ""}`);
}

async function readBox(page) {
  return page.$$eval(".num-grid input", (inputs) => inputs.map((input) => Number(input.value)));
}

/** The preview is server-rendered, so wait for the new PNG to decode. */
async function previewSize(page) {
  try {
    await page
      .locator(".preview-box img")
      .evaluate(
        (img) =>
          img.naturalWidth > 0 ||
          new Promise((resolve, reject) => {
            img.addEventListener("load", () => resolve(true), { once: true });
            img.addEventListener("error", reject, { once: true });
          }),
        { timeout: 15000 },
      );
    return page
      .locator(".preview-box img")
      .evaluate((img) => ({ w: img.naturalWidth, h: img.naturalHeight }));
  } catch (error) {
    return null;
  }
}

async function dragHandle(page, handle, dx, dy) {
  const target = page.locator(`.handle.${handle}`);
  const box = await target.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  // Several small steps so pointermove fires like a real drag.
  for (let step = 1; step <= 6; step += 1) {
    await page.mouse.move(
      box.x + box.width / 2 + (dx * step) / 6,
      box.y + box.height / 2 + (dy * step) / 6,
    );
  }
  await page.mouse.up();
  await page.waitForTimeout(450);
}

async function main() {
  const browser = await chromium.launch({ channel: CHANNEL });
  const page = await browser.newPage({ viewport: { width: 1700, height: 1000 } });
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  try {
    await page.goto(`${BASE}/review?questionId=${QUESTION_ID}`, { waitUntil: "networkidle" });
    await page.waitForSelector(".asset-row", { timeout: 20000 });

    console.log("\n--- open crop editor ---");
    await page.locator(".asset-row button.primary").first().click();
    await page.waitForSelector(".crop-stage .crop-rect", { timeout: 20000 });
    await page.waitForTimeout(900);

    const imageOk = await page.$eval(".crop-img", (img) => img.naturalWidth > 0);
    check("source screenshot loaded in editor", imageOk);
    check(
      "no load-failure banner",
      await page.$eval(".crop-side, .crop-scroll", () => true) &&
        (await page.locator(".crop-scroll .banner.err").evaluate((node) => node.style.display)) ===
          "none",
    );
    const initialPreview = await previewSize(page);
    check(
      "live preview rendered",
      Boolean(initialPreview && initialPreview.w > 0),
      initialPreview ? `${initialPreview.w}x${initialPreview.h}` : "no image",
    );
    check("eight drag handles present", (await page.locator(".handle").count()) === 8);

    const start = await readBox(page);
    console.log(`  start box: ${start.join(", ")}`);

    console.log("\n--- drag south-east handle outward ---");
    await dragHandle(page, "se", 120, 90);
    const grown = await readBox(page);
    console.log(`  box now : ${grown.join(", ")}`);
    check("width grew", grown[2] > start[2], `${start[2]} -> ${grown[2]}`);
    check("height grew", grown[3] > start[3], `${start[3]} -> ${grown[3]}`);
    check("origin unchanged by se drag", grown[0] === start[0] && grown[1] === start[1]);

    console.log("\n--- drag north-west handle past the page edge ---");
    await dragHandle(page, "nw", -420, -260);
    const beyond = await readBox(page);
    console.log(`  box now : ${beyond.join(", ")}`);
    check("x went negative (left of page)", beyond[0] < 0, `x=${beyond[0]}`);
    check("y went negative (above page)", beyond[1] < 0, `y=${beyond[1]}`);
    const readout = await page.locator(".crop-side .mono").innerText();
    console.log(`  readout : ${readout}`);
    check("readout warns about padding", readout.includes("extends past the page"));

    const paddedPreview = await previewSize(page);
    check(
      "padded preview rendered",
      Boolean(paddedPreview && paddedPreview.w > 0),
      paddedPreview ? `${paddedPreview.w}x${paddedPreview.h}` : "no image",
    );

    console.log("\n--- move the whole box by dragging inside it ---");
    const beforeMove = await readBox(page);
    const rect = await page.locator(".crop-rect").boundingBox();
    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
    await page.mouse.down();
    for (let step = 1; step <= 5; step += 1) {
      await page.mouse.move(rect.x + rect.width / 2 + (60 * step) / 5, rect.y + rect.height / 2);
    }
    await page.mouse.up();
    await page.waitForTimeout(400);
    const moved = await readBox(page);
    check("move shifted x", moved[0] > beforeMove[0], `${beforeMove[0]} -> ${moved[0]}`);
    check("move kept size", moved[2] === beforeMove[2] && moved[3] === beforeMove[3]);

    console.log("\n--- plain click on empty space must not wipe the box ---");
    const beforeClick = await readBox(page);
    const stage = await page.locator(".crop-stage").boundingBox();
    await page.mouse.click(stage.x + 8, stage.y + 8);
    await page.waitForTimeout(300);
    const afterClick = await readBox(page);
    check(
      "click left the box alone",
      JSON.stringify(beforeClick) === JSON.stringify(afterClick),
      afterClick.join(", "),
    );

    console.log("\n--- reset and cancel ---");
    await page.getByRole("button", { name: "Reset" }).click();
    await page.waitForTimeout(400);
    const reset = await readBox(page);
    check("reset restored the original box", JSON.stringify(reset) === JSON.stringify(start));

    await page.getByRole("button", { name: "Cancel" }).click();
    await page.waitForTimeout(300);
    check("modal closed", (await page.locator(".modal").count()) === 0);
    check(
      "save button shows no unsaved changes",
      (await page.locator("#save").innerText()).trim() === "Save & publish",
    );

    const realErrors = consoleErrors.filter((text) => !text.includes("favicon"));
    check("no console errors", realErrors.length === 0, realErrors.join(" | "));
  } finally {
    await browser.close();
  }

  const failed = results.filter((item) => !item.passed);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
