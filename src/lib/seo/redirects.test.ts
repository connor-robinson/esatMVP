import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { SEO_ROUTES, APP_ROUTES } from "@/lib/seo/config";
import {
  PUBLIC_SITEMAP_ENTRIES,
  SITEMAP_REDIRECT_SOURCE_PATHS,
} from "@/lib/seo/publicSitemap";

const require = createRequire(import.meta.url);
const nextConfig = require("../../../next.config.js");

type RedirectRule = {
  source: string;
  destination: string;
  permanent: boolean;
};

const SEO_CONSOLIDATION_REDIRECTS: readonly {
  source: string;
  destination: string;
}[] = [
  { source: "/esat-test-date", destination: "/esat-test-dates" },
  {
    source: "/engaa-nsaa-maths-for-esat",
    destination: "/engaa-nsaa-papers-for-esat",
  },
  { source: "/esat-breaks", destination: "/esat-test-day" },
  { source: "/esat-common-mistakes", destination: "/esat-preparation" },
  {
    source: "/engaa-nsaa-tmua-for-esat",
    destination: "/engaa-nsaa-papers-for-esat",
  },
  {
    source: "/what-is-a-good-esat-score",
    destination: "/good-esat-score",
  },
  {
    source: "/fermi-estimation-game",
    destination: "/mental-maths/fermiguessr",
  },
];

async function loadRedirects(): Promise<RedirectRule[]> {
  const redirects = nextConfig.redirects;
  if (typeof redirects !== "function") {
    throw new Error("next.config.js must export async redirects()");
  }
  return redirects();
}

describe("SEO consolidation redirects", () => {
  it("declares permanent server-side redirects for every merged URL", async () => {
    const rules = await loadRedirects();

    for (const expected of SEO_CONSOLIDATION_REDIRECTS) {
      const match = rules.find(
        (rule) =>
          rule.source === expected.source &&
          rule.destination === expected.destination,
      );
      expect(match, `missing redirect for ${expected.source}`).toBeDefined();
      expect(match?.permanent).toBe(true);
    }
  });

  it("uses Next.js permanent redirects (308), not temporary redirects", async () => {
    const rules = await loadRedirects();
    const consolidationRules = rules.filter((rule) =>
      SEO_CONSOLIDATION_REDIRECTS.some(
        (expected) => expected.source === rule.source,
      ),
    );

    expect(consolidationRules.length).toBe(SEO_CONSOLIDATION_REDIRECTS.length);
    for (const rule of consolidationRules) {
      expect(rule.permanent).toBe(true);
    }
  });

  it("keeps legacy ENGAA/NSAA/TMUA slug pointing at the merged papers page", async () => {
    const rules = await loadRedirects();
    const match = rules.find(
      (rule) => rule.source === "/engaa-nsaa-tmua-for-esat",
    );
    expect(match?.destination).toBe(SEO_ROUTES.engaaNsaaPapers);
    expect(match?.permanent).toBe(true);
  });

  it("keeps the old good-score slug pointing at /good-esat-score", async () => {
    const rules = await loadRedirects();
    const match = rules.find(
      (rule) => rule.source === "/what-is-a-good-esat-score",
    );
    expect(match?.destination).toBe(SEO_ROUTES.goodScore);
    expect(match?.permanent).toBe(true);
  });

  it("does not put redirect sources in the sitemap", () => {
    const sitemapPaths = new Set(PUBLIC_SITEMAP_ENTRIES.map((e) => e.path));
    for (const source of SITEMAP_REDIRECT_SOURCE_PATHS) {
      expect(sitemapPaths.has(source)).toBe(false);
    }
    expect(sitemapPaths.has(SEO_ROUTES.goodScore)).toBe(true);
    expect(sitemapPaths.has(SEO_ROUTES.engaaNsaaPapers)).toBe(true);
    expect(sitemapPaths.has(APP_ROUTES.fermiGame)).toBe(true);
  });
});
