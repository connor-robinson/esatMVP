export type QuestionBankSubjectStat = {
  subject: string;
  attempts: number;
  users: number;
  unique_questions: number;
  pct_correct: number;
};

export type QuestionBankOptionBreakdown = {
  option: string;
  count: number;
  pct: number;
};

export type QuestionBankWrongStat = {
  question_id: string;
  schema_id: string | null;
  subject: string;
  primary_tag: string | null;
  correct_option: string | null;
  stem_preview: string | null;
  attempts: number;
  wrong: number;
  correct: number;
  users: number;
  pct_correct: number;
  pct_wrong: number;
  plus_four_wrong_pct: number;
  option_breakdown: QuestionBankOptionBreakdown[];
};

export type QuestionBankStatsPayload = {
  since: string | null;
  generated_at: string;
  min_attempts: number;
  ranking: "plus_four_wrong" | "pct_correct" | string;
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

export type QuestionBankTimeRange = "today" | "week" | "month" | "all";

function asNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function parseOptionBreakdown(raw: unknown): QuestionBankOptionBreakdown[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      const r = row as Record<string, unknown>;
      return {
        option: asString(r.option).toUpperCase(),
        count: asNumber(r.count),
        pct: asNumber(r.pct),
      } satisfies QuestionBankOptionBreakdown;
    })
    .filter((row) => row.option.length > 0);
}

/** UTC start bound for admin QB time filters. */
export function sinceIsoForRange(range: QuestionBankTimeRange): string | null {
  const now = new Date();
  if (range === "all") return null;
  if (range === "today") {
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    ).toISOString();
  }
  if (range === "week") {
    const day = now.getUTCDay();
    const daysFromMonday = (day + 6) % 7;
    return new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - daysFromMonday,
      ),
    ).toISOString();
  }
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  ).toISOString();
}

export function minAttemptsForRange(range: QuestionBankTimeRange): number {
  if (range === "today" || range === "week") return 3;
  return 5;
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
        const attempts = asNumber(r.attempts);
        const wrong = asNumber(r.wrong);
        const correct =
          r.correct != null ? asNumber(r.correct) : Math.max(0, attempts - wrong);
        const pctCorrect = asNumber(r.pct_correct);
        const pctWrong =
          r.pct_wrong != null
            ? asNumber(r.pct_wrong)
            : attempts > 0
              ? Math.round((1000 * wrong) / attempts) / 10
              : 0;
        const plusFour =
          r.plus_four_wrong_pct != null
            ? asNumber(r.plus_four_wrong_pct)
            : Math.round((10000 * (wrong + 2)) / (attempts + 4)) / 100;
        return {
          question_id: asString(r.question_id),
          schema_id:
            typeof r.schema_id === "string" ? r.schema_id : null,
          subject: asString(r.subject, "(unknown)"),
          primary_tag:
            typeof r.primary_tag === "string" ? r.primary_tag : null,
          correct_option:
            typeof r.correct_option === "string" ? r.correct_option : null,
          stem_preview:
            typeof r.stem_preview === "string" ? r.stem_preview : null,
          attempts,
          wrong,
          correct,
          users: asNumber(r.users),
          pct_correct: pctCorrect,
          pct_wrong: pctWrong,
          plus_four_wrong_pct: plusFour,
          option_breakdown: parseOptionBreakdown(r.option_breakdown),
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
    ranking: asString(data.ranking, "plus_four_wrong"),
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

function csvEscape(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Build a detailed CSV for the top hardest questions (plus-four ranked). */
export function buildTopWrongExportCsv(
  rows: QuestionBankWrongStat[],
  meta: { rangeLabel: string; since: string | null; generatedAt: string },
): string {
  const letters = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;
  const header = [
    "rank",
    "question_id",
    "schema_id",
    "subject",
    "primary_tag",
    "correct_option",
    "attempts",
    "correct",
    "wrong",
    "users",
    "pct_correct",
    "pct_wrong",
    "plus_four_wrong_pct",
    ...letters.flatMap((l) => [`option_${l}_count`, `option_${l}_pct`]),
    "all_options_json",
    "stem_preview",
    "range",
    "since",
    "generated_at",
  ];

  const lines = [header.join(",")];
  rows.forEach((row, index) => {
    const byLetter = new Map(
      row.option_breakdown.map((o) => [o.option.toUpperCase(), o]),
    );
    const optionCols = letters.flatMap((l) => {
      const hit = byLetter.get(l);
      return [hit?.count ?? 0, hit?.pct ?? 0];
    });
    lines.push(
      [
        index + 1,
        row.question_id,
        row.schema_id,
        row.subject,
        row.primary_tag,
        row.correct_option,
        row.attempts,
        row.correct,
        row.wrong,
        row.users,
        row.pct_correct,
        row.pct_wrong,
        row.plus_four_wrong_pct,
        ...optionCols,
        JSON.stringify(row.option_breakdown),
        row.stem_preview,
        meta.rangeLabel,
        meta.since,
        meta.generatedAt,
      ]
        .map(csvEscape)
        .join(","),
    );
  });
  return lines.join("\n");
}

export function buildTopWrongExportJson(
  rows: QuestionBankWrongStat[],
  meta: { rangeLabel: string; since: string | null; generatedAt: string },
): string {
  return JSON.stringify(
    {
      ranking: "plus_four_wrong",
      note: "Ranking uses each user's first attempt. plus_four_wrong_pct = 100 * (wrong + 2) / (users + 4). attempts = total tries including retries.",
      range: meta.rangeLabel,
      since: meta.since,
      generated_at: meta.generatedAt,
      top: rows.map((row, index) => ({
        rank: index + 1,
        ...row,
      })),
    },
    null,
    2,
  );
}
