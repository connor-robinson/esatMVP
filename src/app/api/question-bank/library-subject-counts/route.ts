import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  applyLibraryAttemptFilters,
  applyLibraryQueryFilters,
  LIBRARY_PAGE_SIZE,
  loadLibraryAttemptContext,
  parseLibraryFilterParams,
} from "@/lib/questionBank/libraryFilterServer";

export const dynamic = "force-dynamic";

type CountRow = { id: string; subjects: string | null };

/**
 * GET /api/question-bank/library-subject-counts
 * Filtered question totals per subject (no topic breakdown). Respects library filters.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const params = parseLibraryFilterParams(new URL(request.url).searchParams);

    const attemptCtx = await loadLibraryAttemptContext(
      supabase,
      params.needsAttemptData,
    );

    const rows: CountRow[] = [];
    let offset = 0;

    for (;;) {
      let query = supabase
        .from("ai_generated_questions")
        .select("id, subjects")
        .in("subjects", params.subjects)
        .neq("status", "deleted")
        .order("id", { ascending: true })
        .range(offset, offset + LIBRARY_PAGE_SIZE - 1);

      query = applyLibraryQueryFilters(query, params);

      const { data, error } = await query;
      if (error) {
        console.error("[library-subject-counts] query error:", error);
        return NextResponse.json(
          { error: "Failed to load counts" },
          { status: 500 },
        );
      }

      const batch = (data ?? []) as CountRow[];
      if (batch.length === 0) break;
      rows.push(...batch);
      if (batch.length < LIBRARY_PAGE_SIZE) break;
      offset += LIBRARY_PAGE_SIZE;
    }

    const filtered = applyLibraryAttemptFilters(rows, params, attemptCtx);

    const counts: Record<string, number> = {};
    for (const subject of params.subjects) {
      counts[subject] = 0;
    }
    for (const row of filtered) {
      const subject = row.subjects?.trim();
      if (subject && subject in counts) {
        counts[subject] += 1;
      }
    }

    return NextResponse.json({ counts, total: filtered.length });
  } catch (e) {
    console.error("[library-subject-counts]", e);
    return NextResponse.json(
      { error: "Failed to load counts" },
      { status: 500 },
    );
  }
}
