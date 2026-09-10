import type { QuestionBankQuestion } from "@/types/questionBank";
import type { QuestionBankHomeLaunchPayload } from "@/lib/questionBank/homeLaunch";
import { hookQuestionIdsForSubjects } from "@/lib/questionBank/sessionHookLead";

type PrefetchEntry = {
  fingerprint: string;
  promise: Promise<QuestionBankQuestion[] | null>;
};

let entry: PrefetchEntry | null = null;

/** Pool size for session sampling (room for New filter + mix + diagram bias). */
export function sessionQuestionPoolLimit(questionCount: number): number {
  return Math.max(questionCount * 4, questionCount + 40);
}

export function fingerprintHomeLaunch(
  payload: QuestionBankHomeLaunchPayload,
): string {
  return JSON.stringify({
    testType: payload.testType,
    subjects: payload.subjects,
    questionCount: payload.questionCount,
    difficulties: payload.difficulties,
    difficultyMix: payload.difficultyMix ?? null,
    timeLimitMinutes: payload.timeLimitMinutes,
  });
}

export function buildHomeLaunchQuestionsUrl(
  payload: QuestionBankHomeLaunchPayload,
  opts?: { excludeAttempted?: boolean },
): string {
  const params = new URLSearchParams();
  params.append("testType", payload.testType);
  if (payload.subjects.length === 1) {
    params.append("subject", payload.subjects[0]);
  } else if (payload.subjects.length > 1) {
    params.append("subject", payload.subjects.join(","));
  }
  params.append("limit", String(sessionQuestionPoolLimit(payload.questionCount)));
  params.append("random", "true");
  // Skip questions the user already answered. Unanswered items from sessions
  // left early are not in attempts, so they can still appear.
  if (opts?.excludeAttempted !== false) {
    params.append("attemptedStatus", "New");
  }
  return `/api/question-bank/questions?${params.toString()}`;
}

/** Kick off the session question fetch while navigating home → practice. */
export function beginHomeLaunchQuestionsPrefetch(
  payload: QuestionBankHomeLaunchPayload,
): void {
  if (typeof window === "undefined") return;

  const fingerprint = fingerprintHomeLaunch(payload);
  const promise = fetch(buildHomeLaunchQuestionsUrl(payload), {
    credentials: "include",
  })
    .then(async (res) => {
      if (!res.ok) return null;
      const data = (await res.json()) as { questions?: QuestionBankQuestion[] };
      return Array.isArray(data.questions) ? data.questions : null;
    })
    .catch(() => null);

  entry = { fingerprint, promise };
}

export function takeHomeLaunchQuestionsPrefetch(
  payload: QuestionBankHomeLaunchPayload,
): Promise<QuestionBankQuestion[] | null> | null {
  if (!entry) return null;
  if (entry.fingerprint !== fingerprintHomeLaunch(payload)) {
    entry = null;
    return null;
  }
  const promise = entry.promise;
  entry = null;
  return promise;
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
