import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPng = path.join(
  __dirname,
  "../public/images/home/esat-camp-mock-player.png",
);
const outWebp = path.join(
  __dirname,
  "../public/images/home/esat-camp-mock-player-hero.webp",
);
const metaPath = path.join(__dirname, "../public/images/home/_capture-meta.json");
const chromePath =
  process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const VIEWPORT = { width: 1120, height: 820 };
const DPR = 2;

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
});
const page = await browser.newPage({
  viewport: VIEWPORT,
  deviceScaleFactor: DPR,
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

await page.goto("http://localhost:3000/dev/hero-player-capture", {
  waitUntil: "networkidle",
});
await page.waitForSelector(".pearson-radio-row");

await page.addStyleTag({
  content: `
    [class*="cookie" i], [id*="cookie" i], [aria-label*="cookie" i],
    nav, header.site-header {
      display: none !important;
      visibility: hidden !important;
    }
  `,
});

for (const label of ["Reject optional cookies", "Reject"]) {
  const btn = page.getByRole("button", { name: label });
  if ((await btn.count()) > 0) {
    await btn.first().click({ timeout: 1000 }).catch(() => {});
    break;
  }
}

await page.waitForTimeout(1200);

const meta = await page.evaluate(() => {
  const root = document.querySelector(".pearson-exam-root");
  const footer = document.querySelector(".pearson-footer");
  const rows = [...document.querySelectorAll(".pearson-radio-row")];
  const last = rows[rows.length - 1];
  if (!root || !footer || !last) return null;
  const rr = root.getBoundingClientRect();
  const fr = footer.getBoundingClientRect();
  const lr = last.getBoundingClientRect();
  return {
    root: { top: rr.top, left: rr.left, width: rr.width, height: rr.height },
    footerTop: fr.top - rr.top,
    lastOptionBottom: lr.bottom - rr.top,
    optionCount: rows.length,
  };
});

console.log("meta", meta);
fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));

await page.locator(".pearson-exam-root").screenshot({ path: outPng, type: "png" });
await browser.close();

execFileSync(
  "python",
  [
    "-c",
    `
from PIL import Image
import json

meta = json.load(open(r'''${metaPath.replace("\\", "/")}''', encoding='utf-8'))
im = Image.open(r'''${outPng}''').convert('RGB')
w, h = im.size
dpr = ${DPR}

# CSS px -> bitmap px
last_bottom = int(meta['lastOptionBottom'] * dpr)
footer_top = int(meta['footerTop'] * dpr)
gap = int(8 * dpr)

# Remove empty white between last option and footer
if footer_top - last_bottom > gap + 8:
    top = im.crop((0, 0, w, last_bottom + gap))
    foot = im.crop((0, footer_top, w, h))
    out = Image.new('RGB', (w, top.height + foot.height))
    out.paste(top, (0, 0))
    out.paste(foot, (0, top.height))
else:
    out = im

tw = 1400
th = round(out.height * (tw / out.width))
out = out.resize((tw, th), Image.Resampling.LANCZOS)
out.save(r'''${outPng}''', 'PNG', optimize=True)
out.save(r'''${outWebp}''', 'WEBP', quality=88, method=6)
print('final', out.size, 'removed_gap_px', max(0, footer_top - last_bottom - gap))
`,
  ],
  { stdio: "inherit" },
);
