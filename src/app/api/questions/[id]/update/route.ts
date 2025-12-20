import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { AiGeneratedQuestionUpdate } from "@/lib/supabase/types";
import { normalizeMathSpacing } from "@/lib/utils/mathSpacing";

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();
    const { id } = params;
    const body = await request.json();

    // Extract updatable fields
    const updates: AiGeneratedQuestionUpdate = {};
    
    if (body.question_stem !== undefined) {
      updates.question_stem = body.question_stem;
    }
    if (body.options !== undefined) {
      updates.options = body.options;
    }
    if (body.correct_option !== undefined) {
      updates.correct_option = body.correct_option;
    }
    if (body.solution_reasoning !== undefined) {
      updates.solution_reasoning = body.solution_reasoning;
    }
    if (body.solution_key_insight !== undefined) {
      updates.solution_key_insight = body.solution_key_insight;
    }
    if (body.distractor_map !== undefined) {
      updates.distractor_map = body.distractor_map;
    }
    
    // Normalize math spacing in all text fields
    if (updates.question_stem && typeof updates.question_stem === 'string') {
      updates.question_stem = normalizeMathSpacing(updates.question_stem) as any;
    }
    if (updates.options && typeof updates.options === 'object' && updates.options !== null) {
      const normalizedOptions: Record<string, string> = {};
      for (const [key, value] of Object.entries(updates.options as Record<string, any>)) {
        if (typeof value === 'string') {
          normalizedOptions[key] = normalizeMathSpacing(value);
        } else {
          normalizedOptions[key] = value as string;
        }
      }
      updates.options = normalizedOptions as any;
    }
    if (updates.solution_reasoning && typeof updates.solution_reasoning === 'string') {
      updates.solution_reasoning = normalizeMathSpacing(updates.solution_reasoning) as any;
    }
    if (updates.solution_key_insight && typeof updates.solution_key_insight === 'string') {
      updates.solution_key_insight = normalizeMathSpacing(updates.solution_key_insight) as any;
    }
    if (updates.distractor_map && typeof updates.distractor_map === 'object' && updates.distractor_map !== null) {
      const normalizedDistractorMap: Record<string, string> = {};
      for (const [key, value] of Object.entries(updates.distractor_map as Record<string, any>)) {
        if (typeof value === 'string') {
          normalizedDistractorMap[key] = normalizeMathSpacing(value);
        } else {
          normalizedDistractorMap[key] = value as string;
        }
      }
      updates.distractor_map = normalizedDistractorMap as any;
    }

    const { data, error } = await supabase
      .from("ai_generated_questions")
      // @ts-ignore - Supabase type inference issue with table name
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating question:", error);
      return NextResponse.json(
        { error: "Failed to update question" },
        { status: 500 }
      );
    }

    return NextResponse.json({ question: data });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

