import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import {
  findDownloadPaper,
  INDEXABLE_PAST_PAPER_EXPERIMENT_IDS,
  isIndexablePastPaperExperiment,
  pastPaperPagePath,
  PAST_PAPER_DOWNLOADS,
  buildPaperPageMetadata,
} from "@/data/pastPapersDownload";
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
import { buildSeoMetadata, SEO_ROUTES, SITE_URL } from "@/lib/seo/config";
import { buildNoIndexMetadata } from "@/lib/seo/noIndex";

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
    expect(paths).toHaveLength(41);
  });

  it("does not include past-paper download SEO routes", () => {
    for (const paper of PAST_PAPER_DOWNLOADS) {
      const path = pastPaperPagePath(paper);
      expect(APPROVED_SITEMAP_BASELINE_PATHS).not.toContain(path);
    }
    expect(APPROVED_SITEMAP_BASELINE_PATHS).not.toContain("/past-papers/nsaa");
    expect(APPROVED_SITEMAP_BASELINE_PATHS).not.toContain("/past-papers/engaa");
  });

  it("keeps /esat-past-papers in the approved baseline", () => {
    expect(APPROVED_SITEMAP_BASELINE_PATHS).toContain(SEO_ROUTES.pastPapers);
  });

  it("does not include the indexing experiment detail pages", () => {
    for (const id of INDEXABLE_PAST_PAPER_EXPERIMENT_IDS) {
      const paper = PAST_PAPER_DOWNLOADS.find((item) => item.id === id);
      expect(paper).toBeDefined();
      const path = pastPaperPagePath(paper!);
      expect(APPROVED_SITEMAP_BASELINE_PATHS).not.toContain(path);
      expect(sitemap().map((entry) => entry.url)).not.toContain(
        `${SITE_URL}${path}`,
      );
    }
  });

  it("cannot expand the sitemap when past-paper data grows", () => {
    expect(PAST_PAPER_DOWNLOADS.length).toBeGreaterThan(0);
    expect(sitemap()).toHaveLength(41);
    expect(PUBLIC_SITEMAP_ENTRIES).toHaveLength(41);
  });
});

describe("indexing experiment metadata", () => {
  it("marks NSAA 2021 Section 1 as index, follow with self-referencing canonical", () => {
    const paper = findDownloadPaper("nsaa", 2021, "section-1");
    expect(paper).toBeDefined();
    expect(isIndexablePastPaperExperiment(paper!)).toBe(true);

    const copy = buildPaperPageMetadata(paper!);
    const metadata = buildSeoMetadata(copy);
    expect(metadata.robots).toEqual({ index: true, follow: true });
    expect(metadata.alternates?.canonical).toBe(
      "https://esatcamp.com/past-papers/nsaa/2021/section-1",
    );
  });

  it("marks ENGAA 2021 Section 1 as index, follow with self-referencing canonical", () => {
    const paper = findDownloadPaper("engaa", 2021, "section-1");
    expect(paper).toBeDefined();
    expect(isIndexablePastPaperExperiment(paper!)).toBe(true);

    const copy = buildPaperPageMetadata(paper!);
    const metadata = buildSeoMetadata(copy);
    expect(metadata.robots).toEqual({ index: true, follow: true });
    expect(metadata.alternates?.canonical).toBe(
      "https://esatcamp.com/past-papers/engaa/2021/section-1",
    );
  });

  it("keeps NSAA 2022 Section 1 as noindex, follow", () => {
    const paper = findDownloadPaper("nsaa", 2022, "section-1");
    expect(paper).toBeDefined();
    expect(isIndexablePastPaperExperiment(paper!)).toBe(false);

    const copy = buildPaperPageMetadata(paper!);
    const metadata = buildNoIndexMetadata({
      title: copy.title,
      description: copy.description,
    });
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });
});
