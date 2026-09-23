/**
 * Exclude questions with open reports from the question bank
 * until admin reviews and resolves them.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Get question IDs that have open (unresolved) reports
 * These should be temporarily removed from the question bank
 */
export async function getQuestionIdsWithOpenReports(
  supabase: SupabaseClient,
): Promise<Set<string>> {
  try {
    // Get all open support requests for question errors
    const { data, error } = await supabase
      .from("support_requests")
      .select("context")
      .eq("category", "question_or_content_error")
      .in("status", ["open", "in_progress"]);

    if (error) {
      console.error("[excludeReported] Error fetching open reports:", error);
      return new Set();
    }

    const questionIds = new Set<string>();
    
    for (const row of data ?? []) {
      const context =
        typeof row.context === "string"
          ? (JSON.parse(row.context) as Record<string, unknown>)
          : (row.context as Record<string, unknown> | null);

      if (context && typeof context.questionId === "string") {
        questionIds.add(context.questionId);
      }
    }

    if (questionIds.size > 0) {
      console.log(
        `[excludeReported] Excluding ${questionIds.size} questions with open reports`,
      );
    }

    return questionIds;
  } catch (err) {
    console.error("[excludeReported] Unexpected error:", err);
    return new Set();
  }
}
