import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildNsaaFullConverterHref,
  buildNsaaYearPageCopy,
  formatTableScore,
  getAdjacentNsaaYears,
  getNsaaConversionYears,
  isNsaaConversionYear,
  loadNsaaYearPageData,
  nsaaYearPagePath,
} from "@/lib/scoreConverter/nsaaYearConversion";
import { EXACT_CONVERSION_ENTRIES } from "@/lib/scoreConverter/pastPaperConverterLinks";
import { SITE_URL } from "@/lib/seo/config";
import { buildNoIndexMetadata } from "@/lib/seo/noIndex";
import { isPublicSitemapPath } from "@/lib/seo/publicSitemap";
import sitemap from "@/app/sitemap";

function readCsvScores(filename: string): Map<number, number> {
  const filePath = path.join(
    process.cwd(),
    "public",
    "downloads",
    "conversion-tables",
    filename,
  );
  const text = readFileSync(filePath, "utf8").trim();
  const lines = text.split(/\r?\n/).slice(1);
  const map = new Map<number, number>();
  for (const line of lines) {
    if (!line.trim()) continue;
    const [raw, scaled] = line.split(",");
    map.set(Number(raw), Number(scaled));
  }
  return map;
}

describe("NSAA year conversion pages", () => {
  it("exposes only years with published conversion assets", () => {
    const years = getNsaaConversionYears();
    expect(years).toEqual([2017, 2018, 2019, 2020, 2021, 2022, 2023]);
    expect(isNsaaConversionYear(2016)).toBe(false);
    expect(isNsaaConversionYear(2021)).toBe(true);
  });

  it("loads every published NSAA table and matches CSV scores exactly", () => {
    for (const year of getNsaaConversionYears()) {
      const data = loadNsaaYearPageData(year);
      expect(data).not.toBeNull();
      expect(data!.path).toBe(nsaaYearPagePath(year));

      const stems = EXACT_CONVERSION_ENTRIES.filter(
        (entry) => entry.exam === "NSAA" && entry.year === year,
      );
      expect(data!.subjects).toHaveLength(stems.length);

      for (const subject of data!.subjects) {
        const csvScores = readCsvScores(subject.csvFilename);
        expect(Object.keys(subject.scoresByRaw).length).toBe(csvScores.size);
        for (const [raw, scaled] of csvScores) {
          expect(subject.scoresByRaw[raw]).toBe(scaled);
        }
      }
    }
  });

  it("groups 2021 without Section 2 and 2020/2022/2023 with Section 2", () => {
    const y2021 = loadNsaaYearPageData(2021)!;
    expect(y2021.paperNames).toEqual(["Section 1"]);
    expect(y2021.subjects.map((s) => s.partName)).toEqual([
      "Part A",
      "Part B",
      "Part C",
      "Part D",
    ]);

    const y2023 = loadNsaaYearPageData(2023)!;
    expect(y2023.paperNames).toEqual(["Section 1", "Section 2"]);
    expect(y2023.subjects.some((s) => s.partName === "Part X")).toBe(true);

    const y2017 = loadNsaaYearPageData(2017)!;
    expect(y2017.subjects.some((s) => s.partName === "Part E")).toBe(true);
    expect(y2017.paperNames).toEqual(["Section 1"]);
  });

  it("distinguishes missing table cells from a numeric zero", () => {
    expect(formatTableScore(0)).toEqual({ text: "0", missing: false });
    expect(formatTableScore(undefined)).toEqual({ text: "–", missing: true });
    expect(formatTableScore(1.5)).toEqual({ text: "1.5", missing: false });
  });

  it("builds year-specific SEO that self-canonicalises to the year page", () => {
    const data = loadNsaaYearPageData(2021)!;
    const copy = buildNsaaYearPageCopy(data);
    expect(copy.title).toBe(
      "NSAA 2021 Score Conversion | Raw Marks to 1.0–9.0",
    );
    expect(copy.description).toContain("2021");
    expect(copy.description).toContain("Mathematics");
    expect(copy.h1).toBe("NSAA 2021 Score Conversion");

    const metadata = buildNoIndexMetadata({
      title: copy.title,
      description: copy.description,
    });
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });

  it("wires adjacent years and full converter prefills", () => {
    expect(getAdjacentNsaaYears(2021)).toEqual({
      previous: 2020,
      next: 2022,
    });
    expect(getAdjacentNsaaYears(2017).previous).toBeNull();
    expect(getAdjacentNsaaYears(2023).next).toBeNull();

    const physics = loadNsaaYearPageData(2021)!.subjects.find(
      (s) => s.partName === "Part B",
    )!;
    expect(buildNsaaFullConverterHref(physics, 2021)).toBe(
      "/tools/score-converter?exam=nsaa&year=2021&section=section-1&part=part-b",
    );
  });

  it("excludes NSAA year pages from the sitemap while keeping 2016 blocked", () => {
    for (const year of getNsaaConversionYears()) {
      expect(isPublicSitemapPath(nsaaYearPagePath(year))).toBe(false);
    }
    expect(isPublicSitemapPath("/tools/score-converter/nsaa/2016")).toBe(false);

    const urls = sitemap().map((entry) => entry.url);
    for (const year of getNsaaConversionYears()) {
      expect(urls).not.toContain(`${SITE_URL}${nsaaYearPagePath(year)}`);
    }
    expect(urls).not.toContain(`${SITE_URL}/tools/score-converter/nsaa/2016`);
    expect(isPublicSitemapPath("/tools/score-converter/nsaa")).toBe(true);
  });
});
