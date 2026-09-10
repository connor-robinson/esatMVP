import { NextRequest, NextResponse } from "next/server";
import { requireTesterAdmin } from "@/lib/tester/admin";
import {
  getMockWithSlots,
  getReplacementOptions,
  replaceSlot,
  setSlotLocked,
} from "@/lib/mockBuilder/server";

export const dynamic = "force-dynamic";

export async function GET(
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

  const position = Number(new URL(request.url).searchParams.get("position"));
  if (!Number.isFinite(position) || position < 1) {
    return NextResponse.json({ error: "position required" }, { status: 400 });
  }

  try {
    const alternatives = await getReplacementOptions(
      admin.service,
      params.mockId,
      position,
    );
    return NextResponse.json({ alternatives });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 },
    );
  }
}

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
    const body = await request.json();
    const position = Number(body.position);
    if (body.action === "lock") {
      await setSlotLocked(
        admin.service,
        params.mockId,
        position,
        Boolean(body.locked),
      );
      const result = await getMockWithSlots(admin.service, params.mockId);
      return NextResponse.json(result);
    }

    if (!body.questionId) {
      return NextResponse.json({ error: "questionId required" }, { status: 400 });
    }
    await replaceSlot(admin.service, params.mockId, position, body.questionId);
    const result = await getMockWithSlots(admin.service, params.mockId);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Replace failed" },
      { status: 500 },
    );
  }
}
