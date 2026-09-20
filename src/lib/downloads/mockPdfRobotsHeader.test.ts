/**
 * Assert mock PDF download paths are noindex via next.config headers,
 * while crawlable HTML mock pages stay indexable / in the sitemap.
 */

import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { allEsatMockHtmlPaths } from "@/lib/esatMockTests/htmlRoutes";
import { APPROVED_SITEMAP_BASELINE_PATHS } from "@/lib/seo/sitemapBaseline";
import { buildSeoMetadata, SITE_URL } from "@/lib/seo/config";
import sitemap from "@/app/sitemap";

const require = createRequire(import.meta.url);
const nextConfig = require("../../../next.config.js") as {
  headers?: () => Promise<
    Array<{ source: string; headers: Array<{ key: string; value: string }> }>
  >;
};

describe("mock PDF X-Robots-Tag noindex header", () => {
  it("sets X-Robots-Tag: noindex on /downloads/mocks/* only", async () => {
    expect(typeof nextConfig.headers).toBe("function");
    const rules = await nextConfig.headers!();

    const mockPdfRule = rules.find(
      (rule) => rule.source === "/downloads/mocks/:path*",
    );
    expect(mockPdfRule).toBeDefined();
    expect(mockPdfRule!.headers).toEqual(
      expect.arrayContaining([{ key: "X-Robots-Tag", value: "noindex" }]),
    );

    const htmlSources = rules.filter((rule) =>
      String(rule.source).includes("esat-mock-tests"),
    );
    expect(htmlSources).toHaveLength(0);
  });

  it("keeps HTML mock pages indexable and sitemap at 65 URLs", () => {
    const htmlPaths = allEsatMockHtmlPaths();
    expect(htmlPaths).toHaveLength(25);
    expect(APPROVED_SITEMAP_BASELINE_PATHS).toHaveLength(65);
    expect(sitemap()).toHaveLength(65);

    const physics = "/esat-mock-tests/physics/mock-1";
    expect(APPROVED_SITEMAP_BASELINE_PATHS).toContain(physics);
    expect(sitemap().some((e) => e.url === `${SITE_URL}${physics}`)).toBe(true);

    const meta = buildSeoMetadata({
      title: "ESAT Physics Mock 1 | Free Full Mock | ESAT CAMP",
      description: "Take ESAT Physics Mock 1.",
      path: physics,
    });
    expect(meta.robots).toEqual({ index: true, follow: true });
    expect(meta.alternates?.canonical).toBe(`${SITE_URL}${physics}`);
  });
});
