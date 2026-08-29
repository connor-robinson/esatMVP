import "server-only";

import { createClient } from "@supabase/supabase-js";
import {
  getEsatCampMockQuestions,
  isEsatCampMockPaperId,
} from "@/lib/papers/esatCampMocks";
import type { Question } from "@/types/papers";

function mapQuestionRow(row: Record<string, unknown>): Question {
  return {
    id: row.id as number,
    paperId: row.paper_id as number,
    examName: row.exam_name as Question["examName"],
    examYear: row.exam_year as number,
    paperName: row.paper_name as string,
    partLetter: (row.part_letter as string) ?? "",
    partName: (row.part_name as string) ?? "",
    examType: row.exam_type as string,
    questionNumber: row.question_number as number,
    questionImage: row.question_image as string,
    questionStem: (row.question_stem as string) ?? undefined,
    options: (row.options as Question["options"]) ?? undefined,
    diagramAssets: (row.diagram_assets as Question["diagramAssets"]) ?? undefined,
    contentFormat: (row.content_format as Question["contentFormat"]) ?? "image",
    solutionImage: (row.solution_image as string) ?? undefined,
    solutionText: (row.solution_text as string) ?? undefined,
    solutionType: row.solution_type as Question["solutionType"],
    answerLetter: row.answer_letter as string,
    createdAt: (row.created_at as string) ?? "",
    updatedAt: (row.updated_at as string) ?? "",
  };
}

/**
 * Load full past-paper question rows for server routes (service role, no RLS gaps).
 */
export async function getPastPaperQuestions(paperId: number): Promise<Question[]> {
  if (isEsatCampMockPaperId(paperId)) {
    return getEsatCampMockQuestions(paperId);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing Supabase env for past-paper question load");
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from("questions")
    .select("*")
    .eq("paper_id", paperId)
    .order("question_number");

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapQuestionRow(row as Record<string, unknown>));
}
