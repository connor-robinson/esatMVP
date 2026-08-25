import React from "react";
import { Arrow } from "./_svg";

export default function DiagramB14() {
  return (
    <svg
      viewBox="0 0 440 340"
      className="h-auto w-full max-w-sm"
      role="img"
      aria-label="Convection current in a room. A radiator is at the bottom left. A window is at the top right. Arrows show hot air rising from the radiator, moving right across the ceiling, cooling and sinking at the window, then moving left along the floor back to the radiator."
      fill="none"
      stroke="currentColor"
    >
      {/* Room outline */}
      <rect x="40" y="30" width="360" height="280" strokeWidth={2.5} />

      {/* Radiator - bottom left, hatched rectangle */}
      <rect x="55" y="235" width="40" height="55" strokeWidth={2} />
      {/* Hatching lines inside radiator */}
      <line x1="65" y1="235" x2="65" y2="290" strokeWidth={1.5} />
      <line x1="75" y1="235" x2="75" y2="290" strokeWidth={1.5} />
      <line x1="85" y1="235" x2="85" y2="290" strokeWidth={1.5} />
      <text x="75" y="308" textAnchor="middle" fontSize="13" fontWeight="bold" fill="currentColor" stroke="none" fontFamily="sans-serif">
        radiator
      </text>

      {/* Window - top right */}
      <rect x="310" y="70" width="65" height="80" strokeWidth={2.5} />
      <line x1="342" y1="70" x2="342" y2="150" strokeWidth={1.5} />
      <text x="342" y="60" textAnchor="middle" fontSize="13" fontWeight="bold" fill="currentColor" stroke="none" fontFamily="sans-serif">
        window
      </text>

      {/* Convection arrows (clockwise when viewed): */}
      {/* Up from radiator (thick, dashed to distinguish hot air) */}
      <Arrow x1={85} y1={225} x2={85} y2={60} strokeWidth={2.5} />

      {/* Right along ceiling */}
      <Arrow x1={95} y1={55} x2={340} y2={55} strokeWidth={2.5} />

      {/* Down at window */}
      <Arrow x1={345} y1={155} x2={345} y2={245} strokeWidth={2.5} />

      {/* Left along floor */}
      <Arrow x1={330} y1={265} x2={105} y2={265} strokeWidth={2.5} />
    </svg>
  );
}
