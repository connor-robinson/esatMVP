import { NextResponse } from "next/server";
import {
  isConverterExam,
  type ConverterExam,
  type SectionsResponse,
} from "@/lib/scoreConverter/esatModules";
import { loadConverterSections } from "@/lib/scoreConverter/loadConverterSections.server";

export const dynamic = "force-dynamic";

/**
 * GET /api/score-converter/sections?exam=NSAA&year=2022
 * Selectable scoring units for a sitting, built straight from conversion data
 * so a user can never pick a section that dead-ends. TMUA 2024+ returns scaled
 * mode (no raw→scaled table exists).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const examParam = url.searchParams.get("exam") ?? "";
  const yearParam = Number(url.searchParams.get("year"));

  if (!isConverterExam(examParam)) {
    return NextResponse.json({ error: "Unknown exam" }, { status: 400 });
  }
  if (!Number.isFinite(yearParam)) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }
  const exam = examParam.toUpperCase() as ConverterExam;
  const year = yearParam;

  try {
    const { mode, options } = await loadConverterSections(exam, year);
    const body: SectionsResponse = { exam, year, mode, options };
    return NextResponse.json(body);
  } catch {
    return NextResponse.json({ error: "Failed to load sections" }, { status: 500 });
  }
}
