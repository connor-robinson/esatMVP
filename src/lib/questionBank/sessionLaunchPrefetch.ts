import type { QuestionBankQuestion } from "@/types/questionBank";
import {
  resolveQuestionPool,
  type QuestionBankHomeLaunchPayload,
} from "@/lib/questionBank/homeLaunch";
import type { DifficultyMixPreset } from "@/lib/questionBank/difficultyMix";
import { sampleSessionBankQuestions } from "@/lib/questionBank/sessionBankSampling";
import { hookQuestionIdsForSubjects } from "@/lib/questionBank/sessionHookLead";

export type HomeLaunchPrefetchResult =
  | { kind: "single"; questions: QuestionBankQuestion[] }
  | {
      kind: "mixed";
      incorrect: QuestionBankQuestion[];
      fresh: QuestionBankQuestion[];
    };

type PrefetchEntry = {
  fingerprint: string;
  promise: Promise<HomeLaunchPrefetchResult | null>;
};

let entry: PrefetchEntry | null = null;

/** Pool size for session sampling (room for New filter + mix + diagram bias). */
export function sessionQuestionPoolLimit(questionCount: number): number {
  return Math.max(questionCount * 4, questionCount + 40);
}

export function fingerprintHomeLaunch(
  payload: QuestionBankHomeLaunchPayload,
): string {
  const topics = [...(payload.topics ?? [])].sort();
  const questionPool = resolveQuestionPool(payload);
  return JSON.stringify({
    testType: payload.testType,
    subjects: payload.subjects,
    questionCount: payload.questionCount,
    difficulties: payload.difficulties,
    difficultyMix: payload.difficultyMix ?? null,
    timeLimitMinutes: payload.timeLimitMinutes,
    topics,
    playMode:
      questionPool === "incorrect"
        ? "instant"
        : (payload.playMode ?? "instant"),
    questionPool,
  });
}

function appendSharedLaunchParams(
  params: URLSearchParams,
  payload: QuestionBankHomeLaunchPayload,
): void {
  params.append("testType", payload.testType);
  if (payload.subjects.length === 1) {
    params.append("subject", payload.subjects[0]);
  } else if (payload.subjects.length > 1) {
    params.append("subject", payload.subjects.join(","));
  }
  if (payload.topics && payload.topics.length > 0) {
    params.append("tags", payload.topics.join(","));
  }
  params.append(
    "limit",
    String(sessionQuestionPoolLimit(payload.questionCount)),
  );
  params.append("random", "true");
}

export function buildHomeLaunchQuestionsUrl(
  payload: QuestionBankHomeLaunchPayload,
  opts?: { excludeAttempted?: boolean; pool?: "all" | "incorrect" },
): string {
  const params = new URLSearchParams();
  appendSharedLaunchParams(params, payload);
  const questionPool = opts?.pool ?? resolveQuestionPool(payload);

  if (questionPool === "incorrect" || opts?.pool === "incorrect") {
    // Any prior wrong attempt qualifies, including later-corrected questions.
    params.append("attemptResult", "Incorrect Before");
  } else if (opts?.excludeAttempted !== false) {
    // Skip questions the user already answered. Unanswered items from sessions
    // left early are not in attempts, so they can still appear.
    params.append("attemptedStatus", "New");
  }
  return `/api/question-bank/questions?${params.toString()}`;
}

async function fetchLaunchQuestions(
  url: string,
): Promise<QuestionBankQuestion[] | null> {
  try {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) return null;
    const data = (await res.json()) as { questions?: QuestionBankQuestion[] };
    return Array.isArray(data.questions) ? data.questions : null;
  } catch {
    return null;
  }
}

function dedupeById<T extends { id: string }>(questions: readonly T[]): T[] {
  const seen = new Set<string>();
  return questions.filter((q) => {
    if (seen.has(q.id)) return false;
    seen.add(q.id);
    return true;
  });
}

/**
 * About half prior-incorrect, half New/fresh. Unique IDs only; fills from
 * whichever side still has leftovers if one side runs short.
 */
export function sampleMixedSessionQuestions<
  T extends { id: string; difficulty: "Easy" | "Medium" | "Hard" },
>(
  incorrect: readonly T[],
  fresh: readonly T[],
  count: number,
  mix: DifficultyMixPreset,
): T[] {
  if (count <= 0) return [];
  const incorrectUnique = dedupeById(incorrect);
  const freshUnique = dedupeById(fresh);
  const incorrectIds = new Set(incorrectUnique.map((q) => q.id));
  const freshOnly = freshUnique.filter((q) => !incorrectIds.has(q.id));

  const incorrectTarget = Math.min(
    Math.ceil(count / 2),
    incorrectUnique.length,
  );
  const incorrectPicks = sampleSessionBankQuestions(
    incorrectUnique,
    incorrectTarget,
    mix,
  );
  const picked = new Set(incorrectPicks.map((q) => q.id));
  const freshEligible = freshOnly.filter((q) => !picked.has(q.id));
  let freshPicks = sampleSessionBankQuestions(
    freshEligible,
    Math.max(0, count - incorrectPicks.length),
    mix,
  );

  if (incorrectPicks.length + freshPicks.length < count) {
    const used = new Set([
      ...incorrectPicks.map((q) => q.id),
      ...freshPicks.map((q) => q.id),
    ]);
    const leftoverIncorrect = incorrectUnique.filter((q) => !used.has(q.id));
    const extra = sampleSessionBankQuestions(
      leftoverIncorrect,
      count - incorrectPicks.length - freshPicks.length,
      mix,
    );
    freshPicks = [...freshPicks, ...extra];
  }

  const out: T[] = [];
  let i = 0;
  let j = 0;
  while (
    out.length < count &&
    (i < incorrectPicks.length || j < freshPicks.length)
  ) {
    if (i < incorrectPicks.length) out.push(incorrectPicks[i++]!);
    if (out.length >= count) break;
    if (j < freshPicks.length) out.push(freshPicks[j++]!);
  }
  return out;
}

/** Kick off the session question fetch while navigating home → practice. */
export function beginHomeLaunchQuestionsPrefetch(
  payload: QuestionBankHomeLaunchPayload,
): void {
  if (typeof window === "undefined") return;

  const fingerprint = fingerprintHomeLaunch(payload);
  const questionPool = resolveQuestionPool(payload);

  const promise: Promise<HomeLaunchPrefetchResult | null> =
    questionPool === "mixed"
      ? Promise.all([
          fetchLaunchQuestions(
            buildHomeLaunchQuestionsUrl(payload, { pool: "incorrect" }),
          ),
          fetchLaunchQuestions(
            buildHomeLaunchQuestionsUrl(payload, { pool: "all" }),
          ),
        ]).then(([incorrect, fresh]) => {
          const incorrectList = incorrect ?? [];
          const freshList = fresh ?? [];
          if (incorrectList.length === 0 && freshList.length === 0) return null;
          return {
            kind: "mixed" as const,
            incorrect: incorrectList,
            fresh: freshList,
          };
        })
      : fetchLaunchQuestions(buildHomeLaunchQuestionsUrl(payload)).then(
          (questions) =>
            questions && questions.length > 0
              ? { kind: "single" as const, questions }
              : null,
        );

  entry = { fingerprint, promise };
}

export function takeHomeLaunchPrefetch(
  payload: QuestionBankHomeLaunchPayload,
): Promise<HomeLaunchPrefetchResult | null> | null {
  if (!entry) return null;
  if (entry.fingerprint !== fingerprintHomeLaunch(payload)) {
    entry = null;
    return null;
  }
  const promise = entry.promise;
  entry = null;
  return promise;
}

/** @deprecated Prefer takeHomeLaunchPrefetch for mixed pools. */
export function takeHomeLaunchQuestionsPrefetch(
  payload: QuestionBankHomeLaunchPayload,
): Promise<QuestionBankQuestion[] | null> | null {
  const prefetch = takeHomeLaunchPrefetch(payload);
  if (!prefetch) return null;
  return prefetch.then((result) => {
    if (!result) return null;
    if (result.kind === "single") return result.questions;
    const byId = new Map<string, QuestionBankQuestion>();
    for (const q of result.incorrect) byId.set(q.id, q);
    for (const q of result.fresh) {
      if (!byId.has(q.id)) byId.set(q.id, q);
    }
    const merged = [...byId.values()];
    return merged.length > 0 ? merged : null;
  });
}

/** Load fixed hook-set questions by DB id (published bank only). */
export async function fetchHookQuestionsByIds(
  ids: readonly string[],
): Promise<QuestionBankQuestion[]> {
  if (ids.length === 0) return [];
  const params = new URLSearchParams();
  params.append("ids", ids.join(","));
  params.append("limit", String(ids.length));
  try {
    const res = await fetch(
      `/api/question-bank/questions?${params.toString()}`,
      { credentials: "include" },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { questions?: QuestionBankQuestion[] };
    return Array.isArray(data.questions) ? data.questions : [];
  } catch {
    return [];
  }
}

/** Resolve hook questions for session subjects, reusing any already in `pool`. */
export async function resolveHookQuestionsForSubjects(
  subjects: readonly string[],
  pool: readonly QuestionBankQuestion[] = [],
): Promise<QuestionBankQuestion[]> {
  const hookIds = hookQuestionIdsForSubjects(subjects);
  if (hookIds.length === 0) return [];

  const byId = new Map(pool.map((q) => [q.id, q]));
  const missing: string[] = [];
  const found: QuestionBankQuestion[] = [];
  for (const id of hookIds) {
    const hit = byId.get(id);
    if (hit) found.push(hit);
    else missing.push(id);
  }
  if (missing.length === 0) return found;
  const fetched = await fetchHookQuestionsByIds(missing);
  return [...found, ...fetched];
}
