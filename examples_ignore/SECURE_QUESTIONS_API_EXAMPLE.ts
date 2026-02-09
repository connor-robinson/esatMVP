/**
 * SECURE VERSION of src/app/api/questions/route.ts
 * 
 * This version adds authentication and restricts to approved questions only.
 * 
 * TO APPLY: Replace the GET function in the original file with this version
 */

import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = createServerClient();
    
    // SECURITY FIX: Require authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.log("[API] Unauthorized access attempt to questions endpoint");
      return NextResponse.json(
        { error: "Unauthorized - authentication required" },
        { status: 401 }
      );
    }

    console.log("[API] Authenticated user:", session.user.id);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "approved"; // Default to approved only
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const schema = searchParams.get("schema");
    const difficulty = searchParams.get("difficulty");
    const primaryTag = searchParams.get("primary_tag");
    const secondaryTag = searchParams.get("secondary_tag");
    const subjects = searchParams.get("subjects");

    // SECURITY FIX: Restrict to approved questions only for handover
    // If you need to see other statuses, you can add role-based checks
    const allowedStatuses = ['approved']; // Only allow approved questions
    
    // For handover, restrict to approved only
    // If you need to review pending questions, add admin role check:
    // if (status !== 'approved' && !isAdmin(session.user.id)) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    // }
    
    if (!allowedStatuses.includes(status)) {
      console.log("[API] Attempted to access non-approved questions:", status);
      return NextResponse.json(
        { error: "Only approved questions are accessible" },
        { status: 403 }
      );
    }
    
    // Debug logging
    console.log("[API] Fetching questions:", { status, page, limit, schema, difficulty });

    // Build query - now restricted to approved questions
    let query = supabase
      .from("ai_generated_questions")
      .select("*", { count: "exact" })
      .eq("status", status) // This will be "approved" due to restriction above
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
    if (subjects) {
      query = query.eq("subjects", subjects);
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

    // Debug: Log tag information for first few questions (sanitized)
    if (data && data.length > 0) {
      const sampleQuestions = data.slice(0, 3);
      console.log("[API] Sample question tags:", sampleQuestions.map((q: any) => ({
        id: q.id,
        schema_id: q.schema_id,
        primary_tag: q.primary_tag,
        secondary_tags: q.secondary_tags,
        subjects: q.subjects,
        // Don't log sensitive fields like question_stem, options, etc.
      })));
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
