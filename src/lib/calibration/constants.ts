export const CALIBRATION_TOTAL_QUESTIONS = 15;

/** Days after completion before suggesting a retake. */
export const CALIBRATION_OUTDATED_DAYS = 30;

/** Minimum practice sessions since calibration before suggesting retake. */
export const CALIBRATION_OUTDATED_SESSIONS = 10;

export const CALIBRATION_ROUTES = {
  hub: "/calibration",
  session: "/calibration/session",
  results: "/calibration/results",
} as const;
