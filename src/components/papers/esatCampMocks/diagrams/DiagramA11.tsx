import React from "react";
import { Arrow } from "./_svg";

export default function DiagramA11() {
  return (
    <svg
      viewBox="0 0 560 240"
      className="h-auto w-full max-w-xl"
      role="img"
      aria-label="Ultrasound flaw detection. Left: a block with a probe on top, a crack shown as a dashed line, and arrows showing ultrasound paths. Right: reflected pulse graph with bars at 0.12 ms and 0.20 ms."
      fill="none"
      stroke="currentColor"
    >
      {/* Left diagram: block with probe */}
      <rect x="40" y="50" width="160" height="170" strokeWidth={2} />

      {/* Probe on top */}
      <rect x="95" y="35" width="50" height="18" strokeWidth={2} fill="currentColor" />
      <text x="120" y="30" textAnchor="middle" fontSize="12" fontWeight="bold" fill="currentColor" stroke="none" fontFamily="sans-serif">
        probe
      </text>

      {/* Ultrasound arrows down and up */}
      <Arrow x1={115} y1={55} x2={115} y2={130} strokeWidth={2} />
      <Arrow x1={125} y1={130} x2={125} y2={55} strokeWidth={2} />
      {/* Longer arrows to far surface */}
      <Arrow x1={108} y1={55} x2={108} y2={205} strokeWidth={1.5} dashed />
      <Arrow x1={100} y1={205} x2={100} y2={55} strokeWidth={1.5} dashed />

      {/* Crack - dashed horizontal line */}
      <line x1="100" y1="135" x2="200" y2="135" strokeWidth={2.5} strokeDasharray="8 4" />
      <text x="210" y="140" fontSize="12" fill="currentColor" stroke="none" fontFamily="sans-serif">
        crack
      </text>

      {/* Far surface label */}
      <text x="120" y="232" textAnchor="middle" fontSize="12" fill="currentColor" stroke="none" fontFamily="sans-serif">
        far surface
      </text>

      {/* Right diagram: reflected pulse graph */}
      {/* Axes */}
      <line x1="300" y1="30" x2="300" y2="195" strokeWidth={2} />
      <line x1="300" y1="195" x2="530" y2="195" strokeWidth={2} />

      {/* Y-axis label */}
      <text
        x="280"
        y="112"
        textAnchor="middle"
        fontSize="12"
        fill="currentColor"
        stroke="none"
        fontFamily="sans-serif"
        transform="rotate(-90, 280, 112)"
      >
        reflected pulse
      </text>

      {/* X-axis label */}
      <text x="415" y="225" textAnchor="middle" fontSize="12" fill="currentColor" stroke="none" fontFamily="sans-serif">
        time / ms
      </text>

      {/* X ticks */}
      <text x="300" y="212" textAnchor="middle" fontSize="11" fill="currentColor" stroke="none">0.00</text>
      <text x="400" y="212" textAnchor="middle" fontSize="11" fill="currentColor" stroke="none">0.12</text>
      <text x="490" y="212" textAnchor="middle" fontSize="11" fill="currentColor" stroke="none">0.20</text>

      <line x1="400" y1="195" x2="400" y2="200" strokeWidth={1.5} />
      <line x1="490" y1="195" x2="490" y2="200" strokeWidth={1.5} />

      {/* Crack reflection bar - dashed fill to distinguish from far surface bar */}
      <rect x="395" y="80" width="10" height="115" fill="currentColor" stroke="none" opacity={0.5} />

      {/* Far surface reflection bar - solid */}
      <rect x="485" y="45" width="10" height="150" fill="currentColor" stroke="none" />
    </svg>
  );
}
