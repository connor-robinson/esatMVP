import { NextRequest, NextResponse } from "next/server";
import { getReviewSupabase } from "@/lib/supabaseService";
import { isTmuaSubjectValue } from "@/lib/curriculum";
import type { ReviewStatsBreakdown } from "@/types/review";

export const dynamic = "force-dynamic";

const NO_STORE = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
} as const;

const PAGE = 1000;

/**
 * TMUA questions are stored with `subjects` "Paper 1" / "Paper 2" (see tmua db_sync + review UI).
 * The `test_type` column is often NULL or even "ESAT" for older syncs: ESAT pipeline db_sync
 * defaults to ESAT and deliberately does not infer TMUA from `M_`/`R_` schema ids because ESAT
 * maths uses the same prefix pattern. Stats must treat Paper 1/2 as TMUA regardless of test_type.
 */
function isTmuaRow(row: { test_type?: string | null; subjects?: string | null }): boolean {
  const tt = (row.test_type || "").trim().toUpperCase();
  if (tt === "TMUA") return true;
  return isTmuaSubjectValue(row.subjects);
}

function isEsatRow(row: { test_type?: string | null; subjects?: string | null }): boolean {
  if (isTmuaRow(row)) return false;
  const tt = (row.test_type || "").trim().toUpperCase();
  return tt === "ESAT" || tt === "" || row.test_type == null;
}

function normDifficulty(d: string | null | undefined): string {
  const x = (d || "").trim();
  if (x === "Easy" || x === "Medium" || x === "Hard" || x === "Extreme") return x;
  return "Other";
}

function normSubject(s: string | null | undefined): string {
  const t = (s || "").trim();
  return t.length ? t : "— Unspecified";
}

function bump(m: Record<string, number>, key: string, n = 1) {
  m[key] = (m[key] || 0) + n;
}

function bumpNested(
  matrix: Record<string, Record<string, number>>,
  rowKey: string,
  colKey: string,
  n = 1
) {
  if (!matrix[rowKey]) matrix[rowKey] = {};
  const inner = matrix[rowKey];
  inner[colKey] = (inner[colKey] || 0) + n;
}

function isPendingStatus(st: string | null | undefined): boolean {
  const s = (st || "").trim();
  return s === "pending" || s === "pending_review" || s === "needs_revision";
}

function isApprovedStatus(st: string | null | undefined): boolean {
  return (st || "").trim() === "approved";
}

/**
 * GET /api/review/stats/breakdown
 * Paginates non-deleted rows (minimal columns) and returns aggregate counts for the reviewer UI.
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = getReviewSupabase();

    const difficultyAll: Record<string, number> = {};
    const esatBySubject: Record<string, number> = {};
    const tmuaBySubject: Record<string, number> = {};
    const esatByDifficulty: Record<string, number> = {};
    const tmuaByDifficulty: Record<string, number> = {};
    const esatSubjectByDifficulty: Record<string, Record<string, number>> = {};
    const tmuaSubjectByDifficulty: Record<string, Record<string, number>> = {};

    let esatApproved = 0;
    let esatPending = 0;
    let tmuaApproved = 0;
    let tmuaPending = 0;
    let otherTestType = 0;

    let offset = 0;
    let totalRows = 0;

    for (;;) {
      const { data, error } = await supabase
        .from("ai_generated_questions")
        .select("test_type, subjects, difficulty, status")
        .neq("status", "deleted")
        .range(offset, offset + PAGE - 1);

      if (error) {
        console.error("[Review API] stats breakdown fetch error:", error);
        return NextResponse.json(
          { error: "Failed to aggregate stats", details: error.message },
          { status: 500, headers: NO_STORE }
        );
      }

      const rows = data || [];
      if (rows.length === 0) break;

      totalRows += rows.length;

      for (const row of rows as {
        test_type?: string | null;
        subjects?: string | null;
        difficulty?: string | null;
        status?: string | null;
      }[]) {
        const diff = normDifficulty(row.difficulty);
        bump(difficultyAll, diff);

        const subj = normSubject(row.subjects);

        if (isTmuaRow(row)) {
          bump(tmuaBySubject, subj);
          bump(tmuaByDifficulty, diff);
          bumpNested(tmuaSubjectByDifficulty, subj, diff);
          if (isApprovedStatus(row.status)) tmuaApproved += 1;
          else if (isPendingStatus(row.status)) tmuaPending += 1;
        } else if (isEsatRow(row)) {
          bump(esatBySubject, subj);
          bump(esatByDifficulty, diff);
          bumpNested(esatSubjectByDifficulty, subj, diff);
          if (isApprovedStatus(row.status)) esatApproved += 1;
          else if (isPendingStatus(row.status)) esatPending += 1;
        } else {
          otherTestType += 1;
        }
      }

      if (rows.length < PAGE) break;
      offset += PAGE;
    }

    const tmuaTotal = Object.values(tmuaBySubject).reduce((a, b) => a + b, 0);
    const esatTotal = Object.values(esatBySubject).reduce((a, b) => a + b, 0);

    const breakdown: ReviewStatsBreakdown = {
      generatedAt: new Date().toISOString(),
      totalNonDeleted: totalRows,
      tmua: {
        total: tmuaTotal,
        approved: tmuaApproved,
        pending: tmuaPending,
        bySubject: tmuaBySubject,
        byDifficulty: tmuaByDifficulty,
        subjectByDifficulty: tmuaSubjectByDifficulty,
      },
      esat: {
        total: esatTotal,
        approved: esatApproved,
        pending: esatPending,
        bySubject: esatBySubject,
        byDifficulty: esatByDifficulty,
        subjectByDifficulty: esatSubjectByDifficulty,
      },
      difficultyAll,
      otherTestTypeCount: otherTestType,
    };

    return NextResponse.json(breakdown, { headers: NO_STORE });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[Review API] stats breakdown:", e);
    return NextResponse.json(
      { error: "Internal server error", details: message },
      { status: 500, headers: NO_STORE }
    );
  }
}
