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

    // Get current user (optional - allow anonymous reviews)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Parse request body
    const body = await request.json();
    const { status, review_notes } = body;

    // Validate status
    const validStatuses = ["pending_review", "approved", "rejected", "needs_revision"];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be one of: " + validStatuses.join(", ") },
        { status: 400 }
      );
    }

    // Update question status
    const updateData: AiGeneratedQuestionUpdate = {
      status,
      reviewed_at: new Date().toISOString(),
      ...(user && { reviewed_by: user.id }),
      ...(review_notes !== undefined && { review_notes }),
    };

    // First, check if the question exists
    const { data: existingQuestion, error: checkError } = await supabase
      .from("ai_generated_questions")
      // @ts-ignore - Supabase type inference issue with table name
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking question existence:", checkError);
      return NextResponse.json(
        { error: `Failed to check question: ${checkError.message || checkError.code || 'Unknown error'}` },
        { status: 500 }
      );
    }

    if (!existingQuestion) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      );
    }

    // Perform the update
    const { error: updateError } = await supabase
      .from("ai_generated_questions")
      // @ts-ignore - Supabase type inference issue with table name
      .update(updateData)
      .eq("id", id);

    if (updateError) {
      console.error("Error updating question status:", updateError);
      return NextResponse.json(
        { error: `Failed to update question status: ${updateError.message || updateError.code || 'Unknown error'}` },
        { status: 500 }
      );
    }

    // Fetch the updated question
    const { data: updatedQuestion, error: fetchError } = await supabase
      .from("ai_generated_questions")
      // @ts-ignore - Supabase type inference issue with table name
      .select()
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching updated question:", fetchError);
      return NextResponse.json(
        { error: `Failed to fetch updated question: ${fetchError.message || fetchError.code || 'Unknown error'}` },
        { status: 500 }
      );
    }

    if (!updatedQuestion) {
      return NextResponse.json(
        { error: "Question was updated but could not be retrieved" },
        { status: 500 }
      );
    }

    return NextResponse.json({ question: updatedQuestion });
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

