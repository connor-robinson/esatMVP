import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import {
  NOINDEX_FOLLOW,
  buildNoIndexMetadata,
  noIndexFollowMetadata,
} from "@/lib/seo/noIndex";
import {
  PUBLIC_SITEMAP_ENTRIES,
  SITEMAP_EXCLUDED_PATHS,
  isPublicSitemapPath,
} from "@/lib/seo/publicSitemap";
import {
  APP_ROUTES,
  SEO_ROUTES,
  SITE_URL,
  buildCanonicalUrl,
  buildSeoMetadata,
} from "@/lib/seo/config";
import { MAIN_SCORE_CONVERTER_COPY } from "@/lib/scoreConverter/scoreConverterPageCopy";

const ROOT = path.resolve(__dirname, "../..");

function readAppSource(...segments: string[]) {
  return readFileSync(path.join(ROOT, "app", ...segments), "utf8");
}

describe("index hygiene: noindex helpers", () => {
  it("exports the shared noindex, follow directive", () => {
    expect(NOINDEX_FOLLOW).toEqual({ index: false, follow: true });
    expect(noIndexFollowMetadata.robots).toEqual(NOINDEX_FOLLOW);
    expect(buildNoIndexMetadata({ title: "Private" }).robots).toEqual(
      NOINDEX_FOLLOW,
    );
  });
});

describe("index hygiene: private route metadata wiring", () => {
  it("marks /login as noindex, follow for all query-string variations", () => {
    // Client page cannot export metadata; the server layout applies one
    // static robots directive for /login and /login?redirectTo=...
    const layout = readAppSource("login", "layout.tsx");
    expect(layout).toContain("noIndexFollowMetadata");
    expect(layout).toContain('from "@/lib/seo/noIndex"');
    expect(layout).not.toContain("searchParams");
    expect(layout).not.toContain("redirectTo");
  });

  it("marks private application and programme routes as noindex, follow", () => {
    const privateLayouts = [
      ["questions", "layout.tsx"],
      ["mental-maths", "drill", "layout.tsx"],
      ["past-papers", "layout.tsx"],
      ["founding-tester", "layout.tsx"],
      ["profile", "layout.tsx"],
      ["settings", "layout.tsx"],
      ["onboarding", "layout.tsx"],
      ["admin", "layout.tsx"],
      ["dev", "layout.tsx"],
      ["train", "layout.tsx"],
      ["pricing", "success", "layout.tsx"],
      ["auth", "layout.tsx"],
    ] as const;

    for (const segments of privateLayouts) {
      const source = readAppSource(...segments);
      expect(source).toMatch(/noIndexFollowMetadata|index:\s*false/);
      expect(source).toMatch(/noIndexFollowMetadata|follow:\s*true/);
    }
  });
});

describe("index hygiene: public pages stay indexable", () => {
  it("does not apply noindex on the root layout", () => {
    const root = readAppSource("layout.tsx");
    expect(root).not.toMatch(/robots:\s*\{[^}]*index:\s*false/);
    expect(root).not.toContain("noIndexFollowMetadata");
  });

  it("keeps public SEO helpers and score converter indexable", () => {
    const scoreConverter = buildSeoMetadata({
      title: MAIN_SCORE_CONVERTER_COPY.title,
      description: MAIN_SCORE_CONVERTER_COPY.description,
      path: APP_ROUTES.scoreConverter,
    });
    expect(scoreConverter.title).toBe(
      "ESAT Score Converter - NSAA & ENGAA Raw Marks",
    );
    expect(scoreConverter.description).toBe(
      "Estimate your ESAT score from NSAA and ENGAA past-paper raw marks. Convert your result to the ESAT 1.0–9.0 scale. Unofficial estimate.",
    );
    expect(scoreConverter.openGraph?.title).toBe(scoreConverter.title);
    expect(scoreConverter.openGraph?.description).toBe(
      scoreConverter.description,
    );
    expect(scoreConverter.twitter?.title).toBe(scoreConverter.title);
    expect(scoreConverter.twitter?.description).toBe(
      scoreConverter.description,
    );
    expect(scoreConverter.robots).toEqual({ index: true, follow: true });
    expect(scoreConverter.alternates?.canonical).toBe(
      buildCanonicalUrl(APP_ROUTES.scoreConverter),
    );

    const noCalc = buildSeoMetadata({
      title: "ESAT No-Calculator Practice",
      description: "Practice",
      path: SEO_ROUTES.noCalcPractice,
    });
    expect(noCalc.robots).toEqual({ index: true, follow: true });
    expect(noCalc.alternates?.canonical).toBe(
      buildCanonicalUrl(SEO_ROUTES.noCalcPractice),
    );

    const questionBankGuide = buildSeoMetadata({
      title: "Is the ESAT a Question Bank?",
      description: "Guide",
      path: SEO_ROUTES.questionBankGuide,
    });
    expect(questionBankGuide.robots).toEqual({ index: true, follow: true });
    expect(questionBankGuide.alternates?.canonical).toBe(
      buildCanonicalUrl(SEO_ROUTES.questionBankGuide),
    );
  });

  it("wires public landings and score converter to indexable metadata", () => {
    expect(readAppSource("page.tsx")).toMatch(/index:\s*true/);
    expect(readAppSource("esat-no-calculator-practice", "page.tsx")).toContain(
      "buildSeoMetadata",
    );
    expect(readAppSource("is-esat-a-question-bank", "page.tsx")).toContain(
      "buildSeoMetadata",
    );
    expect(readAppSource("tools", "score-converter", "page.tsx")).toContain(
      "buildSeoMetadata",
    );
  });
});

describe("index hygiene: sitemap", () => {
  it("includes only canonical public paths including the score converter", () => {
    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);
    const paths = urls.map((url) => {
      const stripped = url.replace(SITE_URL, "");
      return stripped === "" ? "/" : stripped;
    });

    expect(paths).toEqual(PUBLIC_SITEMAP_ENTRIES.map((entry) => entry.path));
    expect(isPublicSitemapPath(APP_ROUTES.scoreConverter)).toBe(true);
    expect(urls).toContain(`${SITE_URL}${APP_ROUTES.scoreConverter}`);
  });

  it("excludes private, auth, app, and testing routes", () => {
    for (const excluded of SITEMAP_EXCLUDED_PATHS) {
      expect(isPublicSitemapPath(excluded)).toBe(false);
    }
  });
});

describe("index hygiene: robots.txt", () => {
  it("allows crawlers to reach HTML so noindex can be discovered", () => {
    const config = robots();
    const rule = Array.isArray(config.rules) ? config.rules[0] : config.rules;
    expect(rule?.allow).toBe("/");
    expect(rule?.disallow).toEqual(["/api/"]);
    expect(config.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });
});
