/** Percentile = share of players you beat (0–100, higher is better). */
export function computePercentile(score: number, allScores: number[]): number {
  if (allScores.length === 0) return 100;
  if (allScores.length === 1) return 100;
  const worseThanMe = allScores.filter((s) => s < score).length;
  return Math.round((worseThanMe / allScores.length) * 100);
}

/** Approximate erf for normal CDF (Abramowitz & Stegun). */
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-ax * ax));
  return sign * y;
}

/** Beat-percentile from a normal approximation when sample size is small. */
export function estimateBeatPercentile(
  score: number,
  mean: number,
  std: number,
): number {
  const z = (score - mean) / Math.max(std, 1e-6);
  const cdf = 0.5 * (1 + erf(z / Math.SQRT2));
  return Math.round(Math.min(100, Math.max(0, cdf * 100)));
}

/**
 * Beat-percentile for a score — empirical when enough players played,
 * otherwise a normal-curve estimate (marked as approximate in the UI).
 */
export function resolveBeatPercentile(
  score: number,
  populationScores: number[],
  mean: number,
  std: number,
): { percentile: number; isEstimate: boolean } {
  if (populationScores.length >= 3) {
    return { percentile: computePercentile(score, populationScores), isEstimate: false };
  }
  return { percentile: estimateBeatPercentile(score, mean, std), isEstimate: true };
}

export function meanAndStd(values: number[]): { mean: number; std: number } {
  if (values.length === 0) return { mean: 50, std: 20 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (values.length === 1) return { mean, std: 15 };
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return { mean, std: Math.max(Math.sqrt(variance), 5) };
}

/** Gaussian PDF for charting a normal approximation of the day's scores. */
export function normalPdf(x: number, mean: number, std: number): number {
  const s = Math.max(std, 1e-6);
  const z = (x - mean) / s;
  return Math.exp(-0.5 * z * z) / (s * Math.sqrt(2 * Math.PI));
}

export function buildNormalCurve(
  mean: number,
  std: number,
  userScore?: number,
  steps = 80,
): Array<{ score: number; density: number }> {
  const spread = Math.max(std * 3, 25);
  const min = Math.max(0, mean - spread);
  const max = Math.min(100, mean + spread);
  const points: Array<{ score: number; density: number }> = [];

  for (let i = 0; i <= steps; i++) {
    const score = min + ((max - min) * i) / steps;
    points.push({ score, density: normalPdf(score, mean, std) });
  }

  if (userScore != null && Number.isFinite(userScore)) {
    const clamped = Math.min(100, Math.max(0, userScore));
    if (clamped < min || clamped > max) {
      points.push({ score: clamped, density: normalPdf(clamped, mean, std) });
      points.sort((a, b) => a.score - b.score);
    }
  }

  return points;
}
