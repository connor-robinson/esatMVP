import { describe, expect, it } from "vitest";
import { PAST_PAPERS } from "@/content/pastPapers";
import { APP_ROUTES, buildCanonicalUrl, buildSeoMetadata } from "@/lib/seo/config";
import { MAIN_SCORE_CONVERTER_COPY } from "@/lib/scoreConverter/scoreConverterPageCopy";
import {
  buildConverterHref,
  hasExactConversionForPaper,
  parseConverterSearchParams,
  parseExactConversionStem,
  resolvePastPaperConverterCta,
  slugifyConverterSegment,
  subjectToPartName,
} from "@/lib/scoreConverter/pastPaperConverterLinks";
import { isPublicSitemapPath } from "@/lib/seo/publicSitemap";

describe("past paper converter links", () => {
  it("parses exact conversion stems for ENGAA, NSAA and TMUA", () => {
    expect(parseExactConversionStem("engaa-2019-section-1-section-1a")).toEqual({
      exam: "ENGAA",
      year: 2019,
      paperName: "Section 1",
      partName: "Section 1A",
      stem: "engaa-2019-section-1-section-1a",
    });
    expect(parseExactConversionStem("nsaa-2022-section-1-part-b")).toEqual({
      exam: "NSAA",
      year: 2022,
      paperName: "Section 1",
      partName: "Part B",
      stem: "nsaa-2022-section-1-part-b",
    });
    expect(parseExactConversionStem("tmua-2021-paper-1")).toEqual({
      exam: "TMUA",
      year: 2021,
      paperName: "Paper 1",
      partName: "Paper 1",
      stem: "tmua-2021-paper-1",
    });
  });

  it("builds crawlable converter URLs with exam, year and section", () => {
    const href = buildConverterHref({
      exam: "NSAA",
      year: 2022,
      paperName: "Section 1",
    });
    expect(href).toBe(
      "/tools/score-converter?exam=nsaa&year=2022&section=section-1",
    );
    expect(href.startsWith(APP_ROUTES.scoreConverter)).toBe(true);
  });

  it("shows published wording for exact tables and estimate for NSAA 2016", () => {
    const exactPaper = PAST_PAPERS.find(
      (paper) =>
        paper.exam === "ENGAA" &&
        paper.year === 2022 &&
        paper.sectionName === "Section 1",
    );
    expect(exactPaper).toBeTruthy();
    const exactCta = resolvePastPaperConverterCta(exactPaper!);
    expect(exactCta?.wording).toBe("published");
    expect(exactCta?.href).toContain("exam=engaa");
    expect(exactCta?.href).toContain("year=2022");
    expect(exactCta?.href).toContain("section=section-1");

    const estimatePaper = PAST_PAPERS.find(
      (paper) => paper.exam === "NSAA" && paper.year === 2016,
    );
    expect(estimatePaper).toBeTruthy();
    expect(hasExactConversionForPaper("NSAA", 2016, "Section 1")).toBe(false);
    const estimateCta = resolvePastPaperConverterCta(estimatePaper!);
    expect(estimateCta?.wording).toBe("estimate");
    expect(estimateCta?.href).toContain("year=2016");
  });

  it("hides CTAs for undated specimen papers", () => {
    const specimen = PAST_PAPERS.find(
      (paper) => paper.exam === "TMUA" && paper.year === null,
    );
    expect(specimen).toBeTruthy();
    expect(resolvePastPaperConverterCta(specimen!)).toBeNull();
  });

  it("maps subject slugs to scoring units", () => {
    expect(subjectToPartName("NSAA", "physics", "Section 1")).toBe("Part B");
    expect(subjectToPartName("ENGAA", "advanced", "Section 1")).toBe(
      "Section 1B",
    );
    expect(slugifyConverterSegment("Section 1A")).toBe("section-1a");
  });
});

describe("converter query prefill parsing", () => {
  it("accepts preferred slug params and ignores invalid values", () => {
    const parsed = parseConverterSearchParams(
      new URLSearchParams(
        "exam=nsaa&year=2022&section=section-1&subject=physics",
      ),
    );
    expect(parsed).toEqual({
      exam: "NSAA",
      year: 2022,
      paperName: "Section 1",
      partName: "Part B",
    });

    const invalid = parseConverterSearchParams(
      new URLSearchParams("exam=sat&year=not-a-year&section=nope&subject=zzz"),
    );
    expect(invalid).toEqual({});
  });

  it("still accepts legacy paperName and partName params", () => {
    const parsed = parseConverterSearchParams({
      exam: "engaa",
      year: "2019",
      paperName: "Section 1",
      partName: "Section 1A",
    });
    expect(parsed).toEqual({
      exam: "ENGAA",
      year: 2019,
      paperName: "Section 1",
      partName: "Section 1A",
    });
  });

  it("keeps the score converter canonical on the base path", () => {
    const metadata = buildSeoMetadata({
      title: MAIN_SCORE_CONVERTER_COPY.title,
      description: MAIN_SCORE_CONVERTER_COPY.description,
      path: APP_ROUTES.scoreConverter,
    });
    expect(metadata.alternates?.canonical).toBe(
      buildCanonicalUrl(APP_ROUTES.scoreConverter),
    );
    expect(metadata.robots).toEqual({ index: true, follow: true });
    expect(isPublicSitemapPath(APP_ROUTES.scoreConverter)).toBe(true);
    expect(
      isPublicSitemapPath(
        "/tools/score-converter?exam=nsaa&year=2022&section=section-1",
      ),
    ).toBe(false);
  });
});
