import { NextRequest, NextResponse } from "next/server";
import { getUploadSupabase, QUESTION_MEDIA_BUCKET } from "@/lib/supabaseService";
import { extensionFromFilename, normalizeWalkthroughCode } from "@/lib/walkthroughMedia";

export const dynamic = "force-dynamic";

/**
 * POST /api/upload-walkthrough/prepare
 * Body: { code: string, filename?: string }
 * Returns { path, token } for client upload via Supabase uploadToSignedUrl (bypasses Vercel body limits).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const code = normalizeWalkthroughCode(body?.code);
    if (!code) {
      return NextResponse.json(
        { error: "Invalid code. Use 2 letters + 2 digits (e.g. AB12)." },
        { status: 400 }
      );
    }

    const filename =
      typeof body?.filename === "string" && body.filename ? body.filename : "video.mp4";
    const ext = extensionFromFilename(filename);

    const supabase = getUploadSupabase();
    const { data: q, error: qErr } = await supabase
      .from("ai_generated_questions")
      .select("id")
      .eq("media_upload_code", code)
      .maybeSingle();

    if (qErr) {
      console.error("[upload-walkthrough/prepare] lookup", qErr);
      return NextResponse.json({ error: qErr.message }, { status: 500 });
    }
    if (!q?.id) {
      return NextResponse.json(
        { error: "No question matches this code. Check the code on the review page." },
        { status: 404 }
      );
    }

    const path = `${q.id}/screen_${Date.now()}${ext}`;
    const { data: signed, error: signErr } = await supabase.storage
      .from(QUESTION_MEDIA_BUCKET)
      .createSignedUploadUrl(path, { upsert: true });

    if (signErr || !signed) {
      console.error("[upload-walkthrough/prepare] sign", signErr);
      return NextResponse.json(
        {
          error:
            signErr?.message ||
            "Could not create upload URL. Is bucket 'question-media' created?",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      path: signed.path,
      token: signed.token,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[upload-walkthrough/prepare]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
