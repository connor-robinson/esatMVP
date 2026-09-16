/**
 * Next.js App Router only allows specific exports from route.ts / route.js.
 * Plain `tsc` does not catch this; Vercel `next build` does.
 * Run this in CI as a fast gate before the full build.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "src", "app");

const ALLOWED = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
  "runtime",
  "preferredRegion",
  "dynamic",
  "dynamicParams",
  "revalidate",
  "fetchCache",
  "maxDuration",
  "generateStaticParams",
  "generateMetadata",
  "generateViewport",
  "metadata",
  "viewport",
  "config",
]);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/^route\.(ts|tsx|js|jsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

/** Rough scan for `export function/const/async function Name` and `export { Name }`. */
function exportedNames(source) {
  const names = new Set();
  const reFn =
    /export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/g;
  const reConst =
    /export\s+(?:const|let|var|class)\s+([A-Za-z0-9_]+)/g;
  const reType =
    /export\s+type\s+([A-Za-z0-9_]+)/g;
  const reInterface =
    /export\s+interface\s+([A-Za-z0-9_]+)/g;
  const reList = /export\s*\{([^}]+)\}/g;
  let m;
  while ((m = reFn.exec(source))) names.add(m[1]);
  while ((m = reConst.exec(source))) names.add(m[1]);
  // types/interfaces are usually fine for Next, but strip them from "invalid" checks
  const typeNames = new Set();
  while ((m = reType.exec(source))) typeNames.add(m[1]);
  while ((m = reInterface.exec(source))) typeNames.add(m[1]);
  while ((m = reList.exec(source))) {
    for (const part of m[1].split(",")) {
      const cleaned = part
        .replace(/\btype\b/g, "")
        .replace(/\bas\s+[A-Za-z0-9_]+/g, "")
        .trim();
      if (!cleaned) continue;
      const name = cleaned.split(/\s+/)[0];
      if (name) names.add(name);
    }
  }
  return { names, typeNames };
}

const routes = walk(ROOT);
const errors = [];

for (const file of routes) {
  const source = fs.readFileSync(file, "utf8");
  const { names, typeNames } = exportedNames(source);
  for (const name of names) {
    if (typeNames.has(name)) continue;
    if (ALLOWED.has(name)) continue;
    if (name.startsWith("unstable_") || name.startsWith("experimental_")) {
      continue;
    }
    errors.push(
      `${path.relative(process.cwd(), file)}: invalid Route export "${name}" (move helpers out of route.ts or drop export)`,
    );
  }
}

if (errors.length) {
  console.error("Next.js route export check failed:\n");
  for (const e of errors) console.error(`  - ${e}`);
  console.error(
    `\nAllowed exports: ${[...ALLOWED].sort().join(", ")}`,
  );
  process.exit(1);
}

console.log(`OK: checked ${routes.length} route files for invalid exports.`);
