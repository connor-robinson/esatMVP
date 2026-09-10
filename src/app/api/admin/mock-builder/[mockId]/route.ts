import { NextRequest, NextResponse } from "next/server";
import { requireTesterAdmin } from "@/lib/tester/admin";
import {
  getMockWithSlots,
  transitionMockStatus,
  updateMockMeta,
} from "@/lib/mockBuilder/server";
import { MOCK_STATUSES, type MockStatus } from "@/lib/mockBuilder/types";

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

  try {
    const result = await getMockWithSlots(admin.service, params.mockId);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Not found" },
      { status: 404 },
    );
  }
}

export async function PATCH(
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
    if (body.status) {
      if (!MOCK_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      const mock = await transitionMockStatus(
        admin.service,
        params.mockId,
        body.status as MockStatus,
      );
      return NextResponse.json({ mock });
    }

    const mock = await updateMockMeta(admin.service, params.mockId, {
      title: body.title,
      is_free: body.is_free,
      blueprint_snapshot: body.blueprint_snapshot,
    });
    return NextResponse.json({ mock });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Update failed" },
      { status: 500 },
    );
  }
}

export async function DELETE(
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
    const { mock } = await getMockWithSlots(admin.service, params.mockId);
    if (mock.status === "published") {
      await transitionMockStatus(admin.service, params.mockId, "archived");
    }
    const { error } = await admin.service
      .from("esat_mocks")
      .delete()
      .eq("id", params.mockId);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Delete failed" },
      { status: 500 },
    );
  }
}
