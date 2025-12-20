import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { AiGeneratedQuestionUpdate } from "@/lib/supabase/types";

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();
    const { id } = params;

    // Parse request body
    const body = await request.json();
    const { primary_tag, secondary_tags, tags_confidence } = body;

    // Build update object
    const updateData: AiGeneratedQuestionUpdate = {
      ...(primary_tag !== undefined && { primary_tag }),
      ...(secondary_tags !== undefined && { secondary_tags }),
      ...(tags_confidence !== undefined && { tags_confidence }),
      tags_labeled_at: new Date().toISOString(),
      tags_labeled_by: "manual_edit",
    };

    // Remove undefined values
    const cleanUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([_, v]) => v !== undefined)
    );

    const { data, error } = await supabase
      .from("ai_generated_questions")
      // @ts-ignore - Supabase type inference issue with table name
      .update(cleanUpdateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating question tags:", error);
      return NextResponse.json(
        { error: `Failed to update question tags: ${error.message || error.code || 'Unknown error'}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ question: data });
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}



