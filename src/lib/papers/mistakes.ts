/**
 * Past Papers Mistakes — pool aggregation, modes, and session markers.
 * Uses existing paper_sessions (no new tables): original sittings feed the
 * incorrect pool; Mistakes review sittings mark questions as reviewed.
 */

import type { Letter, Question } from "@/types/papers";
import type { PaperSessionRow } from "@/lib/supabase/types";
import {
  getEsatCampMockQuestions,
  isEsatCampMockPaperId,
} from "@/lib/papers/esatCampMocks";

export const MISTAKES_PAPER_VARIANT = "Mistakes review";
export const MISTAKES_SESSION_PREFIX = "[Mistakes]";
export const MISTAKES_PAPER_NAME = "OTHER" as const;

export type MistakesPoolMode =
  | "untouched"
  | "repeat_offenders"
  | "cold_cases"
  | "bounce_backs"
  | "lucky_dip";

export type MistakesExamFilter =
  | "ALL"
  | "ESAT"
  | "TMUA"
  | "NSAA"
  | "ENGAA"
  | "PAT"
  | "MAT";

export const MISTAKES_POOL_OPTIONS: Array<{
  id: MistakesPoolMode;
  label: string;
  description: string;
}> = [
  {
    id: "untouched",
    label: "Untouched",
    description:
      "Skip anything you've already opened in Mistakes. Recycles only when that list runs dry.",
  },
  {
    id: "repeat_offenders",
    label: "Repeat offenders",
    description:
      "Highest miss count first — the questions that keep getting you.",
  },
  {
    id: "cold_cases",
    label: "Cold cases",
    description:
      "Longest since you last missed them — memory that may be fading.",
  },
  {
    id: "bounce_backs",
    label: "Bounce-backs",
    description:
      "You reviewed them in Mistakes and still got them wrong last time.",
  },
  {
    id: "lucky_dip",
    label: "Lucky dip",
    description: "Random draw from every incorrect past-paper question.",
  },
];

export const MISTAKES_EXAM_FILTERS: MistakesExamFilter[] = [
  "ALL",
  "ESAT",
  "TMUA",
  "NSAA",
  "ENGAA",
  "PAT",
  "MAT",
];

export type MistakeHistoryEvent = {
  at: number;
  source: "paper" | "mistakes";
  isCorrect: boolean;
  choice: Letter | null;
  correctChoice: Letter | null;
  timeSec: number;
  sessionName: string;
  sessionId: string;
};

export type MistakePoolItem = {
  key: string;
  paperId: number | null;
  paperName: string;
  paperVariant: string;
  examName: string;
  questionNumber: number;
  questionId: number | null;
  timesWrong: number;
  timesSeenInMistakes: number;
  lastWrongAt: number;
  lastReviewedAt: number | null;
  lastMistakesOutcome: "correct" | "wrong" | null;
  neverReviewed: boolean;
  history: MistakeHistoryEvent[];
};

export type MistakeQuestionPayload = MistakePoolItem & {
  question: Question;
};

export type MistakesSummary = {
  totalIncorrect: number;
  untouched: number;
  bounceBacks: number;
  byExam: Record<string, number>;
};

export function isMistakesSession(row: {
  paper_variant?: string | null;
  session_name?: string | null;
}): boolean {
  const variant = (row.paper_variant || "").trim();
  const name = (row.session_name || "").trim();
  return (
    variant === MISTAKES_PAPER_VARIANT ||
    name.startsWith(MISTAKES_SESSION_PREFIX)
  );
}

export function mistakePoolKey(parts: {
  paperId?: number | null;
  paperName: string;
  paperVariant: string;
  questionNumber: number;
}): string {
  if (parts.paperId != null && Number.isFinite(parts.paperId)) {
    return `id:${parts.paperId}:${parts.questionNumber}`;
  }
  return `nv:${parts.paperName}|${parts.paperVariant}|${parts.questionNumber}`;
}

function asLetter(value: unknown): Letter | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toUpperCase();
  if (!trimmed) return null;
  return trimmed as Letter;
}

function questionNumberAt(
  row: PaperSessionRow,
  index: number,
): number | null {
  const order = Array.isArray(row.question_order) ? row.question_order : [];
  if (typeof order[index] === "number" && order[index] > 0) {
    return order[index];
  }
  const start = row.question_start ?? 1;
  const inferred = start + index;
  return inferred > 0 ? inferred : null;
}

function parsePartKey(raw: string): {
  paperId: number | null;
  paperName: string;
  paperVariant: string;
  questionNumber: number;
} | null {
  if (raw.startsWith("id:")) {
    const [, idStr, qnStr] = raw.split(":");
    const paperId = Number(idStr);
    const questionNumber = Number(qnStr);
    if (!Number.isFinite(paperId) || !Number.isFinite(questionNumber)) {
      return null;
    }
    return {
      paperId,
      paperName: "",
      paperVariant: "",
      questionNumber,
    };
  }
  if (raw.startsWith("nv:")) {
    const body = raw.slice(3);
    const lastPipe = body.lastIndexOf("|");
    if (lastPipe < 0) return null;
    const qnStr = body.slice(lastPipe + 1);
    const rest = body.slice(0, lastPipe);
    const midPipe = rest.indexOf("|");
    if (midPipe < 0) return null;
    const questionNumber = Number(qnStr);
    if (!Number.isFinite(questionNumber)) return null;
    return {
      paperId: null,
      paperName: rest.slice(0, midPipe),
      paperVariant: rest.slice(midPipe + 1),
      questionNumber,
    };
  }
  return null;
}

type MutableItem = MistakePoolItem;

function ensureItem(
  map: Map<string, MutableItem>,
  key: string,
  seed: Omit<
    MistakePoolItem,
    | "key"
    | "timesWrong"
    | "timesSeenInMistakes"
    | "lastWrongAt"
    | "lastReviewedAt"
    | "lastMistakesOutcome"
    | "neverReviewed"
    | "history"
  > &
    Partial<Pick<MistakePoolItem, "lastWrongAt">>,
): MutableItem {
  const existing = map.get(key);
  if (existing) {
    if (!existing.paperId && seed.paperId) existing.paperId = seed.paperId;
    if (!existing.questionId && seed.questionId) {
      existing.questionId = seed.questionId;
    }
    if (!existing.examName && seed.examName) existing.examName = seed.examName;
    if (!existing.paperName && seed.paperName) {
      existing.paperName = seed.paperName;
    }
    if (!existing.paperVariant && seed.paperVariant) {
      existing.paperVariant = seed.paperVariant;
    }
    return existing;
  }
  const created: MutableItem = {
    key,
    paperId: seed.paperId,
    paperName: seed.paperName,
    paperVariant: seed.paperVariant,
    examName: seed.examName,
    questionNumber: seed.questionNumber,
    questionId: seed.questionId,
    timesWrong: 0,
    timesSeenInMistakes: 0,
    lastWrongAt: seed.lastWrongAt ?? 0,
    lastReviewedAt: null,
    lastMistakesOutcome: null,
    neverReviewed: true,
    history: [],
  };
  map.set(key, created);
  return created;
}

function examFromPaperName(paperName: string): string {
  const upper = paperName.trim().toUpperCase();
  for (const exam of ["ESAT", "TMUA", "NSAA", "ENGAA", "PAT", "MAT"] as const) {
    if (upper === exam || upper.startsWith(`${exam} `) || upper.includes(exam)) {
      return exam;
    }
  }
  return paperName.trim() || "OTHER";
}

/**
 * Build the mistakes pool from completed paper_sessions rows.
 */
export function aggregateMistakePool(
  rows: PaperSessionRow[],
): MistakePoolItem[] {
  const map = new Map<string, MutableItem>();

  const completed = rows.filter(
    (row) => row.ended_at && !row.deleted_at,
  );

  for (const row of completed) {
    const endedAt = row.ended_at
      ? new Date(row.ended_at).getTime()
      : Date.now();
    const flags = (Array.isArray(row.correct_flags)
      ? row.correct_flags
      : []) as (boolean | null)[];
    const answers = (Array.isArray(row.answers) ? row.answers : []) as Array<{
      choice?: string | null;
      correctChoice?: string | null;
      other?: string;
    }>;
    const times = (Array.isArray(row.per_question_seconds)
      ? row.per_question_seconds
      : []) as number[];
    const mistakesSession = isMistakesSession(row);
    const partIds = Array.isArray(row.selected_part_ids)
      ? row.selected_part_ids
      : [];

    const len = Math.max(
      flags.length,
      answers.length,
      partIds.length,
      Array.isArray(row.question_order) ? row.question_order.length : 0,
    );

    for (let i = 0; i < len; i++) {
      let key: string | null = null;
      let paperId = row.paper_id;
      let paperName = row.paper_name || "";
      let paperVariant = row.paper_variant || "";
      let questionNumber: number | null = null;
      let questionId: number | null = null;
      let examName = examFromPaperName(paperName);

      if (mistakesSession && typeof partIds[i] === "string") {
        const parsed = parsePartKey(partIds[i]);
        if (parsed) {
          key = partIds[i];
          paperId = parsed.paperId ?? paperId;
          if (parsed.paperName) paperName = parsed.paperName;
          if (parsed.paperVariant) paperVariant = parsed.paperVariant;
          questionNumber = parsed.questionNumber;
        }
        // Optional identity blob in answers[i].other
        try {
          const other = answers[i]?.other;
          if (other && other.trim().startsWith("{")) {
            const meta = JSON.parse(other) as {
              key?: string;
              paperId?: number | null;
              paperName?: string;
              paperVariant?: string;
              questionNumber?: number;
              questionId?: number | null;
              examName?: string;
            };
            if (meta.key) key = meta.key;
            if (meta.paperId != null) paperId = meta.paperId;
            if (meta.paperName) paperName = meta.paperName;
            if (meta.paperVariant) paperVariant = meta.paperVariant;
            if (meta.questionNumber != null) {
              questionNumber = meta.questionNumber;
            }
            if (meta.questionId != null) questionId = meta.questionId;
            if (meta.examName) examName = meta.examName;
          }
        } catch {
          /* ignore */
        }
      } else {
        questionNumber = questionNumberAt(row, i);
        if (questionNumber == null) continue;
        key = mistakePoolKey({
          paperId,
          paperName,
          paperVariant,
          questionNumber,
        });
      }

      if (!key || questionNumber == null) continue;

      const choice = asLetter(answers[i]?.choice);
      const correctChoice = asLetter(answers[i]?.correctChoice);
      let isCorrect = flags[i];
      if (isCorrect == null && choice && correctChoice) {
        isCorrect = choice === correctChoice;
      }

      const item = ensureItem(map, key, {
        paperId,
        paperName,
        paperVariant: mistakesSession ? paperVariant || "" : paperVariant,
        examName,
        questionNumber,
        questionId,
      });

      const event: MistakeHistoryEvent = {
        at: endedAt,
        source: mistakesSession ? "mistakes" : "paper",
        isCorrect: isCorrect === true,
        choice,
        correctChoice,
        timeSec: typeof times[i] === "number" ? times[i] : 0,
        sessionName: row.session_name || "",
        sessionId: row.id,
      };

      if (mistakesSession) {
        item.timesSeenInMistakes += 1;
        item.neverReviewed = false;
        item.lastReviewedAt = Math.max(item.lastReviewedAt ?? 0, endedAt);
        item.lastMistakesOutcome = isCorrect === true ? "correct" : "wrong";
        if (isCorrect === false) {
          item.timesWrong += 1;
          item.lastWrongAt = Math.max(item.lastWrongAt, endedAt);
        }
        item.history.push(event);
        continue;
      }

      // Original paper sitting — only track incorrect outcomes in the pool
      if (isCorrect !== false) continue;

      item.timesWrong += 1;
      item.lastWrongAt = Math.max(item.lastWrongAt, endedAt);
      if (!item.paperName) item.paperName = paperName;
      if (!item.paperVariant) item.paperVariant = paperVariant;
      item.history.push(event);
    }
  }

  // Keep only questions that were wrong at least once (paper or mistakes)
  const items = [...map.values()].filter((item) => item.timesWrong > 0);
  for (const item of items) {
    item.history.sort((a, b) => b.at - a.at);
    item.neverReviewed = item.timesSeenInMistakes === 0;
  }
  return items;
}

export function summarizeMistakePool(items: MistakePoolItem[]): MistakesSummary {
  const byExam: Record<string, number> = {};
  let untouched = 0;
  let bounceBacks = 0;
  for (const item of items) {
    byExam[item.examName] = (byExam[item.examName] || 0) + 1;
    if (item.neverReviewed) untouched += 1;
    if (item.lastMistakesOutcome === "wrong") bounceBacks += 1;
  }
  return {
    totalIncorrect: items.length,
    untouched,
    bounceBacks,
    byExam,
  };
}

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function filterByExam(
  items: MistakePoolItem[],
  exam: MistakesExamFilter,
): MistakePoolItem[] {
  if (exam === "ALL") return items;
  return items.filter(
    (item) => item.examName.toUpperCase() === exam.toUpperCase(),
  );
}

/**
 * Pick questions for a Mistakes session.
 * Untouched mode: prefer never-reviewed; only fill from the rest when needed.
 */
export function selectMistakeItems(
  items: MistakePoolItem[],
  opts: {
    mode: MistakesPoolMode;
    exam: MistakesExamFilter;
    count: number;
  },
): MistakePoolItem[] {
  const filtered = filterByExam(items, opts.exam);
  if (filtered.length === 0 || opts.count <= 0) return [];

  const take = Math.min(opts.count, filtered.length);

  if (opts.mode === "lucky_dip") {
    return shuffleInPlace([...filtered]).slice(0, take);
  }

  if (opts.mode === "bounce_backs") {
    const sticky = filtered.filter(
      (item) => item.lastMistakesOutcome === "wrong",
    );
    const rest = filtered.filter(
      (item) => item.lastMistakesOutcome !== "wrong",
    );
    const ordered = [
      ...shuffleInPlace(sticky),
      ...shuffleInPlace(rest),
    ];
    return ordered.slice(0, take);
  }

  if (opts.mode === "repeat_offenders") {
    const sorted = [...filtered].sort((a, b) => {
      if (b.timesWrong !== a.timesWrong) return b.timesWrong - a.timesWrong;
      // Prefer untouched when tied
      if (a.neverReviewed !== b.neverReviewed) {
        return a.neverReviewed ? -1 : 1;
      }
      return b.lastWrongAt - a.lastWrongAt;
    });
    return sorted.slice(0, take);
  }

  if (opts.mode === "cold_cases") {
    const sorted = [...filtered].sort((a, b) => {
      if (a.lastWrongAt !== b.lastWrongAt) return a.lastWrongAt - b.lastWrongAt;
      return b.timesWrong - a.timesWrong;
    });
    return sorted.slice(0, take);
  }

  // untouched (default): never-reviewed first, then recycle
  const fresh = shuffleInPlace(filtered.filter((i) => i.neverReviewed));
  const recycled = shuffleInPlace(filtered.filter((i) => !i.neverReviewed));
  return [...fresh, ...recycled].slice(0, take);
}

const QUESTION_SELECT = [
  "id",
  "paper_id",
  "exam_name",
  "exam_year",
  "paper_name",
  "part_letter",
  "part_name",
  "exam_type",
  "question_number",
  "question_image",
  "question_stem",
  "options",
  "diagram_assets",
  "content_format",
  "solution_image",
  "solution_text",
  "solution_type",
  "answer_letter",
  "created_at",
  "updated_at",
].join(",");

function mapQuestionRow(row: Record<string, unknown>): Question {
  return {
    id: row.id as number,
    paperId: row.paper_id as number,
    examName: row.exam_name as Question["examName"],
    examYear: row.exam_year as number,
    paperName: row.paper_name as string,
    partLetter: (row.part_letter as string) ?? "",
    partName: (row.part_name as string) ?? "",
    examType: row.exam_type as string,
    questionNumber: row.question_number as number,
    questionImage: row.question_image as string,
    questionStem: (row.question_stem as string) ?? undefined,
    options: (row.options as Question["options"]) ?? undefined,
    diagramAssets: (row.diagram_assets as Question["diagramAssets"]) ?? undefined,
    contentFormat: (row.content_format as Question["contentFormat"]) ?? "image",
    solutionImage: (row.solution_image as string) ?? undefined,
    solutionText: (row.solution_text as string) ?? undefined,
    solutionType: row.solution_type as Question["solutionType"],
    answerLetter: row.answer_letter as string,
    createdAt: (row.created_at as string) ?? "",
    updatedAt: (row.updated_at as string) ?? "",
  };
}

/** Load full question rows for selected pool items. */
export async function hydrateMistakeQuestions(
  supabase: {
    from: (table: string) => any;
  },
  items: MistakePoolItem[],
): Promise<MistakeQuestionPayload[]> {
  const byPaper = new Map<number, number[]>();
  for (const item of items) {
    if (item.paperId == null) continue;
    const list = byPaper.get(item.paperId) ?? [];
    list.push(item.questionNumber);
    byPaper.set(item.paperId, list);
  }

  const questionMap = new Map<string, Question>();

  for (const [paperId, numbers] of byPaper) {
    if (isEsatCampMockPaperId(paperId)) {
      const mocks = getEsatCampMockQuestions(paperId);
      for (const q of mocks) {
        if (numbers.includes(q.questionNumber)) {
          questionMap.set(`id:${paperId}:${q.questionNumber}`, q);
        }
      }
      continue;
    }

    const uniqueNumbers = [...new Set(numbers)];
    const { data, error } = await supabase
      .from("questions")
      .select(QUESTION_SELECT)
      .eq("paper_id", paperId)
      .in("question_number", uniqueNumbers);

    if (error || !data) continue;
    for (const row of data as Record<string, unknown>[]) {
      const q = mapQuestionRow(row);
      questionMap.set(`id:${paperId}:${q.questionNumber}`, q);
    }
  }

  const payloads: MistakeQuestionPayload[] = [];
  for (const item of items) {
    const question =
      (item.paperId != null
        ? questionMap.get(`id:${item.paperId}:${item.questionNumber}`)
        : undefined) ?? null;
    if (!question) continue;
    payloads.push({
      ...item,
      questionId: question.id,
      examName: question.examName || item.examName,
      paperName: item.paperName || question.paperName,
      question,
    });
  }
  return payloads;
}

export function buildMistakesSessionPayload(opts: {
  sessionId: string;
  mode: MistakesPoolMode;
  exam: MistakesExamFilter;
  timeLimitMinutes: number;
  startedAt: number;
  endedAt: number;
  items: MistakeQuestionPayload[];
  answers: Array<{
    choice: Letter | null;
    timeSec: number;
    isCorrect: boolean;
  }>;
}) {
  const { items, answers } = opts;
  const questionOrder = items.map((item) => item.questionNumber);
  const selectedPartIds = items.map((item) => item.key);
  const answerRows = items.map((item, i) => {
    const a = answers[i];
    return {
      choice: a?.choice ?? null,
      other: JSON.stringify({
        key: item.key,
        paperId: item.paperId,
        paperName: item.paperName,
        paperVariant: item.paperVariant,
        questionNumber: item.questionNumber,
        questionId: item.questionId,
        examName: item.examName,
      }),
      correctChoice: (item.question.answerLetter as Letter) || null,
      explanation: "",
      addToDrill: false,
    };
  });

  const modeLabel =
    MISTAKES_POOL_OPTIONS.find((o) => o.id === opts.mode)?.label ?? opts.mode;

  return {
    id: opts.sessionId,
    paperId: null,
    paperName: MISTAKES_PAPER_NAME,
    paperVariant: MISTAKES_PAPER_VARIANT,
    sessionName: `${MISTAKES_SESSION_PREFIX} ${modeLabel} · ${items.length} Qs`,
    questionRange: {
      start: 1,
      end: Math.max(1, items.length),
    },
    selectedSections: [],
    selectedPartIds,
    questionOrder,
    timeLimitMinutes: opts.timeLimitMinutes,
    startedAt: opts.startedAt,
    endedAt: opts.endedAt,
    deadlineAt: null,
    perQuestionSec: answers.map((a) => a.timeSec || 0),
    answers: answerRows,
    correctFlags: answers.map((a) => a.isCorrect),
    guessedFlags: items.map(() => false),
    mistakeTags: items.map(() => "None"),
    notes: `exam=${opts.exam};mode=${opts.mode}`,
    score: {
      correct: answers.filter((a) => a.isCorrect).length,
      total: items.length,
    },
  };
}
