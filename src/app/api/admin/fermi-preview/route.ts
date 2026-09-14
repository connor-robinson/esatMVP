import { NextResponse } from "next/server";
import { existsSync, readFileSync } from "fs";
import path from "path";
import {
  type FermiBatchFile,
  normalizeFermiBatch,
} from "@/lib/fermi/batchQuestion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BATCH_PATHS = [
  "data/fermi-questions-batch-02.json",
  "data/fermi-questions-batch-01.json",
] as const;

function loadBatch(rel: string): FermiBatchFile | null {
  const full = path.join(process.cwd(), rel);
  if (!existsSync(full)) return null;
  const raw = JSON.parse(readFileSync(full, "utf8"));
  const fallbackId = rel.includes("batch-01") ? "batch-01" : "batch-02";
  return normalizeFermiBatch(raw, {
    batchId: fallbackId,
    title: fallbackId,
    startDate: "",
    endDate: "",
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const which = url.searchParams.get("batch") || "02";
  const rel =
    which === "01" ? BATCH_PATHS[1] : BATCH_PATHS[0];
  const batch = loadBatch(rel);
  if (!batch) {
    return NextResponse.json(
      {
        error: `Batch file missing: ${rel}. Run: npx tsx scripts/generate-fermi-month.ts`,
      },
      { status: 404 },
    );
  }

  const byDate = new Map<string, typeof batch.questions>();
  for (const q of batch.questions) {
    const list = byDate.get(q.scheduledDate) ?? [];
    list.push(q);
    byDate.set(q.scheduledDate, list);
  }
  const days = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, questions]) => ({
      date,
      editionTitle:
        questions.find((q) => q.editionTitle)?.editionTitle ?? null,
      questionCount: questions.length,
      factCount: questions.filter((q) => q.showDidYouKnow).length,
      questions: questions.sort((a, b) => a.id - b.id),
    }));

  return NextResponse.json({
    meta: batch.meta,
    dayCount: days.length,
    questionCount: batch.questions.length,
    days,
  });
}
