import { NextRequest, NextResponse } from "next/server";
import { requireTesterAdmin } from "@/lib/tester/admin";
import { parseQuestionBankStats } from "@/lib/admin/questionBankStats";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const admin = await requireTesterAdmin(request);
  if (!admin.ok || !admin.service) {
    return NextResponse.json(
      { error: admin.error ?? "Unauthorized" },
      { status: admin.status ?? 401 },
    );
  }

  const url = new URL(request.url);
  const sinceParam = url.searchParams.get("since")?.trim() || null;
  const minAttempts = Math.max(
    1,
    Number.parseInt(url.searchParams.get("minAttempts") ?? "5", 10) || 5,
  );
  const wrongLimit = Math.max(
    1,
    Math.min(
      100,
      Number.parseInt(url.searchParams.get("wrongLimit") ?? "40", 10) || 40,
    ),
  );

  try {
    const { data, error } = await admin.service.rpc("admin_question_bank_stats", {
      p_since: sinceParam,
      p_min_attempts: minAttempts,
      p_wrong_limit: wrongLimit,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      stats: parseQuestionBankStats(data),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load stats";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
