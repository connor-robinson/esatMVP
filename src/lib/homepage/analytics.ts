import type { HomepageUserState } from "./types";
import type { CalibrationStatus } from "@/lib/calibration/types";
import type { SubscriptionTier } from "@/hooks/useSubscription";

export type HomepageAnalyticsEvent =
  | "homepage_viewed"
  | "homepage_primary_cta_clicked"
  | "homepage_section_opened"
  | "calibration_cta_clicked"
  | "recommended_practice_clicked"
  | "upgrade_cta_clicked"
  | "tester_reward_cta_clicked"
  | "fermi_game_clicked"
  | "score_converter_clicked";

export interface HomepageAnalyticsProperties {
  user_state?: HomepageUserState;
  subscription_status?: SubscriptionTier;
  tester_stage?: string;
  calibration_status?: CalibrationStatus;
  primary_cta_type?: string;
  destination?: string;
  traffic_source?: string;
  section?: string;
}

export async function trackHomepageEvent(
  event: HomepageAnalyticsEvent,
  properties?: HomepageAnalyticsProperties,
): Promise<void> {
  try {
    await fetch("/api/homepage/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, properties }),
      keepalive: true,
    });
  } catch {
    /* non-critical */
  }
}

export function mapSectionEvent(
  destination: string,
): HomepageAnalyticsEvent {
  if (destination === "fermi_game") return "fermi_game_clicked";
  if (destination === "score_converter") return "score_converter_clicked";
  if (destination === "calibration") return "calibration_cta_clicked";
  if (destination === "recommended_practice") {
    return "recommended_practice_clicked";
  }
  return "homepage_section_opened";
}
