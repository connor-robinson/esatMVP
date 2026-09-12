import { describe, expect, it } from "vitest";
import { readEsatTableRows } from "@/lib/esat/serverTables";
import {
  convertMatDataset,
  convertMatScore,
} from "@/lib/matScoreConverter/convert";
import {
  getMatYear,
  isSupportedMatYear,
  listMatYearsNewestFirst,
  MAT_YEAR_DATASETS,
  percentileMethodLabel,
} from "@/lib/matScoreConverter/years";

describe("official MAT year datasets", () => {
  it("covers 2007–2025 newest first with isolated source metadata", () => {
    const years = listMatYearsNewestFirst().map((row) => row.year);
    expect(years).toEqual([
      2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014,
      2013, 2012, 2011, 2010, 2009, 2008, 2007,
    ]);
    for (const row of MAT_YEAR_DATASETS) {
      expect(row.sourceOrganisation).toContain("Oxford");
      expect(row.sourceDocumentTitle.length).toBeGreaterThan(10);
      expect(row.sourceUrl.startsWith("https://www.maths.ox.ac.uk/")).toBe(true);
      expect(row.maxScore).toBe(100);
      expect(row.formatNote.length).toBeGreaterThan(20);
      expect(row.applicantAverage).not.toBeNull();
      expect(row.shortlistedAverage).not.toBeNull();
      expect(row.offerAverage).not.toBeNull();
    }
  });

  it("matches the known Oxford sanity-check averages", () => {
    expect(getMatYear(2025)).toMatchObject({
      applicantAverage: 49.6,
      shortlistedAverage: 66.7,
      offerAverage: 74.0,
    });
    expect(getMatYear(2024)).toMatchObject({
      applicantAverage: 54.4,
      shortlistedAverage: 71.7,
      offerAverage: 77.4,
    });
    expect(getMatYear(2023)).toMatchObject({
      applicantAverage: 51.2,
      shortlistedAverage: 68.1,
      offerAverage: 75.1,
    });
    expect(getMatYear(2022)).toMatchObject({
      applicantAverage: 48.3,
      shortlistedAverage: 65.2,
      offerAverage: 71.5,
    });
    expect(getMatYear(2021)).toMatchObject({
      applicantAverage: 51.1,
      shortlistedAverage: 69.5,
      offerAverage: 73.5,
    });
    expect(getMatYear(2020)).toMatchObject({
      applicantAverage: 57.9,
      shortlistedAverage: 75.2,
      offerAverage: 81.7,
    });
    expect(getMatYear(2019)).toMatchObject({
      applicantAverage: 44.9,
      shortlistedAverage: 63.6,
      offerAverage: 69.3,
    });
    expect(getMatYear(2018)).toMatchObject({
      applicantAverage: 50.8,
      shortlistedAverage: 67.1,
      offerAverage: 72.9,
    });
    expect(getMatYear(2017)).toMatchObject({
      applicantAverage: 51.3,
      shortlistedAverage: 68.7,
      offerAverage: 73.6,
    });
    expect(getMatYear(2011)!.offerAverage).toBe(71.0);
  });

  it("surfaces distinct format eras for syllabus, disruption, online and final year", () => {
    expect(getMatYear(2017)!.formatEra).toBe("classic_pre_2018");
    expect(getMatYear(2018)!.formatEra).toBe("syllabus_2018");
    expect(getMatYear(2023)!.formatEra).toBe("disruption_2023");
    expect(getMatYear(2024)!.formatEra).toBe("online_2024");
    expect(getMatYear(2025)!.formatEra).toBe("final_2025");
    expect(percentileMethodLabel("unavailable")).toBe("Unavailable");
    expect(percentileMethodLabel("histogram_interpolation")).toBe(
      "Histogram interpolation",
    );
  });

  it("does not invent histogram bins from averages alone", () => {
    for (const row of MAT_YEAR_DATASETS) {
      expect(row.bins).toBeNull();
      expect(row.percentileMethod).toBe("unavailable");
    }
  });
});

describe("convertMatScore", () => {
  it("rejects unsupported years without inventing a percentile", () => {
    const before = convertMatScore({ year: 2006, score: 60 });
    const after = convertMatScore({ year: 2026, score: 60 });
    expect(before.error).toBe("unsupported_year");
    expect(after.error).toBe("unsupported_year");
    expect(before.percentile).toBeNull();
    expect(before.tmuaEquivalent).toBeNull();
    expect(isSupportedMatYear(2006)).toBe(false);
    expect(isSupportedMatYear(2026)).toBe(false);
  });

  it("rejects non-finite scores", () => {
    const result = convertMatScore({ year: 2025, score: Number.NaN });
    expect(result.error).toBe("invalid_score");
    expect(result.percentile).toBeNull();
  });

  it("clamps min and max scores and still shows official averages", () => {
    const low = convertMatScore({ year: 2025, score: -20 });
    const high = convertMatScore({ year: 2025, score: 140 });
    expect(low.score).toBe(0);
    expect(high.score).toBe(100);
    expect(low.applicantAverage).toBe(49.6);
    expect(high.offerAverage).toBe(74.0);
    expect(low.percentile).toBeNull();
    expect(low.percentileMethod).toBe("unavailable");
    expect(low.tmuaEquivalent).toBeNull();
    expect(low.error).toBeNull();
  });

  it("does not invent a percentile from averages alone", () => {
    const result = convertMatScore({ year: 2025, score: 49.6 });
    expect(result.error).toBeNull();
    expect(result.percentile).toBeNull();
    expect(result.percentileMethod).toBe("unavailable");
    expect(result.tmuaEquivalent).toBeNull();
    expect(result.conversionMethod).toBeNull();
    expect(result.applicantAverage).toBe(49.6);
    expect(result.shortlistedAverage).toBe(66.7);
    expect(result.offerAverage).toBe(74.0);
  });

  it("uses histogram interpolation when bins are present", () => {
    const result = convertMatDataset(
      {
        ...getMatYear(2022)!,
        bins: [
          { min: 0, max: 50, cumulativePct: 50 },
          { min: 50, max: 100, cumulativePct: 100 },
        ],
        percentileMethod: "histogram_interpolation",
      },
      75,
    );
    expect(result.percentileMethod).toBe("histogram_interpolation");
    expect(result.percentileApproximate).toBe(false);
    expect(result.percentile).toBeCloseTo(75, 10);
    expect(result.conversionMethod).toBe("histogram_percentile");
  });

  it("matches MAT percentile onto official TMUA scores when bins exist", async () => {
    const tmuaRows = await readEsatTableRows(
      "tmua_post_change_cumulative_2024_2025",
    );
    const result = convertMatDataset(
      {
        ...getMatYear(2025)!,
        bins: [
          { min: 0, max: 40, cumulativePct: 25 },
          { min: 40, max: 60, cumulativePct: 50 },
          { min: 60, max: 80, cumulativePct: 75 },
          { min: 80, max: 100, cumulativePct: 100 },
        ],
        percentileMethod: "histogram_interpolation",
      },
      50,
      tmuaRows,
    );
    expect(result.percentile).toBeCloseTo(37.5, 5);
    expect(result.tmuaMatchMethod).toBe("percentile_match");
    expect(result.conversionMethod).toBe("histogram_percentile");
    expect(result.tmuaEquivalent).not.toBeNull();
    expect(result.tmuaEquivalent!).toBeGreaterThanOrEqual(1);
    expect(result.tmuaEquivalent!).toBeLessThanOrEqual(9);
  });

  it("marks missing cohort only when averages and distribution are absent", () => {
    const result = convertMatDataset(
      {
        ...getMatYear(2011)!,
        applicantAverage: null,
        shortlistedAverage: null,
        offerAverage: null,
        bins: null,
        percentileMethod: "unavailable",
      },
      60,
    );
    expect(result.percentile).toBeNull();
    expect(result.error).toBe("missing_cohort_data");
  });

  it("keeps any histogram percentiles monotonic and finite", () => {
    const year = {
      ...getMatYear(2020)!,
      bins: [
        { min: 0, max: 20, cumulativePct: 10 },
        { min: 20, max: 40, cumulativePct: 30 },
        { min: 40, max: 60, cumulativePct: 55 },
        { min: 60, max: 80, cumulativePct: 80 },
        { min: 80, max: 100, cumulativePct: 100 },
      ],
      percentileMethod: "histogram_interpolation" as const,
    };
    let previous: number | null = null;
    for (const score of [0, 25, 50, 75, 100]) {
      const result = convertMatDataset(year, score);
      expect(result.percentile).not.toBeNull();
      expect(Number.isNaN(result.percentile!)).toBe(false);
      if (previous != null) {
        expect(result.percentile!).toBeGreaterThanOrEqual(previous);
      }
      previous = result.percentile;
    }
  });

  it("never invents TMUA equivalents for shipped years without bins", async () => {
    const tmuaRows = await readEsatTableRows(
      "tmua_post_change_cumulative_2024_2025",
    );
    for (const year of MAT_YEAR_DATASETS) {
      const result = convertMatScore({
        year: year.year,
        score: 60,
        tmuaRows,
      });
      expect(result.percentile).toBeNull();
      expect(result.tmuaEquivalent).toBeNull();
      expect(result.error).toBeNull();
    }
  });
});
