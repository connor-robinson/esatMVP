/**
 * Session bank sampling after the fixed hook lead.
 * Prefers diagrams and newer questions early; still sprinkles older / text-only items.
 * Does not re-pick questions already in the candidate pool (no duplicates in-session).
 */

import {
  allocateDifficultyCounts,
  type ApiDifficulty,
  type DifficultyMixPreset,
} from "@/lib/questionBank/difficultyMix";

export type BankSampleQuestion = {
  id: string;
  difficulty: ApiDifficulty;
  created_at?: string | null;
  has_visual?: boolean | null;
  graph_spec?: unknown;
  graph_specs?: Record<string, unknown> | null;
  question_stem?: string;
};

function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = items[i]!;
    items[i] = items[j]!;
    items[j] = tmp;
  }
  return items;
}

/** True when the question has a diagram / graph visual. */
export function questionHasDiagram(q: BankSampleQuestion): boolean {
  if (q.has_visual === true) return true;
  if (q.graph_spec) return true;
  if (q.graph_specs && Object.keys(q.graph_specs).length > 0) return true;
  const stem = q.question_stem ?? "";
  return /<svg[\s>]/i.test(stem);
}

/** 1 = brand new, approaches ~0.12 for very old items (never zero). */
export function questionRecencyScore(
  createdAt: string | null | undefined,
  nowMs = Date.now(),
): number {
  if (!createdAt) return 0.25;
  const ageMs = Math.max(0, nowMs - new Date(createdAt).getTime());
  if (!Number.isFinite(ageMs)) return 0.25;
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return Math.max(0.12, Math.exp(-ageDays / 150));
}

function pickWeight(
  q: BankSampleQuestion,
  phase: "early" | "late",
  nowMs: number,
): number {
  const diagram = questionHasDiagram(q) ? 1 : 0;
  const recency = questionRecencyScore(q.created_at, nowMs);
  if (phase === "early") {
    // Strong diagram + recency bias for the opening stretch of the bank tail.
    return (1 + 4.5 * diagram) * (0.2 + 0.8 * recency);
  }
  // Later: still slightly prefer diagrams/newer, but let older text items through.
  return (1 + 1.1 * diagram) * (0.4 + 0.6 * recency);
}

function weightedSampleWithoutReplacement<T>(
  items: T[],
  count: number,
  weightFn: (item: T) => number,
): T[] {
  if (count <= 0 || items.length === 0) return [];
  const pool = [...items];
  const out: T[] = [];

  while (out.length < count && pool.length > 0) {
    let total = 0;
    const weights = pool.map((item) => {
      const w = Math.max(0.001, weightFn(item));
      total += w;
      return w;
    });
    let r = Math.random() * total;
    let idx = pool.length - 1;
    for (let i = 0; i < weights.length; i += 1) {
      r -= weights[i]!;
      if (r <= 0) {
        idx = i;
        break;
      }
    }
    out.push(pool[idx]!);
    pool.splice(idx, 1);
  }

  return out;
}

/**
 * Order picked questions so the front of the bank tail is diagram-heavy,
 * without making a rigid "all diagrams then all text" block.
 */
export function orderBankTailForSessionStart<T extends BankSampleQuestion>(
  picked: T[],
  nowMs = Date.now(),
): T[] {
  if (picked.length <= 1) return picked;

  const scored = picked.map((q) => ({
    q,
    score:
      (questionHasDiagram(q) ? 3.2 : 0) +
      questionRecencyScore(q.created_at, nowMs) * 1.4 +
      Math.random() * 0.55,
  }));
  scored.sort((a, b) => b.score - a.score);

  const earlyN = Math.max(1, Math.ceil(picked.length * 0.55));
  const early = shuffleInPlace(scored.slice(0, earlyN).map((row) => row.q));
  const late = shuffleInPlace(scored.slice(earlyN).map((row) => row.q));
  return [...early, ...late];
}

/**
 * Difficulty-mix aware sampler for the post-hook bank portion.
 * Weighted toward diagrams + newer items; ordered so early slots feel denser.
 */
export function sampleSessionBankQuestions<T extends BankSampleQuestion>(
  questions: T[],
  count: number,
  mix: DifficultyMixPreset,
  nowMs = Date.now(),
): T[] {
  if (count <= 0 || questions.length === 0) return [];

  const buckets: Record<ApiDifficulty, T[]> = {
    Easy: [],
    Medium: [],
    Hard: [],
  };
  for (const question of questions) {
    buckets[question.difficulty].push(question);
  }

  const targets = allocateDifficultyCounts(count, mix);
  const earlyQuota = Math.ceil(count * 0.55);
  const picked: T[] = [];
  let earlyFilled = 0;

  for (const key of ["Easy", "Medium", "Hard"] as ApiDifficulty[]) {
    const need = Math.min(targets[key], buckets[key].length);
    if (need <= 0) continue;

    const earlyNeed = Math.min(
      need,
      Math.max(0, earlyQuota - earlyFilled),
    );
    const lateNeed = need - earlyNeed;

    const earlyPicks = weightedSampleWithoutReplacement(
      buckets[key],
      earlyNeed,
      (q) => pickWeight(q, "early", nowMs),
    );
    const earlyIds = new Set(earlyPicks.map((q) => q.id));
    const remainingBucket = buckets[key].filter((q) => !earlyIds.has(q.id));
    const latePicks = weightedSampleWithoutReplacement(
      remainingBucket,
      lateNeed,
      (q) => pickWeight(q, "late", nowMs),
    );

    const taken = [...earlyPicks, ...latePicks];
    const takenIds = new Set(taken.map((q) => q.id));
    buckets[key] = buckets[key].filter((q) => !takenIds.has(q.id));
    picked.push(...taken);
    earlyFilled += earlyPicks.length;
  }

  if (picked.length < count) {
    const leftovers = [
      ...buckets.Easy,
      ...buckets.Medium,
      ...buckets.Hard,
    ];
    const extra = weightedSampleWithoutReplacement(
      leftovers,
      count - picked.length,
      (q) => pickWeight(q, "late", nowMs),
    );
    picked.push(...extra);
  }

  return orderBankTailForSessionStart(picked.slice(0, count), nowMs);
}
