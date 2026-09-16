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

export type ScoreUnit = "scaled" | "percent";

export type RoadmapAverageMaps = {
  averages: Record<string, number>;
  counts?: Record<string, number>;
  units?: Record<string, ScoreUnit>;
  yearAverages?: Record<string, number>;
  yearCounts?: Record<string, number>;
  yearUnits?: Record<string, ScoreUnit>;
};

export type StageAverageScore = {
  value: number;
  unit: ScoreUnit;
};

function stageVariants(stage: RoadmapStage): Set<string> {
  return new Set(
    stage.parts.map(
      (part) => `${stage.year}-${part.paperName}-${part.examType}`,
    ),
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

function accuracyFromSession(session: PaperSession): number | null {
  if (!session.score || session.score.total <= 0) return null;
  if (session.score.correct <= 0) return null;
  return (session.score.correct / session.score.total) * 100;
}

/** Map stage id → best predicted score (or accuracy fallback). */
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
    let bestAccuracy: number | null = null;

    for (const session of matched) {
      if (
        typeof session.predictedScore === "number" &&
        Number.isFinite(session.predictedScore)
      ) {
        bestPredicted =
          bestPredicted == null
            ? session.predictedScore
            : Math.max(bestPredicted, session.predictedScore);
      }

      const accuracy = accuracyFromSession(session);
      if (accuracy != null) {
        bestAccuracy =
          bestAccuracy == null ? accuracy : Math.max(bestAccuracy, accuracy);
      }
    }

    result.set(stage.id, {
      predictedScore: bestPredicted,
      accuracyPercent: bestAccuracy,
    });
  }

  return result;
}

export function formatRoadmapScore(score: RoadmapStageScore | undefined): string {
  if (!score) return "-";
  if (score.predictedScore != null) {
    return score.predictedScore.toFixed(1);
  }
  if (score.accuracyPercent != null) {
    return `${Math.round(score.accuracyPercent)}%`;
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

/**
 * Average doer score for a stage.
 * Individual section sittings count: weight exact paper_variant averages,
 * then fall back to exam+year aggregates. Prefer scaled ESAT scores when
 * present; otherwise use accuracy %.
 */
export function averageScoreForStage(
  stage: RoadmapStage,
  averagesByVariant:
    | Record<string, number>
    | Map<string, number>
    | RoadmapAverageMaps,
): StageAverageScore | null {
  const maps = normalizeAverageMaps(averagesByVariant);
  const keys = stageAverageKeys(stage);

  let scaledTotal = 0;
  let scaledCount = 0;
  let percentTotal = 0;
  let percentCount = 0;

  for (const key of keys) {
    const avg = maps.averages[key];
    if (typeof avg !== "number" || !Number.isFinite(avg)) continue;
    const n = maps.counts?.[key] ?? 1;
    const unit = maps.units?.[key] ?? "scaled";
    if (unit === "percent") {
      percentTotal += avg * n;
      percentCount += n;
    } else {
      scaledTotal += avg * n;
      scaledCount += n;
    }
  }

  if (scaledCount > 0) {
    return {
      value: Math.round((scaledTotal / scaledCount) * 10) / 10,
      unit: "scaled",
    };
  }
  if (percentCount > 0) {
    return {
      value: Math.round((percentTotal / percentCount) * 10) / 10,
      unit: "percent",
    };
  }

  // Fall back: any completed sittings for this exam year (any section).
  const paperType = examNameToPaperType(stage.examName) || stage.examName;
  const yearKeys = [
    `${paperType}:${stage.year}`,
    `${stage.examName}:${stage.year}`,
  ];
  for (const key of yearKeys) {
    const avg = maps.yearAverages?.[key];
    if (typeof avg !== "number" || !Number.isFinite(avg)) continue;
    const unit = maps.yearUnits?.[key] ?? "scaled";
    return { value: avg, unit };
  }

  return null;
}

export function formatNumericScore(
  value: number | StageAverageScore | null | undefined,
): string {
  if (value == null) return "No data";
  if (typeof value === "object") {
    if (!Number.isFinite(value.value)) return "No data";
    if (value.unit === "percent") return `${Math.round(value.value)}%`;
    return value.value.toFixed(1);
  }
  if (!Number.isFinite(value)) return "No data";
  return value.toFixed(1);
}
