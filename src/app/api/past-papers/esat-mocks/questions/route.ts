import { NextRequest, NextResponse } from "next/server";
import { getAdminEsatMockQuestionsForPaperId } from "@/lib/papers/adminEsatMocks.server";
import { isAdminEsatMockPaperId } from "@/lib/papers/adminEsatMocks";

export const dynamic = "force-dynamic";

/**
 * GET /api/past-papers/esat-mocks/questions?paperId=920000
 */
export async function GET(request: NextRequest) {
  const paperIdRaw = request.nextUrl.searchParams.get("paperId");
  const paperId = Number(paperIdRaw);
  if (!Number.isFinite(paperId) || !isAdminEsatMockPaperId(paperId)) {
    return NextResponse.json({ error: "Invalid paperId" }, { status: 400 });
  }

  try {
    const questions = await getAdminEsatMockQuestionsForPaperId(paperId);
    return NextResponse.json({ paperId, questions });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load questions" },
      { status: 500 },
    );
  }
}
