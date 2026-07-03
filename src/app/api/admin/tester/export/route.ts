import { NextRequest, NextResponse } from "next/server";
import { requireTesterAdmin } from "@/lib/tester/admin";
import { getSurvey } from "@/lib/tester/surveys";

export const dynamic = "force-dynamic";

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s: string;
  if (typeof value === "object") s = JSON.stringify(value);
  else s = String(value);
  if (/[",\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(csvCell).join(",")];
  for (const r of rows) lines.push(r.map(csvCell).join(","));
  return lines.join("\n");
}

/**
 * GET /api/admin/tester/export?type=surveys|metrics
 * Streams a CSV export of survey answers or tester metrics.
 */
export async function GET(request: NextRequest) {
  const admin = await requireTesterAdmin(request);
  if (!admin.ok || !admin.service) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }
  const service = admin.service;
  const type = request.nextUrl.searchParams.get("type") ?? "surveys";

  // Username lookup shared by both exports.
  const { data: profiles } = await service.from("profiles").select("id, username");
  const usernameById: Record<string, string> = {};
  for (const p of profiles ?? []) usernameById[p.id] = p.username ?? "";

  if (type === "metrics") {
    const { data: programmes } = await service
      .from("tester_programmes")
      .select("*")
      .order("joined_at", { ascending: false });

    const headers = [
      "user_id",
      "username",
      "status",
      "current_stage",
      "joined_at",
      "stage_1_expires_at",
      "stage_2_expires_at",
      "stage_3_expires_at",
      "meaningful_sessions_completed",
      "initial_survey_done",
      "feedback_survey_done",
      "final_survey_done",
      "founding_discount_eligible",
      "testimonial_permission",
      "testimonial_display_type",
      "follow_up_contact_allowed",
      "marketing_consent",
    ];
    const rows = (programmes ?? []).map((r: any) => [
      r.user_id,
      usernameById[r.user_id] ?? "",
      r.programme_status,
      r.current_stage,
      r.joined_at,
      r.stage_1_expires_at,
      r.stage_2_expires_at,
      r.stage_3_expires_at,
      r.meaningful_sessions_completed,
      !!r.stage_1_survey_completed_at,
      !!r.stage_1_feedback_completed_at,
      !!r.final_survey_completed_at,
      r.founding_discount_eligible,
      r.testimonial_permission,
      r.testimonial_display_type,
      r.follow_up_contact_allowed,
      r.marketing_consent,
    ]);

    return new NextResponse(toCsv(headers, rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="tester-metrics.csv"',
      },
    });
  }

  // Default: survey responses.
  const { data: responses } = await service
    .from("tester_survey_responses")
    .select(
      "user_id, programme_id, survey_key, survey_version, question_id, answer_value, tester_stage, submitted_at",
    )
    .order("submitted_at", { ascending: true });

  const headers = [
    "programme_id",
    "user_id",
    "username",
    "survey_key",
    "survey_version",
    "question_id",
    "question_label",
    "answer_value",
    "tester_stage",
    "submitted_at",
  ];
  const rows = (responses ?? []).map((r: any) => {
    const survey = getSurvey(r.survey_key);
    const q = survey?.questions.find((qq) => qq.id === r.question_id);
    return [
      r.programme_id,
      r.user_id,
      usernameById[r.user_id] ?? "",
      r.survey_key,
      r.survey_version,
      r.question_id,
      q?.label ?? r.question_id,
      r.answer_value,
      r.tester_stage,
      r.submitted_at,
    ];
  });

  return new NextResponse(toCsv(headers, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="tester-surveys.csv"',
    },
  });
}
