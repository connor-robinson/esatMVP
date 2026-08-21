import { NextRequest, NextResponse } from "next/server";
import { requireTesterAdmin } from "@/lib/tester/admin";
import { getTesterConfig } from "@/lib/tester/service";
import { addDays, stage3ActivationUpdates } from "@/lib/tester/access";
import { logTesterEvent } from "@/lib/tester/analytics";
import { enqueueTesterEmail } from "@/lib/tester/email";
import { getSurvey } from "@/lib/tester/surveys";
import type { TesterProgrammeRow } from "@/lib/tester/types";

export const dynamic = "force-dynamic";

/** GET /api/admin/tester/[id] - full detail + structured survey answers. */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const admin = await requireTesterAdmin(request);
  if (!admin.ok || !admin.service) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }
  const service = admin.service;

  const { data: row } = await service
    .from("tester_programmes")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: responses } = await service
    .from("tester_survey_responses")
    .select("survey_key, survey_version, question_id, answer_value, submitted_at")
    .eq("programme_id", params.id)
    .order("submitted_at", { ascending: true });

  // Attach human-readable question labels for each response.
  const labelled = (responses ?? []).map((r: any) => {
    const survey = getSurvey(r.survey_key);
    const q = survey?.questions.find((qq) => qq.id === r.question_id);
    return {
      ...r,
      questionLabel: q?.label ?? r.question_id,
    };
  });

  return NextResponse.json({ tester: row, responses: labelled });
}

/**
 * POST /api/admin/tester/[id]  { action, days? }
 * action: grant | extend | revoke | approve | reject | reset
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const admin = await requireTesterAdmin(request);
  if (!admin.ok || !admin.service) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }
  const service = admin.service;

  const body = await request.json().catch(() => ({}));
  const action = body.action as string;
  const days = Number.isFinite(Number(body.days)) ? Math.max(1, Math.floor(Number(body.days))) : null;

  const { data: rowData } = await service
    .from("tester_programmes")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  const row = rowData as TesterProgrammeRow | null;
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const config = await getTesterConfig(service);
  const nowIso = new Date().toISOString();

  if (action === "reset") {
    await service.from("tester_programmes").delete().eq("id", row.id);
    return NextResponse.json({ ok: true, reset: true });
  }

  if (action === "revoke") {
    await service
      .from("tester_programmes")
      .update({ programme_status: "revoked", revoked_at: nowIso })
      .eq("id", row.id);
    return NextResponse.json({ ok: true });
  }

  if (action === "approve") {
    if (row.programme_status !== "awaiting_manual_approval") {
      return NextResponse.json(
        { error: "Tester is not awaiting approval." },
        { status: 409 },
      );
    }
    await service
      .from("tester_programmes")
      .update({ ...stage3ActivationUpdates(config), manually_approved: true })
      .eq("id", row.id)
      .eq("programme_status", "awaiting_manual_approval");
    await logTesterEvent(service, {
      userId: row.user_id,
      programmeId: row.id,
      event: "stage_3_activated",
      testerStage: 3,
      metadata: { manual: true },
    });
    await enqueueTesterEmail(service, {
      userId: row.user_id,
      programmeId: row.id,
      emailKey: "stage_3_activated",
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "reject") {
    if (row.programme_status !== "awaiting_manual_approval") {
      return NextResponse.json(
        { error: "Tester is not awaiting approval." },
        { status: 409 },
      );
    }
    await service
      .from("tester_programmes")
      .update({ programme_status: "programme_completed", completed_at: nowIso })
      .eq("id", row.id);
    return NextResponse.json({ ok: true });
  }

  if (action === "grant" || action === "extend") {
    const grantDays = days ?? config.stage_3_days;

    // Extend the currently-active window if there is one; otherwise open a new
    // manual premium window (tracked in the stage-3 fields).
    const activeField =
      row.programme_status === "stage_1_active"
        ? "stage_1_expires_at"
        : row.programme_status === "stage_2_active"
          ? "stage_2_expires_at"
          : row.programme_status === "stage_3_active"
            ? "stage_3_expires_at"
            : null;

    if (action === "extend" && activeField) {
      const current = (row as any)[activeField]
        ? new Date((row as any)[activeField]).getTime()
        : Date.now();
      const base = new Date(Math.max(current, Date.now()));
      await service
        .from("tester_programmes")
        .update({ [activeField]: addDays(base, grantDays).toISOString() })
        .eq("id", row.id);
      return NextResponse.json({ ok: true });
    }

    // grant (or extend with no active window) => manual stage-3 style window.
    await service
      .from("tester_programmes")
      .update({
        programme_status: "stage_3_active",
        current_stage: 3,
        stage_3_started_at: nowIso,
        stage_3_expires_at: addDays(new Date(), grantDays).toISOString(),
        manually_approved: true,
      })
      .eq("id", row.id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
