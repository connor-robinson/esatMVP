import React from "react";
import { Arrow, DoubleArrow } from "./_svg";

export default function DiagramB25() {
  return (
    <svg
      viewBox="0 0 520 220"
      className="h-auto w-full max-w-lg"
      role="img"
      aria-label="Two blocks X and Y in thermal contact. X has length L and area 2A. Y has length 2L and area A. Left side at 80 degrees C, right side at 30 degrees C. Steady thermal-energy flow from left to right. Boundary temperature unknown."
      fill="none"
      stroke="currentColor"
    >
      {/* "steady thermal-energy flow" arrow */}
      <text x="260" y="22" textAnchor="middle" fontSize="13" fill="currentColor" stroke="none" fontFamily="sans-serif" fontStyle="italic">
        steady thermal-energy flow
      </text>
      <Arrow x1={130} y1={38} x2={420} y2={38} strokeWidth={2} />

      {/* Temperature labels */}
      <text x="90" y="68" textAnchor="middle" fontSize="14" fontWeight="bold" fill="currentColor" stroke="none" fontFamily="sans-serif">
        80 degrees C
      </text>
      <text x="430" y="68" textAnchor="middle" fontSize="14" fontWeight="bold" fill="currentColor" stroke="none" fontFamily="sans-serif">
        30 degrees C
      </text>

      {/* Block X - shorter, taller */}
      <rect x="70" y="82" width="150" height="70" strokeWidth={2.5} />
      <text x="145" y="112" textAnchor="middle" fontSize="16" fontWeight="bold" fill="currentColor" stroke="none" fontFamily="sans-serif">
        X
      </text>
      <text x="145" y="135" textAnchor="middle" fontSize="12" fontWeight="bold" fill="currentColor" stroke="none" fontFamily="sans-serif">
        length L, area 2A
      </text>

      {/* Block Y - longer, shorter height to suggest smaller area */}
      <rect x="220" y="90" width="230" height="55" strokeWidth={2.5} />
      <text x="335" y="115" textAnchor="middle" fontSize="16" fontWeight="bold" fill="currentColor" stroke="none" fontFamily="sans-serif">
        Y
      </text>
      <text x="335" y="135" textAnchor="middle" fontSize="12" fontWeight="bold" fill="currentColor" stroke="none" fontFamily="sans-serif">
        length 2L, area A
      </text>

      {/* Boundary dashed line */}
      <line x1="220" y1="78" x2="220" y2="175" strokeWidth={1.5} strokeDasharray="6 4" />

      {/* "boundary temperature?" label */}
      <text x="220" y="195" textAnchor="middle" fontSize="13" fill="currentColor" stroke="none" fontFamily="sans-serif" fontStyle="italic">
        boundary temperature?
      </text>
    </svg>
  );
}
