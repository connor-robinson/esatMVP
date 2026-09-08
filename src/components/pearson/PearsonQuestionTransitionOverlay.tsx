"use client";

import { PearsonSpinner } from "./PearsonSpinner";

/**
 * Blurred overlay + spinner while the next question assets load.
 */
export function PearsonQuestionTransitionOverlay() {
  return (
    <div
      className="pearson-question-transition"
      role="status"
      aria-live="polite"
      aria-label="Loading question"
    >
      <PearsonSpinner />
    </div>
  );
}
