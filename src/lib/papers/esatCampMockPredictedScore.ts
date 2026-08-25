/**
 * Percentage-based predicted scores for ESAT CAMP mocks.
 * Uses NSAA / ENGAA conversion curves so 27-question modules can be compared
 * without inventing an official ESAT raw→scaled table.
 */

export type ProxyConversionCurve = {
  label: string;
  /** Ascending raw marks with matching scaled scores (1.0–9.0). */
  rows: { raw: number; scaled: number }[];
};

/** NSAA 2023 Section 1 Part A (Mathematics), max 20. */
export const NSAA_2023_MATHS: ProxyConversionCurve = {
  label: "NSAA 2023 Mathematics",
  rows: [
    { raw: 0, scaled: 1 },
    { raw: 1, scaled: 1 },
    { raw: 2, scaled: 1 },
    { raw: 3, scaled: 1 },
    { raw: 4, scaled: 1.5 },
    { raw: 5, scaled: 2 },
    { raw: 6, scaled: 2.4 },
    { raw: 7, scaled: 2.8 },
    { raw: 8, scaled: 3.1 },
    { raw: 9, scaled: 3.5 },
    { raw: 10, scaled: 3.8 },
    { raw: 11, scaled: 4.2 },
    { raw: 12, scaled: 4.5 },
    { raw: 13, scaled: 4.9 },
    { raw: 14, scaled: 5.3 },
    { raw: 15, scaled: 5.7 },
    { raw: 16, scaled: 6.2 },
    { raw: 17, scaled: 6.7 },
    { raw: 18, scaled: 7.5 },
    { raw: 19, scaled: 8.6 },
    { raw: 20, scaled: 9 },
  ],
};

/** NSAA 2023 Section 1 Part B (Physics), max 20. */
export const NSAA_2023_PHYSICS: ProxyConversionCurve = {
  label: "NSAA 2023 Physics",
  rows: [
    { raw: 0, scaled: 1 },
    { raw: 1, scaled: 1 },
    { raw: 2, scaled: 1 },
    { raw: 3, scaled: 1 },
    { raw: 4, scaled: 1 },
    { raw: 5, scaled: 1.1 },
    { raw: 6, scaled: 1.8 },
    { raw: 7, scaled: 2.5 },
    { raw: 8, scaled: 3.1 },
    { raw: 9, scaled: 3.7 },
    { raw: 10, scaled: 4.3 },
    { raw: 11, scaled: 4.8 },
    { raw: 12, scaled: 5.4 },
    { raw: 13, scaled: 6 },
    { raw: 14, scaled: 6.7 },
    { raw: 15, scaled: 7.4 },
    { raw: 16, scaled: 8.1 },
    { raw: 17, scaled: 9 },
    { raw: 18, scaled: 9 },
    { raw: 19, scaled: 9 },
    { raw: 20, scaled: 9 },
  ],
};

/** ENGAA 2023 Section 1A (Maths & Physics), max 20. */
export const ENGAA_2023_1A: ProxyConversionCurve = {
  label: "ENGAA 2023 Section 1A",
  rows: [
    { raw: 0, scaled: 1 },
    { raw: 1, scaled: 1 },
    { raw: 2, scaled: 1 },
    { raw: 3, scaled: 1 },
    { raw: 4, scaled: 1.2 },
    { raw: 5, scaled: 1.9 },
    { raw: 6, scaled: 2.4 },
    { raw: 7, scaled: 2.9 },
    { raw: 8, scaled: 3.4 },
    { raw: 9, scaled: 3.9 },
    { raw: 10, scaled: 4.3 },
    { raw: 11, scaled: 4.8 },
    { raw: 12, scaled: 5.3 },
    { raw: 13, scaled: 5.7 },
    { raw: 14, scaled: 6.3 },
    { raw: 15, scaled: 6.8 },
    { raw: 16, scaled: 7.4 },
    { raw: 17, scaled: 8.2 },
    { raw: 18, scaled: 9 },
    { raw: 19, scaled: 9 },
    { raw: 20, scaled: 9 },
  ],
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Map a percentage (0–1) onto a conversion curve via equivalent raw mark. */
export function scalePercentOnCurve(
  curve: ProxyConversionCurve,
  percent: number,
): number {
  const maxRaw = curve.rows[curve.rows.length - 1]?.raw ?? 0;
  if (maxRaw <= 0) return 1;
  const p = clamp(percent, 0, 1);
  const equivRaw = Math.round(p * maxRaw);
  const exact = curve.rows.find((r) => r.raw === equivRaw);
  if (exact) return exact.scaled;
  // Nearest neighbour fallback
  let best = curve.rows[0]!;
  let bestDist = Math.abs(best.raw - equivRaw);
  for (const row of curve.rows) {
    const dist = Math.abs(row.raw - equivRaw);
    if (dist < bestDist) {
      best = row;
      bestDist = dist;
    }
  }
  return best.scaled;
}

function averageScaled(values: number[]): number | null {
  if (values.length === 0) return null;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  return Math.round(mean * 10) / 10;
}

export type EsatCampSectionScoreInput = {
  /** Subject / section label, e.g. Mathematics or Physics. */
  section: string;
  correct: number;
  total: number;
};

/**
 * Predicted 1.0–9.0 score for one ESAT CAMP section, averaging NSAA + ENGAA
 * percentage-mapped curves.
 */
export function predictEsatCampSectionScore(
  input: EsatCampSectionScoreInput,
): number | null {
  if (input.total <= 0) return null;
  const percent = input.correct / input.total;
  const section = input.section.toLowerCase();

  const curves: ProxyConversionCurve[] = [];
  if (section.includes("math")) {
    curves.push(NSAA_2023_MATHS, ENGAA_2023_1A);
  } else if (section.includes("physics")) {
    curves.push(NSAA_2023_PHYSICS, ENGAA_2023_1A);
  } else {
    curves.push(NSAA_2023_MATHS, NSAA_2023_PHYSICS, ENGAA_2023_1A);
  }

  return averageScaled(curves.map((c) => scalePercentOnCurve(c, percent)));
}

/**
 * Overall predicted score: weight each section by question count.
 */
export function predictEsatCampOverallScore(
  sections: EsatCampSectionScoreInput[],
): number | null {
  let weighted = 0;
  let weight = 0;
  for (const section of sections) {
    const scaled = predictEsatCampSectionScore(section);
    if (scaled == null || section.total <= 0) continue;
    weighted += scaled * section.total;
    weight += section.total;
  }
  if (weight === 0) return null;
  return Math.round((weighted / weight) * 10) / 10;
}
