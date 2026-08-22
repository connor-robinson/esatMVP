import { interpolatePercentile, type EsatRow } from "@/lib/esat/percentiles";

export function clampPercentile(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function topPercentFromPercentile(percentile: number): number {
  return Math.max(0, 100 - clampPercentile(percentile));
}

export function roundScore(score: number): number {
  return Math.round(score * 10) / 10;
}

export function formatOrdinal(value: number): string {
  const rounded = Math.round(value);
  const mod100 = rounded % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${rounded}th`;
  switch (rounded % 10) {
    case 1:
      return `${rounded}st`;
    case 2:
      return `${rounded}nd`;
    case 3:
      return `${rounded}rd`;
    default:
      return `${rounded}th`;
  }
}

export function formatApproximatePercentile(percentile: number): string {
  return `Approximately ${formatOrdinal(Math.round(percentile))} percentile`;
}

export function formatTopPercentLabel(percentile: number): string {
  const top = topPercentFromPercentile(percentile);
  if (top <= 0.5) return "Top 1% of candidates";
  if (top < 1.5) return "Top 1% of candidates";
  return `Top ${Math.round(top)}% of candidates`;
}

export function formatPercentileDetail(percentile: number): string {
  const rounded = Math.round(percentile);
  const top = Math.round(topPercentFromPercentile(percentile));
  return `"Approximately ${formatOrdinal(rounded)} percentile" means the candidate performed as well as or better than approximately ${rounded}% of candidates and was in approximately the top ${top}%.`;
}

export type StrengthBand = "exceptional" | "very_strong" | "strong" | "above_average" | "average" | "below_average";

export function classifyStrength(percentile: number): StrengthBand {
  if (percentile >= 95) return "exceptional";
  if (percentile >= 85) return "very_strong";
  if (percentile >= 70) return "strong";
  if (percentile >= 55) return "above_average";
  if (percentile >= 40) return "average";
  return "below_average";
}

const STRENGTH_COPY: Record<StrengthBand, string> = {
  exceptional: "an exceptional result",
  very_strong: "a very strong result",
  strong: "a strong result",
  above_average: "an above-average result",
  average: "a typical result",
  below_average: "a below-average result",
};

export function formatCycleInterpretation(
  score: number,
  moduleLabel: string,
  cycleLabel: string,
  percentile: number,
): string {
  const strength = STRENGTH_COPY[classifyStrength(percentile)];
  return `This was ${strength} relative to candidates taking ${moduleLabel} in the ${cycleLabel}.`;
}

/** Build cumulative rows when only per-score frequencies are published. */
export function buildCumulativeFromFrequencies(
  rows: Array<{ score: number; candidatePct: number }>,
): EsatRow[] {
  const sorted = [...rows].sort((a, b) => a.score - b.score);
  let running = 0;
  return sorted.map((row) => {
    running += row.candidatePct;
    return {
      score: row.score,
      candidatePct: row.candidatePct,
      cumulativePct: running,
    };
  });
}

export function ensureCumulativeRows(rows: EsatRow[]): EsatRow[] {
  if (!rows.length) return [];
  const sorted = [...rows].sort((a, b) => a.score - b.score);
  const hasCumulative = sorted.every((row) => Number.isFinite(row.cumulativePct));
  const base = hasCumulative
    ? sorted
    : buildCumulativeFromFrequencies(
        sorted
          .map((row) => ({
            score: row.score,
            candidatePct: row.candidatePct ?? 0,
          }))
          .filter((row) => Number.isFinite(row.candidatePct)),
      );

  return base.map((row) => ({
    ...row,
    cumulativePct: Math.max(0, Math.min(100, row.cumulativePct)),
  }));
}

export function validateCumulativeRows(rows: EsatRow[]): {
  monotonic: boolean;
  withinBounds: boolean;
  finalNear100: boolean;
} {
  const sorted = ensureCumulativeRows(rows);
  let monotonic = true;
  let withinBounds = true;

  for (let i = 0; i < sorted.length; i++) {
    const value = sorted[i].cumulativePct;
    if (value < 0 || value > 100) withinBounds = false;
    if (i > 0 && value + 1e-9 < sorted[i - 1].cumulativePct) monotonic = false;
  }

  const finalValue = sorted[sorted.length - 1]?.cumulativePct ?? NaN;
  const finalNear100 = Number.isFinite(finalValue) && finalValue >= 98 && finalValue <= 101;

  return { monotonic, withinBounds, finalNear100 };
}

export function percentileMatchesConverter(rows: EsatRow[], score: number): boolean {
  const fromChart = interpolatePercentile(rows, score);
  const fromSorted = interpolatePercentile(ensureCumulativeRows(rows), score);
  return Math.abs(fromChart - fromSorted) < 1e-9;
}
