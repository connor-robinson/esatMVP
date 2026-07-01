/**
 * TMUA ≤2023 dual-curve data: official raw→scaled (Curve A) and percentile-anchored
 * post-2024 equivalent (Curve B). Single source of truth for the chart + summary.
 */

import { interpolatePercentile, interpolateScore, type EsatRow } from "@/lib/esat/percentiles";
import type { ConversionRow } from "@/types/papers";

const round1 = (v: number) => Math.round(v * 10) / 10;

export interface TmuaDualCurvePoint {
  raw: number;
  actualScaled: number;
  /** null when the post-2024 table has no percentile in range for this point. */
  estimatedScaled: number | null;
}

export interface TmuaDualCurveData {
  points: TmuaDualCurvePoint[];
  maxRaw: number;
  year: number;
  partLabel: string;
  summary: string;
  student: {
    raw: number;
    actualScaled: number;
    estimatedScaled: number | null;
  };
}

function percentileInTableRange(rows: EsatRow[], percentile: number): boolean {
  if (!rows.length || !Number.isFinite(percentile)) return false;
  const sorted = [...rows].sort((a, b) => a.cumulativePct - b.cumulativePct);
  return (
    percentile >= sorted[0].cumulativePct &&
    percentile <= sorted[sorted.length - 1].cumulativePct
  );
}

/** Map official scaled score → post-2024 equivalent via pre-2024 percentile rank. */
export function mapTmuaToPostScale(
  actualScaled: number,
  preChangeRows: EsatRow[],
  postChangeRows: EsatRow[],
): number | null {
  const pct = interpolatePercentile(preChangeRows, actualScaled);
  if (!percentileInTableRange(postChangeRows, pct)) return null;
  const eq = interpolateScore(postChangeRows, pct);
  return Number.isFinite(eq) ? round1(eq) : null;
}

export function formatTmuaDualSummary(opts: {
  raw: number;
  maxRaw: number;
  year: number;
  actualScaled: number;
  estimatedScaled: number | null;
}): string {
  const { raw, maxRaw, year, actualScaled, estimatedScaled } = opts;
  if (estimatedScaled == null) {
    return `Your raw score of ${raw}/${maxRaw} in ${year} converts to ${actualScaled.toFixed(1)} on the old scale.`;
  }
  return (
    `Your raw score of ${raw}/${maxRaw} in ${year} converts to ${actualScaled.toFixed(1)} ` +
    `on the old scale, estimated around ${estimatedScaled.toFixed(1)} on the 2026 scale — ` +
    `both reflect roughly the same percentile rank among that year's candidates.`
  );
}

/**
 * Build full dual-curve payload from conversion_rows + cumulative CSVs.
 * Curve A is deterministic from conversion_rows; Curve B uses percentile bridging.
 */
export function buildTmuaDualCurve(
  conversionRows: ConversionRow[],
  preChangeRows: EsatRow[],
  postChangeRows: EsatRow[],
  opts: {
    year: number;
    raw: number;
    maxRaw: number;
    partLabel: string;
    studentActualScaled: number;
    studentEstimatedScaled: number | null;
  },
): TmuaDualCurveData | null {
  if (conversionRows.length === 0 || preChangeRows.length === 0 || postChangeRows.length === 0) {
    return null;
  }

  const sorted = [...conversionRows].sort((a, b) => a.rawScore - b.rawScore);
  const points: TmuaDualCurvePoint[] = sorted.map((r) => ({
    raw: r.rawScore,
    actualScaled: round1(r.scaledScore),
    estimatedScaled: mapTmuaToPostScale(round1(r.scaledScore), preChangeRows, postChangeRows),
  }));

  const studentPoint = points.find((p) => p.raw === opts.raw);
  const student = {
    raw: opts.raw,
    actualScaled: studentPoint?.actualScaled ?? round1(opts.studentActualScaled),
    estimatedScaled:
      studentPoint?.estimatedScaled ?? opts.studentEstimatedScaled,
  };

  return {
    points,
    maxRaw: opts.maxRaw,
    year: opts.year,
    partLabel: opts.partLabel,
    summary: formatTmuaDualSummary({
      raw: opts.raw,
      maxRaw: opts.maxRaw,
      year: opts.year,
      actualScaled: student.actualScaled,
      estimatedScaled: student.estimatedScaled,
    }),
    student,
  };
}
