import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const katex = require("../../node_modules/katex/dist/katex.js");
globalThis.window = { katex };

const { renderContent } = await import("./static/render.js");

const cases = [
  ["dollar", String.raw`Area is $4\pi R^2$.`],
  ["paren", String.raw`Area is \(4\pi R^2\).`],
  ["bare", String.raw`Answer: \frac{1}{2}\sqrt{10}`],
  ["display", String.raw`$$R=\sqrt{10}r$$`],
];

let failed = 0;
for (const [name, src] of cases) {
  const html = renderContent(src);
  const ok = html.includes("katex");
  console.log(`  [${ok ? "ok" : "FAIL"}] ${name}`);
  if (!ok) {
    failed += 1;
    console.log("   ", html.slice(0, 160));
  }
}
process.exit(failed ? 1 : 0);
