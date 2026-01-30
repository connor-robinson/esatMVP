import { NextResponse } from "next/server";
import { requireRouteUser, getOptionalSession } from "@/lib/supabase/auth";
import { createRouteClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SessionPayload = {
  id: string;
  paperId?: number | null;
  paperName: string;
  paperVariant: string;
  sessionName: string;
  questionRange: { start: number; end: number };
  selectedSections?: string[];
  selectedPartIds?: string[]; // Part IDs for granular tracking
  questionOrder?: number[];
  timeLimitMinutes: number;
  startedAt: number;
  endedAt?: number | null;
  deadlineAt?: number | null;
  perQuestionSec: number[];
  answers: any[];
  correctFlags: (boolean | null)[];
  guessedFlags: boolean[];
  mistakeTags: string[];
  notes?: string;
  score?: { correct: number; total: number } | null;
  predictedScore?: number | null;
  sectionPercentiles?: Record<string, { percentile: number | null; score: number | null; table: string | null; label: string }> | null;
  pinnedInsights?: any;
};

function toIso(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value)
    ? new Date(value).toISOString()
    : null;
}

export async function POST(request: Request) {
  const session = await getOptionalSession();
  if (!session?.user) {
    return NextResponse.json(
      { error: "Authentication required", code: "AUTH_REQUIRED" },
      { status: 401 }
    );
  }

  const supabase = createRouteClient();

  let payload: SessionPayload;
  try {
    payload = (await request.json()) as SessionPayload;
  } catch (parseError) {
    console.error("[papers:POST] Failed to parse request body", parseError);
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  console.log("[papers:POST] Creating session", {
    sessionId: payload?.id,
    paperName: payload?.paperName,
    paperVariant: payload?.paperVariant,
    sessionName: payload?.sessionName,
    userId: session.user.id,
    questionRange: payload?.questionRange,
    selectedSections: payload?.selectedSections,
    selectedPartIds: payload?.selectedPartIds,
    arraysLength: {
      perQuestionSec: payload?.perQuestionSec?.length,
      answers: payload?.answers?.length,
      correctFlags: payload?.correctFlags?.length,
      guessedFlags: payload?.guessedFlags?.length,
      mistakeTags: payload?.mistakeTags?.length
    }
  });

  if (!payload?.id || !payload.paperName || !payload.sessionName) {
    console.error("[papers:POST] Missing required fields", {
      hasId: !!payload?.id,
      hasPaperName: !!payload?.paperName,
      hasSessionName: !!payload?.sessionName,
      payload: payload
    });
    return NextResponse.json({ error: "Missing required fields", details: "id, paperName, and sessionName are required" }, { status: 400 });
  }

  try {
    const { data, error } = await (supabase as any)
      .from("paper_sessions")
      .insert({
        id: payload.id,
        user_id: session.user.id,
        paper_id: payload.paperId ?? null,
        paper_name: payload.paperName,
        paper_variant: payload.paperVariant,
        session_name: payload.sessionName,
        question_start: payload.questionRange?.start ?? null,
        question_end: payload.questionRange?.end ?? null,
        selected_sections: payload.selectedSections ?? [],
        selected_part_ids: payload.selectedPartIds ?? [],
        question_order: payload.questionOrder ?? [],
        time_limit_minutes: payload.timeLimitMinutes,
        started_at: toIso(payload.startedAt),
        ended_at: toIso(payload.endedAt),
        deadline_at: toIso(payload.deadlineAt),
        per_question_seconds: payload.perQuestionSec ?? [],
        answers: payload.answers ?? [],
        correct_flags: payload.correctFlags ?? [],
        guessed_flags: payload.guessedFlags ?? [],
        mistake_tags: payload.mistakeTags ?? [],
        notes: payload.notes ?? null,
        score: payload.score ?? null,
        predicted_score: payload.predictedScore ?? null,
        section_percentiles: payload.sectionPercentiles ?? null,
        pinned_insights: payload.pinnedInsights ?? null,
      })
      .select("*")
      .single();

    if (error) {
      console.error("[papers:POST] failed creating session", {
        error,
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details,
        errorHint: error.hint,
        sessionId: payload.id,
        userId: session.user.id,
        paperName: payload.paperName,
        payloadKeys: Object.keys(payload),
        payloadSizes: {
          answers: payload.answers?.length,
          correctFlags: payload.correctFlags?.length,
          guessedFlags: payload.guessedFlags?.length,
          mistakeTags: payload.mistakeTags?.length,
          perQuestionSec: payload.perQuestionSec?.length,
        }
      });
      return NextResponse.json({ 
        error: "Failed to create session", 
        details: error.message,
        code: error.code,
        hint: error.hint,
        // Include more debugging info in development
        ...(process.env.NODE_ENV === 'development' && {
          errorDetails: error.details,
          errorFull: JSON.stringify(error, null, 2)
        })
      }, { status: 500 });
    }

    console.log("[papers:POST] Session created successfully", {
      sessionId: payload.id,
      createdSession: data ? {
        id: data.id,
        paper_name: data.paper_name,
        started_at: data.started_at
      } : null
    });

    return NextResponse.json({ session: data });
  } catch (insertError: any) {
    console.error("[papers:POST] Exception during session creation", {
      error: insertError,
      errorMessage: insertError?.message,
      errorStack: insertError?.stack,
      errorName: insertError?.name,
      sessionId: payload.id,
      userId: session.user.id,
      paperName: payload.paperName
    });
    return NextResponse.json({ 
      error: "Failed to create session", 
      details: insertError?.message || "Unknown error",
      // Include more debugging info in development
      ...(process.env.NODE_ENV === 'development' && {
        errorName: insertError?.name,
        errorStack: insertError?.stack
      })
    }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getOptionalSession();
  if (!session?.user) {
    return NextResponse.json(
      { error: "Authentication required", code: "AUTH_REQUIRED" },
      { status: 401 }
    );
  }

  const supabase = createRouteClient();

  const payload = (await request.json()) as SessionPayload;
  if (!payload?.id) {
    return NextResponse.json({ error: "Missing session id" }, { status: 400 });
  }

  console.log("[papers:PATCH] Updating session", {
    sessionId: payload.id,
    paperName: payload.paperName,
    paperVariant: payload.paperVariant,
    endedAt: payload.endedAt,
    endedAtIso: toIso(payload.endedAt),
    selectedSections: payload.selectedSections,
    selectedPartIds: payload.selectedPartIds,
    score: payload.score
  });

  const { data, error } = await (supabase as any)
    .from("paper_sessions")
    .update({
      paper_id: payload.paperId ?? null,
      paper_name: payload.paperName,
      paper_variant: payload.paperVariant,
      session_name: payload.sessionName,
      question_start: payload.questionRange?.start ?? null,
      question_end: payload.questionRange?.end ?? null,
      selected_sections: payload.selectedSections ?? [],
      selected_part_ids: payload.selectedPartIds ?? [],
      question_order: payload.questionOrder ?? [],
      time_limit_minutes: payload.timeLimitMinutes,
      started_at: toIso(payload.startedAt),
      ended_at: toIso(payload.endedAt),
      deadline_at: toIso(payload.deadlineAt),
      per_question_seconds: payload.perQuestionSec ?? [],
      answers: payload.answers ?? [],
      correct_flags: payload.correctFlags ?? [],
      guessed_flags: payload.guessedFlags ?? [],
      mistake_tags: payload.mistakeTags ?? [],
      notes: payload.notes ?? null,
      score: payload.score ?? null,
      predicted_score: payload.predictedScore ?? null,
      section_percentiles: payload.sectionPercentiles ?? null,
      pinned_insights: payload.pinnedInsights ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payload.id)
    .eq("user_id", session.user.id)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[papers:PATCH] failed updating session", {
      error,
      errorCode: error.code,
      errorMessage: error.message,
      errorDetails: error.details,
      sessionId: payload.id,
      userId: session.user.id
    });
    return NextResponse.json({ error: "Failed to update session", details: error.message }, { status: 500 });
  }

  console.log("[papers:PATCH] Session updated successfully", {
    sessionId: payload.id,
    updatedSession: data ? {
      id: data.id,
      paper_name: data.paper_name,
      ended_at: data.ended_at,
      updated_at: data.updated_at
    } : null
  });

  return NextResponse.json({ session: data ?? null });
}

export async function GET(request: Request) {
  const session = await getOptionalSession();
  if (!session?.user) {
    return NextResponse.json(
      { error: "Authentication required", code: "AUTH_REQUIRED" },
      { status: 401 }
    );
  }

  const supabase = createRouteClient();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    const { data, error } = await (supabase as any)
      .from("paper_sessions")
      .select("*")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (error) {
      console.error("[papers] failed retrieving session", error);
      return NextResponse.json({ error: "Failed to load session" }, { status: 500 });
    }

    return NextResponse.json({ session: data ?? null });
  }

  console.log("[papers:GET] Fetching all sessions for user", {
    userId: session.user.id
  });

  const { data, error } = await (supabase as any)
    .from("paper_sessions")
    .select("*")
    .eq("user_id", session.user.id)
    .order("started_at", { ascending: false });

  if (error) {
    console.error("[papers:GET] failed listing sessions", {
      error,
      errorCode: error.code,
      errorMessage: error.message,
      userId: session.user.id
    });
    return NextResponse.json({ error: "Failed to load sessions" }, { status: 500 });
  }

  console.log("[papers:GET] Fetched sessions", {
    count: data?.length || 0,
    sample: data?.slice(0, 3).map((s: any) => ({
      id: s.id,
      paper_name: s.paper_name,
      paper_variant: s.paper_variant,
      ended_at: s.ended_at,
      started_at: s.started_at
    }))
  });

  return NextResponse.json({ sessions: data });
}

export async function DELETE(request: Request) {
  const session = await getOptionalSession();
  if (!session?.user) {
    return NextResponse.json(
      { error: "Authentication required", code: "AUTH_REQUIRED" },
      { status: 401 }
    );
  }

  const supabase = createRouteClient();

  // Delete all sessions for this user
  const { error } = await (supabase as any)
    .from("paper_sessions")
    .delete()
    .eq("user_id", session.user.id);

  if (error) {
    console.error("[papers] failed deleting all sessions", error);
    return NextResponse.json({ error: "Failed to delete sessions" }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: "All sessions deleted" });
}

