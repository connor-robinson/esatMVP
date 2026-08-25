import React from "react";
import { Arrow } from "./_svg";

export default function DiagramB5() {
  return (
    <svg
      viewBox="0 0 480 200"
      className="h-auto w-full max-w-md"
      role="img"
      aria-label="Two parallel vertical wires carrying current upward. Left wire carries current I, right wire carries current 2I. Point M is midway between them at equal distances."
      fill="none"
      stroke="currentColor"
    >
      {/* Left wire */}
      <rect x="105" y="35" width="8" height="130" fill="currentColor" stroke="none" />
      <text x="109" y="25" textAnchor="middle" fontSize="16" fontWeight="bold" fill="currentColor" stroke="none" fontFamily="sans-serif">
        I
      </text>
      {/* Current arrow up */}
      <Arrow x1={130} y1={145} x2={130} y2={45} strokeWidth={2.5} />

      {/* Right wire */}
      <rect x="345" y="35" width="8" height="130" fill="currentColor" stroke="none" />
      <text x="349" y="25" textAnchor="middle" fontSize="16" fontWeight="bold" fill="currentColor" stroke="none" fontFamily="sans-serif">
        2I
      </text>
      {/* Current arrow up */}
      <Arrow x1={370} y1={145} x2={370} y2={45} strokeWidth={2.5} />

      {/* Point M */}
      <circle cx="240" cy="105" r="5" fill="currentColor" stroke="none" />
      <text x="240" y="130" textAnchor="middle" fontSize="16" fontWeight="bold" fill="currentColor" stroke="none" fontFamily="sans-serif">
        M
      </text>

      {/* "equal distances" label */}
      <text x="240" y="175" textAnchor="middle" fontSize="13" fill="currentColor" stroke="none" fontFamily="sans-serif" fontStyle="italic">
        equal distances
      </text>
    </svg>
  );
}
