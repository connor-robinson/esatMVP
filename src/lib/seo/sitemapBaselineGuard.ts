/**
 * Compare live sitemap entries against the approved baseline.
 */

import type { PublicSitemapEntry } from "@/lib/seo/publicSitemap.types";

export type SitemapBaselineDiff = {
  added: string[];
  removed: string[];
  lastModifiedChanged: string[];
};

function entryKey(entry: PublicSitemapEntry): string {
  return `${entry.path}\0${entry.lastModified ?? ""}`;
}

export function diffSitemapAgainstBaseline(
  live: readonly PublicSitemapEntry[],
  baseline: readonly PublicSitemapEntry[],
): SitemapBaselineDiff {
  const liveByPath = new Map(live.map((entry) => [entry.path, entry]));
  const baselineByPath = new Map(baseline.map((entry) => [entry.path, entry]));

  const added: string[] = [];
  const removed: string[] = [];
  const lastModifiedChanged: string[] = [];

  for (const path of liveByPath.keys()) {
    if (!baselineByPath.has(path)) added.push(path);
  }

  for (const path of baselineByPath.keys()) {
    if (!liveByPath.has(path)) removed.push(path);
  }

  for (const [path, baselineEntry] of baselineByPath) {
    const liveEntry = liveByPath.get(path);
    if (!liveEntry) continue;
    if (entryKey(liveEntry) !== entryKey(baselineEntry)) {
      lastModifiedChanged.push(path);
    }
  }

  added.sort();
  removed.sort();
  lastModifiedChanged.sort();

  return { added, removed, lastModifiedChanged };
}

export function formatSitemapBaselineFailure(diff: SitemapBaselineDiff): string {
  const lines = ["SITEMAP CHANGE DETECTED", ""];

  if (diff.added.length) {
    lines.push("Added:");
    for (const path of diff.added) lines.push(`+ ${path}`);
    lines.push("");
  }

  if (diff.removed.length) {
    lines.push("Removed:");
    for (const path of diff.removed) lines.push(`- ${path}`);
    lines.push("");
  }

  if (diff.lastModifiedChanged.length) {
    lines.push("lastModified changed:");
    for (const path of diff.lastModifiedChanged) lines.push(`~ ${path}`);
    lines.push("");
  }

  lines.push(
    "Sitemap changes must be explicitly approved by updating the sitemap baseline.",
  );

  return lines.join("\n");
}

export function sitemapMatchesBaseline(
  live: readonly PublicSitemapEntry[],
  baseline: readonly PublicSitemapEntry[],
): boolean {
  const diff = diffSitemapAgainstBaseline(live, baseline);
  return (
    diff.added.length === 0 &&
    diff.removed.length === 0 &&
    diff.lastModifiedChanged.length === 0
  );
}
