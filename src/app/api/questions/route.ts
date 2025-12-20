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
    const primaryTag = searchParams.get("primary_tag");
    const secondaryTag = searchParams.get("secondary_tag");

    const supabase = createServerClient();
    
    // Debug logging
    console.log("[API] Fetching questions:", { status, page, limit, schema, difficulty });

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
    if (primaryTag) {
      query = query.eq("primary_tag", primaryTag);
    }
    if (secondaryTag) {
      query = query.contains("secondary_tags", [secondaryTag]);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error("[API] Error fetching questions:", error);
      console.error("[API] Error details:", JSON.stringify(error, null, 2));
      return NextResponse.json(
        { error: "Failed to fetch questions", details: error.message },
        { status: 500 }
      );
    }

    console.log("[API] Questions fetched:", {
      count: data?.length || 0,
      total: count || 0,
      status,
    });

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

