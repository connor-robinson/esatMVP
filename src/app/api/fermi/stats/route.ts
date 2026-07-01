import { NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/supabase/auth";
import {
  buildNormalCurve,
  computePercentile,
  meanAndStd,
} from "@/lib/fermi/percentile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FermiSessionRow = {
  id: string;
  puzzle_number: number;
  played_date: string;
  average_score: number;
  question_count: number;
  created_at: string;
};

type FermiSessionSummary = {
  id: string;
  puzzleNumber: number;
  playedDate: string;
  averageScore: number;
  questionCount: number;
  createdAt: string;
};

export async function GET(request: Request) {
  const { user, supabase, error } = await requireRouteUser(request);
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const focusDate = searchParams.get("date");

  const { data: mySessions, error: myError } = await (supabase as any)
    .from("fermi_daily_sessions")
    .select("id, puzzle_number, played_date, average_score, question_count, created_at")
    .eq("user_id", user.id)
    .order("played_date", { ascending: true });

  if (myError) {
    console.error("[fermi/stats] my sessions failed", myError);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }

  const sessions: FermiSessionSummary[] = ((mySessions ?? []) as FermiSessionRow[]).map(
    (row) => ({
      id: row.id,
      puzzleNumber: row.puzzle_number,
      playedDate: row.played_date,
      averageScore: row.average_score,
      questionCount: row.question_count,
      createdAt: row.created_at,
    }),
  );

  const latestSession = sessions.length > 0 ? sessions[sessions.length - 1] : null;
  const targetDate =
    focusDate ?? latestSession?.playedDate ?? new Date().toISOString().slice(0, 10);

  const { data: dayRows, error: dayError } = await (supabase as any)
    .from("fermi_daily_sessions")
    .select("average_score, puzzle_number, played_date, user_id")
    .eq("played_date", targetDate);

  if (dayError) {
    console.error("[fermi/stats] day scores failed", dayError);
    return NextResponse.json({ error: "Failed to load distribution" }, { status: 500 });
  }

  const dayScores = (dayRows ?? []).map((r: any) => r.average_score as number);
  const myDaySession = sessions.find((s) => s.playedDate === targetDate);
  const myScore = myDaySession?.averageScore ?? null;
  const percentile =
    myScore != null ? computePercentile(myScore, dayScores) : null;

  const { mean, std } = meanAndStd(dayScores.length > 0 ? dayScores : [50]);
  const distribution = buildNormalCurve(
    mean,
    std,
    myScore ?? undefined,
  );

  return NextResponse.json({
    sessions,
    focus: {
      playedDate: targetDate,
      puzzleNumber: (dayRows?.[0] as any)?.puzzle_number ?? myDaySession?.puzzleNumber ?? null,
      playerCount: dayScores.length,
      averageScore: myScore,
      percentile,
      populationMean: Math.round(mean * 10) / 10,
      distribution,
    },
  });
}
