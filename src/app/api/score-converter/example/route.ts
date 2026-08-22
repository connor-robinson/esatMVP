import { NextResponse } from "next/server";
import {
  buildConverterExample,
  type ConverterExampleResponse,
} from "@/lib/scoreConverter/converterExample.server";
import { isConverterExam, type ConverterExam } from "@/lib/scoreConverter/esatModules";

export const dynamic = "force-dynamic";

/** GET /api/score-converter/example?exam=NSAA */
export async function GET(request: Request) {
  const examParam = new URL(request.url).searchParams.get("exam") ?? "";
  if (!isConverterExam(examParam)) {
    return NextResponse.json({ error: "Unknown exam" }, { status: 400 });
  }

  const exam = examParam.toUpperCase() as ConverterExam;
  const example = await buildConverterExample(exam);
  if (!example) {
    return NextResponse.json({ error: "No example available" }, { status: 404 });
  }

  const body: ConverterExampleResponse = example;
  return NextResponse.json(body);
}
