import { NextRequest, NextResponse } from "next/server";
import { requireTesterAdmin } from "@/lib/tester/admin";
import { generateAndPersist, getMockWithSlots } from "@/lib/mockBuilder/server";

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
    const body = await request.json().catch(() => ({}));
    const assembly = await generateAndPersist(admin.service, params.mockId, {
      keepLocks: body.keepLocks !== false,
    });
    const result = await getMockWithSlots(admin.service, params.mockId);
    return NextResponse.json({ ...result, assembly });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Generate failed" },
      { status: 500 },
    );
  }
}
