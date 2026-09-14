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

function stageVariants(stage: RoadmapStage): Set<string> {
  return new Set(
    stage.parts.map(
      (part) => `${stage.year}-${part.paperName}-${part.examType}`,
    ),
  );
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
