import type { SupabaseClient } from "@supabase/supabase-js";
import { labelForEsatTag } from "@/lib/questionBank/esatTagCanonicalize";
import { labelTopicTagsForQuestion } from "@/lib/questionBank/questionTopicDisplay";
import type { QuestionBankQuestion } from "@/types/questionBank";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const REPORT_THANK_YOU_SUBJECT = "Thanks for your question report";

export function buildReportThankYouBody(username: string | null | undefined): string {
  const name =
    typeof username === "string" && username.trim()
      ? username.trim()
      : "there";
  return `${name}, Thank you for reporting an error. We've reviewed and updated the question. Please bear with us as our site is new and expanding rapidly. If anything else looks off, please let us know, we will respond within 24 hours!`;
}

export type ReportedQuestionMeta = {
  ticketId: string;
  questionId: string;
  userId: string | null;
  username: string | null;
  email: string | null;
  reason: string;
  reportedAt: string;
  ticketStatus: string;
  ticketMessage: string;
  sessionId: string | null;
  sessionNote: string;
  topicLabel: string;
  db: {
    generationId: string;
    schemaId: string;
    subjects: string;
    testType: string | null;
    primaryTag: string | null;
    secondaryTags: string[];
    difficulty: string;
    status: string;
    isGoodQuestion: boolean;
    qualityGateCalibrationTier: "gold" | null;
    qualityGateVerdict: string | null;
    practiceEligible: boolean;
    mockEligible: boolean;
    reservedForMock: boolean;
    hasVisual: boolean;
    createdAt: string;
    updatedAt: string;
    correctOption: string;
  };
};

export type ReportedQuestionItem = {
  meta: ReportedQuestionMeta;
  question: QuestionBankQuestion;
};

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function parseJsonRecord(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  if (typeof value === "object") return value as Record<string, unknown>;
  return {};
}

export function normalizeQuestionBankRow(
  row: Record<string, unknown>,
): QuestionBankQuestion {
  const optionsRaw = row.options;
  const distractorRaw = row.distractor_map;
  const options =
    typeof optionsRaw === "string"
      ? (JSON.parse(optionsRaw) as Record<string, string>)
      : ((optionsRaw as Record<string, string>) ?? {});
  const distractor_map =
    typeof distractorRaw === "string"
      ? (JSON.parse(distractorRaw) as Record<string, string>)
      : ((distractorRaw as Record<string, string> | null) ?? null);

  return {
    ...(row as unknown as QuestionBankQuestion),
    options,
    distractor_map,
  };
}

function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function formatReportedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

function buildTopicLabel(question: QuestionBankQuestion): string {
  const labels = labelTopicTagsForQuestion(question);
  if (labels.length > 0 && question.primary_tag) {
    return `${labels[0]} (${question.primary_tag})`;
  }
  if (labels.length > 0) return labels[0];
  if (question.primary_tag) {
    return labelForEsatTag(question.primary_tag, {
      subject: question.subjects,
      schemaId: question.schema_id,
    });
  }
  return "Untagged";
}

async function buildSessionNote(
  service: SupabaseClient,
  sessionId: string | null,
  questionId: string,
  subjects: string,
  testType: string | null,
): Promise<string> {
  if (!sessionId) {
    return `${testType ?? "ESAT"} ${subjects} question-bank session · session unknown`;
  }

  const { data: session } = await service
    .from("question_bank_sessions")
    .select("id, subjects, question_count, test_type")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) {
    return `Question-bank session · id ${sessionId.slice(0, 8)}…`;
  }

  const labelSubjects = String(session.subjects ?? subjects ?? "Unknown");
  const labelTest = String(session.test_type ?? testType ?? "ESAT");
  const total = Number(session.question_count ?? 0);

  const { data: attempts } = await service
    .from("question_bank_attempts")
    .select("question_id, attempted_at, created_at")
    .eq("session_id", sessionId)
    .order("attempted_at", { ascending: true });

  const ordered = attempts ?? [];
  const index = ordered.findIndex((a) => a.question_id === questionId);
  if (index >= 0 && total > 0) {
    return `${labelTest} ${labelSubjects} question-bank session · Q${index + 1} of ${total}`;
  }
  if (total > 0) {
    return `${labelTest} ${labelSubjects} question-bank session (${total} questions) · position not stored`;
  }
  return `${labelTest} ${labelSubjects} question-bank session`;
}

export async function loadReportedQuestionBankItems(
  service: SupabaseClient,
): Promise<ReportedQuestionItem[]> {
  const { data: tickets, error } = await service
    .from("support_requests")
    .select(
      "id, user_id, subject, message, status, context, created_at, reply_email",
    )
    .eq("category", "question_or_content_error")
    .in("status", ["open", "in_progress"])
    .order("created_at", { ascending: false })
    .limit(80);

  if (error) throw new Error(error.message);

  const parsed = (tickets ?? [])
    .map((ticket) => {
      const context = parseJsonRecord(ticket.context);
      const questionId =
        typeof context.questionId === "string" ? context.questionId.trim() : "";
      const sessionId =
        typeof context.sessionId === "string" ? context.sessionId.trim() : null;
      if (!questionId || !isUuid(questionId)) return null;
      return {
        ticket,
        questionId,
        sessionId,
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  if (parsed.length === 0) return [];

  const questionIds = [...new Set(parsed.map((p) => p.questionId))];
  const userIds = [
    ...new Set(
      parsed
        .map((p) => p.ticket.user_id as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const [{ data: questions }, { data: profiles }] = await Promise.all([
    service.from("ai_generated_questions").select("*").in("id", questionIds),
    userIds.length > 0
      ? service.from("profiles").select("id, username, email").in("id", userIds)
      : Promise.resolve({ data: [] as Array<{ id: string; username: string | null; email: string | null }> }),
  ]);

  const questionById = new Map<string, QuestionBankQuestion>();
  const rawById = new Map<string, Record<string, unknown>>();
  for (const row of questions ?? []) {
    const id = row.id as string;
    const raw = row as Record<string, unknown>;
    rawById.set(id, raw);
    questionById.set(id, normalizeQuestionBankRow(raw));
  }
  const profileById = new Map(
    (profiles ?? []).map((p) => [
      p.id as string,
      {
        username: (p.username as string | null) ?? null,
        email: (p.email as string | null) ?? null,
      },
    ]),
  );

  const items: ReportedQuestionItem[] = [];

  for (const row of parsed) {
    const question = questionById.get(row.questionId);
    if (!question) continue;
    if (question.status === "deleted") continue;
    const raw = rawById.get(row.questionId) ?? {};

    const profile = row.ticket.user_id
      ? profileById.get(row.ticket.user_id as string)
      : null;
    const secondaryTags = Array.isArray(question.secondary_tags)
      ? question.secondary_tags
      : [];
    const sessionNote = await buildSessionNote(
      service,
      row.sessionId,
      row.questionId,
      question.subjects,
      question.test_type ?? null,
    );

    const reason =
      (typeof row.ticket.subject === "string" && row.ticket.subject.trim()) ||
      "Question report";

    items.push({
      question,
      meta: {
        ticketId: row.ticket.id as string,
        questionId: row.questionId,
        userId: (row.ticket.user_id as string | null) ?? null,
        username: profile?.username ?? null,
        email:
          profile?.email ??
          (typeof row.ticket.reply_email === "string"
            ? row.ticket.reply_email
            : null),
        reason,
        reportedAt: formatReportedAt(String(row.ticket.created_at)),
        ticketStatus: String(row.ticket.status ?? "open"),
        ticketMessage: String(row.ticket.message ?? ""),
        sessionId: row.sessionId,
        sessionNote,
        topicLabel: buildTopicLabel(question),
        db: {
          generationId: question.generation_id,
          schemaId: question.schema_id,
          subjects: question.subjects,
          testType: question.test_type ?? null,
          primaryTag: question.primary_tag,
          secondaryTags,
          difficulty: question.difficulty,
          status: question.status,
          isGoodQuestion: raw.is_good_question === true,
          qualityGateCalibrationTier:
            raw.quality_gate_calibration_tier === "gold" ? "gold" : null,
          qualityGateVerdict: question.quality_gate_verdict ?? null,
          practiceEligible: question.practice_eligible !== false,
          mockEligible: question.mock_eligible !== false,
          reservedForMock: question.reserved_for_mock === true,
          hasVisual: question.has_visual === true,
          createdAt: formatDateShort(question.created_at),
          updatedAt: formatDateShort(
            typeof raw.updated_at === "string"
              ? raw.updated_at
              : question.created_at,
          ),
          correctOption: question.correct_option,
        },
      },
    });
  }

  return items;
}
