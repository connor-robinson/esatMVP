import { NextRequest, NextResponse } from "next/server";
import { requireTesterAdmin } from "@/lib/tester/admin";
import { getTesterConfig } from "@/lib/tester/service";
import type { Stage3ApprovalMode } from "@/lib/tester/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/tester
 * Lists every tester with stage, expiry, session count and survey completion.
 * Supports filters: ?filter=willing_to_pay|very_disappointed|testimonial_candidate
 *                   ?status=<programme_status>
 */
export async function GET(request: NextRequest) {
  const admin = await requireTesterAdmin(request);
  if (!admin.ok || !admin.service) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }
  const service = admin.service;

  const filter = request.nextUrl.searchParams.get("filter");
  const status = request.nextUrl.searchParams.get("status");

  const config = await getTesterConfig(service);

  let query = service
    .from("tester_programmes")
    .select("*")
    .order("joined_at", { ascending: false });
  if (status) query = query.eq("programme_status", status);

  const { data: programmes, error } = await query;
  if (error) {
    return NextResponse.json({ error: "Failed to load testers" }, { status: 500 });
  }

  const rows = programmes ?? [];
  const userIds = rows.map((r: any) => r.user_id);

  // Attach usernames for identification.
  const usernameById: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await service
      .from("profiles")
      .select("id, username")
      .in("id", userIds);
    for (const p of profiles ?? []) usernameById[p.id] = p.username ?? "";
  }

  // Survey-answer-based filters use structured responses.
  let allowedProgrammeIds: Set<string> | null = null;
  if (filter === "willing_to_pay") {
    const { data } = await service
      .from("tester_survey_responses")
      .select("programme_id, answer_value")
      .eq("survey_key", "final")
      .eq("question_id", "pay_view");
    allowedProgrammeIds = new Set(
      (data ?? [])
        .filter((r: any) =>
          ["definitely_pay", "might_pay"].includes(String(r.answer_value)),
        )
        .map((r: any) => r.programme_id),
    );
  } else if (filter === "very_disappointed") {
    const { data } = await service
      .from("tester_survey_responses")
      .select("programme_id, answer_value")
      .eq("survey_key", "final")
      .eq("question_id", "disappointment");
    allowedProgrammeIds = new Set(
      (data ?? [])
        .filter((r: any) => String(r.answer_value) === "very")
        .map((r: any) => r.programme_id),
    );
  } else if (filter === "testimonial_candidate") {
    allowedProgrammeIds = new Set(
      rows
        .filter((r: any) =>
          ["yes", "maybe_later"].includes(r.testimonial_permission),
        )
        .map((r: any) => r.id),
    );
  }

  const testers = rows
    .filter((r: any) => !allowedProgrammeIds || allowedProgrammeIds.has(r.id))
    .map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      username: usernameById[r.user_id] ?? null,
      status: r.programme_status,
      currentStage: r.current_stage,
      joinedAt: r.joined_at,
      stage1ExpiresAt: r.stage_1_expires_at,
      stage2ExpiresAt: r.stage_2_expires_at,
      stage3ExpiresAt: r.stage_3_expires_at,
      meaningfulSessions: r.meaningful_sessions_completed,
      initialSurveyDone: !!r.stage_1_survey_completed_at,
      feedbackSurveyDone: !!r.stage_1_feedback_completed_at,
      finalSurveyDone: !!r.final_survey_completed_at,
      foundingDiscountEligible: r.founding_discount_eligible,
      testimonialPermission: r.testimonial_permission,
      testimonialDisplayType: r.testimonial_display_type,
      followUpAllowed: r.follow_up_contact_allowed,
      manuallyApproved: r.manually_approved,
      marketingConsent: r.marketing_consent,
    }));

  return NextResponse.json({ testers, config });
}

/**
 * PATCH /api/admin/tester
 * Updates programme configuration (durations, approval mode, thresholds, discount).
 */
export async function PATCH(request: NextRequest) {
  const admin = await requireTesterAdmin(request);
  if (!admin.ok || !admin.service) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }
  const service = admin.service;

  const body = await request.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};

  const intField = (key: string, min: number, max: number) => {
    if (body[key] !== undefined) {
      const n = Number(body[key]);
      if (!Number.isInteger(n) || n < min || n > max) {
        throw new Error(`Invalid ${key}`);
      }
      updates[key] = n;
    }
  };

  try {
    intField("stage_1_hours", 1, 720);
    intField("stage_2_days", 1, 365);
    intField("stage_3_days", 1, 365);
    intField("meaningful_session_min_seconds", 0, 86400);
    intField("meaningful_session_min_questions", 0, 1000);
    intField("founding_discount_percent", 0, 100);

    if (body.stage_3_approval_mode !== undefined) {
      const mode = body.stage_3_approval_mode as Stage3ApprovalMode;
      if (!["auto", "manual", "disabled"].includes(mode)) {
        throw new Error("Invalid stage_3_approval_mode");
      }
      updates.stage_3_approval_mode = mode;
    }
    if (body.offer_to_paid_users !== undefined) {
      updates.offer_to_paid_users = body.offer_to_paid_users === true;
    }
    if (body.founding_discount_code !== undefined) {
      updates.founding_discount_code =
        typeof body.founding_discount_code === "string"
          ? body.founding_discount_code.slice(0, 100) || null
          : null;
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  await service.from("tester_programme_config").update(updates).eq("id", 1);
  const config = await getTesterConfig(service);
  return NextResponse.json({ config });
}
