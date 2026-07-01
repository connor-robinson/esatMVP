import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireRouteUser } from "@/lib/supabase/auth";
import { userHasFullAccess } from "@/lib/subscription/serverAccess";
import { QUESTION_BANK_PUBLISH_STATUS } from "@/lib/questionBank/qualityGate";
import {
  FREE_TIER_QUESTION_IDS,
  FREE_TIER_QUESTION_LIMIT,
} from "@/lib/questionBank/freeTierQuestions";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function parseQuestionRow(q: Record<string, unknown>) {
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

/**
 * GET /api/question-bank/free-tier
 * Returns the fixed free-tier question set and usage for unpaid users.
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireRouteUser(request);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (user && (await userHasFullAccess(user.id))) {
      return NextResponse.json({ hasFullAccess: true });
    }

    const { data: rows, error: queryError } = await supabase
      .from("ai_generated_questions")
      .select("*")
      .eq("status", QUESTION_BANK_PUBLISH_STATUS)
      .in("id", [...FREE_TIER_QUESTION_IDS]);

    if (queryError) {
      console.error("[free-tier] query error:", queryError);
      return NextResponse.json(
        { error: "Failed to load free tier questions" },
        { status: 500 },
      );
    }

    const byId = new Map<string, ReturnType<typeof parseQuestionRow>>(
      (rows ?? []).map((row) => [
        row.id as string,
        parseQuestionRow(row as Record<string, unknown>),
      ]),
    );
    const questions = FREE_TIER_QUESTION_IDS.map((id) => byId.get(id)).filter(
      (q): q is ReturnType<typeof parseQuestionRow> => q != null,
    );

    let attemptedQuestionIds: string[] = [];
    if (user) {
      const { data: attempts } = await supabase
        .from("question_bank_attempts")
        .select("question_id")
        .eq("user_id", user.id)
        .in("question_id", [...FREE_TIER_QUESTION_IDS]);

      attemptedQuestionIds = [
        ...new Set(
          (attempts ?? []).map((a) => a.question_id as string),
        ),
      ];
    }

    const attemptedCount = attemptedQuestionIds.length;
    const remaining = Math.max(0, FREE_TIER_QUESTION_LIMIT - attemptedCount);
    const isExhausted = attemptedCount >= FREE_TIER_QUESTION_LIMIT;
    const remainingQuestions = questions.filter(
      (q) => !attemptedQuestionIds.includes(String(q.id)),
    );

    return NextResponse.json({
      hasFullAccess: false,
      limit: FREE_TIER_QUESTION_LIMIT,
      attemptedCount,
      remaining,
      isExhausted,
      attemptedQuestionIds,
      questions,
      remainingQuestions,
      requiresAuth: !user,
    });
  } catch (err) {
    console.error("[free-tier]", err);
    return NextResponse.json(
      { error: "Failed to load free tier status" },
      { status: 500 },
    );
  }
}
