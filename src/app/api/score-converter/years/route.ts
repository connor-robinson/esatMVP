import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  isConverterExam,
  TMUA_IRT_FROM_YEAR,
  type ConverterExam,
  type YearOption,
  type YearsResponse,
} from "@/lib/scoreConverter/esatModules";

export const dynamic = "force-dynamic";

/**
 * GET /api/score-converter/years?exam=NSAA
 * Distinct years that actually have conversion data (populated from `papers`).
 * TMUA additionally exposes the IRT era (2024+) as scaled-score-entry years.
 */
export async function GET(request: Request) {
  const examParam = new URL(request.url).searchParams.get("exam") ?? "";
  if (!isConverterExam(examParam)) {
    return NextResponse.json({ error: "Unknown exam" }, { status: 400 });
  }
  const exam = examParam.toUpperCase() as ConverterExam;

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("papers")
    .select("exam_year")
    .eq("exam_name", exam)
    .eq("has_conversion", true);

  if (error) {
    return NextResponse.json({ error: "Failed to load years" }, { status: 500 });
  }

  const rawYears = new Set<number>(
    ((data ?? []) as Array<{ exam_year: number }>).map((r) => r.exam_year),
  );

  const years: YearOption[] = [...rawYears].map((year) => ({
    year,
    mode: "raw",
    hasData: true,
  }));

  if (exam === "TMUA") {
    const currentYear = new Date().getFullYear();
    for (let y = TMUA_IRT_FROM_YEAR; y <= currentYear; y++) {
      if (!rawYears.has(y)) {
        // No published raw→scaled table since 2024 (Rasch IRT scoring): the user
        // enters their reported scaled score directly.
        years.push({ year: y, mode: "scaled", hasData: false });
      }
    }
  }

  years.sort((a, b) => b.year - a.year);

  const body: YearsResponse = { exam, years };
  return NextResponse.json(body);
}
