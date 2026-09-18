import { NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/supabase/auth";
import { userHasFullAccess } from "@/lib/subscription/serverAccess";
import {
  insertQuestionBankAttempts,
  type AttemptWriteInput,
} from "@/lib/questionBank/attemptWrite";
import {
  QB_MISTAKES_SESSION_SOURCE,
  buildQbMistakesSessionSummary,
  normalizeQbMistakesPoolMode,
  type QbMistakeQuestionPayload,
  type QbMistakesExamFilter,
} from "@/lib/questionBank/mistakes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Persist a finished QB Mistakes review as a question_bank_session
 * (source=mistakes) plus linked attempts so the unreviewed pool updates.
 */
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
      sessionId?: string;
      mode?: string;
      exam?: QbMistakesExamFilter;
      timeLimitMinutes?: number;
      startedAt?: number;
      endedAt?: number;
      questions?: QbMistakeQuestionPayload[];
      answers?: Array<{
        choice: string | null;
        timeSec: number;
        isCorrect: boolean;
      }>;
    };

    const questions = body.questions ?? [];
    const answers = body.answers ?? [];
    if (!body.sessionId || questions.length === 0) {
      return NextResponse.json({ error: "Missing session data" }, { status: 400 });
    }
    if (answers.length !== questions.length) {
      return NextResponse.json(
        { error: "Answer count mismatch" },
        { status: 400 },
      );
    }

    const mode = normalizeQbMistakesPoolMode(body.mode);
    const exam = (body.exam ?? "ALL") as QbMistakesExamFilter;
    const subject =
      (body as { subject?: string }).subject ?? "ALL";
    const startedAt = body.startedAt ?? Date.now();
    const endedAt = body.endedAt ?? Date.now();
    const correctCount = answers.filter((a) => a.isCorrect).length;
    const totalTimeMs = answers.reduce(
      (sum, a) => sum + Math.max(0, (a.timeSec || 0) * 1000),
      0,
    );
    const subjects = [
      ...new Set(questions.map((q) => q.subjects).filter(Boolean)),
    ].join(", ");
    const testType =
      exam === "ALL"
        ? questions[0]?.testType ?? null
        : exam;

    const summary = {
      ...buildQbMistakesSessionSummary({
        mode,
        exam,
        subject: subject as any,
        questionIds: questions.map((q) => q.questionId),
      }),
      totalQuestions: questions.length,
      correctCount,
      accuracy:
        questions.length > 0 ? correctCount / questions.length : 0,
    };

    const { error: sessionError } = await supabase
      .from("question_bank_sessions")
      .upsert(
        {
          id: body.sessionId,
          user_id: user.id,
          started_at: new Date(startedAt).toISOString(),
          ended_at: new Date(endedAt).toISOString(),
          question_count: questions.length,
          correct_count: correctCount,
          total_time_ms: totalTimeMs,
          time_limit_minutes: body.timeLimitMinutes ?? questions.length * 1.5,
          source: QB_MISTAKES_SESSION_SOURCE,
          subjects: subjects || null,
          test_type: testType,
          summary,
        } as never,
        { onConflict: "id" },
      );

    if (sessionError) {
      return NextResponse.json(
        { error: "Failed to save mistakes session", detail: sessionError.message },
        { status: 500 },
      );
    }

    const attemptRows: AttemptWriteInput[] = questions.map((q, i) => ({
      question_id: q.questionId,
      user_answer: answers[i]?.choice || "",
      is_correct: !!answers[i]?.isCorrect,
      time_spent_ms: Math.max(0, Math.round((answers[i]?.timeSec || 0) * 1000)),
      viewed_solution: false,
      was_revealed: false,
      used_hint: false,
      wrong_answers_before: [],
      session_id: body.sessionId!,
      attempted_at: new Date(endedAt - (questions.length - i) * 1000).toISOString(),
    }));

    const { error: attemptsError } = await insertQuestionBankAttempts(
      supabase,
      user.id,
      attemptRows,
    );

    if (attemptsError) {
      return NextResponse.json(
        {
          error: "Failed to save mistake attempts",
          detail: attemptsError.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      score: { correct: correctCount, total: questions.length },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 },
    );
  }
}
