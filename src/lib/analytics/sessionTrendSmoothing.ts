/**
 * Outlier-resistant rolling trend for session performance charts (time axis).
 */

/** Indices of points outside 1.5×IQR (needs ≥4 valid values). */
export function detectOutlierIndices(values: (number | null)[]): Set<number> {
  const indexed = values
    .map((v, i) =>
      v != null && Number.isFinite(v) ? { i, v } : null,
    )
    .filter((x): x is { i: number; v: number } => x != null);

  if (indexed.length < 4) return new Set();

  const sorted = [...indexed].sort((a, b) => a.v - b.v);
  const q1 = sorted[Math.floor((sorted.length - 1) * 0.25)].v;
  const q3 = sorted[Math.floor((sorted.length - 1) * 0.75)].v;
  const iqr = q3 - q1;
  if (iqr <= 0) return new Set();

  const lo = q1 - 1.5 * iqr;
  const hi = q3 + 1.5 * iqr;
  const outliers = new Set<number>();
  indexed.forEach(({ i, v }) => {
    if (v < lo || v > hi) outliers.add(i);
  });
  return outliers;
}

/** Centered rolling mean; outliers excluded from each window. */
export function rollingTrendLine(
  values: (number | null)[],
  outlierIndices: Set<number>,
): (number | null)[] {
  const n = values.length;
  if (n === 0) return [];
  if (n < 3) return [...values];

  const window = Math.min(9, Math.max(3, 2 * Math.floor(n / 4) + 1));
  const half = Math.floor(window / 2);

  return values.map((_, i) => {
    const bucket: number[] = [];
    for (let j = Math.max(0, i - half); j <= Math.min(n - 1, i + half); j++) {
      const v = values[j];
      if (v != null && !outlierIndices.has(j)) bucket.push(v);
    }
    if (bucket.length === 0) {
      const self = values[i];
      if (self != null && !outlierIndices.has(i)) return self;
      return null;
    }
    const avg = bucket.reduce((a, b) => a + b, 0) / bucket.length;
    return Math.round(avg * 10) / 10;
  });
}

export function buildSmoothedTrendSeries(
  accuracy: (number | null)[],
  speed: (number | null)[],
): {
  accuracyTrend: (number | null)[];
  speedTrend: (number | null)[];
  accuracyOutliers: Set<number>;
  speedOutliers: Set<number>;
} {
  const accuracyOutliers = detectOutlierIndices(accuracy);
  const speedOutliers = detectOutlierIndices(speed);
  return {
    accuracyTrend: rollingTrendLine(accuracy, accuracyOutliers),
    speedTrend: rollingTrendLine(speed, speedOutliers),
    accuracyOutliers,
    speedOutliers,
  };
}
