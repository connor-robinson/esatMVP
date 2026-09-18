import { NextResponse } from "next/server";
import { listAdminEsatMockCatalog } from "@/lib/papers/adminEsatMocks.server";

export const dynamic = "force-dynamic";

/**
 * GET /api/past-papers/esat-mocks
 * Catalog of Mock A–E sittings from the admin mock builder.
 */
export async function GET() {
  try {
    const sittings = await listAdminEsatMockCatalog();
    return NextResponse.json({ sittings });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load mocks" },
      { status: 500 },
    );
  }
}
