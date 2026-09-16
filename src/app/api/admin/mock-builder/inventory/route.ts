import { NextRequest, NextResponse } from "next/server";
import { requireTesterAdmin } from "@/lib/tester/admin";
import { loadMockPoolInventory } from "@/lib/mockBuilder/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Full inventory including never-attempted bank counts (heavier). */
export async function GET(request: NextRequest) {
  const admin = await requireTesterAdmin(request);
  if (!admin.ok || !admin.service) {
    return NextResponse.json(
      { error: admin.error ?? "Unauthorized" },
      { status: admin.status ?? 401 },
    );
  }

  try {
    const inventory = await loadMockPoolInventory(admin.service);
    return NextResponse.json({ inventory });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load inventory" },
      { status: 500 },
    );
  }
}
