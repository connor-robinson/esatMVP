import { NextRequest, NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/supabase/auth";
import { requireTesterAdmin } from "@/lib/tester/admin";
import { createTesterServiceClient } from "@/lib/tester/service";
import {
  isTesterDevEnabled,
  simulateTesterProgramme,
  type DevSimulateAction,
} from "@/lib/tester/dev";

export const dynamic = "force-dynamic";

const ACTIONS: DevSimulateAction[] = [
  "reset",
  "prepare_join",
  "stage_1_survey_pending",
  "stage_1_active",
  "stage_1_expired",
  "stage_2_active",
  "stage_2_expired",
  "stage_3_active",
  "programme_completed",
  "expire_current",
  "set_sessions",
  "mark_feedback_done",
  "mark_final_done",
  "sync",
];

async function authorizeDev(request: NextRequest) {
  const { user, error } = await requireRouteUser(request);
  if (error || !user) {
    return { ok: false as const, status: 401, error: "Unauthorized" };
  }

  if (isTesterDevEnabled()) {
    return {
      ok: true as const,
      userId: user.id,
      service: createTesterServiceClient(),
    };
  }

  const admin = await requireTesterAdmin(request);
  if (admin.ok && admin.service) {
    return { ok: true as const, userId: user.id, service: admin.service };
  }

  return {
    ok: false as const,
    status: 403,
    error: "Tester dev tools are disabled. Set ENABLE_TESTER_DEV_TOOLS=true or use an admin account.",
  };
}

/** GET /api/tester/dev — availability + current synced state */
export async function GET(request: NextRequest) {
  const auth = await authorizeDev(request);
  if (!auth.ok) {
    return NextResponse.json(
      { enabled: false, error: auth.error },
      { status: auth.status },
    );
  }

  const { state } = await simulateTesterProgramme(auth.service, auth.userId, {
    action: "sync",
  });

  return NextResponse.json({
    enabled: true,
    state,
    serverTime: new Date().toISOString(),
    defaultStageMinutes: 2,
  });
}

/**
 * POST /api/tester/dev { action, sessions?, minutes? }
 * Fast-forward your own tester programme for local QA (dev / admin / env flag).
 */
export async function POST(request: NextRequest) {
  const auth = await authorizeDev(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => ({}));
  const action = body.action as DevSimulateAction;

  if (!action || !ACTIONS.includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  try {
    const result = await simulateTesterProgramme(auth.service, auth.userId, {
      action,
      sessions:
        typeof body.sessions === "number" ? body.sessions : undefined,
      minutes: typeof body.minutes === "number" ? body.minutes : undefined,
    });

    return NextResponse.json({
      ok: true,
      action,
      state: result.state,
      serverTime: new Date().toISOString(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Simulation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
