import { NextRequest, NextResponse } from "next/server";
import { getReviewSupabase, QUESTION_MEDIA_BUCKET } from "@/lib/supabaseService";

export const dynamic = "force-dynamic";

const URL_TTL_SEC = 60 * 60; // 1 hour

/**
 * GET /api/review/walkthrough-play-url?questionId=uuid
 * Signed URL for private bucket playback in <video src="...">.
 */
export async function GET(request: NextRequest) {
  try {
    const questionId =
      request.nextUrl.searchParams.get("questionId")?.trim() || "";
    if (!questionId) {
      return NextResponse.json(
        { error: "questionId query parameter required" },
        { status: 400 }
      );
    }

    const supabase = getReviewSupabase();
    const { data: row, error: selErr } = await supabase
      .from("ai_generated_questions")
      .select("id, screen_video_storage_path")
      .eq("id", questionId)
      .maybeSingle();

    if (selErr) {
      console.error("[walkthrough-play-url] select", selErr);
      return NextResponse.json({ error: selErr.message }, { status: 500 });
    }
    if (!row) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    const path = row.screen_video_storage_path?.trim();
    if (!path) {
      return NextResponse.json(
        { error: "No walkthrough video for this question" },
        { status: 404 }
      );
    }

    const { data: signed, error: signErr } = await supabase.storage
      .from(QUESTION_MEDIA_BUCKET)
      .createSignedUrl(path, URL_TTL_SEC);

    if (signErr || !signed?.signedUrl) {
      console.error("[walkthrough-play-url] sign", signErr);
      return NextResponse.json(
        {
          error:
            signErr?.message ||
            "Could not sign video URL (bucket / path / storage policies)",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: signed.signedUrl,
      expiresIn: URL_TTL_SEC,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[walkthrough-play-url]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
