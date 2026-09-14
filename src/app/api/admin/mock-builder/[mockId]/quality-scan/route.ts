import { NextRequest, NextResponse } from "next/server";
import { requireTesterAdmin } from "@/lib/tester/admin";
import {
  getMockWithSlots,
  runQuestionQualityScan,
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
    const scan = await runQuestionQualityScan(admin.service, params.mockId, {
      force: body.force === true,
    });
    const result = await getMockWithSlots(admin.service, params.mockId);
    return NextResponse.json({ ...result, scan });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Quality scan failed" },
      { status: 500 },
    );
  }
}
