import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPng = path.join(__dirname, "../public/images/home/roadmap-preview.png");
const outWebp = path.join(
  __dirname,
  "../public/images/home/roadmap-preview.webp",
);
const chromePath =
  process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
});
const page = await browser.newPage({
  viewport: { width: 1280, height: 900 },
  deviceScaleFactor: 2,
});

await page.addInitScript(() => {
  try {
    localStorage.setItem(
      "esat-cookie-consent",
      JSON.stringify({ necessary: true, analytics: false, decided: true }),
    );
  } catch {
    /* ignore */
  }
});

await page.goto("http://localhost:3000/past-papers/roadmap", {
  waitUntil: "networkidle",
  timeout: 60000,
});

for (const label of ["Reject optional cookies", "Reject"]) {
  const btn = page.getByRole("button", { name: label });
  if ((await btn.count()) > 0) {
    await btn.first().click({ timeout: 1500 }).catch(() => {});
    break;
  }
}

await page.waitForTimeout(2500);

// Prefer the main roadmap list / timeline region; fall back to a clipped viewport shot.
const candidates = [
  "main",
  "[data-roadmap]",
  ".roadmap",
  "section",
];
let shot = false;
for (const sel of candidates) {
  const loc = page.locator(sel).first();
  if ((await loc.count()) > 0) {
    const box = await loc.boundingBox();
    if (box && box.height > 200 && box.width > 400) {
      await page.screenshot({
        path: outPng,
        type: "png",
        clip: {
          x: Math.max(0, box.x),
          y: Math.max(0, box.y),
          width: Math.min(box.width, 980),
          height: Math.min(box.height, 720),
        },
      });
      shot = true;
      console.log("shot via", sel, box);
      break;
    }
  }
}

if (!shot) {
  await page.screenshot({
    path: outPng,
    type: "png",
    clip: { x: 40, y: 120, width: 1000, height: 680 },
  });
  console.log("shot via fallback clip");
}

await browser.close();

execFileSync(
  "python",
  [
    "-c",
    `
from PIL import Image
im = Image.open(r'''${outPng}''').convert('RGB')
# Deliver at marketing width; keep aspect
w = 1200
h = round(im.height * (w / im.width))
out = im.resize((w, h), Image.Resampling.LANCZOS)
out.save(r'''${outPng}''', 'PNG', optimize=True)
out.save(r'''${outWebp}''', 'WEBP', quality=85, method=6)
print('final', out.size)
`,
  ],
  { stdio: "inherit" },
);
