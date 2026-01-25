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

  const payload = (await request.json()) as SessionPayload;
  if (!payload?.id || !payload.paperName || !payload.sessionName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

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
      pinned_insights: payload.pinnedInsights ?? null,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[papers] failed creating session", error);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }

  return NextResponse.json({ session: data });
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
      pinned_insights: payload.pinnedInsights ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payload.id)
    .eq("user_id", session.user.id)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[papers] failed updating session", error);
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 });
  }

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

  const { data, error } = await (supabase as any)
    .from("paper_sessions")
    .select("*")
    .eq("user_id", session.user.id)
    .order("started_at", { ascending: false });

  if (error) {
    console.error("[papers] failed listing sessions", error);
    return NextResponse.json({ error: "Failed to load sessions" }, { status: 500 });
  }

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

