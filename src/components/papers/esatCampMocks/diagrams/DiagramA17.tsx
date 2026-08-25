import React from "react";
import { Arrow } from "./_svg";

export default function DiagramA17() {
  return (
    <svg
      viewBox="0 0 520 300"
      className="h-auto w-full max-w-lg"
      role="img"
      aria-label="Refraction diagram. Incident wavefronts in region X (lambda = 6.0 cm) hit a boundary. A normal line is shown. Refracted ray enters region Y (lambda = 4.0 cm) bending towards normal."
      fill="none"
      stroke="currentColor"
    >
      {/* Region labels */}
      <text x="440" y="40" textAnchor="end" fontSize="14" fontWeight="bold" fill="currentColor" stroke="none" fontFamily="sans-serif">
        region X: lambda = 6.0 cm
      </text>
      <text x="200" y="280" fontSize="14" fontWeight="bold" fill="currentColor" stroke="none" fontFamily="sans-serif">
        region Y: lambda = 4.0 cm
      </text>

      {/* Boundary line (horizontal) */}
      <line x1="20" y1="145" x2="500" y2="145" strokeWidth={2.5} />

      {/* Normal (vertical dashed) */}
      <line x1="260" y1="50" x2="260" y2="260" strokeWidth={1.5} strokeDasharray="6 4" />
      <text x="278" y="70" fontSize="12" fill="currentColor" stroke="none" fontFamily="sans-serif" fontStyle="italic">
        normal
      </text>

      {/* Incident ray - coming from upper left to boundary point */}
      <Arrow x1={130} y1={40} x2={256} y2={142} strokeWidth={2.5} />

      {/* Incident wavefronts (perpendicular to ray) */}
      <line x1="120" y1="55" x2="155" y2="35" strokeWidth={1.5} />
      <line x1="165" y1="80" x2="200" y2="60" strokeWidth={1.5} />

      {/* Refracted ray - from boundary point going down-right, closer to normal */}
      <Arrow x1={264} y1={148} x2={370} y2={275} strokeWidth={2.5} />

      {/* Refracted wavefronts */}
      <line x1="290" y1="175" x2="320" y2="165" strokeWidth={1.5} />
      <line x1="310" y1="210" x2="340" y2="200" strokeWidth={1.5} />
    </svg>
  );
}
