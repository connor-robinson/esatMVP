import { NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/supabase/auth";
import { userHasFullAccess } from "@/lib/subscription/serverAccess";
import {
  aggregateQbMistakePool,
  hydrateQbMistakeQuestions,
  normalizeQbMistakesPoolMode,
  selectQbMistakeItems,
  summarizeQbMistakePool,
  type QbAttemptSeed,
  type QbMistakesExamFilter,
  type QbMistakesSubjectFilter,
  type QbSessionSeed,
  QB_MISTAKES_SUBJECT_FILTERS,
} from "@/lib/questionBank/mistakes";
import { applyPublishedQuestionBankFilter } from "@/lib/questionBank/libraryFilterServer";
import { getQuestionIdsWithOpenReports } from "@/lib/questionBank/excludeReported";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_EXAMS: QbMistakesExamFilter[] = ["ALL", "ESAT", "TMUA"];
const VALID_SUBJECTS = new Set<string>(QB_MISTAKES_SUBJECT_FILTERS);

async function loadPool(supabase: any, userId: string) {
  const [attemptsRes, sessionsRes] = await Promise.all([
    supabase
      .from("question_bank_attempts")
      .select(
        "question_id, user_answer, is_correct, time_spent_ms, attempted_at, session_id",
      )
      .eq("user_id", userId)
      .order("attempted_at", { ascending: true }),
    supabase
      .from("question_bank_sessions")
      .select("id, source, summary")
      .eq("user_id", userId),
  ]);

  if (attemptsRes.error) {
    throw new Error("Failed to load attempts");
  }
  if (sessionsRes.error) {
    throw new Error("Failed to load sessions");
  }

  const attempts = (attemptsRes.data || []) as QbAttemptSeed[];
  const sessions = (sessionsRes.data || []) as QbSessionSeed[];

  const wrongIds = [
    ...new Set(
      attempts.filter((a) => !a.is_correct).map((a) => a.question_id),
    ),
  ];

  const meta = new Map<
    string,
    { subjects: string; test_type?: string | null; primary_tag?: string | null }
  >();

  const reportedIds = await getQuestionIdsWithOpenReports();

  const visibleWrongIds = wrongIds.filter((id) => !reportedIds.has(id));
  if (visibleWrongIds.length > 0) {
    const { data: rows } = await applyPublishedQuestionBankFilter(
      supabase
        .from("ai_generated_questions")
        .select("id, subjects, test_type, primary_tag"),
    ).in("id", visibleWrongIds);

    for (const row of (rows || []) as Array<{
      id: string;
      subjects: string;
      test_type?: string | null;
      primary_tag?: string | null;
    }>) {
      meta.set(row.id, {
        subjects: row.subjects || "",
        test_type: row.test_type,
        primary_tag: row.primary_tag,
      });
    }
  }

  // Drop attempts for unpublished / missing questions from the pool.
  const knownAttempts = attempts.filter((a) => meta.has(a.question_id));
  const items = aggregateQbMistakePool(knownAttempts, sessions, meta);
  return { items, summary: summarizeQbMistakePool(items) };
}

export async function GET(request: Request) {
  try {
    const { user, supabase, error: authError } = await requireRouteUser(request);
    if (authError || !user || !supabase) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await userHasFullAccess(user.id))) {
      return NextResponse.json({ error: "Premium required" }, { status: 403 });
    }

    const { items, summary } = await loadPool(supabase, user.id);
    return NextResponse.json({
      summary,
      items: items.map((item) => ({
        key: item.key,
        questionId: item.questionId,
        subjects: item.subjects,
        testType: item.testType,
        timesWrong: item.timesWrong,
        timesSeenInMistakes: item.timesSeenInMistakes,
        lastWrongAt: item.lastWrongAt,
        lastReviewedAt: item.lastReviewedAt,
        lastMistakesOutcome: item.lastMistakesOutcome,
        neverReviewed: item.neverReviewed,
        historyCount: item.history.length,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { user, supabase, error: authError } = await requireRouteUser(request);
    if (authError || !user || !supabase) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await userHasFullAccess(user.id))) {
      return NextResponse.json({ error: "Premium required" }, { status: 403 });
    }

    const body = (await request.json()) as {
      mode?: string;
      exam?: QbMistakesExamFilter;
      subject?: QbMistakesSubjectFilter;
      questionCount?: number;
      timeLimitMinutes?: number;
    };

    const mode = normalizeQbMistakesPoolMode(body.mode);
    const exam = VALID_EXAMS.includes(body.exam as QbMistakesExamFilter)
      ? (body.exam as QbMistakesExamFilter)
      : "ALL";
    const subject = VALID_SUBJECTS.has(body.subject || "")
      ? (body.subject as QbMistakesSubjectFilter)
      : "ALL";
    const questionCount = Math.max(
      1,
      Math.min(60, Math.round(Number(body.questionCount) || 10)),
    );
    const timeLimitMinutes = Math.max(
      0.5,
      Math.min(180, Number(body.timeLimitMinutes) || questionCount * 1.5),
    );

    const { items, summary } = await loadPool(supabase, user.id);
    const selected = selectQbMistakeItems(items, {
      mode,
      exam,
      subject,
      count: questionCount,
    });

    if (selected.length === 0) {
      return NextResponse.json(
        {
          error: "No incorrect questions in this pool yet",
          summary,
          questions: [],
        },
        { status: 404 },
      );
    }

    const hydrated = await hydrateQbMistakeQuestions(supabase as any, selected);
    if (hydrated.length === 0) {
      return NextResponse.json(
        {
          error: "Could not load question content for your mistakes.",
          summary,
          questions: [],
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      summary,
      mode,
      exam,
      subject,
      timeLimitMinutes,
      questions: hydrated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 },
    );
  }
}
