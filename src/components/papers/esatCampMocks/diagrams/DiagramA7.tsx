import React from "react";
import { Arrow, Cross } from "./_svg";

export default function DiagramA7() {
  return (
    <svg
      viewBox="0 0 520 260"
      className="h-auto w-full max-w-lg"
      role="img"
      aria-label="Current-carrying wire in a magnetic field directed into the page, with I = 2.5 A upward and magnetic force pointing left. Wire length in field is 0.15 m."
      fill="none"
      stroke="currentColor"
    >
      <text x="470" y="28" textAnchor="end" fontSize="14" fill="currentColor" stroke="none" fontFamily="sans-serif">
        B into page
      </text>

      {/* Top and bottom rails */}
      <line x1="30" y1="50" x2="490" y2="50" strokeWidth={3} />
      <line x1="30" y1="210" x2="490" y2="210" strokeWidth={3} />

      {/* Wire (vertical bar) */}
      <rect x="252" y="48" width="8" height="164" fill="currentColor" stroke="none" />

      {/* Current arrow (upward) - thick */}
      <Arrow x1={270} y1={185} x2={270} y2={70} strokeWidth={3} />

      {/* I = 2.5 A label */}
      <text x="310" y="130" fontSize="14" fill="currentColor" stroke="none" fontFamily="sans-serif">
        I = 2.5 A
      </text>

      {/* Magnetic force arrow (left) - dashed to distinguish from current */}
      <Arrow x1={230} y1={130} x2={120} y2={130} strokeWidth={3} />
      <text x="100" y="125" textAnchor="end" fontSize="13" fill="currentColor" stroke="none" fontFamily="sans-serif">
        magnetic force
      </text>

      {/* Crosses for B field - left of wire */}
      <Cross cx={100} cy={90} />
      <Cross cx={170} cy={90} />
      <Cross cx={100} cy={170} />
      <Cross cx={170} cy={170} />

      {/* Crosses for B field - right of wire */}
      <Cross cx={340} cy={90} />
      <Cross cx={410} cy={90} />
      <Cross cx={340} cy={170} />
      <Cross cx={410} cy={170} />

      {/* 0.15 m in field label */}
      <text x="260" y="245" textAnchor="middle" fontSize="14" fill="currentColor" stroke="none" fontFamily="sans-serif" fontStyle="italic">
        0.15 m in field
      </text>
    </svg>
  );
}
