import { NextRequest, NextResponse } from "next/server";
import { getReviewSupabase } from "@/lib/supabaseService";
import { normalizeReviewQuestion } from "@/lib/utils";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
} as const;

/**
 * PATCH /api/review/[id]/resolve-auto-diagram
 * Atomically resolves the temporary auto-diagram compare state:
 * - keep_diagram: keep current question_stem, clear backup snapshot
 * - revert: restore question_stem from backup snapshot, then clear backup
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const supabase = getReviewSupabase();
    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;
    const body = (await request.json().catch(() => ({}))) as { choice?: string };
    const choice = String(body.choice || "").trim();

    if (choice !== "keep_diagram" && choice !== "revert") {
      return NextResponse.json(
        { error: "Invalid choice", details: "Must be 'keep_diagram' or 'revert'." },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const { data: existing, error: existingErr } = await supabase
      .from("ai_generated_questions")
      .select("id, question_stem, question_stem_before_auto_diagram")
      .eq("id", id)
      .maybeSingle();

    if (existingErr) {
      return NextResponse.json(
        { error: "Failed to load question", details: existingErr.message, code: existingErr.code },
        { status: 500, headers: NO_STORE_HEADERS }
      );
    }
    if (!existing) {
      return NextResponse.json(
        { error: "Question not found", details: `No question for id ${id}` },
        { status: 404, headers: NO_STORE_HEADERS }
      );
    }

    const backup =
      typeof existing.question_stem_before_auto_diagram === "string"
        ? existing.question_stem_before_auto_diagram
        : "";

    const updates: Record<string, unknown> = {
      question_stem_before_auto_diagram: null,
      updated_at: new Date().toISOString(),
    };

    if (choice === "revert") {
      if (!backup.trim()) {
        return NextResponse.json(
          { error: "No backup stem available to revert." },
          { status: 400, headers: NO_STORE_HEADERS }
        );
      }
      updates.question_stem = backup;
    }

    const { data: updatedRows, error: updateErr } = await supabase
      .from("ai_generated_questions")
      .update(updates)
      .eq("id", id)
      .select("*")
      .limit(1);

    if (updateErr) {
      return NextResponse.json(
        { error: "Failed to resolve auto diagram choice", details: updateErr.message, code: updateErr.code },
        { status: 500, headers: NO_STORE_HEADERS }
      );
    }

    const updated = Array.isArray(updatedRows) ? updatedRows[0] : null;
    if (!updated) {
      return NextResponse.json(
        { error: "Update returned no row" },
        { status: 500, headers: NO_STORE_HEADERS }
      );
    }

    return NextResponse.json(
      { question: normalizeReviewQuestion(updated) },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error", details: error?.message || "Unknown error" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

