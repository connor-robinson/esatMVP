"use client";

import { PearsonSpinner } from "./PearsonSpinner";

/**
 * Post–End Exam loading overlay: blurred exam chrome + radial pill spinner.
 * VERIFIED_ESAT specimen player (Aug 2026).
 */
export function PearsonSessionEndingOverlay() {
  return (
    <div
      className="pearson-session-ending"
      role="status"
      aria-live="polite"
      aria-label="Loading, please wait"
    >
      <PearsonSpinner />
    </div>
  );
}
