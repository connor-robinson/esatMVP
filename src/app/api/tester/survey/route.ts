import { NextRequest, NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/supabase/auth";
import { createTesterServiceClient, getTesterConfig } from "@/lib/tester/service";
import { syncTesterProgramme, addHours } from "@/lib/tester/access";
import { logTesterEvent } from "@/lib/tester/analytics";
import { enqueueTesterEmail } from "@/lib/tester/email";
import { getSurvey, validateSurveySubmission } from "@/lib/tester/surveys";
import type {
  SurveyAnswer,
  SurveyKey,
  ProgrammeStatus,
  TesterProgrammeRow,
  TestimonialDisplayType,
  TestimonialPermission,
} from "@/lib/tester/types";

export const dynamic = "force-dynamic";

const ALLOWED_STATUSES: Record<SurveyKey, ProgrammeStatus[]> = {
  initial: ["stage_1_survey_pending"],
  stage_1_feedback: ["stage_1_expired"],
  final: ["stage_2_expired", "final_survey_pending"],
};

/**
 * POST /api/tester/survey
 * Submit a completed tester survey. Idempotent (one submission per survey per
 * programme). Surveys record completion; premium rewards are granted server-side
 * by syncTesterProgramme once all eligibility conditions are met.
 *
 * Body: { surveyKey: SurveyKey, answers: { questionId, value }[] }
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireRouteUser(request);
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const surveyKey = body.surveyKey as SurveyKey;
    const answers: SurveyAnswer[] = Array.isArray(body.answers) ? body.answers : [];

    if (!surveyKey || !["initial", "stage_1_feedback", "final"].includes(surveyKey)) {
      return NextResponse.json({ error: "Unknown survey" }, { status: 400 });
    }

    const survey = getSurvey(surveyKey);
    const validationError = validateSurveySubmission(survey, answers);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const service = createTesterServiceClient();
    await getTesterConfig(service);

    const { data: rowData } = await service
      .from("tester_programmes")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    let row = rowData as TesterProgrammeRow | null;

    if (!row) {
      return NextResponse.json(
        { error: "You have not joined the tester programme." },
        { status: 400 },
      );
    }

    if (!ALLOWED_STATUSES[surveyKey].includes(row.programme_status)) {
      return NextResponse.json(
        { error: "This survey is not available at your current stage." },
        { status: 409 },
      );
    }

    // Idempotency guard: one submission per (programme, survey).
    const { data: submission, error: submissionError } = await service
      .from("tester_survey_submissions")
      .insert({
        user_id: user.id,
        programme_id: row.id,
        survey_key: surveyKey,
        survey_version: survey.version,
        tester_stage: row.current_stage,
      })
      .select("id")
      .single();

    if (submissionError || !submission) {
      // Already submitted - return current state without re-applying rewards.
      const { state } = await syncTesterProgramme(service, user.id);
      return NextResponse.json({ state, alreadySubmitted: true });
    }

    // Store structured, versioned responses.
    const answerMap: Record<string, string | number | string[]> = {};
    for (const a of answers) answerMap[a.questionId] = a.value;

    const responseRows = answers.map((a) => ({
      user_id: user.id,
      programme_id: row!.id,
      submission_id: submission.id,
      survey_key: surveyKey,
      survey_version: survey.version,
      question_id: a.questionId,
      answer_value: a.value,
      tester_stage: row!.current_stage,
    }));
    if (responseRows.length > 0) {
      await service.from("tester_survey_responses").insert(responseRows as never);
    }

    const nowIso = new Date().toISOString();

    if (surveyKey === "initial") {
      const config = await getTesterConfig(service);
      const expires = addHours(new Date(), config.stage_1_hours).toISOString();
      const { data: updated } = await service
        .from("tester_programmes")
        .update({
          programme_status: "stage_1_active",
          current_stage: 1,
          stage_1_started_at: nowIso,
          stage_1_expires_at: expires,
          stage_1_survey_completed_at: nowIso,
        })
        .eq("id", row.id)
        .eq("programme_status", "stage_1_survey_pending")
        .select("*")
        .maybeSingle();
      if (updated) row = updated as TesterProgrammeRow;

      await logTesterEvent(service, {
        userId: user.id,
        programmeId: row.id,
        event: "initial_survey_completed",
        testerStage: 1,
      });
      await logTesterEvent(service, {
        userId: user.id,
        programmeId: row.id,
        event: "stage_1_activated",
        testerStage: 1,
      });
      await enqueueTesterEmail(service, {
        userId: user.id,
        programmeId: row.id,
        emailKey: "welcome_stage_1",
      });
    } else if (surveyKey === "stage_1_feedback") {
      await service
        .from("tester_programmes")
        .update({ stage_1_feedback_completed_at: nowIso })
        .eq("id", row.id);
      await logTesterEvent(service, {
        userId: user.id,
        programmeId: row.id,
        event: "stage_1_feedback_completed",
        testerStage: 1,
      });
    } else if (surveyKey === "final") {
      const willing = answerMap["testimonial_willing"] as string | undefined;
      const testimonialText =
        willing === "yes" ? (answerMap["testimonial_text"] as string) ?? null : null;
      const displayType =
        willing === "yes"
          ? ((answerMap["testimonial_display"] as TestimonialDisplayType) ?? null)
          : null;
      const permission = (willing as TestimonialPermission) ?? null;
      const followUp = answerMap["follow_up_ok"] === "yes";

      await service
        .from("tester_programmes")
        .update({
          final_survey_completed_at: nowIso,
          follow_up_contact_allowed: followUp,
          testimonial_permission: permission,
          testimonial_display_type: displayType,
          testimonial_text: testimonialText,
        })
        .eq("id", row.id);

      await logTesterEvent(service, {
        userId: user.id,
        programmeId: row.id,
        event: "final_survey_completed",
        testerStage: 2,
      });
      if (willing === "yes" && testimonialText) {
        await logTesterEvent(service, {
          userId: user.id,
          programmeId: row.id,
          event: "testimonial_submitted",
          testerStage: 2,
          metadata: { displayType },
        });
      }
    }

    // Apply any newly-unlocked rewards (grants happen here, idempotently).
    const { state } = await syncTesterProgramme(service, user.id);
    return NextResponse.json({ state, submitted: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
