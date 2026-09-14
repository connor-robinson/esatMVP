import {
  minAttemptsForRange,
  sinceIsoForRange,
  type QuestionBankTimeRange,
} from "@/lib/admin/questionBankStats";

export type PastPaperTimeRange = QuestionBankTimeRange;

export { minAttemptsForRange, sinceIsoForRange };

export type PastPaperPaperStat = {
  paper_id: number | null;
  exam_name: string;
  paper_variant: string;
  sessions: number;
  completed: number;
  users: number;
  avg_pct_correct: number | null;
};

export type PastPaperSectionStat = {
  section: string;
  sessions: number;
  users: number;
};

export type PastPaperOptionBreakdown = {
  option: string;
  count: number;
  pct: number;
};

export type PastPaperWrongStat = {
  question_id: number;
  exam_name: string;
  exam_year: number | null;
  paper_label: string;
  section: string;
  question_number: number;
  correct_option: string | null;
  attempts: number;
  wrong: number;
  correct: number;
  users: number;
  pct_correct: number;
  pct_wrong: number;
  plus_four_wrong_pct: number;
  option_breakdown: PastPaperOptionBreakdown[];
};

export type PastPaperStatsPayload = {
  since: string | null;
  generated_at: string;
  min_attempts: number;
  ranking: string;
  summary: {
    total_sessions: number;
    completed_sessions: number;
    unique_users: number;
    answered_attempts: number;
    unique_questions: number;
    correct_attempts: number;
    wrong_attempts: number;
    avg_pct_correct: number;
  };
  papers: PastPaperPaperStat[];
  sections: PastPaperSectionStat[];
  mostWrong: PastPaperWrongStat[];
};

function asNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function parseOptionBreakdown(raw: unknown): PastPaperOptionBreakdown[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      const r = row as Record<string, unknown>;
      return {
        option: asString(r.option).toUpperCase(),
        count: asNumber(r.count),
        pct: asNumber(r.pct),
      } satisfies PastPaperOptionBreakdown;
    })
    .filter((row) => row.option.length > 0);
}

export function parsePastPaperStats(raw: unknown): PastPaperStatsPayload {
  const data = (raw ?? {}) as Record<string, unknown>;
  const summaryRaw = (data.summary ?? {}) as Record<string, unknown>;

  const papers = Array.isArray(data.papers)
    ? data.papers.map((row) => {
        const r = row as Record<string, unknown>;
        return {
          paper_id:
            r.paper_id == null || r.paper_id === ""
              ? null
              : asNumber(r.paper_id),
          exam_name: asString(r.exam_name, "(unknown)"),
          paper_variant: asString(r.paper_variant, "(unknown)"),
          sessions: asNumber(r.sessions),
          completed: asNumber(r.completed),
          users: asNumber(r.users),
          avg_pct_correct:
            r.avg_pct_correct == null ? null : asNumber(r.avg_pct_correct),
        } satisfies PastPaperPaperStat;
      })
    : [];

  const sections = Array.isArray(data.sections)
    ? data.sections.map((row) => {
        const r = row as Record<string, unknown>;
        return {
          section: asString(r.section, "(unknown)"),
          sessions: asNumber(r.sessions),
          users: asNumber(r.users),
        } satisfies PastPaperSectionStat;
      })
    : [];

  const mostWrong = Array.isArray(data.mostWrong)
    ? data.mostWrong.map((row) => {
        const r = row as Record<string, unknown>;
        return {
          question_id: asNumber(r.question_id),
          exam_name: asString(r.exam_name, "(unknown)"),
          exam_year: r.exam_year == null ? null : asNumber(r.exam_year),
          paper_label: asString(r.paper_label, "(unknown)"),
          section: asString(r.section, "(unknown)"),
          question_number: asNumber(r.question_number),
          correct_option:
            typeof r.correct_option === "string" && r.correct_option
              ? r.correct_option
              : null,
          attempts: asNumber(r.attempts),
          wrong: asNumber(r.wrong),
          correct: asNumber(r.correct),
          users: asNumber(r.users),
          pct_correct: asNumber(r.pct_correct),
          pct_wrong: asNumber(r.pct_wrong),
          plus_four_wrong_pct: asNumber(r.plus_four_wrong_pct),
          option_breakdown: parseOptionBreakdown(r.option_breakdown),
        } satisfies PastPaperWrongStat;
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
      total_sessions: asNumber(summaryRaw.total_sessions),
      completed_sessions: asNumber(summaryRaw.completed_sessions),
      unique_users: asNumber(summaryRaw.unique_users),
      answered_attempts: asNumber(summaryRaw.answered_attempts),
      unique_questions: asNumber(summaryRaw.unique_questions),
      correct_attempts: asNumber(summaryRaw.correct_attempts),
      wrong_attempts: asNumber(summaryRaw.wrong_attempts),
      avg_pct_correct: asNumber(summaryRaw.avg_pct_correct),
    },
    papers,
    sections,
    mostWrong,
  };
}

function csvEscape(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function buildPastPaperTopWrongExportCsv(
  rows: PastPaperWrongStat[],
  meta: { rangeLabel: string; since: string | null; generatedAt: string },
): string {
  const header = [
    "rank",
    "question_id",
    "exam_name",
    "exam_year",
    "paper_label",
    "section",
    "question_number",
    "correct_option",
    "attempts",
    "correct",
    "wrong",
    "users",
    "pct_correct",
    "pct_wrong",
    "plus_four_wrong_pct",
    "all_options_json",
    "range",
    "since",
    "generated_at",
  ];
  const lines = [header.join(",")];
  rows.forEach((row, index) => {
    lines.push(
      [
        index + 1,
        row.question_id,
        row.exam_name,
        row.exam_year,
        row.paper_label,
        row.section,
        row.question_number,
        row.correct_option,
        row.attempts,
        row.correct,
        row.wrong,
        row.users,
        row.pct_correct,
        row.pct_wrong,
        row.plus_four_wrong_pct,
        JSON.stringify(row.option_breakdown),
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

export function buildPastPaperTopWrongExportJson(
  rows: PastPaperWrongStat[],
  meta: { rangeLabel: string; since: string | null; generatedAt: string },
): string {
  return JSON.stringify(
    {
      ranking: "plus_four_wrong",
      note: "Ranking uses each user's first attempt. plus_four_wrong_pct = 100 * (wrong + 2) / (users + 4). attempts = total tries including retakes.",
      range: meta.rangeLabel,
      since: meta.since,
      generated_at: meta.generatedAt,
      top: rows.map((row, index) => ({ rank: index + 1, ...row })),
    },
    null,
    2,
  );
}
