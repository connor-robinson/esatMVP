export type QuestionBankSubjectStat = {
  subject: string;
  attempts: number;
  users: number;
  unique_questions: number;
  pct_correct: number;
};

export type QuestionBankWrongStat = {
  question_id: string;
  schema_id: string | null;
  subject: string;
  primary_tag: string | null;
  attempts: number;
  wrong: number;
  users: number;
  pct_correct: number;
};

export type QuestionBankStatsPayload = {
  since: string | null;
  generated_at: string;
  min_attempts: number;
  summary: {
    total_attempts: number;
    unique_questions: number;
    unique_users: number;
    correct_attempts: number;
    wrong_attempts: number;
  };
  subjects: QuestionBankSubjectStat[];
  mostWrong: QuestionBankWrongStat[];
};

function asNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function parseQuestionBankStats(
  raw: unknown,
): QuestionBankStatsPayload {
  const data = (raw ?? {}) as Record<string, unknown>;
  const summaryRaw = (data.summary ?? {}) as Record<string, unknown>;

  const subjects = Array.isArray(data.subjects)
    ? data.subjects.map((row) => {
        const r = row as Record<string, unknown>;
        return {
          subject: asString(r.subject, "(unknown)"),
          attempts: asNumber(r.attempts),
          users: asNumber(r.users),
          unique_questions: asNumber(r.unique_questions),
          pct_correct: asNumber(r.pct_correct),
        } satisfies QuestionBankSubjectStat;
      })
    : [];

  const mostWrong = Array.isArray(data.mostWrong)
    ? data.mostWrong.map((row) => {
        const r = row as Record<string, unknown>;
        return {
          question_id: asString(r.question_id),
          schema_id:
            typeof r.schema_id === "string" ? r.schema_id : null,
          subject: asString(r.subject, "(unknown)"),
          primary_tag:
            typeof r.primary_tag === "string" ? r.primary_tag : null,
          attempts: asNumber(r.attempts),
          wrong: asNumber(r.wrong),
          users: asNumber(r.users),
          pct_correct: asNumber(r.pct_correct),
        } satisfies QuestionBankWrongStat;
      })
    : [];

  return {
    since: typeof data.since === "string" ? data.since : null,
    generated_at:
      typeof data.generated_at === "string"
        ? data.generated_at
        : new Date().toISOString(),
    min_attempts: asNumber(data.min_attempts, 5),
    summary: {
      total_attempts: asNumber(summaryRaw.total_attempts),
      unique_questions: asNumber(summaryRaw.unique_questions),
      unique_users: asNumber(summaryRaw.unique_users),
      correct_attempts: asNumber(summaryRaw.correct_attempts),
      wrong_attempts: asNumber(summaryRaw.wrong_attempts),
    },
    subjects,
    mostWrong,
  };
}
