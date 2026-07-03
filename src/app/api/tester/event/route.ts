import { NextRequest, NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/supabase/auth";
import { createTesterServiceClient } from "@/lib/tester/service";
import { logTesterEvent, type TesterEvent } from "@/lib/tester/analytics";

export const dynamic = "force-dynamic";

// Only client-triggerable funnel events are accepted here. Lifecycle events
// (stage activations/expiries, survey completions) are logged server-side.
const CLIENT_EVENTS: TesterEvent[] = [
  "tester_programme_viewed",
  "initial_survey_started",
  "stage_1_feedback_started",
  "final_survey_started",
  "tester_offer_viewed",
  "checkout_started",
];

/**
 * POST /api/tester/event  { event, metadata? }
 * Lightweight analytics beacon for client-side funnel events.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireRouteUser(request);
    if (error || !user) {
      return NextResponse.json({ ok: false }, { status: 200 });
    }

    const body = await request.json().catch(() => ({}));
    const event = body.event as TesterEvent;
    if (!CLIENT_EVENTS.includes(event)) {
      return NextResponse.json({ ok: false }, { status: 200 });
    }

    const service = createTesterServiceClient();
    const { data: programme } = await service
      .from("tester_programmes")
      .select("id, current_stage")
      .eq("user_id", user.id)
      .maybeSingle();

    await logTesterEvent(service, {
      userId: user.id,
      programmeId: programme?.id ?? null,
      event,
      testerStage: programme?.current_stage ?? null,
      trafficSource:
        typeof body.trafficSource === "string" ? body.trafficSource : null,
      metadata:
        body.metadata && typeof body.metadata === "object" ? body.metadata : {},
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
