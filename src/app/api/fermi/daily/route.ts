import { NextResponse } from "next/server";
import { resolveDailyRound } from "@/lib/fermi/resolveDailyRound";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const round = await resolveDailyRound();
    return NextResponse.json(round);
  } catch (error) {
    console.error("[fermi/daily] GET failed", error);
    return NextResponse.json({ error: "Failed to load daily puzzle" }, { status: 500 });
  }
}
