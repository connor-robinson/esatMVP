/**
 * Session difficulty mixes for question bank practice.
 * Each preset is a weighted blend of Easy / Medium / Hard questions.
 */

export type DifficultyMixPreset = "Auto" | "Easy" | "Medium" | "Hard";

export type ApiDifficulty = "Easy" | "Medium" | "Hard";

/** Relative weights per preset. Hard includes rare “extreme” items (still stored as Hard). */
export const DIFFICULTY_MIX_WEIGHTS: Record<
  DifficultyMixPreset,
  Record<ApiDifficulty, number>
> = {
  Auto: { Easy: 1, Medium: 1, Hard: 1 },
  Easy: { Easy: 0.7, Medium: 0.25, Hard: 0.05 },
  Medium: { Easy: 0.2, Medium: 0.55, Hard: 0.25 },
  Hard: { Easy: 0.05, Medium: 0.25, Hard: 0.7 },
};

export const DIFFICULTY_MIX_PRESETS: readonly DifficultyMixPreset[] = [
  "Auto",
  "Easy",
  "Medium",
  "Hard",
] as const;

export const DIFFICULTY_MIX_BLURBS: Record<DifficultyMixPreset, string> = {
  Auto: "Even mix of Easy, Medium and Hard.",
  Easy: "Mostly Easy, some Medium, rarely Hard.",
  Medium: "Mostly Medium, with some Easy and some Hard.",
  Hard: "Mostly Hard, some Medium, little Easy. Very few extreme-level Hard items.",
};

export function allocateDifficultyCounts(
  total: number,
  mix: DifficultyMixPreset,
): Record<ApiDifficulty, number> {
  const weights = DIFFICULTY_MIX_WEIGHTS[mix];
  const order: ApiDifficulty[] = ["Easy", "Medium", "Hard"];
  const weightSum = order.reduce((sum, key) => sum + weights[key], 0);
  const raw = order.map((key) => ({
    key,
    exact: (weights[key] / weightSum) * total,
  }));

  const counts: Record<ApiDifficulty, number> = {
    Easy: 0,
    Medium: 0,
    Hard: 0,
  };
  let assigned = 0;
  for (const row of raw) {
    const n = Math.floor(row.exact);
    counts[row.key] = n;
    assigned += n;
  }

  const remainders = raw
    .map((row) => ({ key: row.key, frac: row.exact - Math.floor(row.exact) }))
    .sort((a, b) => b.frac - a.frac);

  let left = total - assigned;
  for (const row of remainders) {
    if (left <= 0) break;
    counts[row.key] += 1;
    left -= 1;
  }

  return counts;
}

function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = items[i]!;
    items[i] = items[j]!;
    items[j] = tmp;
  }
  return items;
}

export function sampleQuestionsByDifficultyMix<
  T extends { difficulty: ApiDifficulty },
>(questions: T[], count: number, mix: DifficultyMixPreset): T[] {
  if (count <= 0 || questions.length === 0) return [];

  const buckets: Record<ApiDifficulty, T[]> = {
    Easy: [],
    Medium: [],
    Hard: [],
  };
  for (const question of questions) {
    buckets[question.difficulty].push(question);
  }
  for (const key of Object.keys(buckets) as ApiDifficulty[]) {
    shuffleInPlace(buckets[key]);
  }

  const targets = allocateDifficultyCounts(count, mix);
  const picked: T[] = [];

  for (const key of ["Easy", "Medium", "Hard"] as ApiDifficulty[]) {
    const take = Math.min(targets[key], buckets[key].length);
    picked.push(...buckets[key].splice(0, take));
  }

  if (picked.length < count) {
    const leftovers = shuffleInPlace([
      ...buckets.Easy,
      ...buckets.Medium,
      ...buckets.Hard,
    ]);
    picked.push(...leftovers.slice(0, count - picked.length));
  }

  return shuffleInPlace(picked).slice(0, count);
}

export function difficultiesForMixApi(_mix: DifficultyMixPreset): ApiDifficulty[] {
  return ["Easy", "Medium", "Hard"];
}

export function uiDifficultiesForMix(
  mix: DifficultyMixPreset,
): Array<"Easy" | "Medium" | "Hard"> {
  if (mix === "Auto") return [];
  return [mix];
}
