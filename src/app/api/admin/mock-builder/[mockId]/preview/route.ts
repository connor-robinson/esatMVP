import { NextRequest, NextResponse } from "next/server";
import { requireTesterAdmin } from "@/lib/tester/admin";
import { getMockWithSlots } from "@/lib/mockBuilder/server";
import { mockSlotsToPearsonQuestions } from "@/lib/mockBuilder/toPearsonQuestion";

export const dynamic = "force-dynamic";

/**
 * Admin-only: full mock paper adapted for PearsonExamPlayer preview.
 */
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
    const { mock, slots } = await getMockWithSlots(admin.service, params.mockId);
    const questions = mockSlotsToPearsonQuestions(slots, mock);
    const missing = slots.filter((s) => !s.question).length;
    const timeLimitSeconds = Math.max(
      60,
      Math.round(Number(mock.time_limit_minutes || 40) * 60),
    );

    return NextResponse.json({
      mock: {
        id: mock.id,
        title: mock.title,
        subject: mock.subject,
        status: mock.status,
        questionCount: mock.question_count,
        timeLimitMinutes: mock.time_limit_minutes,
      },
      questions,
      timeLimitSeconds,
      slotCount: slots.length,
      missingSlots: missing,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Not found" },
      { status: 404 },
    );
  }
}
