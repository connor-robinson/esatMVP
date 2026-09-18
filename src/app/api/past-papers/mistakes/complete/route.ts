import { NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/supabase/auth";
import { userHasFullAccess } from "@/lib/subscription/serverAccess";
import {
  buildMistakesSessionPayload,
  type MistakeQuestionPayload,
  type MistakesExamFilter,
  type MistakesPoolMode,
} from "@/lib/papers/mistakes";
import type { Letter } from "@/types/papers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Persist a finished Mistakes review as a paper_session so subsequent
 * pools treat those questions as reviewed (and count new wrongs).
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
      mode?: MistakesPoolMode;
      exam?: MistakesExamFilter;
      timeLimitMinutes?: number;
      startedAt?: number;
      endedAt?: number;
      questions?: MistakeQuestionPayload[];
      answers?: Array<{
        choice: Letter | null;
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

    const payload = buildMistakesSessionPayload({
      sessionId: body.sessionId,
      mode: body.mode ?? "untouched",
      exam: body.exam ?? "ALL",
      timeLimitMinutes: body.timeLimitMinutes ?? questions.length * 1.5,
      startedAt: body.startedAt ?? Date.now(),
      endedAt: body.endedAt ?? Date.now(),
      items: questions,
      answers,
    });

    const toIso = (value: number) => new Date(value).toISOString();

    const { error } = await (supabase as any).from("paper_sessions").upsert(
      {
        id: payload.id,
        user_id: user.id,
        paper_id: null,
        paper_name: payload.paperName,
        paper_variant: payload.paperVariant,
        session_name: payload.sessionName,
        question_start: payload.questionRange.start,
        question_end: payload.questionRange.end,
        selected_sections: payload.selectedSections,
        selected_part_ids: payload.selectedPartIds,
        question_order: payload.questionOrder,
        time_limit_minutes: payload.timeLimitMinutes,
        started_at: toIso(payload.startedAt),
        ended_at: toIso(payload.endedAt!),
        deadline_at: null,
        per_question_seconds: payload.perQuestionSec,
        answers: payload.answers,
        correct_flags: payload.correctFlags,
        guessed_flags: payload.guessedFlags,
        mistake_tags: payload.mistakeTags,
        notes: payload.notes,
        score: payload.score,
      },
      { onConflict: "id" },
    );

    if (error) {
      return NextResponse.json(
        { error: "Failed to save mistakes session" },
        { status: 500 },
      );
    }

    // Keep drill_items review timestamps in sync (best-effort).
    const nowIso = new Date().toISOString();
    const drillRows = questions.map((item, i) => ({
      user_id: user.id,
      paper_id: item.paperId,
      paper_name: item.examName || item.paperName,
      question_number: item.questionNumber,
      correct_choice: item.question.answerLetter ?? null,
      explanation: "",
      origin_session_id: body.sessionId,
      question_id: item.questionId,
      last_wrong_at: answers[i]?.isCorrect
        ? undefined
        : nowIso,
      last_reviewed_at: nowIso,
      last_outcome: answers[i]?.isCorrect ? "correct" : "wrong",
      last_time_sec: answers[i]?.timeSec ?? null,
      review_count: 1,
    }));

    // Upsert without wiping last_wrong_at when correct — do one-by-one updates.
    for (let i = 0; i < drillRows.length; i++) {
      const row = drillRows[i];
      const patch: Record<string, unknown> = {
        user_id: row.user_id,
        paper_id: row.paper_id,
        paper_name: row.paper_name,
        question_number: row.question_number,
        correct_choice: row.correct_choice,
        explanation: row.explanation,
        origin_session_id: row.origin_session_id,
        question_id: row.question_id,
        last_reviewed_at: row.last_reviewed_at,
        last_outcome: row.last_outcome,
        last_time_sec: row.last_time_sec,
        updated_at: nowIso,
      };
      if (!answers[i]?.isCorrect) {
        patch.last_wrong_at = nowIso;
      }
      try {
        await (supabase as any)
          .from("drill_items")
          .upsert(patch, { onConflict: "user_id,paper_name,question_number" });
      } catch {
        /* drill_items optional */
      }
    }

    return NextResponse.json({
      ok: true,
      score: payload.score,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 },
    );
  }
}
