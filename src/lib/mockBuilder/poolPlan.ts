/**
 * Analyse mock pool availability against a blueprint and build a fill plan.
 * Fails loudly when hard difficulty mins cannot be met.
 */

import type {
  MockBlueprintConfig,
  MockCandidateQuestion,
  MockDifficulty,
} from "./types";
import { mockPoolTier, type MockPoolTier } from "./poolFilters";
import { isAssemblyEligible } from "./poolFilters";

export type DifficultyFillTarget = {
  difficulty: MockDifficulty;
  min: number;
  max: number;
  ideal: number;
  available: number;
  target: number;
};

export type PoolPlan = {
  feasible: boolean;
  shortfalls: string[];
  difficultyTargets: DifficultyFillTarget[];
  byDifficulty: Record<MockDifficulty, number>;
  byTopic: Record<string, number>;
  byTier: Record<MockPoolTier, number>;
  labeledCount: number;
  unlabeledCount: number;
  totalEligible: number;
  summary: string;
};

function emptyDifficultyCounts(): Record<MockDifficulty, number> {
  return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
}

/**
 * Eligible pool for planning: assembly-eligible and has trusted AI 1–5 difficulty.
 */
export function filterPlanPool(
  pool: MockCandidateQuestion[],
  options?: { allowIds?: Set<string> },
): MockCandidateQuestion[] {
  const allow = options?.allowIds ?? new Set<string>();
  return pool.filter((q) => {
    if (allow.has(q.id)) return true;
    return isAssemblyEligible(q) && q.hasAiMockDifficulty;
  });
}

export function analysePoolPlan(
  pool: MockCandidateQuestion[],
  blueprint: MockBlueprintConfig,
  options?: { allowIds?: Set<string>; requireAiDifficulty?: boolean },
): PoolPlan {
  const requireAi = options?.requireAiDifficulty !== false;
  const allow = options?.allowIds ?? new Set<string>();

  const eligible = pool.filter((q) => {
    if (allow.has(q.id)) return true;
    if (!isAssemblyEligible(q)) return false;
    if (requireAi && !q.hasAiMockDifficulty) return false;
    return true;
  });

  const unlabeledCount = pool.filter(
    (q) =>
      isAssemblyEligible(q) &&
      !q.hasAiMockDifficulty &&
      !allow.has(q.id),
  ).length;

  const byDifficulty = emptyDifficultyCounts();
  const byTopic: Record<string, number> = {};
  const byTier: Record<MockPoolTier, number> = {
    off_bank: 0,
    unattempted_bank: 0,
    attempted_bank: 0,
  };

  for (const q of eligible) {
    byDifficulty[q.mockDifficulty] += 1;
    byTopic[q.topicCode] = (byTopic[q.topicCode] ?? 0) + 1;
    byTier[mockPoolTier(q)] += 1;
  }

  const shortfalls: string[] = [];
  const difficultyTargets: DifficultyFillTarget[] = [];

  let remainingSlots = blueprint.questionCount;
  // First pass: assign mins
  const provisional = emptyDifficultyCounts();
  for (const band of blueprint.difficultyDistribution) {
    const available = byDifficulty[band.difficulty] ?? 0;
    if (available < band.min) {
      shortfalls.push(
        `Need ${band.min} difficulty-${band.difficulty} questions; pool has ${available}.`,
      );
    }
    const takeMin = Math.min(band.min, available);
    provisional[band.difficulty] = takeMin;
    remainingSlots -= takeMin;
  }

  // Second pass: fill toward ideal then max
  for (const band of blueprint.difficultyDistribution) {
    const available = byDifficulty[band.difficulty] ?? 0;
    const already = provisional[band.difficulty];
    const roomToIdeal = Math.max(0, band.ideal - already);
    const roomToMax = Math.max(0, band.max - already);
    const stock = Math.max(0, available - already);
    const addIdeal = Math.min(roomToIdeal, stock, Math.max(0, remainingSlots));
    provisional[band.difficulty] += addIdeal;
    remainingSlots -= addIdeal;
    const afterIdeal = provisional[band.difficulty];
    const stockLeft = Math.max(0, available - afterIdeal);
    const addMax = Math.min(
      Math.max(0, roomToMax - addIdeal),
      stockLeft,
      Math.max(0, remainingSlots),
    );
    provisional[band.difficulty] += addMax;
    remainingSlots -= addMax;
  }

  // Dump leftover slots into bands with stock under max (prefer ideal proximity)
  if (remainingSlots > 0) {
    const order = [...blueprint.difficultyDistribution].sort(
      (a, b) =>
        Math.abs(provisional[a.difficulty] - a.ideal) -
        Math.abs(provisional[b.difficulty] - b.ideal),
    );
    for (const band of order) {
      if (remainingSlots <= 0) break;
      const available = byDifficulty[band.difficulty] ?? 0;
      const already = provisional[band.difficulty];
      const canAdd = Math.min(
        Math.max(0, band.max - already),
        Math.max(0, available - already),
        remainingSlots,
      );
      provisional[band.difficulty] += canAdd;
      remainingSlots -= canAdd;
    }
  }

  for (const band of blueprint.difficultyDistribution) {
    difficultyTargets.push({
      difficulty: band.difficulty,
      min: band.min,
      max: band.max,
      ideal: band.ideal,
      available: byDifficulty[band.difficulty] ?? 0,
      target: provisional[band.difficulty],
    });
  }

  const totalEligible = eligible.length;
  if (totalEligible < blueprint.questionCount) {
    shortfalls.push(
      `Need ${blueprint.questionCount} eligible questions; pool has ${totalEligible} with AI difficulty 1–5.`,
    );
  }

  if (unlabeledCount > 0 && requireAi) {
    // Not a hard fail by itself if labeled stock is enough, but note it.
  }

  const feasible = shortfalls.length === 0;
  const bandSummary = difficultyTargets
    .map((t) => `D${t.difficulty}:${t.target}/${t.available}`)
    .join(" ");
  const summary = feasible
    ? `Pool plan OK (${totalEligible} eligible). Targets ${bandSummary}. Off-bank ${byTier.off_bank}.`
    : `Pool plan blocked: ${shortfalls.join(" ")}`;

  return {
    feasible,
    shortfalls,
    difficultyTargets,
    byDifficulty,
    byTopic,
    byTier,
    labeledCount: totalEligible,
    unlabeledCount,
    totalEligible,
    summary,
  };
}

/** Throw if the pool cannot satisfy hard blueprint mins. */
export function assertPoolPlanFeasible(plan: PoolPlan): void {
  if (plan.feasible) return;
  throw new Error(plan.shortfalls.join(" ") || plan.summary);
}
