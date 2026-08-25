/**
 * Verify KaTeX math is actually rendered on the studio review page.
 *
 *   node scripts/past_paper_studio/math_render_check.mjs [questionId]
 */
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.STUDIO_URL || "http://127.0.0.1:8790";
const QUESTION_ID = process.argv[2] || "2116";
const CHANNEL = process.env.PLAYWRIGHT_CHANNEL || "chrome";
const OUT = path.resolve(".studio-shots");

const results = [];
function check(label, passed, detail = "") {
  results.push({ label, passed, detail });
  console.log(`  [${passed ? "ok" : "FAIL"}] ${label}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    channel: CHANNEL,
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  console.log(`\n--- open review for question ${QUESTION_ID} ---`);
  await page.goto(`${BASE}/review?questionId=${QUESTION_ID}`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page.waitForSelector("#preview-pane .qrender", { timeout: 30000 });

  const info = await page.evaluate(() => {
    const preview = document.querySelector("#preview-pane");
    const katexNodes = preview ? preview.querySelectorAll(".katex") : [];
    const stemHtml = preview?.querySelector(".stem")?.innerHTML || "";
    const stemText = preview?.querySelector(".stem")?.innerText || "";
    return {
      hasWindowKatex: typeof window.katex?.renderToString === "function",
      katexCount: katexNodes.length,
      stemHtmlSample: stemHtml.slice(0, 500),
      stemTextSample: stemText.slice(0, 300),
      rawDollarVisible: /\$R\$|\$r\$|\$4\\pi/.test(stemText),
      hasKatexClass: stemHtml.includes('class="katex"') || stemHtml.includes("class='katex'"),
      cssLoaded: [...document.styleSheets].some((s) => {
        try {
          return (s.href || "").includes("katex");
        } catch {
          return false;
        }
      }),
    };
  });

  check("window.katex available", info.hasWindowKatex);
  check("katex.css stylesheet loaded", info.cssLoaded);
  check("preview contains .katex nodes", info.katexCount > 0, `count=${info.katexCount}`);
  check("stem HTML includes katex markup", info.hasKatexClass);
  check("raw $...$ not shown as plain text", !info.rawDollarVisible, info.stemTextSample);

  const optionMath = await page.$$eval("#preview-pane .opt", (nodes) =>
    nodes.map((node) => ({
      letter: node.querySelector(".letter")?.textContent || "",
      hasKatex: Boolean(node.querySelector(".katex")),
      hasFrac: Boolean(node.querySelector(".mfrac")),
      hasSqrt: Boolean(node.querySelector(".sqrt")),
    })),
  );
  check(
    "options render KaTeX",
    optionMath.length > 0 && optionMath.every((opt) => opt.hasKatex),
    `${optionMath.filter((opt) => opt.hasKatex).length}/${optionMath.length}`,
  );
  const withFrac = optionMath.filter((opt) => opt.hasFrac);
  const withSqrt = optionMath.filter((opt) => opt.hasSqrt);
  check("fraction options use mfrac", withFrac.length > 0, `letters=${withFrac.map((o) => o.letter).join("")}`);
  check("root options use sqrt", withSqrt.length > 0, `letters=${withSqrt.map((o) => o.letter).join("")}`);

  await page.locator("#preview-pane").screenshot({
    path: path.join(OUT, "math-preview.png"),
  });
  console.log(`  screenshot -> ${path.join(OUT, "math-preview.png")}`);
  console.log("  option math:", JSON.stringify(optionMath));

  if (consoleErrors.length) {
    console.log("  console errors:");
    for (const err of consoleErrors.slice(0, 8)) console.log("   ", err);
  }
  check("no console errors", consoleErrors.length === 0, `${consoleErrors.length} errors`);

  console.log("\nstem text sample:");
  console.log(info.stemTextSample);
  console.log("\nstem html sample:");
  console.log(info.stemHtmlSample);

  await browser.close();

  const failed = results.filter((r) => !r.passed).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
