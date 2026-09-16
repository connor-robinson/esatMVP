import { NextRequest, NextResponse } from "next/server";
import { requireTesterAdmin } from "@/lib/tester/admin";
import {
  autoRemediateMockQuality,
  getMockWithSlots,
  runAiPaperReview,
} from "@/lib/mockBuilder/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

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
    const body = await request.json().catch(() => ({}));
    const remediation = await autoRemediateMockQuality(
      admin.service,
      params.mockId,
      { rescanFirst: body.rescanFirst === true },
    );
    let review: unknown = null;
    let reviewSource: string | null = null;
    try {
      const paper = await runAiPaperReview(admin.service, params.mockId);
      review = paper.review;
      reviewSource = paper.source;
    } catch {
      // Remediation succeeded; paper review is best-effort on this path.
    }
    const result = await getMockWithSlots(admin.service, params.mockId);
    return NextResponse.json({
      ...result,
      ...remediation,
      review,
      reviewSource,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Auto-fix failed" },
      { status: 500 },
    );
  }
}
