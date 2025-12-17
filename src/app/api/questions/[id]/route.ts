import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();
    const { id } = params;

    const { data, error } = await supabase
      .from("ai_generated_questions")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Question not found" },
          { status: 404 }
        );
      }
      console.error("Error fetching question:", error);
      return NextResponse.json(
        { error: "Failed to fetch question" },
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

