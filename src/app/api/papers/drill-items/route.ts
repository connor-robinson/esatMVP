import { NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/supabase/auth";

export const runtime = "nodejs";

type DrillItemPayload = {
  paperId?: number | null;
  paperName: string;
  questionNumber: number;
  correctChoice?: string | null;
  explanation?: string | null;
  originSessionId?: string | null;
  questionId?: number | null;
  lastWrongAt?: number | null;
  lastTimeSec?: number | null;
};

function toIso(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value)
    ? new Date(value).toISOString()
    : new Date().toISOString();
}

export async function POST(request: Request) {
  const { session, supabase } = await requireRouteUser(request);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { items?: DrillItemPayload[] };
  const items = body?.items ?? [];

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ ok: true });
  }

const rows = items.map((item) => ({
    user_id: session.user.id,
    paper_id: item.paperId ?? null,
    paper_name: item.paperName,
    question_number: item.questionNumber,
    correct_choice: item.correctChoice ?? null,
    explanation: item.explanation ?? "",
    origin_session_id: item.originSessionId ?? null,
    question_id: item.questionId ?? null,
    last_wrong_at: toIso(item.lastWrongAt),
    last_time_sec: item.lastTimeSec ?? null,
  }));

  const { error } = await (supabase as any)
    .from("drill_items")
    .upsert(rows, { onConflict: "user_id,paper_name,question_number" });

  if (error) {
    console.error("[drill] failed syncing drill items", error);
    return NextResponse.json({ error: "Failed to sync drill items" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

