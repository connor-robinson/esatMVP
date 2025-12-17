import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = createServerClient();

    // Get counts by status
    const { data: statusData, error: statusError } = await supabase
      .from("ai_generated_questions")
      .select("status");

    if (statusError) {
      console.error("Error fetching status stats:", statusError);
      return NextResponse.json(
        { error: "Failed to fetch statistics" },
        { status: 500 }
      );
    }

    // Count by status
    const byStatus: Record<string, number> = {};
    statusData?.forEach((q) => {
      byStatus[q.status] = (byStatus[q.status] || 0) + 1;
    });

    // Get counts by schema
    const { data: schemaData, error: schemaError } = await supabase
      .from("ai_generated_questions")
      .select("schema_id");

    if (schemaError) {
      console.error("Error fetching schema stats:", schemaError);
    }

    const bySchema: Record<string, number> = {};
    schemaData?.forEach((q) => {
      bySchema[q.schema_id] = (bySchema[q.schema_id] || 0) + 1;
    });

    // Get counts by difficulty
    const { data: difficultyData, error: difficultyError } = await supabase
      .from("ai_generated_questions")
      .select("difficulty");

    if (difficultyError) {
      console.error("Error fetching difficulty stats:", difficultyError);
    }

    const byDifficulty: Record<string, number> = {};
    difficultyData?.forEach((q) => {
      byDifficulty[q.difficulty] = (byDifficulty[q.difficulty] || 0) + 1;
    });

    // Get total count
    const { count: totalCount, error: countError } = await supabase
      .from("ai_generated_questions")
      .select("*", { count: "exact", head: true });

    return NextResponse.json({
      total: totalCount || 0,
      byStatus,
      bySchema,
      byDifficulty,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

