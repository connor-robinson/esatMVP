import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import {
  findDownloadPaper,
  pastPaperPagePath,
  PAST_PAPER_DOWNLOADS,
  buildPaperPageMetadata,
} from "@/data/pastPapersDownload";
import { PUBLIC_SITEMAP_ENTRIES, SITEMAP_EXCLUDED_PATHS } from "@/lib/seo/publicSitemap";
import {
  APPROVED_SITEMAP_BASELINE,
  APPROVED_SITEMAP_BASELINE_PATHS,
} from "@/lib/seo/sitemapBaseline";
import {
  diffSitemapAgainstBaseline,
  formatSitemapBaselineFailure,
  sitemapMatchesBaseline,
} from "@/lib/seo/sitemapBaselineGuard";
import { buildNoIndexMetadata, NOINDEX_FOLLOW } from "@/lib/seo/noIndex";
import { SEO_ROUTES, SITE_URL } from "@/lib/seo/config";

const REMOVED_FROM_43_BASELINE = [
  "/cookie-policy",
  "/tools/score-converter/nsaa/2017",
  "/tools/score-converter/nsaa/2018",
  "/tools/score-converter/nsaa/2019",
  "/tools/score-converter/nsaa/2020",
  "/tools/score-converter/nsaa/2021",
  "/tools/score-converter/nsaa/2022",
  "/tools/score-converter/nsaa/2023",
] as const;

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
    expect(paths).toHaveLength(36);
  });

  it("excludes redirect sources and the thin /help utility", () => {
    expect(APPROVED_SITEMAP_BASELINE_PATHS).not.toContain("/esat-breaks");
    expect(APPROVED_SITEMAP_BASELINE_PATHS).not.toContain(
      "/esat-common-mistakes",
    );
    expect(APPROVED_SITEMAP_BASELINE_PATHS).not.toContain("/help");
    expect(APPROVED_SITEMAP_BASELINE_PATHS).not.toContain(
      "/what-is-a-good-esat-score",
    );
    expect(APPROVED_SITEMAP_BASELINE_PATHS).not.toContain(
      "/engaa-nsaa-tmua-for-esat",
    );
    expect(APPROVED_SITEMAP_BASELINE_PATHS).toContain(SEO_ROUTES.goodScore);
    expect(APPROVED_SITEMAP_BASELINE_PATHS).toContain(
      SEO_ROUTES.universityRequirements,
    );
  });

  it("includes only the two approved exam hub URLs, once each", () => {
    const paths = APPROVED_SITEMAP_BASELINE_PATHS;
    expect(paths.filter((path) => path === "/past-papers/engaa")).toHaveLength(
      1,
    );
    expect(paths.filter((path) => path === "/past-papers/nsaa")).toHaveLength(1);
    expect(sitemap().map((entry) => entry.url)).toEqual(
      expect.arrayContaining([
        `${SITE_URL}/past-papers/engaa`,
        `${SITE_URL}/past-papers/nsaa`,
      ]),
    );
    expect(SITEMAP_EXCLUDED_PATHS).not.toContain("/past-papers/engaa");
    expect(SITEMAP_EXCLUDED_PATHS).not.toContain("/past-papers/nsaa");
  });

  it("does not include past-paper download detail SEO routes", () => {
    for (const paper of PAST_PAPER_DOWNLOADS) {
      const path = pastPaperPagePath(paper);
      expect(APPROVED_SITEMAP_BASELINE_PATHS).not.toContain(path);
    }
  });

  it("keeps /esat-past-papers in the approved baseline", () => {
    expect(APPROVED_SITEMAP_BASELINE_PATHS).toContain(SEO_ROUTES.pastPapers);
  });

  it("does not include rolled-back URLs from the 43-URL state", () => {
    for (const path of REMOVED_FROM_43_BASELINE) {
      expect(APPROVED_SITEMAP_BASELINE_PATHS).not.toContain(path);
      expect(SITEMAP_EXCLUDED_PATHS).toContain(path);
      expect(sitemap().map((entry) => entry.url)).not.toContain(
        `${SITE_URL}${path}`,
      );
    }
  });

  it("cannot expand the sitemap when past-paper data grows", () => {
    expect(PAST_PAPER_DOWNLOADS.length).toBeGreaterThan(0);
    expect(sitemap()).toHaveLength(36);
    expect(PUBLIC_SITEMAP_ENTRIES).toHaveLength(36);
  });

  it("increased the approved baseline by exactly two hub URLs", () => {
    expect(APPROVED_SITEMAP_BASELINE).toHaveLength(36);
    const withoutHubs = APPROVED_SITEMAP_BASELINE_PATHS.filter(
      (path) =>
        path !== "/past-papers/engaa" && path !== "/past-papers/nsaa",
    );
    expect(withoutHubs).toHaveLength(34);
  });
});

describe("exam hub indexability", () => {
  it("makes ENGAA and NSAA hubs indexable with self-canonicals", async () => {
    const [{ metadata: engaa }, { metadata: nsaa }] = await Promise.all([
      import("@/app/past-papers/engaa/page"),
      import("@/app/past-papers/nsaa/page"),
    ]);

    expect(engaa.robots).toEqual({ index: true, follow: true });
    expect(nsaa.robots).toEqual({ index: true, follow: true });
    expect(String(engaa.robots)).not.toMatch(/noindex/i);
    expect(String(nsaa.robots)).not.toMatch(/noindex/i);
    expect(engaa.alternates?.canonical).toBe(
      `${SITE_URL}/past-papers/engaa`,
    );
    expect(nsaa.alternates?.canonical).toBe(`${SITE_URL}/past-papers/nsaa`);
  });

  it("keeps live exam hub pages publicly reachable with HTTP 200", async () => {
    for (const path of ["/past-papers/engaa", "/past-papers/nsaa"] as const) {
      const response = await fetch(`${SITE_URL}${path}`, {
        method: "GET",
        redirect: "manual",
      });
      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    }
  });
});

describe("rolled-back page metadata", () => {
  it("marks /cookie-policy as noindex, follow", () => {
    const metadata = buildNoIndexMetadata({
      title: "Cookie Policy | ESAT Camp",
      description: "How ESAT Camp uses cookies.",
    });
    expect(metadata.robots).toEqual(NOINDEX_FOLLOW);
  });

  it("marks NSAA 2021 score-converter year page as noindex, follow", () => {
    const metadata = buildNoIndexMetadata({
      title: "NSAA 2021 Score Conversion",
      description: "Conversion tables for NSAA 2021.",
    });
    expect(metadata.robots).toEqual(NOINDEX_FOLLOW);
  });

  it("keeps all past-paper detail pages as noindex, follow", () => {
    for (const id of ["nsaa-2021-s1", "nsaa-2022-s1", "engaa-2021-s1"] as const) {
      const paper = PAST_PAPER_DOWNLOADS.find((item) => item.id === id);
      expect(paper).toBeDefined();
      const copy = buildPaperPageMetadata(paper!);
      const metadata = buildNoIndexMetadata({
        title: copy.title,
        description: copy.description,
      });
      expect(metadata.robots).toEqual(NOINDEX_FOLLOW);
    }
  });

  it("keeps NSAA 2022 Section 1 as noindex, follow", () => {
    const paper = findDownloadPaper("nsaa", 2022, "section-1");
    expect(paper).toBeDefined();
    const copy = buildPaperPageMetadata(paper!);
    const metadata = buildNoIndexMetadata({
      title: copy.title,
      description: copy.description,
    });
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });
});
