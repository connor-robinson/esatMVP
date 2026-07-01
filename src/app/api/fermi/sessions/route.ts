import { NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/supabase/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GuessPayload = {
  questionId: string;
  guess: number;
  logError: number;
  closenessScore: number;
};

type SessionPayload = {
  puzzleNumber: number;
  playedDate: string;
  averageScore: number;
  results: GuessPayload[];
};

export async function POST(request: Request) {
  const { user, supabase, error } = await requireRouteUser(request);
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: SessionPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { puzzleNumber, playedDate, averageScore, results } = body;
  if (
    !playedDate ||
    !Number.isFinite(puzzleNumber) ||
    !Number.isFinite(averageScore) ||
    !Array.isArray(results) ||
    results.length === 0
  ) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data: sessionRow, error: sessionError } = await (supabase as any)
    .from("fermi_daily_sessions")
    .upsert(
      {
        user_id: user.id,
        puzzle_number: puzzleNumber,
        played_date: playedDate,
        average_score: Math.round(averageScore),
        question_count: results.length,
      },
      { onConflict: "user_id,played_date" },
    )
    .select("id")
    .single();

  if (sessionError || !sessionRow) {
    return NextResponse.json({ error: "Failed to save session" }, { status: 500 });
  }

  await (supabase as any)
    .from("fermi_guesses")
    .delete()
    .eq("session_id", sessionRow.id);

  const guessRows = results.map((r) => ({
    session_id: sessionRow.id,
    user_id: user.id,
    question_id: r.questionId,
    guess_value: r.guess,
    log_error: r.logError,
    closeness_score: r.closenessScore,
  }));

  const { error: guessesError } = await (supabase as any)
    .from("fermi_guesses")
    .insert(guessRows);

  if (guessesError) {
    return NextResponse.json({ error: "Failed to save guesses" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, sessionId: sessionRow.id });
}
