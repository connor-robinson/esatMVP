import { NextRequest, NextResponse } from "next/server";
import { requireTesterAdmin } from "@/lib/tester/admin";
import {
  loadReportedQuestionBankItems,
  type QuestionReportStatusFilter,
} from "@/lib/admin/reportedQuestions";

export const dynamic = "force-dynamic";

function parseStatus(raw: string | null): QuestionReportStatusFilter {
  if (raw === "resolved" || raw === "all") return raw;
  return "open";
}

export async function GET(request: NextRequest) {
  const admin = await requireTesterAdmin(request);
  if (!admin.ok || !admin.service) {
    return NextResponse.json(
      { error: admin.error ?? "Unauthorized" },
      { status: admin.status ?? 401 },
    );
  }

  const status = parseStatus(request.nextUrl.searchParams.get("status"));

  try {
    const { items, summary } = await loadReportedQuestionBankItems(
      admin.service,
      {
        status,
        includeDeleted: true,
        limit: status === "open" ? 120 : 400,
      },
    );
    return NextResponse.json({
      items,
      summary,
      count: items.length,
      status,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
