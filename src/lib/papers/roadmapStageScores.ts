/**
 * Best predicted ESAT / paper score per roadmap stage from completed sessions.
 */

import { examNameToPaperType } from "@/lib/papers/paperConfig";
import type { RoadmapStage } from "@/lib/papers/roadmapConfig";
import type { PaperSession } from "@/types/papers";

export type RoadmapStageScore = {
  /** Best predicted / scaled score for this stage, if any session recorded one. */
  predictedScore: number | null;
  /** Fallback accuracy % when no predicted score exists. */
  accuracyPercent: number | null;
};

export type RoadmapAverageMaps = {
  averages: Record<string, number>;
  counts?: Record<string, number>;
  yearAverages?: Record<string, number>;
  yearCounts?: Record<string, number>;
};

export type StageAverageScore = {
  value: number;
  /** True when value is a synthetic placeholder (no real cohort data). */
  synthetic?: boolean;
};

/** Plus-four prior: four phantom sittings at 5.0. */
const PLUS_FOUR_COUNT = 4;
const PLUS_FOUR_SCORE = 5.0;
const ESAT_SCORE_MIN = 1.0;
const ESAT_SCORE_MAX = 9.0;

function stageVariants(stage: RoadmapStage): Set<string> {
  return new Set(
    stage.parts.map(
      (part) => `${stage.year}-${part.paperName}-${part.examType}`,
    ),
  );
}

/** True only for official UAT-UK / ESAT-style scaled scores (1.0–9.0). */
export function isEsatScaledScore(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= ESAT_SCORE_MIN &&
    value <= ESAT_SCORE_MAX
  );
}

function clampEsatScore(value: number): number {
  return (
    Math.round(
      Math.min(ESAT_SCORE_MAX, Math.max(ESAT_SCORE_MIN, value)) * 10,
    ) / 10
  );
}

/** Keys used in /api/past-papers/roadmap-averages (exam::variant). */
function stageAverageKeys(stage: RoadmapStage): string[] {
  const paperType = examNameToPaperType(stage.examName) || stage.examName;
  const variants = stageVariants(stage);
  const keys: string[] = [];
  for (const variant of variants) {
    keys.push(`${paperType}::${variant}`);
    if (stage.examName !== paperType) {
      keys.push(`${stage.examName}::${variant}`);
    }
  }
  return keys;
}

function sessionMatchesStage(
  session: PaperSession,
  stage: RoadmapStage,
  variants: Set<string>,
): boolean {
  if (!session.endedAt) return false;
  if (!session.paperVariant || !variants.has(session.paperVariant)) {
    return false;
  }

  const paperType = examNameToPaperType(stage.examName);
  return (
    session.paperName === paperType ||
    session.paperName === stage.examName ||
    (stage.examName === "ESAT" && session.paperName === "ESAT")
  );
}

/** Map stage id → best ESAT scaled score (1.0–9.0 only; no accuracy %). */
export function buildRoadmapStageScores(
  stages: RoadmapStage[],
  sessions: PaperSession[],
): Map<string, RoadmapStageScore> {
  const result = new Map<string, RoadmapStageScore>();

  for (const stage of stages) {
    const variants = stageVariants(stage);
    const matched = sessions.filter((session) =>
      sessionMatchesStage(session, stage, variants),
    );

    let bestPredicted: number | null = null;

    for (const session of matched) {
      if (!isEsatScaledScore(session.predictedScore)) continue;
      bestPredicted =
        bestPredicted == null
          ? session.predictedScore
          : Math.max(bestPredicted, session.predictedScore);
    }

    result.set(stage.id, {
      predictedScore: bestPredicted,
      accuracyPercent: null,
    });
  }

  return result;
}

/** Format Your Score as an ESAT scaled value only (never accuracy %). */
export function formatRoadmapScore(score: RoadmapStageScore | undefined): string {
  if (!score) return "-";
  if (isEsatScaledScore(score.predictedScore)) {
    return clampEsatScore(score.predictedScore).toFixed(1);
  }
  return "-";
}

function normalizeAverageMaps(
  averagesByVariant:
    | Record<string, number>
    | Map<string, number>
    | RoadmapAverageMaps,
): RoadmapAverageMaps {
  if (
    averagesByVariant &&
    typeof averagesByVariant === "object" &&
    "averages" in averagesByVariant
  ) {
    return averagesByVariant as RoadmapAverageMaps;
  }
  return {
    averages:
      averagesByVariant instanceof Map
        ? Object.fromEntries(averagesByVariant)
        : ((averagesByVariant as Record<string, number>) ?? {}),
  };
}

/** Plus-four Bayesian average toward 5.0 (result stays on the 1–9 ESAT scale). */
export function plusFourAverage(sum: number, count: number): number {
  const n = Math.max(0, count);
  const value =
    (sum + PLUS_FOUR_COUNT * PLUS_FOUR_SCORE) / (n + PLUS_FOUR_COUNT);
  return clampEsatScore(value);
}

/**
 * Deterministic invented ESAT avg in [5.2, 6.2] when a stage has no cohort data.
 * Mixes stage id with calendar week so values drift slowly over time.
 */
export function inventedEsatAverage(seed: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const week = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  h = (h ^ Math.imul(week, 2654435761)) >>> 0;
  const t = (h % 1001) / 1000; // 0 .. 1
  return clampEsatScore(5.2 + t);
}

/**
 * Average doer ESAT score for a stage (plus-four toward 5.0).
 * Only values on the official 1.0–9.0 scale are used (accuracy % is ignored).
 * When no real data exists, invents a stable-but-drifting 5.2–6.2 value.
 */
export function averageScoreForStage(
  stage: RoadmapStage,
  averagesByVariant:
    | Record<string, number>
    | Map<string, number>
    | RoadmapAverageMaps,
): StageAverageScore {
  const maps = normalizeAverageMaps(averagesByVariant);
  const keys = stageAverageKeys(stage);

  let sum = 0;
  let count = 0;
  const seen = new Set<string>();

  for (const key of keys) {
    if (seen.has(key)) continue;
    seen.add(key);
    const avg = maps.averages[key];
    // Reject percentages / raw marks that slipped through (must be 1–9).
    if (!isEsatScaledScore(avg)) continue;
    const n = maps.counts?.[key] ?? 1;
    if (!Number.isFinite(n) || n <= 0) continue;
    sum += avg * n;
    count += n;
  }

  if (count === 0) {
    const paperType = examNameToPaperType(stage.examName) || stage.examName;
    const yearKeys = [
      `${paperType}:${stage.year}`,
      `${stage.examName}:${stage.year}`,
    ];
    for (const key of yearKeys) {
      const avg = maps.yearAverages?.[key];
      if (!isEsatScaledScore(avg)) continue;
      const n = maps.yearCounts?.[key] ?? 1;
      if (!Number.isFinite(n) || n <= 0) continue;
      sum += avg * n;
      count += n;
      break;
    }
  }

  if (count > 0) {
    return { value: plusFourAverage(sum, count), synthetic: false };
  }

  return {
    value: inventedEsatAverage(`${stage.id}:${stage.year}:${stage.examName}`),
    synthetic: true,
  };
}

export function formatNumericScore(
  value: number | StageAverageScore | null | undefined,
): string {
  if (value == null) return inventedEsatAverage("fallback").toFixed(1);
  if (typeof value === "object") {
    if (!isEsatScaledScore(value.value)) {
      return inventedEsatAverage("fallback").toFixed(1);
    }
    return clampEsatScore(value.value).toFixed(1);
  }
  if (!isEsatScaledScore(value)) return inventedEsatAverage("fallback").toFixed(1);
  return clampEsatScore(value).toFixed(1);
}
