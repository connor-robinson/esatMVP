/**
 * Hide question-bank items that have an unresolved content report.
 * A question stays out of student queues until the report is resolved or closed.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Tickets still waiting for a manual review. */
export const UNREVIEWED_REPORT_STATUSES = ["open", "in_progress"] as const;

function serviceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function questionIdsFromReportRows(
  rows: Array<{ context?: unknown }>,
): Set<string> {
  const questionIds = new Set<string>();
  for (const row of rows) {
    let context: Record<string, unknown> | null = null;
    if (typeof row.context === "string") {
      try {
        const parsed = JSON.parse(row.context) as unknown;
        context =
          parsed && typeof parsed === "object"
            ? (parsed as Record<string, unknown>)
            : null;
      } catch {
        context = null;
      }
    } else if (row.context && typeof row.context === "object") {
      context = row.context as Record<string, unknown>;
    }
    const questionId =
      typeof context?.questionId === "string" ? context.questionId.trim() : "";
    if (UUID_RE.test(questionId)) questionIds.add(questionId);
  }
  return questionIds;
}

export function omitReportedQuestions<T extends { id: string }>(
  rows: T[],
  reportedIds: Set<string>,
): T[] {
  if (reportedIds.size === 0) return rows;
  return rows.filter((row) => !reportedIds.has(row.id));
}

/**
 * Question IDs with an open or in-progress content report.
 * Uses the service role because students cannot read support_requests.
 */
export async function getQuestionIdsWithOpenReports(): Promise<Set<string>> {
  try {
    const supabase = serviceClient();
    if (!supabase) {
      console.error(
        "[excludeReported] Missing service role key; reported questions were not hidden",
      );
      return new Set();
    }

    const { data, error } = await supabase
      .from("support_requests")
      .select("context")
      .eq("category", "question_or_content_error")
      .in("status", [...UNREVIEWED_REPORT_STATUSES]);

    if (error) {
      console.error("[excludeReported] Error fetching open reports:", error);
      return new Set();
    }

    return questionIdsFromReportRows(data ?? []);
  } catch (err) {
    console.error("[excludeReported] Unexpected error:", err);
    return new Set();
  }
}
