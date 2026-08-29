"use client";

const SEGMENTS = 12;
const SPIN_DURATION_S = 1.2;

/** Radial pill spinner (ESAT specimen / between-question loading). */
export function PearsonSpinner() {
  return (
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
  );
}
