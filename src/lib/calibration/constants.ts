/**
 * Calibration product constants.
 *
 * The Mathematics 1 Calibration Test lives under Exam Tools. The repo's
 * "Exam Tools" nav section historically maps to `/tools/*`; the calibration
 * product uses the spec-mandated `/exam-tools/calibration` base and the nav /
 * section resolver treats `/exam-tools` as part of the Exam Tools section.
 */

export const CALIBRATION_TEST_ID = "esat_math1_calibration_v1";

/** Total questions in the Math 1 calibration. Kept for legacy homepage copy. */
export const CALIBRATION_TOTAL_QUESTIONS = 15;

/** Recommended overall time limit, in seconds (23 minutes). */
export const CALIBRATION_TIME_LIMIT_SECONDS = 23 * 60;

/** Days after completion before suggesting a retake (legacy homepage logic). */
export const CALIBRATION_OUTDATED_DAYS = 30;

/** Minimum practice sessions since calibration before suggesting retake. */
export const CALIBRATION_OUTDATED_SESSIONS = 10;

/** Minimum days before a same-form retake is encouraged. */
export const CALIBRATION_RETAKE_MIN_DAYS = 7;

const CALIBRATION_BASE = "/exam-tools/calibration";
const MATH1_BASE = `${CALIBRATION_BASE}/math-1`;

export const CALIBRATION_ROUTES = {
  /** Exam Tools → Calibration index. */
  index: CALIBRATION_BASE,
  /** Math 1 landing page (primary entry / "hub"). */
  hub: MATH1_BASE,
  math1: MATH1_BASE,
  /** Test-taking route. */
  session: `${MATH1_BASE}/test`,
  test: `${MATH1_BASE}/test`,
  /** Latest-results convenience route (redirects to newest attempt). */
  results: `${MATH1_BASE}/results`,
} as const;

export function calibrationResultsRoute(attemptId: string): string {
  return `${MATH1_BASE}/results/${attemptId}`;
}

/** localStorage / sessionStorage keys for anonymous persistence. */
export const CALIBRATION_STORAGE = {
  anonId: "nocalc:calibrationAnonId",
  attemptPrefix: "nocalc:calibrationAttempt:",
  activeAttemptId: "nocalc:calibrationActiveAttempt:esat_math1_calibration_v1",
  pendingMerge: "nocalc:calibrationPendingMerge",
} as const;
