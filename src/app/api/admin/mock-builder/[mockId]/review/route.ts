import { NextRequest, NextResponse } from "next/server";
import { requireTesterAdmin } from "@/lib/tester/admin";
import { getMockWithSlots, runAiPaperReview } from "@/lib/mockBuilder/server";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { mockId: string } },
) {
  const admin = await requireTesterAdmin(request);
  if (!admin.ok || !admin.service) {
    return NextResponse.json(
      { error: admin.error ?? "Unauthorized" },
      { status: admin.status ?? 401 },
    );
  }

  try {
    const { review, source } = await runAiPaperReview(
      admin.service,
      params.mockId,
    );
    const result = await getMockWithSlots(admin.service, params.mockId);
    return NextResponse.json({ ...result, review, source });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Review failed" },
      { status: 500 },
    );
  }
}
