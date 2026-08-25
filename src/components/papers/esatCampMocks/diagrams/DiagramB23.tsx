import React from "react";
import { Arrow, Cross } from "./_svg";

export default function DiagramB23() {
  return (
    <svg
      viewBox="0 0 520 220"
      className="h-auto w-full max-w-lg"
      role="img"
      aria-label="Wire in a magnetic field B into page. Two current phases shown: first 1.0 A upward for 2.0 s, then 0.50 A downward for 4.0 s. Crosses indicate B field into page."
      fill="none"
      stroke="currentColor"
    >
      {/* "B into page" label */}
      <text x="470" y="28" textAnchor="end" fontSize="14" fill="currentColor" stroke="none" fontFamily="sans-serif">
        B into page
      </text>

      {/* Top and bottom rails */}
      <line x1="30" y1="50" x2="490" y2="50" strokeWidth={3} />
      <line x1="30" y1="190" x2="490" y2="190" strokeWidth={3} />

      {/* Wire (vertical bar) */}
      <rect x="252" y="48" width="8" height="144" fill="currentColor" stroke="none" />

      {/* Current arrow 1: upward (1.0 A for 2.0 s) - solid */}
      <Arrow x1={275} y1={170} x2={275} y2={65} strokeWidth={2.5} />
      <text x="300" y="120" fontSize="12" fill="currentColor" stroke="none" fontFamily="sans-serif">
        1.0 A for 2.0 s
      </text>

      {/* Current arrow 2: downward (0.50 A for 4.0 s) - dashed to distinguish */}
      <Arrow x1={238} y1={65} x2={238} y2={170} strokeWidth={2.5} />
      <text x="225" y="120" textAnchor="end" fontSize="12" fill="currentColor" stroke="none" fontFamily="sans-serif">
        then 0.50 A for 4.0 s
      </text>

      {/* Crosses for B field */}
      <Cross cx={100} cy={120} />
      <Cross cx={170} cy={120} />
      <Cross cx={340} cy={100} />
      <Cross cx={410} cy={100} />
      <Cross cx={340} cy={155} />
      <Cross cx={410} cy={155} />
    </svg>
  );
}
