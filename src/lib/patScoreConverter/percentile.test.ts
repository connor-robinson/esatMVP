import { describe, expect, it } from "vitest";
import {
  histogramBinsToRows,
  interpolateHistogramPercentile,
  normalCdf,
  normalCdfPercentile,
  percentileMatch,
  round1,
  scoreAtPercentile,
} from "@/lib/patScoreConverter/percentile";
import type { PatScoreBin } from "@/lib/patScoreConverter/types";

const BINS: readonly PatScoreBin[] = [
  { min: 0, max: 20, pct: 10, cumulativePct: 10 },
  { min: 20, max: 40, pct: 30, cumulativePct: 40 },
  { min: 40, max: 60, pct: 40, cumulativePct: 80 },
  { min: 60, max: 80, pct: 15, cumulativePct: 95 },
  { min: 80, max: 100, pct: 5, cumulativePct: 100 },
];

describe("interpolateHistogramPercentile", () => {
  it("uses the published cumulative at exact bin maxima", () => {
    expect(interpolateHistogramPercentile(BINS, 20)).toBe(10);
    expect(interpolateHistogramPercentile(BINS, 40)).toBe(40);
    expect(interpolateHistogramPercentile(BINS, 60)).toBe(80);
    expect(interpolateHistogramPercentile(BINS, 100)).toBe(100);
  });

  it("uses the previous cumulative at exact bin minima", () => {
    expect(interpolateHistogramPercentile(BINS, 0)).toBe(0);
    expect(interpolateHistogramPercentile(BINS, 80)).toBe(95);
  });

  it("interpolates linearly inside a bin", () => {
    expect(interpolateHistogramPercentile(BINS, 50)).toBeCloseTo(60, 10);
    expect(interpolateHistogramPercentile(BINS, 30)).toBeCloseTo(25, 10);
  });

  it("clamps scores below the first bin and above the last bin", () => {
    expect(interpolateHistogramPercentile(BINS, -5)).toBe(0);
    expect(interpolateHistogramPercentile(BINS, 140)).toBe(100);
  });

  it("returns NaN for empty bins or non-finite scores", () => {
    expect(interpolateHistogramPercentile([], 50)).toBeNaN();
    expect(interpolateHistogramPercentile(BINS, Number.NaN)).toBeNaN();
  });

  it("is monotonic across the score range", () => {
    let previous = -1;
    for (let score = 0; score <= 100; score += 1) {
      const percentile = interpolateHistogramPercentile(BINS, score);
      expect(percentile).toBeGreaterThanOrEqual(previous);
      previous = percentile;
    }
  });

  it("builds monotonic chart rows from bins", () => {
    const rows = histogramBinsToRows(BINS);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i]!.score).toBeGreaterThanOrEqual(rows[i - 1]!.score);
      expect(rows[i]!.cumulativePct).toBeGreaterThanOrEqual(
        rows[i - 1]!.cumulativePct,
      );
    }
  });
});

describe("normalCdfPercentile", () => {
  it("returns about 50 at the mean", () => {
    expect(normalCdfPercentile(55.6, 55.6, 18.6)).toBeCloseTo(50, 6);
    expect(normalCdf(0)).toBeCloseTo(0.5, 8);
  });

  it("is finite at the 0 and 100 tails", () => {
    const low = normalCdfPercentile(0, 55.6, 18.6);
    const high = normalCdfPercentile(100, 55.6, 18.6);
    expect(low).toBeGreaterThanOrEqual(0);
    expect(low).toBeLessThan(5);
    expect(high).toBeGreaterThan(95);
    expect(high).toBeLessThanOrEqual(100);
  });

  it("returns NaN when mean or SD is missing or invalid", () => {
    expect(normalCdfPercentile(50, Number.NaN, 18)).toBeNaN();
    expect(normalCdfPercentile(50, 50, Number.NaN)).toBeNaN();
    expect(normalCdfPercentile(50, 50, 0)).toBeNaN();
    expect(normalCdfPercentile(50, 50, -1)).toBeNaN();
    expect(normalCdfPercentile(Number.NaN, 50, 10)).toBeNaN();
  });

  it("is monotonic in score", () => {
    let previous = -1;
    for (let score = 0; score <= 100; score += 1) {
      const percentile = normalCdfPercentile(score, 51.2, 16.9);
      expect(percentile).toBeGreaterThanOrEqual(previous);
      previous = percentile;
    }
  });
});

describe("scoreAtPercentile / percentileMatch", () => {
  const rows = [
    { score: 1, cumulativePct: 10 },
    { score: 5, cumulativePct: 50 },
    { score: 9, cumulativePct: 100 },
  ];

  it("matches published points exactly", () => {
    expect(scoreAtPercentile(rows, 10)).toBe(1);
    expect(scoreAtPercentile(rows, 50)).toBe(5);
    expect(scoreAtPercentile(rows, 100)).toBe(9);
  });

  it("interpolates between published points", () => {
    expect(percentileMatch(rows, 30)).toBeCloseTo(3, 10);
  });

  it("clamps outside the published range", () => {
    expect(scoreAtPercentile(rows, 0)).toBe(1);
    expect(scoreAtPercentile(rows, 120)).toBe(9);
  });
});

describe("round1", () => {
  it("rounds display values without changing nearby internals", () => {
    expect(round1(55.64)).toBe(55.6);
    expect(round1(55.65)).toBe(55.7);
  });
});
