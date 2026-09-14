import { NextResponse } from "next/server";
import { loadFermiPreviewBatch } from "@/lib/fermi/loadBatchFile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lightweight day index, or one day's questions via ?date=YYYY-MM-DD */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const which = url.searchParams.get("batch") === "01" ? "01" : "02";
  const date = url.searchParams.get("date");
  const batch = loadFermiPreviewBatch(which);

  if (!batch) {
    return NextResponse.json(
      {
        error: `Batch file missing. Run: npx tsx scripts/generate-fermi-month.ts`,
      },
      { status: 404 },
    );
  }

  if (date) {
    const day = batch.days.find((d) => d.date === date);
    if (!day) {
      return NextResponse.json({ error: "Day not found" }, { status: 404 });
    }
    return NextResponse.json({ meta: batch.meta, day });
  }

  // Index only (no question bodies) for fast clients
  if (url.searchParams.get("index") === "1") {
    return NextResponse.json({
      meta: batch.meta,
      dayCount: batch.dayCount,
      questionCount: batch.questionCount,
      days: batch.days.map((d) => ({
        date: d.date,
        editionTitle: d.editionTitle,
        questionCount: d.questions.length,
        factCount: d.questions.filter((q) => q.showDidYouKnow).length,
      })),
    });
  }

  return NextResponse.json(batch);
}
