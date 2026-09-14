"use client";

import { MAX_REST_BREAKS_PER_SECTION } from "@/lib/papers/restBreaks";

type RestBreakOverlayProps = {
  breaksRemainingAfterResume: number;
  onResume: () => void;
  /** Visual tone for Pearson chrome vs ESAT QB shell. */
  tone?: "pearson" | "esat";
};

/**
 * Obscures test content during a pause-the-clock rest break (UAT-UK rule).
 */
export function RestBreakOverlay({
  breaksRemainingAfterResume,
  onResume,
  tone = "pearson",
}: RestBreakOverlayProps) {
  const rootClass =
    tone === "esat" ? "rest-break-overlay rest-break-overlay--esat" : "rest-break-overlay";

  return (
    <div
      className={rootClass}
      role="dialog"
      aria-modal="true"
      aria-labelledby="rest-break-title"
      aria-describedby="rest-break-desc"
    >
      <div className="rest-break-overlay__card">
        <p className="rest-break-overlay__eyebrow">Access arrangement</p>
        <h2 id="rest-break-title" className="rest-break-overlay__title">
          Rest break
        </h2>
        <p id="rest-break-desc" className="rest-break-overlay__body">
          The clock is paused. Test content is hidden for this break, matching
          pause-the-clock rest breaks on the real exam (up to{" "}
          {MAX_REST_BREAKS_PER_SECTION} per section).
        </p>
        <p className="rest-break-overlay__meta">
          {breaksRemainingAfterResume === 0
            ? "This is your last rest break for this section."
            : `${breaksRemainingAfterResume} rest break${
                breaksRemainingAfterResume === 1 ? "" : "s"
              } left after you resume.`}
        </p>
        <button
          type="button"
          className="rest-break-overlay__resume"
          onClick={onResume}
        >
          Resume test
        </button>
      </div>
    </div>
  );
}
