/**
 * Crawl sitemap URLs and report technical SEO signals.
 * Usage: node scripts/seo-url-audit.mjs [baseUrl]
 */

import { PUBLIC_SITEMAP_ENTRIES } from "../src/lib/seo/publicSitemap.ts";

const BASE = (process.argv[2] ?? "https://esatcamp.com").replace(/\/$/, "");

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchAll(regex, text) {
  const out = [];
  let m;
  const r = new RegExp(regex.source, regex.flags.includes("g") ? regex.flags : `${regex.flags}g`);
  while ((m = r.exec(text)) !== null) out.push(m);
  return out;
}

function extractMeta(html, name) {
  const re = new RegExp(
    `<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']*)["']`,
    "i",
  );
  const m = html.match(re);
  if (m) return m[1];
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${name}["']`,
    "i",
  );
  return html.match(re2)?.[1] ?? null;
}

function extractCanonical(html) {
  const m = html.match(
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
  );
  if (m) return m[1];
  return html.match(
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i,
  )?.[1];
}

function extractJsonLd(html) {
  return matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    html,
  ).map((m) => m[1].trim());
}

function countH1(html) {
  return matchAll(/<h1[\s>]/gi, html).length;
}

function extractTitle(html) {
  return html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "";
}

async function auditUrl(path) {
  const url = `${BASE}${path}`;
  const issues = [];
  let status = 0;
  let html = "";
  let finalUrl = url;

  try {
    const res = await fetch(url, { redirect: "follow" });
    status = res.status;
    finalUrl = res.url;
    html = await res.text();
  } catch (err) {
    return {
      path,
      url,
      status: 0,
      issues: [`fetch failed: ${err.message}`],
      title: "",
      canonical: null,
      robots: null,
      h1Count: 0,
      wordCount: 0,
      jsonLdErrors: [],
      bodyTextSample: "",
    };
  }

  if (status !== 200) issues.push(`HTTP ${status}`);
  if (finalUrl !== url && !finalUrl.replace("https://www.", "https://").startsWith(url.replace("https://www.", "https://"))) {
    issues.push(`redirects to ${finalUrl}`);
  }

  const canonical = extractCanonical(html);
  const expectedCanonical = `${BASE}${path === "/" ? "" : path}`;
  if (!canonical) issues.push("missing canonical");
  else if (canonical !== expectedCanonical) {
    if (canonical.includes("www.")) issues.push(`canonical uses www: ${canonical}`);
    else issues.push(`canonical mismatch: ${canonical} (expected ${expectedCanonical})`);
  }

  const robots = extractMeta(html, "robots");
  if (robots?.toLowerCase().includes("noindex")) issues.push(`noindex: ${robots}`);

  const h1Count = countH1(html);
  if (h1Count === 0) issues.push("no H1 in initial HTML");
  if (h1Count > 1) issues.push(`${h1Count} H1 tags`);

  const bodyText = stripTags(html);
  const wordCount = bodyText ? bodyText.split(" ").filter(Boolean).length : 0;
  if (wordCount < 120) issues.push(`thin body text (~${wordCount} words in HTML)`);

  const jsonLdErrors = [];
  for (const block of extractJsonLd(html)) {
    try {
      JSON.parse(block);
    } catch {
      jsonLdErrors.push("invalid JSON-LD");
    }
  }
  if (jsonLdErrors.length) issues.push(...jsonLdErrors);

  const noscriptOnly =
    wordCount < 80 && html.includes("__NEXT_DATA__") && !html.includes("<h1");
  if (noscriptOnly) issues.push("possible client-only main content");

  return {
    path,
    url,
    status,
    issues,
    title: extractTitle(html),
    canonical,
    robots: robots ?? "none",
    h1Count,
    wordCount,
    jsonLdErrors,
    bodyTextSample: bodyText.slice(0, 120),
  };
}

const results = [];
for (const { path } of PUBLIC_SITEMAP_ENTRIES) {
  const row = await auditUrl(path);
  results.push(row);
  const flag = row.issues.length ? "!" : ".";
  process.stderr.write(flag);
}
process.stderr.write("\n");

const problemRows = results.filter((r) => r.issues.length);
console.log(JSON.stringify({ base: BASE, total: results.length, problems: problemRows.length, results }, null, 2));
