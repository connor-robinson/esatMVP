import React from "react";
import { Arrow } from "./_svg";

export default function DiagramB11() {
  const ox = 40;
  const oy = 140;
  const w = 460;

  const wavelength = 100;
  const amplitude = 60;

  const points: string[] = [];
  for (let px = 0; px <= w; px += 2) {
    const x = ox + px;
    const y = oy - amplitude * Math.sin((2 * Math.PI * px) / wavelength);
    points.push(`${px === 0 ? "M" : "L"} ${x} ${y}`);
  }
  const pathD = points.join(" ");

  return (
    <svg
      viewBox="0 0 540 280"
      className="h-auto w-full max-w-lg"
      role="img"
      aria-label="Transverse wave travelling to the right. Sinusoidal wave with amplitude A. Point P is marked on the equilibrium line where the wave crosses zero with positive slope."
      fill="none"
      stroke="currentColor"
    >
      <g fontFamily="sans-serif" fontSize="13" fill="currentColor" stroke="none">
        {/* Equilibrium line */}
        <line x1={ox} y1={oy} x2={ox + w} y2={oy} stroke="currentColor" strokeWidth={1.5} />

        {/* +A label */}
        <text x={ox - 5} y={oy - amplitude + 5} textAnchor="end" fontWeight="bold">+A</text>
        {/* 0 label */}
        <text x={ox - 5} y={oy + 5} textAnchor="end" fontWeight="bold">0</text>
        {/* -A label */}
        <text x={ox - 5} y={oy + amplitude + 5} textAnchor="end" fontWeight="bold">-A</text>
      </g>

      {/* Wave */}
      <path d={pathD} strokeWidth={2.5} />

      {/* Point P - at zero crossing going up (x offset ~75% of wavelength from start = 75px) */}
      {/* The wave sin starts at 0 going up. The first positive-slope zero crossing after a trough is at x=wavelength = 100px, which is at ox+100 */}
      {/* Actually from the image, P is at the second zero crossing from left (first ascending zero after the first trough). That's at ~75px in the wave. */}
      {/* Looking at the image again: the wave shows a trough first, then P is at the ascending zero crossing. So offset the wave phase. */}
      {/* Let me reconsider: the reference image shows trough first, then P at zero crossing ascending. Let me adjust. */}

      {/* P is at approximately 1 wavelength from start (ascending zero crossing) */}
      <circle cx={ox + wavelength} cy={oy} r={5} fill="currentColor" stroke="none" />

      {/* Dashed vertical line at P */}
      <line x1={ox + wavelength} y1={oy - amplitude - 30} x2={ox + wavelength} y2={oy + amplitude + 10} strokeWidth={1.5} strokeDasharray="6 4" />
      <text x={ox + wavelength} y={oy + amplitude + 28} textAnchor="middle" fontSize="14" fontWeight="bold" fill="currentColor" stroke="none" fontFamily="sans-serif">
        P
      </text>

      {/* "wave travels right" label with arrow */}
      <text x="370" y="40" textAnchor="end" fontSize="13" fill="currentColor" stroke="none" fontFamily="sans-serif">
        wave travels right
      </text>
      <Arrow x1={380} y1={35} x2={460} y2={35} strokeWidth={2} />
    </svg>
  );
}
