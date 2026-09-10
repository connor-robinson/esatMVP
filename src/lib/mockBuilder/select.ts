/**
 * Mock selection + iterative replacement optimiser.
 * Paper-level quality over random LIMIT 27.
 */

import { effectiveQuestionTimeSeconds } from "./metadata";
import { conflictsWithPaper, findSimilarityIssues } from "./similarity";
import { sequenceQuestions } from "./sequence";
import {
  answerDistributionMap,
  computePaperScore,
  meanDifficulty,
  presentationMixMap,
  topicCoverageMap,
  totalWorkloadSeconds,
} from "./scoring";
import { detectGaps } from "./gaps";
import { isDiagramQuestion, isFreeTierHookQuestionId } from "./poolFilters";
import type {
  MockBlueprintConfig,
  MockCandidateQuestion,
  MockDifficulty,
  MockSlot,
  PaperAssemblyResult,
} from "./types";

export type AssembleOptions = {
  blueprint: MockBlueprintConfig;
  pool: MockCandidateQuestion[];
  /** Locked slots that must remain (position 1-based). */
  lockedSlots?: MockSlot[];
  /** Question IDs already used in other published/approved mocks (soft avoid). */
  usedElsewhereIds?: Set<string>;
  maxIterations?: number;
  seed?: number;
};

function isPublishable(q: MockCandidateQuestion): boolean {
  return (
    q.status === "approved" &&
    q.mockEligible &&
    Boolean(q.questionStem?.trim()) &&
    Boolean(q.correctOption) &&
    Object.keys(q.options).length >= 2
  );
}

function difficultyNeed(
  current: MockCandidateQuestion[],
  blueprint: MockBlueprintConfig,
): MockDifficulty | null {
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const q of current) counts[q.mockDifficulty] += 1;
  let best: MockDifficulty | null = null;
  let bestDeficit = 0;
  for (const band of blueprint.difficultyDistribution) {
    const deficit = band.ideal - (counts[band.difficulty] ?? 0);
    if (deficit > bestDeficit) {
      bestDeficit = deficit;
      best = band.difficulty;
    }
  }
  return bestDeficit > 0 ? best : null;
}

function topicNeed(
  current: MockCandidateQuestion[],
  blueprint: MockBlueprintConfig,
): string | null {
  const counts: Record<string, number> = {};
  for (const q of current) {
    counts[q.topicCode] = (counts[q.topicCode] ?? 0) + 1;
  }
  let best: string | null = null;
  let bestDeficit = 0;
  for (const t of blueprint.topicTargets) {
    const n = counts[t.topicCode] ?? 0;
    if (n < t.min) {
      const deficit = t.min - n;
      if (deficit > bestDeficit) {
        bestDeficit = deficit;
        best = t.topicCode;
      }
    }
  }
  // Prefer uncovered topics when mins are satisfied
  if (!best) {
    for (const t of blueprint.topicTargets) {
      if ((counts[t.topicCode] ?? 0) === 0) return t.topicCode;
    }
  }
  return best;
}

function scoreCandidateFit(
  candidate: MockCandidateQuestion,
  current: MockCandidateQuestion[],
  blueprint: MockBlueprintConfig,
  usedElsewhere: Set<string>,
): number {
  let score = candidate.qualityScore * 20;
  const needDiff = difficultyNeed(current, blueprint);
  if (needDiff != null) {
    score += 8 - Math.abs(candidate.mockDifficulty - needDiff) * 3;
  }
  const needTopic = topicNeed(current, blueprint);
  if (needTopic && candidate.topicCode === needTopic) score += 6;

  const topicCount = current.filter((q) => q.topicCode === candidate.topicCode)
    .length;
  if (topicCount >= blueprint.maxPerTopicSoft) score -= 10;

  const reasoningCount = current.filter(
    (q) => q.reasoningType === candidate.reasoningType,
  ).length;
  if (reasoningCount >= blueprint.maxRepeatedReasoningType) score -= 8;

  if (conflictsWithPaper(candidate, current)) score -= 15;

  // Hard-excluded elsewhere; keep a heavy penalty as safety net.
  if (usedElsewhere.has(candidate.id)) score -= 100;
  if (candidate.reservedForMock) score -= 100;
  if (isFreeTierHookQuestionId(candidate.id)) score -= 100;
  score -= candidate.mockUsageCount * 0.5;

  const diagramTarget = blueprint.presentationTargets.find(
    (t) => t.type === "diagram",
  );
  if (diagramTarget) {
    const currentDiagrams = current.filter(isDiagramQuestion).length;
    const candIsDiagram = isDiagramQuestion(candidate);
    if (currentDiagrams < diagramTarget.min && candIsDiagram) {
      score += 14;
    }
    if (currentDiagrams >= diagramTarget.max && candIsDiagram) {
      score -= 18;
    }
    if (currentDiagrams < diagramTarget.min && !candIsDiagram) {
      score -= 4;
    }
  }

  const letterCounts: Record<string, number> = {};
  for (const q of current) {
    letterCounts[q.correctOption] = (letterCounts[q.correctOption] ?? 0) + 1;
  }
  const projected = (letterCounts[candidate.correctOption] ?? 0) + 1;
  if (projected > blueprint.answerDistributionTolerance.hardMaxPerLetter) {
    score -= 12;
  }

  // Prefer workload toward ideal
  const currentTime = totalWorkloadSeconds(current);
  const projectedTime = currentTime + effectiveQuestionTimeSeconds(candidate);
  const ideal = blueprint.estimatedTimingSeconds.ideal;
  const remainingSlots = blueprint.questionCount - current.length - 1;
  const projectedFinal =
    projectedTime + remainingSlots * (ideal / blueprint.questionCount);
  score -= Math.abs(projectedFinal - ideal) / 80;

  return score;
}

function greedySelect(
  pool: MockCandidateQuestion[],
  blueprint: MockBlueprintConfig,
  locked: MockCandidateQuestion[],
  usedElsewhere: Set<string>,
): MockCandidateQuestion[] {
  const selected = [...locked];
  const selectedIds = new Set(selected.map((q) => q.id));
  const available = pool.filter(
    (q) =>
      isPublishable(q) &&
      !selectedIds.has(q.id) &&
      !usedElsewhere.has(q.id) &&
      !isFreeTierHookQuestionId(q.id) &&
      !q.reservedForMock,
  );

  while (selected.length < blueprint.questionCount && available.length > 0) {
    let bestIdx = 0;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < available.length; i++) {
      const s = scoreCandidateFit(
        available[i],
        selected,
        blueprint,
        usedElsewhere,
      );
      if (s > bestScore) {
        bestScore = s;
        bestIdx = i;
      }
    }
    const [chosen] = available.splice(bestIdx, 1);
    selected.push(chosen);
    selectedIds.add(chosen.id);
  }

  return selected;
}

function iterativeImprove(
  selected: MockCandidateQuestion[],
  pool: MockCandidateQuestion[],
  blueprint: MockBlueprintConfig,
  lockedIds: Set<string>,
  usedElsewhere: Set<string>,
  maxIterations: number,
): MockCandidateQuestion[] {
  let current = [...selected];
  let best = current;
  let bestScore = computePaperScore(
    current,
    blueprint,
    findSimilarityIssues(current),
  ).overall;

  const available = pool.filter(
    (q) =>
      isPublishable(q) &&
      !current.some((c) => c.id === q.id) &&
      !usedElsewhere.has(q.id) &&
      !isFreeTierHookQuestionId(q.id) &&
      !q.reservedForMock,
  );

  for (let iter = 0; iter < maxIterations; iter++) {
    const issues = findSimilarityIssues(current);
    const breakdown = computePaperScore(current, blueprint, issues);
    const unlockedIndexes = current
      .map((q, i) => ({ q, i }))
      .filter(({ q }) => !lockedIds.has(q.id))
      .map(({ i }) => i);

    if (unlockedIndexes.length === 0) break;

    // Replace weakest contribution: high-similarity or overrepresented topic/difficulty.
    const replaceIdx =
      unlockedIndexes[iter % unlockedIndexes.length] ??
      unlockedIndexes[0];
    const outgoing = current[replaceIdx];

    let bestCandidate: MockCandidateQuestion | null = null;
    let bestCandidateScore = bestScore;

    for (const cand of available) {
      if (cand.id === outgoing.id) continue;
      if (conflictsWithPaper(cand, current.filter((_, i) => i !== replaceIdx))) {
        continue;
      }
      const next = current.map((q, i) => (i === replaceIdx ? cand : q));
      const nextScore = computePaperScore(
        next,
        blueprint,
        findSimilarityIssues(next),
      ).overall;
      const fitBonus =
        scoreCandidateFit(
          cand,
          next.filter((q) => q.id !== cand.id),
          blueprint,
          usedElsewhere,
        ) / 100;
      const total = nextScore + fitBonus * 0.05;
      if (total > bestCandidateScore) {
        bestCandidateScore = total;
        bestCandidate = cand;
      }
    }

    if (bestCandidate) {
      available.push(outgoing);
      const idx = available.findIndex((q) => q.id === bestCandidate!.id);
      if (idx >= 0) available.splice(idx, 1);
      current = current.map((q, i) =>
        i === replaceIdx ? bestCandidate! : q,
      );
      if (bestCandidateScore > bestScore) {
        bestScore = bestCandidateScore;
        best = current;
      }
    }
  }

  return best;
}

export function assembleMockPaper(options: AssembleOptions): PaperAssemblyResult {
  const {
    blueprint,
    pool,
    lockedSlots = [],
    usedElsewhereIds = new Set(),
    maxIterations = 40,
    seed,
  } = options;

  const notes: string[] = [];
  const lockedQuestions: MockCandidateQuestion[] = [];
  const lockedOrder: Array<{ questionId: string; position: number }> = [];

  for (const slot of lockedSlots) {
    const q =
      slot.question ??
      pool.find((p) => p.id === slot.questionId) ??
      null;
    if (!q) {
      notes.push(
        `Locked question ${slot.questionId} at position ${slot.position} was not found in pool.`,
      );
      continue;
    }
    lockedQuestions.push(q);
    lockedOrder.push({ questionId: q.id, position: slot.position });
  }

  if (lockedQuestions.length > blueprint.questionCount) {
    throw new Error("More locked questions than blueprint question count.");
  }

  let selected = greedySelect(
    pool,
    blueprint,
    lockedQuestions,
    usedElsewhereIds,
  );

  if (selected.length < blueprint.questionCount) {
    notes.push(
      `Only ${selected.length}/${blueprint.questionCount} eligible questions available.`,
    );
  }

  selected = iterativeImprove(
    selected,
    pool,
    blueprint,
    new Set(lockedQuestions.map((q) => q.id)),
    usedElsewhereIds,
    maxIterations,
  );

  // Keep exactly questionCount when possible
  if (selected.length > blueprint.questionCount) {
    const lockedIds = new Set(lockedQuestions.map((q) => q.id));
    const locked = selected.filter((q) => lockedIds.has(q.id));
    const rest = selected.filter((q) => !lockedIds.has(q.id));
    selected = [
      ...locked,
      ...rest.slice(0, Math.max(0, blueprint.questionCount - locked.length)),
    ];
  }

  const sequenced = sequenceQuestions(selected, { lockedOrder, seed });
  const similarityIssues = findSimilarityIssues(sequenced);
  const score = computePaperScore(sequenced, blueprint, similarityIssues);
  const gaps = detectGaps(sequenced, blueprint, similarityIssues);

  const slots: MockSlot[] = sequenced.map((q, i) => ({
    position: i + 1,
    questionId: q.id,
    locked: lockedQuestions.some((lq) => lq.id === q.id),
    question: q,
  }));

  return {
    slots,
    score,
    predictedDifficulty: meanDifficulty(sequenced),
    predictedWorkloadSeconds: totalWorkloadSeconds(sequenced),
    topicCoverage: topicCoverageMap(sequenced),
    presentationMix: presentationMixMap(sequenced),
    answerDistribution: answerDistributionMap(sequenced),
    similarityIssues,
    gaps,
    notes,
  };
}

export type ReplaceSlotOptions = {
  blueprint: MockBlueprintConfig;
  pool: MockCandidateQuestion[];
  currentSlots: MockSlot[];
  position: number;
  limit?: number;
};

/**
 * Propose replacement candidates for a slot that preserve blueprint pressure.
 */
export function proposeReplacements(
  options: ReplaceSlotOptions,
): MockCandidateQuestion[] {
  const { blueprint, pool, currentSlots, position, limit = 5 } = options;
  const current = currentSlots
    .map((s) => s.question)
    .filter((q): q is MockCandidateQuestion => Boolean(q));
  const target = currentSlots.find((s) => s.position === position)?.question;
  if (!target) return [];

  const others = current.filter((q) => q.id !== target.id);
  const usedIds = new Set(current.map((q) => q.id));

  const scored = pool
    .filter(
      (q) =>
        isPublishable(q) &&
        !usedIds.has(q.id) &&
        !isFreeTierHookQuestionId(q.id) &&
        !q.reservedForMock,
    )
    .filter((q) => !conflictsWithPaper(q, others))
    .map((q) => {
      let s = scoreCandidateFit(q, others, blueprint, new Set());
      // Prefer similar difficulty / time / topic family to the slot.
      s += 6 - Math.abs(q.mockDifficulty - target.mockDifficulty) * 2;
      s +=
        4 -
        Math.abs(q.estimatedTimeSeconds - target.estimatedTimeSeconds) / 25;
      if (q.topicCode === target.topicCode) s += 3;
      if (q.reasoningType === target.reasoningType) s -= 4; // prefer different mechanism
      return { q, s };
    })
    .sort((a, b) => b.s - a.s);

  return scored.slice(0, limit).map((x) => x.q);
}
