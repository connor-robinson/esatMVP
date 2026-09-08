import { describe, expect, it } from "vitest";
import { readEsatTableRows } from "@/lib/esat/serverTables";
import { convertPatDataset, convertPatScore } from "@/lib/patScoreConverter/convert";
import {
  getPatYear,
  isSupportedPatYear,
  listPatYearsNewestFirst,
  PAT_YEAR_DATASETS,
  percentileMethodLabel,
} from "@/lib/patScoreConverter/years";

describe("official PAT year datasets", () => {
  it("covers 2010–2025 newest first with isolated source metadata", () => {
    const years = listPatYearsNewestFirst().map((row) => row.year);
    expect(years).toEqual([
      2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014,
      2013, 2012, 2011, 2010,
    ]);
    for (const row of PAT_YEAR_DATASETS) {
      expect(row.sourceOrganisation).toContain("Oxford");
      expect(row.sourceDocumentTitle.length).toBeGreaterThan(10);
      expect(row.sourceUrl.startsWith("https://www.physics.ox.ac.uk/")).toBe(
        true,
      );
      expect(row.maxScore).toBe(100);
      expect(row.formatNote.length).toBeGreaterThan(20);
    }
  });

  it("matches the 2023 and 2022 Oxford sanity checks", () => {
    const y2023 = getPatYear(2023)!;
    expect(y2023.mean).toBe(55.6);
    expect(y2023.sd).toBe(18.6);
    expect(y2023.rangeMin).toBe(8);
    expect(y2023.rangeMax).toBe(96);
    expect(y2023.percentileMethod).toBe("normal_approximation");

    const y2022 = getPatYear(2022)!;
    expect(y2022.mean).toBe(51.2);
    expect(y2022.sd).toBe(16.9);
    expect(y2022.shortlistingBenchmark).toBe(68);
  });

  it("only publishes PAT-only shortlisting marks as the benchmark", () => {
    expect(getPatYear(2023)!.shortlistingBenchmark).toBeNull();
    expect(getPatYear(2024)!.shortlistingBenchmark).toBeNull();
    expect(getPatYear(2025)!.shortlistingBenchmark).toBeNull();
    expect(getPatYear(2021)!.shortlistingBenchmark).toBe(63);
    expect(getPatYear(2018)!.shortlistingBenchmark).toBe(62);
  });

  it("surfaces a distinct format era for the required historical changes", () => {
    expect(getPatYear(2014)!.formatEra).toBe("pre_2015");
    expect(getPatYear(2015)!.formatEra).toBe("mcq_removed_2015");
    expect(getPatYear(2017)!.formatEra).toBe("mcq_return_2017");
    expect(getPatYear(2018)!.formatEra).toBe("calculator_2018");
    expect(getPatYear(2023)!.formatEra).toBe("online_2023");
    expect(getPatYear(2024)!.formatEra).toBe("mcq_only_2024");
    expect(percentileMethodLabel("normal_approximation")).toBe(
      "Normal approximation",
    );
  });
});

describe("convertPatScore", () => {
  it("rejects unsupported years without inventing a percentile", () => {
    const result = convertPatScore({ year: 2009, score: 60 });
    expect(result.error).toBe("unsupported_year");
    expect(result.percentile).toBeNull();
    expect(result.esatPhysicsEquivalent).toBeNull();
    expect(isSupportedPatYear(2009)).toBe(false);
  });

  it("rejects non-finite scores", () => {
    const result = convertPatScore({ year: 2023, score: Number.NaN });
    expect(result.error).toBe("invalid_score");
    expect(result.percentile).toBeNull();
  });

  it("clamps min and max scores and still returns a finite percentile", () => {
    const low = convertPatScore({ year: 2023, score: -20 });
    const high = convertPatScore({ year: 2023, score: 140 });
    expect(low.score).toBe(0);
    expect(high.score).toBe(100);
    expect(low.percentile).toBeGreaterThanOrEqual(0);
    expect(high.percentile).toBeLessThanOrEqual(100);
    expect(low.percentileApproximate).toBe(true);
    expect(low.percentileMethod).toBe("normal_approximation");
  });

  it("uses a labelled normal approximation when no histogram exists", () => {
    const result = convertPatScore({ year: 2023, score: 55.6 });
    expect(result.error).toBeNull();
    expect(result.percentileMethod).toBe("normal_approximation");
    expect(result.percentileApproximate).toBe(true);
    expect(result.percentile).toBeCloseTo(50, 5);
    expect(result.mean).toBe(55.6);
    expect(result.sd).toBe(18.6);
    expect(result.chartRows.length).toBeGreaterThan(10);
  });

  it("uses histogram interpolation when bins are present", () => {
    const result = convertPatDataset(
      {
        ...getPatYear(2022)!,
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
    expect(result.conversionMethod).toBe("histogram_interpolation");
  });

  it("does not invent a percentile when mean and SD are missing", () => {
    const result = convertPatDataset(
      {
        ...getPatYear(2011)!,
        mean: null,
        sd: null,
        bins: null,
        percentileMethod: "unavailable",
      },
      60,
    );
    expect(result.percentile).toBeNull();
    expect(result.percentileMethod).toBe("unavailable");
    expect(result.esatPhysicsEquivalent).toBeNull();
    expect(result.error).toBe("missing_cohort_data");
  });

  it("matches PAT percentile onto official ESAT Physics scores", async () => {
    const esatPhysicsRows = await readEsatTableRows("esat_physics_cumulative");
    const result = convertPatScore({
      year: 2023,
      score: 55.6,
      esatPhysicsRows,
    });
    expect(result.percentile).toBeCloseTo(50, 5);
    expect(result.esatMatchMethod).toBe("percentile_match");
    expect(result.conversionMethod).toBe("normal_approximation");
    expect(result.esatPhysicsEquivalent).toBeGreaterThan(3.5);
    expect(result.esatPhysicsEquivalent).toBeLessThan(5.5);
  });

  it("keeps percentiles monotonic and finite across supported years", async () => {
    const esatPhysicsRows = await readEsatTableRows("esat_physics_cumulative");
    for (const year of PAT_YEAR_DATASETS) {
      let previous: number | null = null;
      for (const score of [0, 25, 50, 75, 100]) {
        const result = convertPatScore({
          year: year.year,
          score,
          esatPhysicsRows,
        });
        expect(Number.isNaN(result.percentile ?? 0)).toBe(false);
        if (result.percentile != null) {
          if (previous != null) {
            expect(result.percentile).toBeGreaterThanOrEqual(previous);
          }
          previous = result.percentile;
        }
        if (result.esatPhysicsEquivalent != null) {
          expect(result.esatPhysicsEquivalent).toBeGreaterThanOrEqual(1);
          expect(result.esatPhysicsEquivalent).toBeLessThanOrEqual(9);
        }
      }
    }
  });
});
