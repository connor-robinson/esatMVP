import { NextResponse } from "next/server";
import { isKnownEsatTable, readEsatTableRows } from "@/lib/esat/serverTables";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tableKey = searchParams.get("table");

  if (!tableKey) {
    return NextResponse.json({ error: "Missing table parameter" }, { status: 400 });
  }

  if (!isKnownEsatTable(tableKey)) {
    return NextResponse.json({ error: `Unknown table: ${tableKey}` }, { status: 404 });
  }

  try {
    const rows = await readEsatTableRows(tableKey);
    return NextResponse.json(
      { rows },
      {
        headers: {
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      },
    );
  } catch (error: any) {
    console.error(`[esat-api] Failed to load table ${tableKey}:`, error);
    if (error?.code === "ENOENT") {
      return NextResponse.json(
        { error: `Table file not found: ${tableKey}` },
        { status: 404 },
      );
    }
    return NextResponse.json({ error: "Failed to load table" }, { status: 500 });
  }
}
