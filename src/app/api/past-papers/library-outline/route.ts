import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { mergePapersWithEsatCampMocks } from "@/lib/papers/esatCampMocks";
import type { Paper } from "@/types/papers";

export const dynamic = "force-dynamic";

/**
 * GET /api/past-papers/library-outline
 * Lightweight paper catalog (metadata only - no questions).
 */
export async function GET() {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("papers")
      .select(
        "id, exam_name, exam_year, paper_name, exam_type, has_conversion",
      )
      .order("exam_name")
      .order("exam_year", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to load papers" },
        { status: 500 },
      );
    }

    const papers: Paper[] = mergePapersWithEsatCampMocks(
      ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
        id: row.id as number,
        examName: row.exam_name as Paper["examName"],
        examYear: row.exam_year as number,
        paperName: row.paper_name as string,
        examType: row.exam_type as Paper["examType"],
        hasConversion: row.has_conversion as boolean,
        createdAt: "",
        updatedAt: "",
      })),
    );

    return NextResponse.json({ papers, total: papers.length });
  } catch {
    return NextResponse.json(
      { error: "Failed to load papers" },
      { status: 500 },
    );
  }
}
