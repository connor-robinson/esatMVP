import { NextResponse } from "next/server";
import {
  fetchPublishedTableDetail,
  rowsToCsv,
} from "@/lib/scoreConverter/publishedTables.server";

export const dynamic = "force-dynamic";

/** GET /api/score-converter/published-table?tableId=1&partName=Section%201A */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const tableId = Number(url.searchParams.get("tableId"));
  const partName = url.searchParams.get("partName") ?? "";

  if (!Number.isFinite(tableId) || !partName) {
    return NextResponse.json(
      { error: "Missing tableId or partName" },
      { status: 400 },
    );
  }

  const detail = await fetchPublishedTableDetail(tableId, partName);
  if (!detail) {
    return NextResponse.json({ error: "Table not found" }, { status: 404 });
  }

  const format = url.searchParams.get("format");
  if (format === "csv") {
    const csv = rowsToCsv(detail, detail.rows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${detail.csvFilename}"`,
      },
    });
  }

  return NextResponse.json(detail);
}
