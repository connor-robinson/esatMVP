import {
  interpolatePercentile,
  interpolateScore,
  type EsatRow,
} from "@/lib/esat/percentiles";
import type { PatScoreBin } from "@/lib/patScoreConverter/types";

const TAIL_Z = 8;
const BIN_EPS = 1e-12;

/** Display rounding only. Conversion math keeps full internal precision. */
export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function clampScore(score: number, maxScore = 100): number {
  if (!Number.isFinite(score)) return NaN;
  return Math.min(maxScore, Math.max(0, score));
}

/**
 * Abramowitz & Stegun erf approximation. Accurate enough for percentile
 * display while remaining deterministic across runtimes.
 */
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) *
      t +
      0.254829592) *
      t *
      Math.exp(-ax * ax));
  return sign * y;
}

export function normalCdf(z: number): number {
  if (!Number.isFinite(z)) return NaN;
  if (z <= -TAIL_Z) return 0;
  if (z >= TAIL_Z) return 1;
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

export function normalPdf(x: number, mean: number, sd: number): number {
  const s = Math.max(sd, 1e-9);
  const z = (x - mean) / s;
  return Math.exp(-0.5 * z * z) / (s * Math.sqrt(2 * Math.PI));
}

/**
 * Normal-distribution percentile from an official mean and SD.
 * Returns NaN when the inputs are not usable so callers can show no estimate.
 */
export function normalCdfPercentile(
  score: number,
  mean: number,
  sd: number,
): number {
  if (!Number.isFinite(score) || !Number.isFinite(mean) || !Number.isFinite(sd)) {
    return NaN;
  }
  if (sd <= 0) return NaN;
  const percentile = normalCdf((score - mean) / sd) * 100;
  if (!Number.isFinite(percentile)) return NaN;
  return Math.min(100, Math.max(0, percentile));
}

export function sortPatBins(bins: readonly PatScoreBin[]): PatScoreBin[] {
  return [...bins].sort((a, b) => a.min - b.min || a.max - b.max);
}

function previousCumulative(
  bins: readonly PatScoreBin[],
  index: number,
): number {
  if (index <= 0) return 0;
  return bins[index - 1]!.cumulativePct;
}

/**
 * Percentile from published score-range bins.
 * Exact bin edges use the published cumulative value. Interior points
 * interpolate linearly between the previous cumulative and this bin's
 * cumulative.
 */
export function interpolateHistogramPercentile(
  bins: readonly PatScoreBin[],
  score: number,
): number {
  if (!bins.length || !Number.isFinite(score)) return NaN;
  const sorted = sortPatBins(bins);
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;

  if (score < first.min) return 0;
  if (score > last.max) return Math.min(100, Math.max(0, last.cumulativePct));

  for (let i = 0; i < sorted.length; i++) {
    const bin = sorted[i]!;
    if (score < bin.min - BIN_EPS || score > bin.max + BIN_EPS) continue;

    const prev = previousCumulative(sorted, i);
    const width = bin.max - bin.min;
    if (width <= BIN_EPS) {
      return Math.min(100, Math.max(0, bin.cumulativePct));
    }
    if (Math.abs(score - bin.max) <= BIN_EPS) {
      return Math.min(100, Math.max(0, bin.cumulativePct));
    }
    if (Math.abs(score - bin.min) <= BIN_EPS) {
      return Math.min(100, Math.max(0, prev));
    }

    const t = (score - bin.min) / width;
    const interpolated = prev + (bin.cumulativePct - prev) * t;
    if (!Number.isFinite(interpolated)) return NaN;
    return Math.min(100, Math.max(0, interpolated));
  }

  return NaN;
}

export function histogramBinsToRows(bins: readonly PatScoreBin[]): EsatRow[] {
  if (bins.length === 0) return [];
  const sorted = sortPatBins(bins);
  const rows: EsatRow[] = [];
  let prev = 0;
  if (sorted[0]!.min > 0) {
    rows.push({ score: sorted[0]!.min, cumulativePct: 0, candidatePct: 0 });
  }
  for (const bin of sorted) {
    const cumulativePct = Math.min(100, Math.max(0, bin.cumulativePct));
    rows.push({
      score: bin.max,
      cumulativePct,
      candidatePct: Math.max(0, cumulativePct - prev),
    });
    prev = cumulativePct;
  }
  return rows;
}

export function normalCurveRows(
  mean: number,
  sd: number,
  minScore = 0,
  maxScore = 100,
): EsatRow[] {
  if (!Number.isFinite(mean) || !Number.isFinite(sd) || sd <= 0) return [];
  const lo = Math.min(minScore, maxScore);
  const hi = Math.max(minScore, maxScore);
  const rows: EsatRow[] = [];
  let prev = 0;
  for (let score = lo; score <= hi; score += 1) {
    const cumulativePct = normalCdfPercentile(score, mean, sd);
    if (!Number.isFinite(cumulativePct)) continue;
    rows.push({
      score,
      cumulativePct,
      candidatePct: Math.max(0, cumulativePct - prev),
    });
    prev = cumulativePct;
  }
  if (rows.length > 0 && rows[0]!.score !== lo) {
    const start = normalCdfPercentile(lo, mean, sd);
    rows.unshift({
      score: lo,
      cumulativePct: start,
      candidatePct: start,
    });
  }
  return rows;
}

/** Reverse lookup: percentile → score on an official ESAT/TMUA table. */
export function scoreAtPercentile(
  rows: readonly EsatRow[],
  percentile: number,
): number {
  return interpolateScore([...rows], percentile);
}

/** PAT percentile → ESAT Physics score at the same percentile. */
export function percentileMatch(
  rows: readonly EsatRow[],
  percentile: number,
): number {
  return scoreAtPercentile(rows, percentile);
}

export { interpolatePercentile, interpolateScore };
