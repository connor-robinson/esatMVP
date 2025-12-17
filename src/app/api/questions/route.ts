import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending_review";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const schema = searchParams.get("schema");
    const difficulty = searchParams.get("difficulty");

    const supabase = createServerClient();

    // Build query
    let query = supabase
      .from("ai_generated_questions")
      .select("*", { count: "exact" })
      .eq("status", status)
      .order("created_at", { ascending: false });

    // Apply filters
    if (schema) {
      query = query.eq("schema_id", schema);
    }
    if (difficulty) {
      query = query.eq("difficulty", difficulty);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching questions:", error);
      return NextResponse.json(
        { error: "Failed to fetch questions" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      questions: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

