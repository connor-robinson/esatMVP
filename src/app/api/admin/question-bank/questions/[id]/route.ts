import { NextRequest, NextResponse } from "next/server";
import { requireTesterAdmin } from "@/lib/tester/admin";
import { normalizeMathSpacing } from "@/lib/utils/mathSpacing";
import { normalizeQuestionBankRow } from "@/lib/admin/reportedQuestions";

export const dynamic = "force-dynamic";

const ALLOWED_FIELDS = [
  "question_stem",
  "options",
  "correct_option",
  "solution_reasoning",
  "solution_key_insight",
  "distractor_map",
  "difficulty",
  "status",
  "primary_tag",
  "secondary_tags",
] as const;

/**
 * PATCH /api/admin/question-bank/questions/[id]
 * Service-role update for reported-question review (approve / delete / edit).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const admin = await requireTesterAdmin(request);
  if (!admin.ok || !admin.service) {
    return NextResponse.json(
      { error: admin.error ?? "Unauthorized" },
      { status: admin.status ?? 401 },
    );
  }

  const questionId = params.id?.trim();
  if (!questionId) {
    return NextResponse.json({ error: "Missing question id" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  for (const key of ALLOWED_FIELDS) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  if (updates.status !== undefined) {
    const status = String(updates.status);
    if (!["pending", "approved", "deleted"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Use pending, approved, or deleted." },
        { status: 400 },
      );
    }
  }

  if (typeof updates.question_stem === "string") {
    updates.question_stem = normalizeMathSpacing(updates.question_stem);
  }
  if (updates.options && typeof updates.options === "object") {
    const next: Record<string, string> = {};
    for (const [k, v] of Object.entries(
      updates.options as Record<string, unknown>,
    )) {
      next[k] = typeof v === "string" ? normalizeMathSpacing(v) : String(v ?? "");
    }
    updates.options = next;
  }
  if (typeof updates.solution_reasoning === "string") {
    updates.solution_reasoning = normalizeMathSpacing(updates.solution_reasoning);
  }
  if (typeof updates.solution_key_insight === "string") {
    updates.solution_key_insight = normalizeMathSpacing(
      updates.solution_key_insight,
    );
  }

  const { data, error } = await admin.service
    .from("ai_generated_questions")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", questionId)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  return NextResponse.json({
    question: normalizeQuestionBankRow(data as Record<string, unknown>),
  });
}
