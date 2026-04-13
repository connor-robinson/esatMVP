import { NextRequest, NextResponse } from "next/server";
import { getUploadSupabase } from "@/lib/supabaseService";

export const dynamic = "force-dynamic";

function parseQuestionIdFromPath(path: string): string | null {
  const i = path.indexOf("/");
  if (i <= 0 || i < 36) return null;
  const id = path.slice(0, i);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return null;
  }
  return id;
}

/**
 * POST /api/upload-walkthrough/complete
 * Body: { path: string } — storage path returned from prepare (after client upload succeeds).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const path =
      typeof body?.path === "string" ? body.path.trim() : "";
    const questionId = parseQuestionIdFromPath(path);
    if (!questionId) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const supabase = getUploadSupabase();
    const { data: row, error: selErr } = await supabase
      .from("ai_generated_questions")
      .select("id")
      .eq("id", questionId)
      .maybeSingle();

    if (selErr) {
      return NextResponse.json({ error: selErr.message }, { status: 500 });
    }
    if (!row) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    const { error: upErr } = await supabase
      .from("ai_generated_questions")
      .update({
        screen_video_storage_path: path,
        media_status: "screen_only",
        /** So review UI `updated_at` comparison and queues see the row as changed. */
        updated_at: new Date().toISOString(),
      })
      .eq("id", questionId);

    if (upErr) {
      console.error("[upload-walkthrough/complete] update", upErr);
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, path });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[upload-walkthrough/complete]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
