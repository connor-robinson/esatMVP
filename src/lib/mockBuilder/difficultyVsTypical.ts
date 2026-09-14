/**
 * Compare a mock's mean difficulty (1–5) to a typical ESAT paper.
 * "Typical" = the blueprint ideal band mix (mean ≈ 3.15).
 */

import type { MockBlueprintConfig } from "./types";
import { getDefaultBlueprint } from "./blueprints";

export type DifficultyVsTypicalBand =
  | "much_easier"
  | "easier"
  | "typical"
  | "harder"
  | "much_harder";

export type DifficultyVsTypical = {
  predictedMean: number;
  typicalMean: number;
  delta: number;
  band: DifficultyVsTypicalBand;
  /** Short label for tables, e.g. "Slightly harder". */
  label: string;
  /** Full sentence for create/detail banners. */
  summary: string;
};

/** Ideal mean difficulty from blueprint band ideals (weighted by ideal counts). */
export function idealMeanDifficulty(
  blueprint: Pick<MockBlueprintConfig, "difficultyDistribution">,
): number {
  const bands = blueprint.difficultyDistribution;
  let weight = 0;
  let sum = 0;
  for (const band of bands) {
    const n = Math.max(0, band.ideal);
    weight += n;
    sum += band.difficulty * n;
  }
  if (weight <= 0) return 3;
  return sum / weight;
}

/**
 * Default typical ESAT mean when no blueprint snapshot is available
 * (Math 1 default bands: ≈ 3.15).
 */
export function typicalEsatMeanDifficulty(): number {
  return idealMeanDifficulty(getDefaultBlueprint("Math 1"));
}

export function compareDifficultyToTypicalEsat(
  predictedDifficulty: number | null | undefined,
  blueprint?: Pick<MockBlueprintConfig, "difficultyDistribution"> | null,
): DifficultyVsTypical | null {
  if (predictedDifficulty == null || !Number.isFinite(predictedDifficulty)) {
    return null;
  }

  const typicalMean = blueprint
    ? idealMeanDifficulty(blueprint)
    : typicalEsatMeanDifficulty();
  const predictedMean = Number(predictedDifficulty);
  const delta = predictedMean - typicalMean;

  let band: DifficultyVsTypicalBand;
  if (delta <= -0.4) band = "much_easier";
  else if (delta <= -0.15) band = "easier";
  else if (delta < 0.15) band = "typical";
  else if (delta < 0.4) band = "harder";
  else band = "much_harder";

  const label =
    band === "much_easier"
      ? "Much easier"
      : band === "easier"
        ? "Slightly easier"
        : band === "typical"
          ? "About typical"
          : band === "harder"
            ? "Slightly harder"
            : "Much harder";

  const meanText = predictedMean.toFixed(1);
  const typicalText = typicalMean.toFixed(1);
  const summary =
    band === "typical"
      ? `About as hard as a typical ESAT paper (mean ${meanText} vs typical ${typicalText}).`
      : band === "easier"
        ? `Slightly easier than a typical ESAT paper (mean ${meanText} vs typical ${typicalText}).`
        : band === "much_easier"
          ? `Noticeably easier than a typical ESAT paper (mean ${meanText} vs typical ${typicalText}).`
          : band === "harder"
            ? `Slightly harder than a typical ESAT paper (mean ${meanText} vs typical ${typicalText}).`
            : `Noticeably harder than a typical ESAT paper (mean ${meanText} vs typical ${typicalText}).`;

  return {
    predictedMean,
    typicalMean,
    delta,
    band,
    label,
    summary,
  };
}
