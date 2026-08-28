"use client";

const SEGMENTS = 12;
const SPIN_DURATION_S = 1.2;

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
      <div className="pearson-spinner" aria-hidden="true">
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <span
            key={i}
            className="pearson-spinner-seg"
            style={{
              transform: `rotate(${i * (360 / SEGMENTS)}deg)`,
              animationDelay: `${-(i * SPIN_DURATION_S) / SEGMENTS}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
