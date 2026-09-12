import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import {
  APP_ROUTES,
  SEO_ROUTES,
  SITE_URL,
  buildCanonicalUrl,
  buildSeoMetadata,
} from "@/lib/seo/config";
import {
  PUBLIC_SITEMAP_ENTRIES,
  SITEMAP_REDIRECT_SOURCE_PATHS,
  isPublicSitemapPath,
} from "@/lib/seo/publicSitemap";

/**
 * Regression coverage for historic Google Search Console exclusion categories.
 *
 * Host redirects (http/www -> https://esatcamp.com) are configured in Vercel
 * domain settings and mirrored in next.config.js for www.esatcamp.com.
 * Verify with deployed HTTP checks:
 *   curl -I / curl -IL against http://, http://www., and https://www. hosts.
 * Prefer one-hop 301/308 to https://esatcamp.com/*; leave alone if already clean.
 */
describe("GSC exclusion regressions", () => {
  it("sitemap contains only https://esatcamp.com URLs and no www", () => {
    for (const entry of sitemap()) {
      expect(entry.url.startsWith(`${SITE_URL}/`) || entry.url === SITE_URL).toBe(
        true,
      );
      expect(entry.url).not.toContain("://www.");
      expect(entry.url.startsWith("https://")).toBe(true);
    }
  });

  it("sitemap omits known redirect sources from GSC history", () => {
    for (const path of [
      ...SITEMAP_REDIRECT_SOURCE_PATHS,
      "/engaa-nsaa-tmua-for-esat",
      "/what-is-a-good-esat-score",
      "/esat-breaks",
      "/esat-common-mistakes",
    ]) {
      expect(isPublicSitemapPath(path)).toBe(false);
    }
  });

  it("keeps intentional canonical SEO pages in the sitemap once", () => {
    const paths = PUBLIC_SITEMAP_ENTRIES.map((entry) => entry.path);
    const expected = [
      SEO_ROUTES.pastPapers,
      SEO_ROUTES.physics,
      SEO_ROUTES.goodScore,
      SEO_ROUTES.universityRequirements,
      SEO_ROUTES.uclRequirements,
      SEO_ROUTES.engaaNsaaPapers,
      SEO_ROUTES.questionBank,
      SEO_ROUTES.mockTests,
      "/about",
      "/pricing",
    ];

    for (const path of expected) {
      expect(paths.filter((p) => p === path)).toHaveLength(1);
    }
    expect(paths).not.toContain(APP_ROUTES.fermiGame);
  });

  it("uses self-referencing canonicals for historic redirect-error landings", () => {
    for (const path of [
      SEO_ROUTES.pastPapers,
      SEO_ROUTES.physics,
      SEO_ROUTES.goodScore,
      SEO_ROUTES.universityRequirements,
    ]) {
      const meta = buildSeoMetadata({
        title: "t",
        description: "d",
        path,
      });
      expect(meta.alternates?.canonical).toBe(buildCanonicalUrl(path));
      expect(meta.robots).toEqual({ index: true, follow: true });
    }
  });

  it("standardises the good-score article on /good-esat-score", () => {
    expect(SEO_ROUTES.goodScore).toBe("/good-esat-score");
    expect(isPublicSitemapPath("/good-esat-score")).toBe(true);
    expect(isPublicSitemapPath("/what-is-a-good-esat-score")).toBe(false);
    expect(
      buildSeoMetadata({
        title: "What Is a Good ESAT Score?",
        description: "Guide",
        path: SEO_ROUTES.goodScore,
      }).alternates?.canonical,
    ).toBe("https://esatcamp.com/good-esat-score");
  });

  it("keeps /esat-university-requirements canonical to itself", () => {
    const canonical = buildCanonicalUrl(SEO_ROUTES.universityRequirements);
    expect(canonical).toBe("https://esatcamp.com/esat-university-requirements");
    expect(canonical).not.toContain("ucl-esat-requirements");
  });
});
