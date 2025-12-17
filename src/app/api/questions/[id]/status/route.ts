import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { AiGeneratedQuestionUpdate } from "@/lib/supabase/types";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();
    const { id } = params;

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

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
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      ...(review_notes !== undefined && { review_notes }),
    };

    const { data, error } = await supabase
      .from("ai_generated_questions")
      // @ts-ignore - Supabase type inference issue with table name
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating question status:", error);
      return NextResponse.json(
        { error: "Failed to update question status" },
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

