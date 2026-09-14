import { NextRequest, NextResponse } from "next/server";
import { requireTesterAdmin } from "@/lib/tester/admin";
import type { Question } from "@/types/papers";

export const dynamic = "force-dynamic";

function mapQuestionRow(row: Record<string, unknown>): Question {
  return {
    id: Number(row.id),
    paperId: Number(row.paper_id),
    examName: row.exam_name as Question["examName"],
    examYear: Number(row.exam_year),
    paperName: (row.paper_name as string) ?? "",
    partLetter: (row.part_letter as string) ?? "",
    partName: (row.part_name as string) ?? "",
    examType: (row.exam_type as string) ?? "",
    questionNumber: Number(row.question_number),
    questionImage: (row.question_image as string) ?? "",
    questionStem: (row.question_stem as string) ?? undefined,
    options: (row.options as Question["options"]) ?? undefined,
    diagramAssets: (row.diagram_assets as Question["diagramAssets"]) ?? undefined,
    contentFormat: (row.content_format as Question["contentFormat"]) ?? "image",
    solutionImage: (row.solution_image as string) ?? undefined,
    solutionText: (row.solution_text as string) ?? undefined,
    solutionType: (row.solution_type as Question["solutionType"]) ?? "none",
    answerLetter: (row.answer_letter as string) ?? "",
    createdAt: (row.created_at as string) ?? "",
    updatedAt: (row.updated_at as string) ?? "",
  };
}

/**
 * GET /api/admin/past-papers/questions/[id]
 * Load a full past-paper question for admin preview.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const admin = await requireTesterAdmin(_request);
  if (!admin.ok || !admin.service) {
    return NextResponse.json(
      { error: admin.error ?? "Unauthorized" },
      { status: admin.status ?? 401 },
    );
  }

  const rawId = params.id?.trim();
  const questionId = Number(rawId);
  if (!rawId || !Number.isFinite(questionId)) {
    return NextResponse.json({ error: "Missing question id" }, { status: 400 });
  }

  const { data, error } = await admin.service
    .from("questions")
    .select("*")
    .eq("id", questionId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  return NextResponse.json({
    question: mapQuestionRow(data as Record<string, unknown>),
  });
}
