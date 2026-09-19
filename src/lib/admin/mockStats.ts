/**
 * Admin ESAT mock sitting stats from live `paper_sessions`
 * (virtual paper ids 920000–920049 / ESAT CAMP variants).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  minAttemptsForRange,
  sinceIsoForRange,
  type QuestionBankTimeRange,
} from "@/lib/admin/questionBankStats";
import {
  ADMIN_ESAT_MOCK_COUNT,
  ADMIN_ESAT_MOCK_PAPER_ID_BASE,
  ADMIN_ESAT_MOCK_SUBJECTS,
  ADMIN_MOCK_SUBJECT_TO_PART_NAME,
  adminMockPaperName,
  isAdminEsatMockPaperId,
  parseAdminEsatMockPaperId,
  parseAdminMockPaperName,
  type AdminEsatMockSubject,
} from "@/lib/papers/adminEsatMocks";
import { mockLetterForNumber } from "@/lib/esatMockTests/catalog";

export type MockStatsTimeRange = QuestionBankTimeRange;

export { minAttemptsForRange, sinceIsoForRange };

export type MockCatalogSummary = {
  total_mocks: number;
  published: number;
  approved: number;
  draft_or_review: number;
};

export type MockSittingStat = {
  mock_number: number;
  mock_label: string;
  sessions: number;
  completed: number;
  users: number;
  avg_pct_correct: number | null;
  avg_predicted: number | null;
  full_sittings: number;
  module_sittings: number;
};

export type MockSubjectStat = {
  subject: string;
  sessions: number;
  users: number;
  completed: number;
  avg_pct_correct: number | null;
};

export type MockPredictedBucket = {
  label: string;
  count: number;
};

export type MockOptionBreakdown = {
  option: string;
  count: number;
  pct: number;
};

export type MockWrongStat = {
  question_id: string;
  mock_label: string;
  subject: string;
  question_number: number;
  correct_option: string | null;
  stem_preview: string | null;
  attempts: number;
  wrong: number;
  correct: number;
  users: number;
  pct_correct: number;
  pct_wrong: number;
  plus_four_wrong_pct: number;
  option_breakdown: MockOptionBreakdown[];
};

export type MockStatsPayload = {
  since: string | null;
  generated_at: string;
  min_attempts: number;
  ranking: string;
  catalog: MockCatalogSummary;
  summary: {
    total_sessions: number;
    completed_sessions: number;
    unique_users: number;
    full_sittings: number;
    module_sittings: number;
    avg_pct_correct: number | null;
    avg_predicted: number | null;
    predicted_samples: number;
    answered_attempts: number;
    unique_questions: number;
    correct_attempts: number;
    wrong_attempts: number;
  };
  byMock: MockSittingStat[];
  bySubject: MockSubjectStat[];
  predictedBuckets: MockPredictedBucket[];
  mostWrong: MockWrongStat[];
};

type SessionRow = {
  id: string;
  user_id: string;
  paper_id: number | null;
  paper_name: string | null;
  paper_variant: string | null;
  session_name: string | null;
  selected_sections: string[] | null;
  answers: unknown;
  correct_flags: unknown;
  score: unknown;
  predicted_score: number | null;
  ended_at: string | null;
  created_at: string;
  deleted_at: string | null;
};

type MockMeta = {
  id: string;
  subject: AdminEsatMockSubject;
  mock_number: number;
  status: string;
};

type SlotMeta = {
  mock_id: string;
  question_id: string;
  position: number;
  subject: AdminEsatMockSubject;
  mock_number: number;
  correct_option: string | null;
  stem_preview: string | null;
};

const EXCLUDED_EMAILS = new Set([
  "esatcamp@gmail.com",
  "ansonchanw@gmail.com",
  "thelame1sout@gmail.com",
  "alamenamealt@gmail.com",
  "forgoodrecommendations@gmail.com",
  "geminiapiofficial@gmail.com",
  "ansonapifree@gmail.com",
]);

function asNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function isExcludedProfile(email: string | null, role: string | null): boolean {
  if ((role ?? "") === "admin") return true;
  const lower = (email ?? "").toLowerCase();
  if (lower.includes("@seed.esatcamp.local")) return true;
  return EXCLUDED_EMAILS.has(lower);
}

function scorePct(score: unknown): number | null {
  if (!score || typeof score !== "object") return null;
  const row = score as Record<string, unknown>;
  const correct = asNumber(row.correct, NaN);
  const total = asNumber(row.total, NaN);
  if (!Number.isFinite(correct) || !Number.isFinite(total) || total <= 0) {
    return null;
  }
  return Math.round((1000 * correct) / total) / 10;
}

function parseMockNumber(session: SessionRow): number | null {
  const fromVariant = parseAdminMockPaperName(
    (session.paper_variant ?? "")
      .replace(/^(\d{4})-/, "")
      .replace(/-ESAT CAMP$/i, "")
      .trim(),
  );
  if (fromVariant != null) return fromVariant;

  const variantMatch = /Mock\s+([A-E]|\d+)/i.exec(session.paper_variant ?? "");
  if (variantMatch) {
    const token = variantMatch[1]!;
    if (/^[A-E]$/i.test(token)) {
      return token.toUpperCase().charCodeAt(0) - 64;
    }
    const n = Number(token);
    if (n >= 1 && n <= ADMIN_ESAT_MOCK_COUNT) return n;
  }

  if (session.paper_id != null && isAdminEsatMockPaperId(session.paper_id)) {
    return parseAdminEsatMockPaperId(session.paper_id)?.mockNumber ?? null;
  }
  return null;
}

function subjectFromPartName(part: string): AdminEsatMockSubject | null {
  const trimmed = part.trim();
  for (const subject of ADMIN_ESAT_MOCK_SUBJECTS) {
    if (ADMIN_MOCK_SUBJECT_TO_PART_NAME[subject] === trimmed) return subject;
    if (subject === trimmed) return subject;
  }
  // Catalog labels
  if (/math(?:s)?\s*1/i.test(trimmed)) return "Math 1";
  if (/math(?:s)?\s*2/i.test(trimmed)) return "Math 2";
  if (/physics/i.test(trimmed)) return "Physics";
  if (/chemistry/i.test(trimmed)) return "Chemistry";
  if (/biology/i.test(trimmed)) return "Biology";
  return null;
}

function subjectsForSession(session: SessionRow): AdminEsatMockSubject[] {
  const fromSections = (session.selected_sections ?? [])
    .map(subjectFromPartName)
    .filter((s): s is AdminEsatMockSubject => s != null);
  if (fromSections.length > 0) {
    // Preserve catalog subject order
    return ADMIN_ESAT_MOCK_SUBJECTS.filter((s) => fromSections.includes(s));
  }
  if (session.paper_id != null) {
    const parsed = parseAdminEsatMockPaperId(session.paper_id);
    if (parsed) return [parsed.subject];
  }
  return [...ADMIN_ESAT_MOCK_SUBJECTS];
}

function isFullSitting(subjects: AdminEsatMockSubject[]): boolean {
  return subjects.length >= ADMIN_ESAT_MOCK_SUBJECTS.length;
}

function parseAnswers(raw: unknown): Array<{ choice: string | null }> {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (!item || typeof item !== "object") return { choice: null };
    const choice = (item as Record<string, unknown>).choice;
    if (typeof choice !== "string" || !choice.trim()) return { choice: null };
    return { choice: choice.trim().toUpperCase() };
  });
}

function parseCorrectFlags(raw: unknown, length: number): Array<boolean | null> {
  if (!Array.isArray(raw)) return Array.from({ length }, () => null);
  return Array.from({ length }, (_, i) => {
    const v = raw[i];
    if (v === true) return true;
    if (v === false) return false;
    return null;
  });
}

function stemPreview(stem: unknown): string | null {
  if (typeof stem !== "string") return null;
  const cleaned = stem.replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  return cleaned.length > 120 ? `${cleaned.slice(0, 117)}…` : cleaned;
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((10 * sum) / values.length) / 10;
}

function predictedBucketLabel(score: number): string {
  const floored = Math.max(1, Math.min(8, Math.floor(score)));
  return `${floored}–${floored + 1}`;
}

function sessionAt(row: SessionRow): string {
  return row.ended_at || row.created_at;
}

async function fetchAllMockSessions(
  service: SupabaseClient,
  since: string | null,
): Promise<SessionRow[]> {
  const pageSize = 1000;
  const rows: SessionRow[] = [];
  let from = 0;
  const paperIdMax =
    ADMIN_ESAT_MOCK_PAPER_ID_BASE + ADMIN_ESAT_MOCK_COUNT * 10;

  for (;;) {
    const { data, error } = await service
      .from("paper_sessions")
      .select(
        "id, user_id, paper_id, paper_name, paper_variant, session_name, selected_sections, answers, correct_flags, score, predicted_score, ended_at, created_at, deleted_at",
      )
      .is("deleted_at", null)
      .or(
        `and(paper_id.gte.${ADMIN_ESAT_MOCK_PAPER_ID_BASE},paper_id.lt.${paperIdMax}),paper_variant.ilike.%ESAT CAMP%`,
      )
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw new Error(error.message);
    const batch = (data ?? []) as SessionRow[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }

  return rows.filter((row) => {
    const isMock =
      (row.paper_id != null && isAdminEsatMockPaperId(row.paper_id)) ||
      /ESAT CAMP/i.test(row.paper_variant ?? "");
    if (!isMock) return false;
    if (!since) return true;
    return sessionAt(row) >= since;
  });
}

async function loadSlotIndex(
  service: SupabaseClient,
): Promise<{
  catalog: MockCatalogSummary;
  slotsByMockSubject: Map<string, SlotMeta[]>;
}> {
  const { data: mocks, error: mocksError } = await service
    .from("esat_mocks")
    .select("id, subject, mock_number, status");
  if (mocksError) throw new Error(mocksError.message);

  const mockRows = (mocks ?? []) as MockMeta[];
  const catalog: MockCatalogSummary = {
    total_mocks: mockRows.length,
    published: mockRows.filter((m) => m.status === "published").length,
    approved: mockRows.filter((m) => m.status === "approved").length,
    draft_or_review: mockRows.filter(
      (m) => m.status === "draft" || m.status === "review",
    ).length,
  };

  const mockById = new Map(mockRows.map((m) => [m.id, m]));
  const { data: slotRows, error: slotsError } = await service
    .from("esat_mock_questions")
    .select("mock_id, question_id, position");
  if (slotsError) throw new Error(slotsError.message);

  const questionIds = [
    ...new Set(
      (slotRows ?? []).map((r: { question_id: string }) => r.question_id),
    ),
  ];
  const questionMeta = new Map<
    string,
    { correct_option: string | null; stem_preview: string | null }
  >();

  for (let i = 0; i < questionIds.length; i += 200) {
    const chunk = questionIds.slice(i, i + 200);
    const { data: qs, error: qErr } = await service
      .from("ai_generated_questions")
      .select("id, correct_option, question_stem")
      .in("id", chunk);
    if (qErr) throw new Error(qErr.message);
    for (const q of qs ?? []) {
      const row = q as {
        id: string;
        correct_option: string | null;
        question_stem: string | null;
      };
      questionMeta.set(row.id, {
        correct_option: row.correct_option
          ? row.correct_option.trim().toUpperCase()
          : null,
        stem_preview: stemPreview(row.question_stem),
      });
    }
  }

  const slotsByMockSubject = new Map<string, SlotMeta[]>();
  for (const raw of slotRows ?? []) {
    const row = raw as {
      mock_id: string;
      question_id: string;
      position: number;
    };
    const mock = mockById.get(row.mock_id);
    if (!mock) continue;
    if (
      !(ADMIN_ESAT_MOCK_SUBJECTS as readonly string[]).includes(mock.subject)
    ) {
      continue;
    }
    const key = `${mock.mock_number}:${mock.subject}`;
    const meta = questionMeta.get(row.question_id);
    const list = slotsByMockSubject.get(key) ?? [];
    list.push({
      mock_id: row.mock_id,
      question_id: row.question_id,
      position: row.position,
      subject: mock.subject as AdminEsatMockSubject,
      mock_number: mock.mock_number,
      correct_option: meta?.correct_option ?? null,
      stem_preview: meta?.stem_preview ?? null,
    });
    slotsByMockSubject.set(key, list);
  }

  for (const list of slotsByMockSubject.values()) {
    list.sort((a, b) => a.position - b.position);
  }

  return { catalog, slotsByMockSubject };
}

function orderedSlotsForSession(
  mockNumber: number,
  subjects: AdminEsatMockSubject[],
  slotsByMockSubject: Map<string, SlotMeta[]>,
): SlotMeta[] {
  const out: SlotMeta[] = [];
  for (const subject of subjects) {
    const key = `${mockNumber}:${subject}`;
    const slots = slotsByMockSubject.get(key) ?? [];
    out.push(...slots);
  }
  return out;
}

export async function computeEsatMockStats(
  service: SupabaseClient,
  options: {
    since: string | null;
    minAttempts: number;
    wrongLimit: number;
  },
): Promise<MockStatsPayload> {
  const { since, minAttempts, wrongLimit } = options;
  const [allSessions, slotIndex] = await Promise.all([
    fetchAllMockSessions(service, since),
    loadSlotIndex(service),
  ]);

  const userIds = [...new Set(allSessions.map((s) => s.user_id))];
  const excluded = new Set<string>();
  for (let i = 0; i < userIds.length; i += 200) {
    const chunk = userIds.slice(i, i + 200);
    const { data: profiles, error } = await service
      .from("profiles")
      .select("id, email, role")
      .in("id", chunk);
    if (error) throw new Error(error.message);
    for (const p of profiles ?? []) {
      const row = p as { id: string; email: string | null; role: string | null };
      if (isExcludedProfile(row.email, row.role)) excluded.add(row.id);
    }
  }

  const sessions = allSessions.filter((s) => !excluded.has(s.user_id));
  const { catalog, slotsByMockSubject } = slotIndex;

  type Attempt = {
    user_id: string;
    question_id: string;
    at: string;
    choice: string;
    is_correct: boolean;
    mock_label: string;
    subject: string;
    question_number: number;
    correct_option: string | null;
    stem_preview: string | null;
  };

  const attempts: Attempt[] = [];
  const byMockAcc = new Map<
    number,
    {
      sessions: number;
      completed: number;
      users: Set<string>;
      pcts: number[];
      predicted: number[];
      full: number;
      module: number;
    }
  >();
  const bySubjectAcc = new Map<
    string,
    {
      sessions: number;
      completed: number;
      users: Set<string>;
      pcts: number[];
    }
  >();

  let fullSittings = 0;
  let moduleSittings = 0;
  const completedPcts: number[] = [];
  const predictedValues: number[] = [];
  const predictedBucketCounts = new Map<string, number>();
  const uniqueUsers = new Set<string>();

  for (const session of sessions) {
    uniqueUsers.add(session.user_id);
    const mockNumber = parseMockNumber(session);
    const subjects = subjectsForSession(session);
    const full = isFullSitting(subjects);
    if (full) fullSittings += 1;
    else moduleSittings += 1;

    const pct = session.ended_at ? scorePct(session.score) : null;
    if (pct != null) completedPcts.push(pct);

    if (
      session.ended_at &&
      typeof session.predicted_score === "number" &&
      Number.isFinite(session.predicted_score)
    ) {
      predictedValues.push(session.predicted_score);
      const label = predictedBucketLabel(session.predicted_score);
      predictedBucketCounts.set(
        label,
        (predictedBucketCounts.get(label) ?? 0) + 1,
      );
    }

    if (mockNumber != null) {
      const acc = byMockAcc.get(mockNumber) ?? {
        sessions: 0,
        completed: 0,
        users: new Set<string>(),
        pcts: [],
        predicted: [],
        full: 0,
        module: 0,
      };
      acc.sessions += 1;
      if (session.ended_at) acc.completed += 1;
      acc.users.add(session.user_id);
      if (full) acc.full += 1;
      else acc.module += 1;
      if (pct != null) acc.pcts.push(pct);
      if (
        session.ended_at &&
        typeof session.predicted_score === "number" &&
        Number.isFinite(session.predicted_score)
      ) {
        acc.predicted.push(session.predicted_score);
      }
      byMockAcc.set(mockNumber, acc);
    }

    for (const subject of subjects) {
      const label = subject;
      const acc = bySubjectAcc.get(label) ?? {
        sessions: 0,
        completed: 0,
        users: new Set<string>(),
        pcts: [],
      };
      acc.sessions += 1;
      if (session.ended_at) acc.completed += 1;
      acc.users.add(session.user_id);
      if (pct != null) acc.pcts.push(pct);
      bySubjectAcc.set(label, acc);
    }

    if (!session.ended_at || mockNumber == null) continue;

    const slots = orderedSlotsForSession(
      mockNumber,
      subjects,
      slotsByMockSubject,
    );
    if (slots.length === 0) continue;

    const answers = parseAnswers(session.answers);
    const flags = parseCorrectFlags(session.correct_flags, slots.length);
    const at = session.ended_at || session.created_at;
    const mockLabel = adminMockPaperName(mockNumber);

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i]!;
      const choice = answers[i]?.choice ?? null;
      if (!choice) continue;

      let isCorrect = flags[i];
      if (isCorrect == null && slot.correct_option) {
        isCorrect = choice === slot.correct_option;
      }
      if (isCorrect == null) continue;

      attempts.push({
        user_id: session.user_id,
        question_id: slot.question_id,
        at,
        choice,
        is_correct: isCorrect,
        mock_label: mockLabel,
        subject: slot.subject,
        question_number: slot.position,
        correct_option: slot.correct_option,
        stem_preview: slot.stem_preview,
      });
    }
  }

  // First attempt per user+question
  const sortedAttempts = [...attempts].sort((a, b) =>
    a.at < b.at ? -1 : a.at > b.at ? 1 : 0,
  );
  const firstKey = new Set<string>();
  const firstAttempts: Attempt[] = [];
  const totalByQuestion = new Map<string, number>();

  for (const attempt of sortedAttempts) {
    totalByQuestion.set(
      attempt.question_id,
      (totalByQuestion.get(attempt.question_id) ?? 0) + 1,
    );
    const key = `${attempt.user_id}:${attempt.question_id}`;
    if (firstKey.has(key)) continue;
    firstKey.add(key);
    firstAttempts.push(attempt);
  }

  type WrongAgg = {
    question_id: string;
    mock_label: string;
    subject: string;
    question_number: number;
    correct_option: string | null;
    stem_preview: string | null;
    users: number;
    wrong: number;
    correct: number;
    optionCounts: Map<string, number>;
  };

  const wrongMap = new Map<string, WrongAgg>();
  for (const attempt of firstAttempts) {
    const agg = wrongMap.get(attempt.question_id) ?? {
      question_id: attempt.question_id,
      mock_label: attempt.mock_label,
      subject: attempt.subject,
      question_number: attempt.question_number,
      correct_option: attempt.correct_option,
      stem_preview: attempt.stem_preview,
      users: 0,
      wrong: 0,
      correct: 0,
      optionCounts: new Map<string, number>(),
    };
    agg.users += 1;
    if (attempt.is_correct) agg.correct += 1;
    else agg.wrong += 1;
    agg.optionCounts.set(
      attempt.choice,
      (agg.optionCounts.get(attempt.choice) ?? 0) + 1,
    );
    if (!agg.correct_option && attempt.correct_option) {
      agg.correct_option = attempt.correct_option;
    }
    if (!agg.stem_preview && attempt.stem_preview) {
      agg.stem_preview = attempt.stem_preview;
    }
    wrongMap.set(attempt.question_id, agg);
  }

  const mostWrong: MockWrongStat[] = [...wrongMap.values()]
    .filter((row) => row.users >= Math.max(minAttempts, 1))
    .map((row) => {
      const attemptsTotal = totalByQuestion.get(row.question_id) ?? row.users;
      const pct_correct =
        row.users > 0
          ? Math.round((1000 * row.correct) / row.users) / 10
          : 0;
      const pct_wrong =
        row.users > 0 ? Math.round((1000 * row.wrong) / row.users) / 10 : 0;
      const plus_four_wrong_pct =
        Math.round((10000 * (row.wrong + 2)) / (row.users + 4)) / 100;
      const option_breakdown = [...row.optionCounts.entries()]
        .map(([option, count]) => ({
          option,
          count,
          pct:
            row.users > 0
              ? Math.round((1000 * count) / row.users) / 10
              : 0,
        }))
        .sort((a, b) => b.count - a.count || a.option.localeCompare(b.option));
      return {
        question_id: row.question_id,
        mock_label: row.mock_label,
        subject: row.subject,
        question_number: row.question_number,
        correct_option: row.correct_option,
        stem_preview: row.stem_preview,
        attempts: attemptsTotal,
        wrong: row.wrong,
        correct: row.correct,
        users: row.users,
        pct_correct,
        pct_wrong,
        plus_four_wrong_pct,
        option_breakdown,
      } satisfies MockWrongStat;
    })
    .sort(
      (a, b) =>
        b.plus_four_wrong_pct - a.plus_four_wrong_pct ||
        b.wrong - a.wrong ||
        b.users - a.users,
    )
    .slice(0, Math.max(wrongLimit, 1));

  const byMock: MockSittingStat[] = [];
  for (let n = 1; n <= ADMIN_ESAT_MOCK_COUNT; n++) {
    const acc = byMockAcc.get(n);
    byMock.push({
      mock_number: n,
      mock_label: `Mock ${mockLetterForNumber(n)}`,
      sessions: acc?.sessions ?? 0,
      completed: acc?.completed ?? 0,
      users: acc?.users.size ?? 0,
      avg_pct_correct: avg(acc?.pcts ?? []),
      avg_predicted: avg(acc?.predicted ?? []),
      full_sittings: acc?.full ?? 0,
      module_sittings: acc?.module ?? 0,
    });
  }
  byMock.sort((a, b) => b.sessions - a.sessions || a.mock_number - b.mock_number);

  const bySubject: MockSubjectStat[] = ADMIN_ESAT_MOCK_SUBJECTS.map(
    (subject) => {
      const acc = bySubjectAcc.get(subject);
      return {
        subject,
        sessions: acc?.sessions ?? 0,
        users: acc?.users.size ?? 0,
        completed: acc?.completed ?? 0,
        avg_pct_correct: avg(acc?.pcts ?? []),
      };
    },
  ).sort((a, b) => b.sessions - a.sessions || a.subject.localeCompare(b.subject));

  const predictedBuckets: MockPredictedBucket[] = [];
  for (let i = 1; i <= 8; i++) {
    const label = `${i}–${i + 1}`;
    predictedBuckets.push({
      label,
      count: predictedBucketCounts.get(label) ?? 0,
    });
  }

  const correctAttempts = attempts.filter((a) => a.is_correct).length;
  const wrongAttempts = attempts.length - correctAttempts;

  return {
    since,
    generated_at: new Date().toISOString(),
    min_attempts: Math.max(minAttempts, 1),
    ranking: "plus_four_wrong_first_attempt",
    catalog,
    summary: {
      total_sessions: sessions.length,
      completed_sessions: sessions.filter((s) => s.ended_at).length,
      unique_users: uniqueUsers.size,
      full_sittings: fullSittings,
      module_sittings: moduleSittings,
      avg_pct_correct: avg(completedPcts),
      avg_predicted: avg(predictedValues),
      predicted_samples: predictedValues.length,
      answered_attempts: attempts.length,
      unique_questions: wrongMap.size,
      correct_attempts: correctAttempts,
      wrong_attempts: wrongAttempts,
    },
    byMock,
    bySubject,
    predictedBuckets,
    mostWrong,
  };
}

function csvEscape(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function buildMockTopWrongExportCsv(
  rows: MockWrongStat[],
  meta: { rangeLabel: string; since: string | null; generatedAt: string },
): string {
  const header = [
    "rank",
    "question_id",
    "mock_label",
    "subject",
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
        row.mock_label,
        row.subject,
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

export function buildMockTopWrongExportJson(
  rows: MockWrongStat[],
  meta: { rangeLabel: string; since: string | null; generatedAt: string },
): string {
  return JSON.stringify(
    {
      ranking: "plus_four_wrong",
      note: "Ranking uses each user's first attempt on a mock question. plus_four_wrong_pct = 100 * (wrong + 2) / (users + 4).",
      range: meta.rangeLabel,
      since: meta.since,
      generated_at: meta.generatedAt,
      top: rows.map((row, index) => ({ rank: index + 1, ...row })),
    },
    null,
    2,
  );
}
