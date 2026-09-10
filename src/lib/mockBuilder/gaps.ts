/**
 * Detect blueprint gaps after assembling a draft paper.
 */

import { totalWorkloadSeconds } from "./scoring";
import type {
  MockBlueprintConfig,
  MockCandidateQuestion,
  MockGap,
  SimilarityIssue,
} from "./types";

export function detectGaps(
  questions: MockCandidateQuestion[],
  blueprint: MockBlueprintConfig,
  similarityIssues: SimilarityIssue[] = [],
): MockGap[] {
  const gaps: MockGap[] = [];
  const diffCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const topicCounts: Record<string, number> = {};
  const presentationCounts: Record<string, number> = {};

  for (const q of questions) {
    diffCounts[q.mockDifficulty] += 1;
    topicCounts[q.topicCode] = (topicCounts[q.topicCode] ?? 0) + 1;
    presentationCounts[q.presentationType] =
      (presentationCounts[q.presentationType] ?? 0) + 1;
  }

  for (const band of blueprint.difficultyDistribution) {
    const n = diffCounts[band.difficulty] ?? 0;
    if (n < band.min) {
      const need = band.min - n;
      gaps.push({
        kind: "difficulty",
        message: `Missing ${need} difficulty-${band.difficulty} question(s) (have ${n}, want ${band.min}–${band.max}).`,
        targetDifficulty: band.difficulty,
        targetTimeSeconds: {
          min: 60 + band.difficulty * 10,
          max: 90 + band.difficulty * 15,
        },
      });
    }
  }

  for (const t of blueprint.topicTargets) {
    const n = topicCounts[t.topicCode] ?? 0;
    if (n < t.min) {
      gaps.push({
        kind: "topic",
        message: `Missing topic ${t.topicCode}: have ${n}, want at least ${t.min}.`,
        topicCode: t.topicCode,
        targetDifficulty: 3,
        targetTimeSeconds: { min: 70, max: 110 },
      });
    }
  }

  for (const p of blueprint.presentationTargets) {
    if (p.type === "text") continue;
    const n = presentationCounts[p.type] ?? 0;
    if (n < p.min) {
      gaps.push({
        kind: "presentation",
        message: `Need more ${p.type} questions: have ${n}, want at least ${p.min}.`,
        presentationType: p.type,
        targetDifficulty: 3,
        targetTimeSeconds: { min: 80, max: 120 },
      });
    }
  }

  const workload = totalWorkloadSeconds(questions);
  if (workload < blueprint.estimatedTimingSeconds.min) {
    gaps.push({
      kind: "timing",
      message: `Predicted workload ${workload}s is below target min ${blueprint.estimatedTimingSeconds.min}s (insufficient time pressure).`,
      targetTimeSeconds: {
        min: 100,
        max: 140,
      },
      targetDifficulty: 4,
    });
  } else if (workload > blueprint.estimatedTimingSeconds.max) {
    gaps.push({
      kind: "timing",
      message: `Predicted workload ${workload}s exceeds target max ${blueprint.estimatedTimingSeconds.max}s.`,
      targetTimeSeconds: { min: 50, max: 75 },
      targetDifficulty: 2,
    });
  }

  for (const issue of similarityIssues.filter((i) => i.severity === "high")) {
    gaps.push({
      kind: "reasoning",
      message: issue.reason,
      avoidPositions: [issue.a, issue.b],
      targetDifficulty: 3,
      targetTimeSeconds: { min: 70, max: 110 },
    });
  }

  return gaps;
}

/** Compact prompt payload for the question-generation pipeline. */
export function gapsToGenerationBriefs(gaps: MockGap[]): string[] {
  return gaps.slice(0, 8).map((g) => {
    const parts = [g.message];
    if (g.targetDifficulty != null) {
      parts.push(`target difficulty: ${g.targetDifficulty}`);
    }
    if (g.targetTimeSeconds) {
      parts.push(
        `target time: ${g.targetTimeSeconds.min}–${g.targetTimeSeconds.max} sec`,
      );
    }
    if (g.topicCode) parts.push(`topic: ${g.topicCode}`);
    if (g.reasoningType) parts.push(`reasoning: ${g.reasoningType}`);
    if (g.presentationType) parts.push(`presentation: ${g.presentationType}`);
    if (g.avoidPositions?.length) {
      parts.push(`must differ from Q${g.avoidPositions.join(" and Q")}`);
    }
    return parts.join("; ");
  });
}
