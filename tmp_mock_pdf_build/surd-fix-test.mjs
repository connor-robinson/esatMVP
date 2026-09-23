import katex from "katex";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const katexCss = fs
  .readFileSync(path.join("node_modules", "katex", "dist", "katex.min.css"), "utf8")
  .replace(/@font-face\s*\{[\s\S]*?\}\s*/g, "");

const samples = [
  String.raw`5\sqrt{3}`,
  String.raw`1+\sqrt{13}`,
  String.raw`R=\frac{\sqrt{7}}{2}r`,
  String.raw`\sqrt{a+b}`,
];

const body = samples
  .map((tex) => {
    const html = katex.renderToString(tex, {
      throwOnError: false,
      strict: "ignore",
      minRuleThickness: 0.05,
    });
    return `<div class="row">${html}</div>`;
  })
  .join("\n");

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
${katexCss}
body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #000; padding: 15mm; }
.katex { font-size: 0.95em; font-family: Arial, Helvetica, sans-serif !important; }
.katex .mathnormal, .katex .mathit, .katex .textit,
.katex .mathrm, .katex .textrm, .katex .textup, .katex .mathbf, .katex .textbf,
.katex .mathsf, .katex .textsf, .katex .mathtt, .katex .texttt,
.katex .mord, .katex .mbin, .katex .mrel, .katex .mopen, .katex .mclose,
.katex .mpunct, .katex .minner {
  font-family: Arial, Helvetica, sans-serif !important;
}
.katex svg { fill: currentColor; stroke: none !important; }
.pdf-sqrt {
  display: inline-block;
  position: relative;
  vertical-align: middle;
  line-height: 1;
  margin: 0 0.08em 0 0.12em;
}
.pdf-sqrt > img {
  position: absolute;
  left: 0;
  top: 0;
  margin: 0;
  padding: 0;
  border: 0;
  display: block;
  max-width: none !important;
  max-height: none !important;
  background: transparent !important;
  filter: none !important;
  pointer-events: none;
}
.pdf-sqrt-inner {
  position: relative;
  display: inline-block;
  line-height: 1.15;
  white-space: nowrap;
}
.row { margin: 8mm 0; }
</style></head><body>${body}</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.emulateMedia({ media: "print" });
await page.evaluate(`(() => {
  const nodes = Array.from(document.querySelectorAll(".katex .mord.sqrt"));
  nodes.sort((a, b) => b.querySelectorAll(".mord.sqrt").length - a.querySelectorAll(".mord.sqrt").length);
  nodes.forEach((sqrtEl) => {
    if (!sqrtEl.isConnected) return;
    const radicand = sqrtEl.querySelector(".svg-align > .mord");
    if (!radicand) return;
    const content = radicand.querySelector(":scope > .mord") || radicand;
    const wrap = document.createElement("span");
    wrap.className = "pdf-sqrt";
    const inner = document.createElement("span");
    inner.className = "pdf-sqrt-inner";
    inner.innerHTML = content.innerHTML;
    inner.querySelectorAll("[style]").forEach((el) => {
      el.style.paddingLeft = "0";
      el.style.marginLeft = "0";
    });
    wrap.style.visibility = "hidden";
    wrap.appendChild(inner);
    sqrtEl.replaceWith(wrap);
    const fs = parseFloat(window.getComputedStyle(inner).fontSize) || 14;
    const hookW = Math.max(11, fs * 0.82);
    const padR = Math.max(2, fs * 0.12);
    const barT = Math.max(1.9, fs * 0.11);
    const gap = Math.max(1, fs * 0.05);
    const cw = Math.max(inner.offsetWidth, fs * 0.4);
    const ch = Math.max(inner.offsetHeight, fs * 0.95);
    const totalW = Math.ceil(hookW + cw + padR);
    const totalH = Math.ceil(barT + gap + ch);
    inner.style.paddingLeft = hookW + "px";
    inner.style.paddingTop = barT + gap + "px";
    inner.style.paddingRight = padR + "px";
    wrap.style.width = totalW + "px";
    wrap.style.height = totalH + "px";
    wrap.style.visibility = "visible";
    const scale = 4;
    const canvas = document.createElement("canvas");
    canvas.width = totalW * scale;
    canvas.height = totalH * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(scale, scale);
    ctx.strokeStyle = "#000000";
    ctx.fillStyle = "#000000";
    const strokeW = Math.max(1.7, barT * 0.95);
    ctx.lineWidth = strokeW;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    const yBarMid = barT / 2;
    const yTick = Math.min(totalH * 0.55, totalH - strokeW);
    const yBot = totalH - strokeW * 0.55;
    const xBar0 = hookW * 0.82;
    ctx.fillRect(xBar0, 0, totalW - xBar0 - 0.5, barT);
    ctx.beginPath();
    ctx.moveTo(strokeW * 0.4, yTick);
    ctx.lineTo(hookW * 0.3, yTick);
    ctx.lineTo(hookW * 0.52, yBot);
    ctx.lineTo(xBar0 + strokeW * 0.15, yBarMid);
    ctx.stroke();
    const img = document.createElement("img");
    img.className = "pdf-sqrt-glyph";
    img.src = canvas.toDataURL("image/png");
    img.alt = "";
    img.width = totalW;
    img.height = totalH;
    img.style.cssText = "position:absolute;left:0;top:0;width:"+totalW+"px;height:"+totalH+"px;margin:0;padding:0;border:0;display:block;pointer-events:none;background:transparent;";
    wrap.insertBefore(img, inner);
  });
})()`);
fs.mkdirSync("tmp_mock_pdf_build", { recursive: true });
await page.pdf({ path: "tmp_mock_pdf_build/surd-fix-test.pdf", format: "A4", printBackground: true });
await page.screenshot({ path: "tmp_mock_pdf_build/surd-fix-test.png", fullPage: true });
await browser.close();
console.log("ok");
