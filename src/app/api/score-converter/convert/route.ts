import { NextResponse } from "next/server";
import { convertScoreConverter } from "@/lib/scoreConverter/convert.server";
import { isConverterExam, type ConverterExam } from "@/lib/scoreConverter/esatModules";

export const dynamic = "force-dynamic";

/** POST /api/score-converter/convert */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const examParam = String(record.exam ?? "");
  const year = Number(record.year);
  if (!isConverterExam(examParam) || !Number.isFinite(year)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const exam = examParam.toUpperCase() as ConverterExam;

  try {
    const resp = await convertScoreConverter({
      exam,
      year,
      mode: record.mode === "scaled" ? "scaled" : "raw",
      scaledScore:
        typeof record.scaledScore === "number" ? record.scaledScore : undefined,
      selections: Array.isArray(record.selections)
        ? (record.selections as Array<{
            paperName: string;
            partName: string;
            raw: number;
            legacyLabel?: string;
          }>)
        : undefined,
    });
    return NextResponse.json(resp);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Conversion failed";
    const status = message.includes("No sections") || message.includes("Select") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
