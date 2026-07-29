import { trackEvent } from "@/lib/ga";

/**
 * Structured calibration funnel analytics.
 *
 * Events are posted to a lightweight endpoint that stores them in
 * `homepage_analytics_events` (event name + JSON properties). Raw answer
 * content is never sent — only diagnostic metadata.
 */

export type CalibrationAnalyticsEvent =
  | "calibration_landing_viewed"
  | "calibration_start_clicked"
  | "calibration_started"
  | "calibration_question_viewed"
  | "calibration_answer_selected"
  | "calibration_answer_changed"
  | "calibration_question_skipped"
  | "calibration_confidence_submitted"
  | "calibration_marked_for_review"
  | "calibration_abandoned"
  | "calibration_resumed"
  | "calibration_completed"
  | "calibration_results_viewed"
  | "calibration_strength_opened"
  | "calibration_weakness_opened"
  | "calibration_solution_viewed"
  | "calibration_sign_in_clicked"
  | "calibration_sign_in_completed"
  | "calibration_recommended_session_clicked"
  | "calibration_plan_activated"
  | "calibration_upgrade_viewed"
  | "calibration_upgrade_clicked"
  | "calibration_upgrade_completed";

export type CalibrationUserState =
  | "signed_out"
  | "free"
  | "premium"
  | "unknown";

export interface CalibrationAnalyticsProps {
  user_state?: CalibrationUserState;
  attempt_id?: string;
  question_number?: number;
  elapsed_seconds?: number;
  readiness_band?: string;
  primary_weakness?: string;
  cta_placement?: string;
  destination?: string;
  [key: string]: string | number | boolean | undefined | null;
}

export async function trackCalibrationEvent(
  event: CalibrationAnalyticsEvent,
  properties: CalibrationAnalyticsProps = {},
): Promise<void> {
  if (event === "calibration_started") {
    trackEvent("calibration_started", {
      user_state: properties.user_state,
      attempt_id: properties.attempt_id,
      cta_placement: properties.cta_placement,
    });
  }

  try {
    await fetch("/api/calibration/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, properties }),
      keepalive: true,
    });
  } catch {
    /* analytics is non-critical */
  }
}
