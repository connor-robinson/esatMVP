import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { PAST_PAPER_DOWNLOADS } from "@/data/pastPapersDownload";
import { PUBLIC_SITEMAP_ENTRIES } from "@/lib/seo/publicSitemap";
import {
  APPROVED_SITEMAP_BASELINE,
  APPROVED_SITEMAP_BASELINE_PATHS,
} from "@/lib/seo/sitemapBaseline";
import {
  diffSitemapAgainstBaseline,
  formatSitemapBaselineFailure,
  sitemapMatchesBaseline,
} from "@/lib/seo/sitemapBaselineGuard";
import { SEO_ROUTES } from "@/lib/seo/config";

describe("sitemap baseline guard", () => {
  it("matches the approved baseline exactly", () => {
    const diff = diffSitemapAgainstBaseline(
      PUBLIC_SITEMAP_ENTRIES,
      APPROVED_SITEMAP_BASELINE,
    );
    expect(sitemapMatchesBaseline(PUBLIC_SITEMAP_ENTRIES, APPROVED_SITEMAP_BASELINE)).toBe(
      true,
    );
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
    expect(diff.lastModifiedChanged).toEqual([]);
  });

  it("fails with a readable report when the live sitemap diverges", () => {
    const diff = diffSitemapAgainstBaseline(
      [
        ...PUBLIC_SITEMAP_ENTRIES,
        { path: "/past-papers/nsaa/2021/section-1" },
      ],
      APPROVED_SITEMAP_BASELINE,
    );
    expect(diff.added).toContain("/past-papers/nsaa/2021/section-1");
    expect(formatSitemapBaselineFailure(diff)).toContain("SITEMAP CHANGE DETECTED");
    expect(formatSitemapBaselineFailure(diff)).toContain(
      "+ /past-papers/nsaa/2021/section-1",
    );
  });

  it("exports the live sitemap.xml from the approved baseline only", () => {
    const paths = sitemap().map((entry) =>
      entry.url.replace("https://esatcamp.com", "") || "/",
    );
    expect(paths).toEqual([...APPROVED_SITEMAP_BASELINE_PATHS]);
    expect(paths).toHaveLength(43);
  });

  it("does not include past-paper download SEO routes", () => {
    for (const paper of PAST_PAPER_DOWNLOADS) {
      const path = `/past-papers/${paper.exam.toLowerCase()}/${paper.year}/${paper.sectionSlug}`;
      expect(APPROVED_SITEMAP_BASELINE_PATHS).not.toContain(path);
    }
    expect(APPROVED_SITEMAP_BASELINE_PATHS).not.toContain("/past-papers/nsaa");
    expect(APPROVED_SITEMAP_BASELINE_PATHS).not.toContain("/past-papers/engaa");
  });

  it("keeps /esat-past-papers in the approved baseline", () => {
    expect(APPROVED_SITEMAP_BASELINE_PATHS).toContain(SEO_ROUTES.pastPapers);
  });
});
