import { NextRequest, NextResponse } from "next/server";
import { getUploadSupabase } from "@/lib/supabaseService";
import { normalizeWalkthroughCode } from "@/lib/walkthroughMedia";
import { stripHtml } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PREVIEW_MAX = 280;

/**
 * POST /api/upload-walkthrough/preview
 * Body: { code: string }
 * Returns a short plain-text stem preview so iPad can confirm the correct question.
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

    const supabase = getUploadSupabase();
    const { data: row, error: qErr } = await supabase
      .from("ai_generated_questions")
      .select("id, question_stem, primary_tag, subjects, schema_id, difficulty")
      .eq("media_upload_code", code)
      .maybeSingle();

    if (qErr) {
      console.error("[upload-walkthrough/preview] lookup", qErr);
      return NextResponse.json({ error: qErr.message }, { status: 500 });
    }
    if (!row?.id) {
      return NextResponse.json(
        { error: "No question matches this code." },
        { status: 404 }
      );
    }

    const plain = stripHtml(String(row.question_stem || "")).replace(/\s+/g, " ").trim();
    const stemPreview =
      plain.length > PREVIEW_MAX
        ? `${plain.slice(0, PREVIEW_MAX - 1)}…`
        : plain;

    return NextResponse.json({
      questionId: row.id,
      stemPreview,
      primary_tag: row.primary_tag ?? null,
      subjects: row.subjects ?? null,
      schema_id: row.schema_id ?? null,
      difficulty: row.difficulty ?? null,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[upload-walkthrough/preview]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
