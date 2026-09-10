import {
  FREE_TIER_LIMIT_PER_SUBJECT,
  freeTierQuestionIdsForSubject,
  isFreeTierPreviewSubject,
} from "@/lib/questionBank/freeTierQuestions";
import type {
  ApiDifficulty,
  DifficultyMixPreset,
} from "@/lib/questionBank/difficultyMix";
import { sampleSessionBankQuestions } from "@/lib/questionBank/sessionBankSampling";

function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = items[i]!;
    items[i] = items[j]!;
    items[j] = tmp;
  }
  return items;
}

/** Fixed hook DB ids for subjects that have a free-tier / preview set. */
export function hookQuestionIdsForSubjects(
  subjects: readonly string[],
): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const subject of subjects) {
    if (!isFreeTierPreviewSubject(subject)) continue;
    for (const id of freeTierQuestionIdsForSubject(subject)) {
      if (seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

/**
 * Build a practice session that leads with the fixed subject hook set
 * (shuffled, up to 10), then fills the rest from the bank with difficulty mix,
 * diagram/recency weighting, and no in-session duplicates of hook ids.
 */
export function buildSessionQuestionsWithHookLead<
  T extends {
    id: string;
    difficulty: ApiDifficulty;
    created_at?: string | null;
    has_visual?: boolean | null;
    graph_spec?: unknown;
    graph_specs?: Record<string, unknown> | null;
    question_stem?: string;
  },
>(options: {
  pool: T[];
  hookQuestions: T[];
  count: number;
  mix: DifficultyMixPreset;
  /** Max hook questions to place first. Defaults to the free-tier set size (10). */
  leadLimit?: number;
}): T[] {
  const {
    pool,
    hookQuestions,
    count,
    mix,
    leadLimit = FREE_TIER_LIMIT_PER_SUBJECT,
  } = options;

  if (count <= 0) return [];

  const hookIdSet = new Set(hookQuestions.map((q) => q.id));
  const leadSize = Math.min(leadLimit, count, hookQuestions.length);
  const lead =
    leadSize > 0
      ? shuffleInPlace([...hookQuestions]).slice(0, leadSize)
      : [];

  const remainingCount = count - lead.length;
  if (remainingCount <= 0) return lead;

  const restPool = pool.filter((q) => !hookIdSet.has(q.id));
  const rest = sampleSessionBankQuestions(restPool, remainingCount, mix);
  return [...lead, ...rest];
}
