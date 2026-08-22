import { describe, expect, it } from "vitest";
import { readEsatTableRows } from "@/lib/esat/serverTables";
import {
  buildCumulativeFromFrequencies,
  ensureCumulativeRows,
  percentileMatchesConverter,
  topPercentFromPercentile,
  validateCumulativeRows,
} from "@/lib/esat/percentileWording";
import { interpolatePercentile } from "@/lib/esat/percentiles";

const TABLE_KEYS = [
  "esat_math1_cumulative",
  "esat_math2_cumulative",
  "esat_physics_cumulative",
  "esat_chemistry_cumulative",
  "esat_biology_cumulative",
] as const;

describe("ESAT cumulative percentile tables", () => {
  for (const tableKey of TABLE_KEYS) {
    describe(tableKey, () => {
      it("has monotonic cumulative percentiles between 0 and 100", async () => {
        const rows = await readEsatTableRows(tableKey);
        const normalized = ensureCumulativeRows(rows);
        const result = validateCumulativeRows(normalized);

        expect(result.monotonic).toBe(true);
        expect(result.withinBounds).toBe(true);
      });

      it("ends near 100%", async () => {
        const rows = await readEsatTableRows(tableKey);
        const normalized = ensureCumulativeRows(rows);
        const result = validateCumulativeRows(normalized);

        expect(result.finalNear100).toBe(true);
      });

      it("matches the score converter interpolation for sample scores", async () => {
        const rows = await readEsatTableRows(tableKey);
        for (const score of [4.0, 5.5, 7.0, 8.2]) {
          expect(percentileMatchesConverter(rows, score)).toBe(true);
        }
      });
    });
  }

  it("builds cumulative values from frequency-only rows", () => {
    const built = buildCumulativeFromFrequencies([
      { score: 1.0, candidatePct: 2.0 },
      { score: 2.0, candidatePct: 4.0 },
      { score: 3.0, candidatePct: 9.0 },
    ]);

    expect(built.map((row) => row.cumulativePct)).toEqual([2, 6, 15]);
    expect(validateCumulativeRows(built).monotonic).toBe(true);
  });

  it("derives top percentage as 100 minus percentile", () => {
    expect(topPercentFromPercentile(72.4)).toBeCloseTo(27.6, 5);
    expect(topPercentFromPercentile(90)).toBe(10);
  });

  it("returns the same percentile as the converter at 7.0 for Mathematics 1", async () => {
    const rows = await readEsatTableRows("esat_math1_cumulative");
    const score = 7.0;
    const percentile = interpolatePercentile(rows, score);

    expect(percentile).toBeGreaterThan(85);
    expect(percentile).toBeLessThan(95);
    expect(topPercentFromPercentile(percentile)).toBeCloseTo(100 - percentile, 5);
  });
});
