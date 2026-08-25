import { NextResponse } from "next/server";
import {
  fetchPublishedTableCatalog,
  PUBLISHED_TABLE_EXAMS,
} from "@/lib/scoreConverter/publishedTables.server";
import { isConverterExam } from "@/lib/scoreConverter/esatModules";

export const dynamic = "force-dynamic";

/** GET /api/score-converter/published-catalog?exam=NSAA */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const examParam = url.searchParams.get("exam");

  let examFilter: "NSAA" | "ENGAA" | undefined;
  if (examParam && examParam !== "all") {
    if (!isConverterExam(examParam)) {
      return NextResponse.json({ error: "Invalid exam" }, { status: 400 });
    }
    const exam = examParam.toUpperCase() as "NSAA" | "ENGAA" | "TMUA";
    if (!PUBLISHED_TABLE_EXAMS.includes(exam as "NSAA" | "ENGAA")) {
      return NextResponse.json({ rows: [] });
    }
    examFilter = exam as "NSAA" | "ENGAA";
  }

  const rows = await fetchPublishedTableCatalog(examFilter);
  return NextResponse.json({ rows });
}
