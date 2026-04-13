import { NextRequest, NextResponse } from "next/server";
import { getUploadSupabase } from "@/lib/supabaseService";
import { ensureMediaUploadCode } from "@/lib/walkthroughMedia";

export const dynamic = "force-dynamic";

/**
 * POST /api/review/ensure-media-code
 * Body: { questionId: string }
 * Returns { media_upload_code } for display on the review UI (iPad uses this code on /uploader).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const questionId = typeof body?.questionId === "string" ? body.questionId.trim() : "";
    if (!questionId) {
      return NextResponse.json({ error: "questionId required" }, { status: 400 });
    }

    const supabase = getUploadSupabase();
    const code = await ensureMediaUploadCode(supabase, questionId);
    return NextResponse.json({ media_upload_code: code });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[ensure-media-code]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
