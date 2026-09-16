/**
 * Latest predicted ESAT / paper score per roadmap stage from completed sessions.
 */

import { examNameToPaperType } from "@/lib/papers/paperConfig";
import type { RoadmapStage } from "@/lib/papers/roadmapConfig";
import type { PaperSession } from "@/types/papers";

export type RoadmapStageScore = {
  /** Latest predicted / scaled ESAT score for this stage, if any. */
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

/** Coerce DB / JSON values (number or numeric string) onto the 1.0–9.0 scale. */
export function coerceEsatScaledScore(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value < ESAT_SCORE_MIN || value > ESAT_SCORE_MAX) return null;
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (
      Number.isFinite(parsed) &&
      parsed >= ESAT_SCORE_MIN &&
      parsed <= ESAT_SCORE_MAX
    ) {
      return parsed;
    }
  }
  return null;
}

/** True only for official UAT-UK / ESAT-style scaled scores (1.0–9.0). */
export function isEsatScaledScore(value: unknown): value is number {
  return coerceEsatScaledScore(value) != null;
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

/**
 * Prefer overall predicted ESAT score; else the latest section scaled score
 * from `sectionPercentiles` (mark page saves both after conversion).
 */
export function esatScoreFromSession(session: PaperSession): number | null {
  const overall = coerceEsatScaledScore(session.predictedScore);
  if (overall != null) return overall;

  const sections = session.sectionPercentiles;
  if (!sections || typeof sections !== "object") return null;

  let latest: number | null = null;
  for (const [key, entry] of Object.entries(sections)) {
    if (key.toUpperCase() === "SECTION") continue;
    const score = coerceEsatScaledScore(entry?.score);
    if (score != null) latest = score;
  }
  return latest;
}

function sessionRecency(session: PaperSession): number {
  if (typeof session.endedAt === "number" && Number.isFinite(session.endedAt)) {
    return session.endedAt;
  }
  if (session.updatedAt) {
    const t = Date.parse(session.updatedAt);
    if (Number.isFinite(t)) return t;
  }
  if (session.createdAt) {
    const t = Date.parse(session.createdAt);
    if (Number.isFinite(t)) return t;
  }
  return session.startedAt || 0;
}

/**
 * Map stage id → latest ESAT scaled score from completed sessions
 * (overall predicted, else latest section score).
 */
export function buildRoadmapStageScores(
  stages: RoadmapStage[],
  sessions: PaperSession[],
): Map<string, RoadmapStageScore> {
  const result = new Map<string, RoadmapStageScore>();

  for (const stage of stages) {
    const variants = stageVariants(stage);
    const matched = sessions
      .filter((session) => sessionMatchesStage(session, stage, variants))
      .sort((a, b) => sessionRecency(b) - sessionRecency(a));

    let latestScore: number | null = null;
    for (const session of matched) {
      const score = esatScoreFromSession(session);
      if (score != null) {
        latestScore = score;
        break;
      }
    }

    result.set(stage.id, {
      predictedScore: latestScore,
      accuracyPercent: null,
    });
  }

  return result;
}

/** Format Your Score as an ESAT scaled value only (never accuracy %). */
export function formatRoadmapScore(score: RoadmapStageScore | undefined): string {
  if (!score) return "-";
  const value = coerceEsatScaledScore(score.predictedScore);
  if (value != null) return clampEsatScore(value).toFixed(1);
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
    const avg = coerceEsatScaledScore(maps.averages[key]);
    // Reject percentages / raw marks that slipped through (must be 1–9).
    if (avg == null) continue;
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
      const avg = coerceEsatScaledScore(maps.yearAverages?.[key]);
      if (avg == null) continue;
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
    const coerced = coerceEsatScaledScore(value.value);
    if (coerced == null) {
      return inventedEsatAverage("fallback").toFixed(1);
    }
    return clampEsatScore(coerced).toFixed(1);
  }
  const coerced = coerceEsatScaledScore(value);
  if (coerced == null) return inventedEsatAverage("fallback").toFixed(1);
  return clampEsatScore(coerced).toFixed(1);
}
