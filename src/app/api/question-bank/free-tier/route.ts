import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireRouteUser } from "@/lib/supabase/auth";
import { userHasFullAccess } from "@/lib/subscription/serverAccess";
import { QUESTION_BANK_PUBLISH_STATUS } from "@/lib/questionBank/qualityGate";
import {
  FREE_TIER_LIMIT_PER_SUBJECT,
  FREE_TIER_PREVIEW_SUBJECTS,
  FREE_TIER_QUESTION_IDS,
  freeTierQuestionIdsForSubject,
  isFreeTierPreviewSubject,
  type FreeTierPreviewSubject,
} from "@/lib/questionBank/freeTierQuestions";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

type ParsedQuestion = Record<string, unknown> & { id: string; subjects?: string };

function parseQuestionRow(q: Record<string, unknown>): ParsedQuestion {
  return {
    ...q,
    id: q.id as string,
    options:
      typeof q.options === "string" ? JSON.parse(q.options as string) : q.options,
    distractor_map:
      q.distractor_map && typeof q.distractor_map === "string"
        ? JSON.parse(q.distractor_map as string)
        : q.distractor_map,
  };
}

type SubjectFreeTierStatus = {
  subject: FreeTierPreviewSubject;
  limit: number;
  attemptedCount: number;
  remaining: number;
  isExhausted: boolean;
  attemptedQuestionIds: string[];
  questions: ParsedQuestion[];
  remainingQuestions: ParsedQuestion[];
};

function buildSubjectStatus(
  subject: FreeTierPreviewSubject,
  byId: Map<string, ParsedQuestion>,
  attemptedSet: Set<string>,
): SubjectFreeTierStatus {
  const ids = freeTierQuestionIdsForSubject(subject);
  const questions = ids
    .map((id) => byId.get(id))
    .filter((q): q is ParsedQuestion => q != null);
  const attemptedQuestionIds = ids.filter((id) => attemptedSet.has(id));
  const attemptedCount = attemptedQuestionIds.length;
  const remaining = Math.max(0, FREE_TIER_LIMIT_PER_SUBJECT - attemptedCount);
  const isExhausted = attemptedCount >= FREE_TIER_LIMIT_PER_SUBJECT;
  const remainingQuestions = questions.filter(
    (q) => !attemptedSet.has(String(q.id)),
  );

  return {
    subject,
    limit: FREE_TIER_LIMIT_PER_SUBJECT,
    attemptedCount,
    remaining,
    isExhausted,
    attemptedQuestionIds,
    questions,
    remainingQuestions,
  };
}

/**
 * GET /api/question-bank/free-tier
 * Returns hook-set preview usage. Optional ?subject=Math+1 scopes the session payload.
 */
export async function GET(request: NextRequest) {
  try {
    const { user } = await requireRouteUser(request);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (user && (await userHasFullAccess(user.id))) {
      return NextResponse.json({ hasFullAccess: true });
    }

    const subjectParam = request.nextUrl.searchParams.get("subject");
    const scopedSubject = isFreeTierPreviewSubject(subjectParam ?? "")
      ? (subjectParam as FreeTierPreviewSubject)
      : null;

    const { data: rows, error: queryError } = await supabase
      .from("ai_generated_questions")
      .select("*")
      .eq("status", QUESTION_BANK_PUBLISH_STATUS)
      .in("id", [...FREE_TIER_QUESTION_IDS]);

    if (queryError) {
      return NextResponse.json(
        { error: "Failed to load free tier questions" },
        { status: 500 },
      );
    }

    const byId = new Map<string, ParsedQuestion>(
      (rows ?? []).map((row) => [
        row.id as string,
        parseQuestionRow(row as Record<string, unknown>),
      ]),
    );

    let attemptedSet = new Set<string>();
    if (user) {
      const { data: attempts } = await supabase
        .from("question_bank_attempts")
        .select("question_id")
        .eq("user_id", user.id)
        .in("question_id", [...FREE_TIER_QUESTION_IDS]);

      attemptedSet = new Set(
        (attempts ?? []).map((a) => a.question_id as string),
      );
    }

    const bySubject = Object.fromEntries(
      FREE_TIER_PREVIEW_SUBJECTS.map((subject) => [
        subject,
        buildSubjectStatus(subject, byId, attemptedSet),
      ]),
    ) as Record<FreeTierPreviewSubject, SubjectFreeTierStatus>;

    const active = scopedSubject ?? "Math 1";
    const activeStatus = bySubject[active];

    const totalAttempted = FREE_TIER_PREVIEW_SUBJECTS.reduce(
      (sum, s) => sum + bySubject[s].attemptedCount,
      0,
    );
    const totalRemaining = FREE_TIER_PREVIEW_SUBJECTS.reduce(
      (sum, s) => sum + bySubject[s].remaining,
      0,
    );
    const anyPreviewAvailable = FREE_TIER_PREVIEW_SUBJECTS.some(
      (s) => bySubject[s].remainingQuestions.length > 0 && !bySubject[s].isExhausted,
    );

    return NextResponse.json({
      hasFullAccess: false,
      subject: active,
      limit: FREE_TIER_LIMIT_PER_SUBJECT,
      limitPerSubject: FREE_TIER_LIMIT_PER_SUBJECT,
      attemptedCount: activeStatus.attemptedCount,
      remaining: activeStatus.remaining,
      isExhausted: activeStatus.isExhausted,
      attemptedQuestionIds: activeStatus.attemptedQuestionIds,
      questions: activeStatus.questions,
      remainingQuestions: activeStatus.remainingQuestions,
      bySubject,
      totalAttempted,
      totalRemaining,
      anyPreviewAvailable,
      requiresAuth: !user,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load free tier status" },
      { status: 500 },
    );
  }
}
