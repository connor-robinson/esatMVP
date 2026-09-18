import { NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/supabase/auth";
import { userHasFullAccess } from "@/lib/subscription/serverAccess";
import type { PaperSessionRow } from "@/lib/supabase/types";
import {
  aggregateMistakePool,
  hydrateMistakeQuestions,
  normalizeMistakesPoolMode,
  selectMistakeItems,
  summarizeMistakePool,
  type MistakesExamFilter,
  type MistakesSubjectFilter,
  MISTAKES_SUBJECT_FILTERS,
} from "@/lib/papers/mistakes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_EXAMS: MistakesExamFilter[] = ["ALL", "ENGAA", "NSAA", "TMUA"];
const VALID_SUBJECTS = new Set<string>(MISTAKES_SUBJECT_FILTERS);

async function loadPool(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("paper_sessions")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .not("ended_at", "is", null)
    .order("ended_at", { ascending: false });

  if (error) {
    throw new Error("Failed to load sessions");
  }

  const rows = (Array.isArray(data) ? data : []) as PaperSessionRow[];
  const items = aggregateMistakePool(rows);
  return { items, summary: summarizeMistakePool(items) };
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
        paperId: item.paperId,
        paperName: item.paperName,
        paperVariant: item.paperVariant,
        examName: item.examName,
        questionNumber: item.questionNumber,
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
      exam?: MistakesExamFilter;
      subject?: MistakesSubjectFilter;
      questionCount?: number;
      timeLimitMinutes?: number;
    };

    const mode = normalizeMistakesPoolMode(body.mode);
    const exam = VALID_EXAMS.includes(body.exam as MistakesExamFilter)
      ? (body.exam as MistakesExamFilter)
      : "ALL";
    const subject = VALID_SUBJECTS.has(body.subject || "")
      ? (body.subject as MistakesSubjectFilter)
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
    const selected = selectMistakeItems(items, {
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

    const hydrated = await hydrateMistakeQuestions(supabase as any, selected);

    if (hydrated.length === 0) {
      return NextResponse.json(
        {
          error:
            "Could not load question content for your mistakes. Try sitting another paper.",
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
