import { NextRequest, NextResponse } from "next/server";
import { getReviewSupabase } from "@/lib/supabaseService";
import { normalizeReviewQuestion } from "@/lib/utils";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
} as const;

/**
 * Diagram regeneration queue endpoint.
 *
 * The review app does NOT run Imagen / Gemini Vision inline -- those live in
 * the Python pipeline (``question-generation/esat_question_generator``).
 *
 * - ``POST /api/review/[id]/regenerate-diagram`` enqueues a regen job by
 *   writing ``diagram_regen_status='queued'`` + the reviewer's optional note
 *   on the row. The worker
 *   (``diagram_regen_worker.py``) polls Supabase, runs Vision analysis +
 *   Imagen + upload, then writes the new stem and sets ``done``.
 *
 * - ``GET /api/review/[id]/regenerate-diagram`` returns the regen status
 *   columns so the UI can poll while the job is pending.
 */

function resolveId(params: Promise<{ id: string }> | { id: string }): Promise<string> {
  return Promise.resolve(params).then((p) => p.id);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const id = await resolveId(params);
    const supabase = getReviewSupabase();
    const body = (await request.json().catch(() => ({}))) as {
      userNote?: unknown;
      reset?: unknown;
    };

    const userNote =
      typeof body.userNote === "string" ? body.userNote.trim().slice(0, 4000) : "";
    const reset = body.reset === true;

    const { data: existing, error: loadErr } = await supabase
      .from("ai_generated_questions")
      .select(
        "id, question_stem, has_visual, visual_type, diagram_regen_status, diagram_regen_attempts"
      )
      .eq("id", id)
      .maybeSingle();

    if (loadErr) {
      return NextResponse.json(
        { error: "Failed to load question", details: loadErr.message },
        { status: 500, headers: NO_STORE_HEADERS }
      );
    }
    if (!existing) {
      return NextResponse.json(
        { error: "Question not found", details: `No question for id ${id}` },
        { status: 404, headers: NO_STORE_HEADERS }
      );
    }

    const stem = String((existing as { question_stem?: string }).question_stem || "");
    const looksLikeItHasDiagram =
      existing.has_visual === true ||
      stem.includes("<figure class=\"qg-diagram\"") ||
      stem.includes("<svg") ||
      stem.includes("<img");

    if (!looksLikeItHasDiagram) {
      return NextResponse.json(
        {
          error: "No diagram to regenerate",
          details:
            "This question has no diagram in its stem and is not flagged with has_visual=true. Nothing for the worker to replace.",
        },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const currentStatus = existing.diagram_regen_status as string | null;
    if (!reset && (currentStatus === "queued" || currentStatus === "in_progress")) {
      const { data: row } = await supabase
        .from("ai_generated_questions")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      return NextResponse.json(
        {
          question: row ? normalizeReviewQuestion(row) : null,
          info: "A regen job is already pending for this row.",
        },
        { status: 200, headers: NO_STORE_HEADERS }
      );
    }

    const nowIso = new Date().toISOString();
    const updates: Record<string, unknown> = {
      diagram_regen_status: "queued",
      diagram_regen_user_note: userNote || null,
      /** Worker rewrites these; clear stale text so the UI does not show last run's output. */
      diagram_regen_reason: null,
      diagram_regen_new_prompt: null,
      diagram_regen_last_error: null,
      diagram_regen_requested_at: nowIso,
      diagram_regen_completed_at: null,
      updated_at: nowIso,
    };

    const { data: updatedRows, error: updateErr } = await supabase
      .from("ai_generated_questions")
      .update(updates)
      .eq("id", id)
      .select();

    if (updateErr) {
      return NextResponse.json(
        { error: "Failed to enqueue regen", details: updateErr.message, code: updateErr.code },
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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const id = await resolveId(params);
    const supabase = getReviewSupabase();
    const { data, error } = await supabase
      .from("ai_generated_questions")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      return NextResponse.json(
        { error: "Failed to load question", details: error.message },
        { status: 500, headers: NO_STORE_HEADERS }
      );
    }
    if (!data) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404, headers: NO_STORE_HEADERS }
      );
    }
    return NextResponse.json(
      { question: normalizeReviewQuestion(data) },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error", details: error?.message || "Unknown error" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
