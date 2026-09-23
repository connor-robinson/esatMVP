import { chromium } from "playwright";

const chromePath =
  process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
});
const page = await browser.newPage({
  viewport: { width: 1040, height: 640 },
  deviceScaleFactor: 1,
});
await page.goto("http://localhost:3000/dev/hero-player-capture", {
  waitUntil: "networkidle",
});
await page.waitForTimeout(800);
const boxes = await page.evaluate(() => {
  const q = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      top: Math.round(r.top),
      bottom: Math.round(r.bottom),
      left: Math.round(r.left),
      height: Math.round(r.height),
    };
  };
  return {
    viewport: q(".pearson-viewport"),
    stem: q(".pearson-stem"),
    diagram: q(".pearson-diagram"),
    radios: q(".pearson-radio-list"),
    footer: q(".pearson-footer"),
    firstRadio: q(".pearson-radio-row"),
  };
});
console.log(JSON.stringify(boxes, null, 2));
await browser.close();
