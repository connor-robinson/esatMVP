/**
 * Difficulty sequencing: separate from selection.
 * Avoids sorted easy→hard and long hard clusters.
 */

import type { MockCandidateQuestion } from "./types";

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(ids: string[]): number {
  let h = 2166136261;
  for (const id of ids) {
    for (let i = 0; i < id.length; i++) {
      h ^= id.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
  }
  return h >>> 0;
}

/**
 * Sequence selected questions into a realistic fluctuating difficulty curve.
 * Locked positions (by question id → desired index) are respected when provided.
 */
export function sequenceQuestions(
  selected: MockCandidateQuestion[],
  options?: {
    lockedOrder?: Array<{ questionId: string; position: number }>;
    seed?: number;
  },
): MockCandidateQuestion[] {
  const n = selected.length;
  if (n === 0) return [];

  const byId = new Map(selected.map((q) => [q.id, q]));
  const result: Array<MockCandidateQuestion | null> = Array(n).fill(null);
  const used = new Set<string>();

  for (const lock of options?.lockedOrder ?? []) {
    const q = byId.get(lock.questionId);
    const idx = lock.position - 1;
    if (!q || idx < 0 || idx >= n || result[idx]) continue;
    result[idx] = q;
    used.add(q.id);
  }

  const remaining = selected.filter((q) => !used.has(q.id));
  const rand = mulberry32(options?.seed ?? hashSeed(selected.map((q) => q.id)));

  // Target contour: medium opener, early hard spike, mid easy breaths, late hard.
  const targetCurve = buildTargetCurve(n, rand);

  const pool = [...remaining].sort((a, b) => {
    if (a.mockDifficulty !== b.mockDifficulty) {
      return a.mockDifficulty - b.mockDifficulty;
    }
    return a.estimatedTimeSeconds - b.estimatedTimeSeconds;
  });

  for (let i = 0; i < n; i++) {
    if (result[i]) continue;
    const target = targetCurve[i];
    let bestIdx = 0;
    let bestScore = Number.POSITIVE_INFINITY;
    for (let p = 0; p < pool.length; p++) {
      const q = pool[p];
      let score = Math.abs(q.mockDifficulty - target) * 10;
      score += Math.abs(q.estimatedTimeSeconds - 85) / 40;
      // Prefer not stacking same difficulty as neighbours.
      const prev = i > 0 ? result[i - 1] : null;
      const next = i < n - 1 ? result[i + 1] : null;
      if (prev && prev.mockDifficulty === q.mockDifficulty && q.mockDifficulty >= 4) {
        score += 4;
      }
      if (next && next.mockDifficulty === q.mockDifficulty && q.mockDifficulty >= 4) {
        score += 2;
      }
      // Occasional early hard: reward hard items in early hard slots.
      if (i < 8 && target >= 4 && q.mockDifficulty >= 4) score -= 2;
      // Prefer short/easy as breathers after hard.
      if (prev && prev.mockDifficulty >= 4 && q.mockDifficulty <= 2) score -= 3;
      score += rand() * 0.5;
      if (score < bestScore) {
        bestScore = score;
        bestIdx = p;
      }
    }
    const [chosen] = pool.splice(bestIdx, 1);
    result[i] = chosen;
  }

  return result.map((q, i) => {
    if (!q) throw new Error(`Sequence gap at position ${i + 1}`);
    return q;
  });
}

function buildTargetCurve(n: number, rand: () => number): number[] {
  const curve: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / Math.max(1, n - 1);
    // Base: gentle rise with noise, not monotonic sort.
    let base = 2.6 + t * 1.2;
    if (i === 0) base = 3;
    if (i === 1) base = 2;
    if (i === 4) base = 4;
    if (i === 5) base = 2;
    if (i === Math.floor(n * 0.65)) base = 4.5;
    if (i === Math.floor(n * 0.7)) base = 3;
    if (i === n - 1) base = 4;
    if (i === n - 2) base = 3.5;
    base += (rand() - 0.5) * 0.8;
    curve.push(Math.max(1, Math.min(5, base)));
  }
  return curve;
}

/** Guard: sequenced paper must not equal ascending difficulty sort. */
export function isStrictlyAscendingDifficulty(
  questions: MockCandidateQuestion[],
): boolean {
  for (let i = 1; i < questions.length; i++) {
    if (questions[i].mockDifficulty < questions[i - 1].mockDifficulty) {
      return false;
    }
  }
  return questions.length > 3;
}
