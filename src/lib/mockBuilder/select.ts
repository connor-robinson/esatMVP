/**
 * Mock selection + iterative replacement optimiser.
 * Hard difficulty-band constraints; soft topic/timing/variety pressures.
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
import {
  isAssemblyEligible,
  isDiagramQuestion,
  isFreeTierHookQuestion,
  mockPoolTier,
  mockPoolTierScoreBonus,
  qualityGateReplacePreference,
} from "./poolFilters";
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
  /** Question IDs already used in other mocks (soft avoid / hard exclude). */
  usedElsewhereIds?: Set<string>;
  maxIterations?: number;
  seed?: number;
  /** Require hasAiMockDifficulty (default true). */
  requireAiDifficulty?: boolean;
  /** Difficulty band targets from poolPlan (optional). */
  difficultyTargets?: Partial<Record<MockDifficulty, number>>;
};

function isSelectableForMock(
  q: MockCandidateQuestion,
  requireAiDifficulty: boolean,
  allowIds: Set<string>,
): boolean {
  if (allowIds.has(q.id)) return true;
  if (!isAssemblyEligible(q)) return false;
  if (requireAiDifficulty && !q.hasAiMockDifficulty) return false;
  return true;
}

function difficultyCounts(
  current: MockCandidateQuestion[],
): Record<MockDifficulty, number> {
  const counts: Record<MockDifficulty, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  for (const q of current) counts[q.mockDifficulty] += 1;
  return counts;
}

function difficultyNeed(
  current: MockCandidateQuestion[],
  blueprint: MockBlueprintConfig,
  targets?: Partial<Record<MockDifficulty, number>>,
): MockDifficulty | null {
  const counts = difficultyCounts(current);
  let best: MockDifficulty | null = null;
  let bestDeficit = 0;
  for (const band of blueprint.difficultyDistribution) {
    const target = targets?.[band.difficulty] ?? band.ideal;
    const deficit = target - (counts[band.difficulty] ?? 0);
    if (deficit > bestDeficit) {
      bestDeficit = deficit;
      best = band.difficulty;
    }
  }
  // Prefer filling mins first
  for (const band of blueprint.difficultyDistribution) {
    if ((counts[band.difficulty] ?? 0) < band.min) {
      return band.difficulty;
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
  if (!best) {
    for (const t of blueprint.topicTargets) {
      if ((counts[t.topicCode] ?? 0) === 0) return t.topicCode;
    }
  }
  return best;
}

function wouldBreakDifficultyMax(
  candidate: MockCandidateQuestion,
  current: MockCandidateQuestion[],
  blueprint: MockBlueprintConfig,
): boolean {
  const counts = difficultyCounts(current);
  const band = blueprint.difficultyDistribution.find(
    (b) => b.difficulty === candidate.mockDifficulty,
  );
  if (!band) return false;
  return (counts[candidate.mockDifficulty] ?? 0) + 1 > band.max;
}

function scoreCandidateFit(
  candidate: MockCandidateQuestion,
  current: MockCandidateQuestion[],
  blueprint: MockBlueprintConfig,
  usedElsewhere: Set<string>,
  targets?: Partial<Record<MockDifficulty, number>>,
): number {
  let score = candidate.qualityScore * 20;
  score += qualityGateReplacePreference(candidate);

  const needDiff = difficultyNeed(current, blueprint, targets);
  if (needDiff != null) {
    if (candidate.mockDifficulty === needDiff) score += 18;
    else score += 8 - Math.abs(candidate.mockDifficulty - needDiff) * 4;
  }

  const counts = difficultyCounts(current);
  for (const band of blueprint.difficultyDistribution) {
    const n = counts[band.difficulty] ?? 0;
    if (n < band.min && candidate.mockDifficulty === band.difficulty) {
      score += 22;
    }
    if (n >= band.max && candidate.mockDifficulty === band.difficulty) {
      score -= 30;
    }
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

  if (usedElsewhere.has(candidate.id)) score -= 100;
  if (candidate.reservedForMock) score -= 100;
  if (isFreeTierHookQuestion(candidate)) score -= 100;
  score -= candidate.mockUsageCount * 0.5;
  score += mockPoolTierScoreBonus(mockPoolTier(candidate));

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
  requireAiDifficulty: boolean,
  targets?: Partial<Record<MockDifficulty, number>>,
): MockCandidateQuestion[] {
  const selected = [...locked];
  const selectedIds = new Set(selected.map((q) => q.id));
  const allowIds = new Set(locked.map((q) => q.id));
  const available = pool.filter(
    (q) =>
      isSelectableForMock(q, requireAiDifficulty, allowIds) &&
      !selectedIds.has(q.id) &&
      !usedElsewhere.has(q.id) &&
      !isFreeTierHookQuestion(q) &&
      !q.reservedForMock,
  );

  while (selected.length < blueprint.questionCount && available.length > 0) {
    const need = difficultyNeed(selected, blueprint, targets);
    let candidates = available;
    if (need != null) {
      const matching = available.filter((q) => q.mockDifficulty === need);
      if (matching.length > 0) candidates = matching;
    }

    // Prefer not exceeding band max when alternatives exist.
    const underMax = candidates.filter(
      (q) => !wouldBreakDifficultyMax(q, selected, blueprint),
    );
    if (underMax.length > 0) candidates = underMax;

    // Mild tier preference within the constrained candidate set (not hard exhaust).
    let bestIdx = 0;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < candidates.length; i++) {
      const s = scoreCandidateFit(
        candidates[i],
        selected,
        blueprint,
        usedElsewhere,
        targets,
      );
      if (s > bestScore) {
        bestScore = s;
        bestIdx = i;
      }
    }
    const chosen = candidates[bestIdx];
    const availIdx = available.findIndex((q) => q.id === chosen.id);
    available.splice(availIdx, 1);
    selected.push(chosen);
    selectedIds.add(chosen.id);
  }

  return selected;
}

function difficultyMinsSatisfied(
  selected: MockCandidateQuestion[],
  blueprint: MockBlueprintConfig,
): boolean {
  const counts = difficultyCounts(selected);
  return blueprint.difficultyDistribution.every(
    (band) => (counts[band.difficulty] ?? 0) >= band.min,
  );
}

function iterativeImprove(
  selected: MockCandidateQuestion[],
  pool: MockCandidateQuestion[],
  blueprint: MockBlueprintConfig,
  lockedIds: Set<string>,
  usedElsewhere: Set<string>,
  maxIterations: number,
  requireAiDifficulty: boolean,
  targets?: Partial<Record<MockDifficulty, number>>,
): MockCandidateQuestion[] {
  let current = [...selected];
  let best = current;
  let bestScore = computePaperScore(
    current,
    blueprint,
    findSimilarityIssues(current),
  ).overall;

  const allowIds = lockedIds;
  const available = pool.filter(
    (q) =>
      isSelectableForMock(q, requireAiDifficulty, allowIds) &&
      !current.some((c) => c.id === q.id) &&
      !usedElsewhere.has(q.id) &&
      !isFreeTierHookQuestion(q) &&
      !q.reservedForMock,
  );

  for (let iter = 0; iter < maxIterations; iter++) {
    const issues = findSimilarityIssues(current);
    const breakdown = computePaperScore(current, blueprint, issues);
    if (
      breakdown.overall >= 0.72 &&
      breakdown.difficulty >= 0.55 &&
      difficultyMinsSatisfied(current, blueprint) &&
      issues.filter((i) => i.severity === "high").length === 0
    ) {
      break;
    }

    const unlockedIndexes = current
      .map((q, i) => ({ q, i }))
      .filter(({ q }) => !lockedIds.has(q.id))
      .map(({ i }) => i);

    if (unlockedIndexes.length === 0) break;

    const replaceIdx =
      unlockedIndexes[iter % unlockedIndexes.length] ?? unlockedIndexes[0];
    const outgoing = current[replaceIdx];

    let bestCandidate: MockCandidateQuestion | null = null;
    let bestCandidateScore = bestScore;

    for (const cand of available) {
      if (cand.id === outgoing.id) continue;
      const others = current.filter((_, i) => i !== replaceIdx);
      if (conflictsWithPaper(cand, others)) continue;
      if (wouldBreakDifficultyMax(cand, others, blueprint)) continue;

      const next = current.map((q, i) => (i === replaceIdx ? cand : q));
      // Never accept a swap that breaks difficulty mins if current already meets them.
      if (
        difficultyMinsSatisfied(current, blueprint) &&
        !difficultyMinsSatisfied(next, blueprint)
      ) {
        continue;
      }

      const nextScore = computePaperScore(
        next,
        blueprint,
        findSimilarityIssues(next),
      ).overall;
      const fitBonus =
        scoreCandidateFit(
          cand,
          others,
          blueprint,
          usedElsewhere,
          targets,
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

/**
 * Auto-swap one side of each high-similarity pair.
 * Medium/low similarity is left alone.
 */
export function swapHighSimilarityPairs(
  slots: MockSlot[],
  pool: MockCandidateQuestion[],
  blueprint: MockBlueprintConfig,
  options?: {
    usedElsewhereIds?: Set<string>;
    requireAiDifficulty?: boolean;
  },
): { slots: MockSlot[]; swapCount: number; notes: string[] } {
  const usedElsewhere = options?.usedElsewhereIds ?? new Set<string>();
  const requireAi = options?.requireAiDifficulty !== false;
  const notes: string[] = [];
  let current = [...slots].sort((a, b) => a.position - b.position);
  let swapCount = 0;
  const maxSwaps = 8;

  for (let round = 0; round < maxSwaps; round++) {
    const questions = current
      .map((s) => s.question)
      .filter((q): q is MockCandidateQuestion => Boolean(q));
    const highs = findSimilarityIssues(questions).filter(
      (i) => i.severity === "high",
    );
    if (highs.length === 0) break;

    const issue = highs[0];
    // Prefer swapping the later position.
    const position = Math.max(issue.a, issue.b);
    const slot = current.find((s) => s.position === position);
    if (!slot || slot.locked) {
      const other = current.find(
        (s) => s.position === Math.min(issue.a, issue.b),
      );
      if (!other || other.locked) {
        notes.push(
          `Could not swap high-similarity pair Q${issue.a}/Q${issue.b} (locked).`,
        );
        break;
      }
      const alts = proposeReplacements({
        blueprint,
        pool,
        currentSlots: current,
        position: other.position,
        limit: 8,
        usedElsewhereIds: usedElsewhere,
        requireAiDifficulty: requireAi,
        preferPassQuality: true,
      });
      if (alts.length === 0) {
        notes.push(
          `No replacement for high-similarity Q${other.position}.`,
        );
        break;
      }
      const replacement = alts[0];
      current = current.map((s) =>
        s.position === other.position
          ? {
              ...s,
              questionId: replacement.id,
              question: replacement,
            }
          : s,
      );
      swapCount += 1;
      notes.push(
        `Swapped Q${other.position} to reduce similarity with Q${position}.`,
      );
      continue;
    }

    const alts = proposeReplacements({
      blueprint,
      pool,
      currentSlots: current,
      position,
      limit: 8,
      usedElsewhereIds: usedElsewhere,
      requireAiDifficulty: requireAi,
      preferPassQuality: true,
    });
    if (alts.length === 0) {
      notes.push(`No replacement for high-similarity Q${position}.`);
      break;
    }
    const replacement = alts[0];
    current = current.map((s) =>
      s.position === position
        ? {
            ...s,
            questionId: replacement.id,
            question: replacement,
          }
        : s,
    );
    swapCount += 1;
    notes.push(
      `Swapped Q${position} to reduce similarity with Q${Math.min(issue.a, issue.b)}.`,
    );
  }

  return { slots: current, swapCount, notes };
}

export function assembleMockPaper(options: AssembleOptions): PaperAssemblyResult {
  const {
    blueprint,
    pool,
    lockedSlots = [],
    usedElsewhereIds = new Set(),
    maxIterations = 40,
    seed,
    requireAiDifficulty = true,
    difficultyTargets,
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
    requireAiDifficulty,
    difficultyTargets,
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
    requireAiDifficulty,
    difficultyTargets,
  );

  if (selected.length > blueprint.questionCount) {
    const lockedIds = new Set(lockedQuestions.map((q) => q.id));
    const locked = selected.filter((q) => lockedIds.has(q.id));
    const rest = selected.filter((q) => !lockedIds.has(q.id));
    selected = [
      ...locked,
      ...rest.slice(0, Math.max(0, blueprint.questionCount - locked.length)),
    ];
  }

  if (
    selected.length >= blueprint.questionCount &&
    !difficultyMinsSatisfied(selected, blueprint)
  ) {
    const counts = difficultyCounts(selected);
    const missing = blueprint.difficultyDistribution
      .filter((b) => (counts[b.difficulty] ?? 0) < b.min)
      .map(
        (b) =>
          `D${b.difficulty} have ${counts[b.difficulty] ?? 0}, need min ${b.min}`,
      );
    notes.push(`Difficulty mins not met after assemble: ${missing.join("; ")}.`);
  }

  let sequenced = sequenceQuestions(selected, { lockedOrder, seed });
  let slots: MockSlot[] = sequenced.map((q, i) => ({
    position: i + 1,
    questionId: q.id,
    locked: lockedQuestions.some((lq) => lq.id === q.id),
    question: q,
  }));

  const simSwap = swapHighSimilarityPairs(slots, pool, blueprint, {
    usedElsewhereIds,
    requireAiDifficulty,
  });
  slots = simSwap.slots;
  notes.push(...simSwap.notes);
  if (simSwap.swapCount > 0) {
    notes.push(`Similarity swaps: ${simSwap.swapCount}.`);
    // Re-sequence after swaps while preserving locks.
    const qs = slots
      .map((s) => s.question)
      .filter((q): q is MockCandidateQuestion => Boolean(q));
    sequenced = sequenceQuestions(qs, { lockedOrder, seed });
    slots = sequenced.map((q, i) => ({
      position: i + 1,
      questionId: q.id,
      locked: lockedQuestions.some((lq) => lq.id === q.id),
      question: q,
    }));
  }

  const finalQuestions = slots
    .map((s) => s.question)
    .filter((q): q is MockCandidateQuestion => Boolean(q));
  const similarityIssues = findSimilarityIssues(finalQuestions);
  const score = computePaperScore(finalQuestions, blueprint, similarityIssues);
  const gaps = detectGaps(finalQuestions, blueprint, similarityIssues);

  const offBank = finalQuestions.filter((q) => mockPoolTier(q) === "off_bank")
    .length;
  const unattempted = finalQuestions.filter(
    (q) => mockPoolTier(q) === "unattempted_bank",
  ).length;
  const attempted = finalQuestions.filter(
    (q) => mockPoolTier(q) === "attempted_bank",
  ).length;
  notes.push(
    `Pool mix: ${offBank} off-bank, ${unattempted} unattempted bank, ${attempted} attempted bank.`,
  );

  return {
    slots,
    score,
    predictedDifficulty: meanDifficulty(finalQuestions),
    predictedWorkloadSeconds: totalWorkloadSeconds(finalQuestions),
    topicCoverage: topicCoverageMap(finalQuestions),
    presentationMix: presentationMixMap(finalQuestions),
    answerDistribution: answerDistributionMap(finalQuestions),
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
  usedElsewhereIds?: Set<string>;
  requireAiDifficulty?: boolean;
  preferPassQuality?: boolean;
};

/**
 * Propose replacement candidates for a slot that preserve blueprint pressure.
 */
export function proposeReplacements(
  options: ReplaceSlotOptions,
): MockCandidateQuestion[] {
  const {
    blueprint,
    pool,
    currentSlots,
    position,
    limit = 5,
    usedElsewhereIds = new Set(),
    requireAiDifficulty = true,
    preferPassQuality = true,
  } = options;
  const current = currentSlots
    .map((s) => s.question)
    .filter((q): q is MockCandidateQuestion => Boolean(q));
  const target = currentSlots.find((s) => s.position === position)?.question;
  if (!target) return [];

  const others = current.filter((q) => q.id !== target.id);
  const usedIds = new Set(current.map((q) => q.id));
  const allowIds = new Set<string>();

  const scored = pool
    .filter(
      (q) =>
        isSelectableForMock(q, requireAiDifficulty, allowIds) &&
        !usedIds.has(q.id) &&
        !usedElsewhereIds.has(q.id) &&
        !isFreeTierHookQuestion(q) &&
        !q.reservedForMock,
    )
    .filter((q) => !conflictsWithPaper(q, others))
    .filter((q) => !wouldBreakDifficultyMax(q, others, blueprint))
    .map((q) => {
      let s = scoreCandidateFit(q, others, blueprint, new Set());
      s += 6 - Math.abs(q.mockDifficulty - target.mockDifficulty) * 2;
      s +=
        4 -
        Math.abs(q.estimatedTimeSeconds - target.estimatedTimeSeconds) / 25;
      if (q.topicCode === target.topicCode) s += 3;
      if (q.reasoningType === target.reasoningType) s -= 4;
      if (preferPassQuality) s += qualityGateReplacePreference(q);
      return { q, s };
    })
    .sort((a, b) => b.s - a.s);

  return scored.slice(0, limit).map((x) => x.q);
}
