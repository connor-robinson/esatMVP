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
      ["dashboard", "layout.tsx"],
      ["questions", "layout.tsx"],
      ["mental-maths", "drill", "layout.tsx"],
      ["past-papers", "layout.tsx"],
      ["founding-tester", "layout.tsx"],
      ["profile", "layout.tsx"],
      ["settings", "layout.tsx"],
      ["onboarding", "layout.tsx"],
      ["admin", "layout.tsx"],
      ["access", "layout.tsx"],
      ["partners", "layout.tsx"],
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

  it("marks access code and legacy redeem routes as noindex, nofollow", () => {
    for (const segments of [
      ["access", "[code]", "layout.tsx"],
      ["access", "redeem", "[token]", "layout.tsx"],
    ] as const) {
      const source = readAppSource(...segments);
      expect(source).toMatch(
        /noIndexNofollowMetadata|buildNoIndexNofollowMetadata|index:\s*false/,
      );
      expect(source).toMatch(
        /noIndexNofollowMetadata|buildNoIndexNofollowMetadata|follow:\s*false/,
      );
      expect(source).not.toContain("canonical");
      expect(source).not.toContain("params.code");
      expect(source).not.toContain("params.token");
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

  it("marks new past-paper download SEO routes as noindex, follow", () => {
    for (const segments of [
      ["past-papers", "nsaa", "layout.tsx"],
      ["past-papers", "engaa", "layout.tsx"],
      ["past-papers", "nsaa", "page.tsx"],
      ["past-papers", "engaa", "page.tsx"],
      ["past-papers", "nsaa", "[year]", "[section]", "page.tsx"],
      ["past-papers", "engaa", "[year]", "[section]", "page.tsx"],
    ] as const) {
      const source = readAppSource(...segments);
      expect(source).toMatch(/buildNoIndexMetadata|noIndexFollowMetadata/);
      expect(source).not.toMatch(/buildSeoMetadata/);
    }
  });

  it("keeps /esat-past-papers indexable", () => {
    const page = readAppSource("esat-past-papers", "page.tsx");
    expect(page).toContain("buildSeoMetadata");
    expect(page).not.toContain("buildNoIndexMetadata");
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
    expect(entries).toHaveLength(43);
    expect(isPublicSitemapPath(APP_ROUTES.scoreConverter)).toBe(true);
    expect(urls).toContain(`${SITE_URL}${APP_ROUTES.scoreConverter}`);
  });

  it("excludes private, auth, app, and testing routes", () => {
    for (const excluded of SITEMAP_EXCLUDED_PATHS) {
      expect(isPublicSitemapPath(excluded)).toBe(false);
    }
  });

  it("uses per-page lastModified only when a reliable date exists", () => {
    const entries = sitemap();
    const withLastMod = entries.filter((entry) => entry.lastModified != null);
    const withoutLastMod = entries.filter((entry) => entry.lastModified == null);

    expect(withLastMod.length).toBeGreaterThan(0);
    expect(withoutLastMod.length).toBeGreaterThan(0);
    expect(withLastMod.length).toBeLessThan(entries.length);

    const lastModDates = withLastMod.map((entry) =>
      entry.lastModified!.toISOString().slice(0, 10),
    );
    expect(new Set(lastModDates).size).toBeGreaterThan(1);

    for (const entry of entries) {
      expect(entry).not.toHaveProperty("changeFrequency");
      expect(entry).not.toHaveProperty("priority");
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
