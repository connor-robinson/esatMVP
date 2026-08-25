import React from "react";
import { Arrow } from "./_svg";

export default function DiagramB21() {
  return (
    <svg
      viewBox="0 0 520 230"
      className="h-auto w-full max-w-lg"
      role="img"
      aria-label="Electrostatic induction. A negative rod on the left near a conducting sphere. The sphere has positive charges on the near side and negative charges on the far side. The sphere is connected to a temporary earth. Electrons flow from the sphere to earth."
      fill="none"
      stroke="currentColor"
    >
      {/* Negative rod */}
      <rect x="30" y="80" width="130" height="60" strokeWidth={2} />
      <text x="95" y="55" textAnchor="middle" fontSize="14" fontWeight="bold" fill="currentColor" stroke="none" fontFamily="sans-serif">
        negative rod
      </text>
      {/* Dashes (negative charges) inside rod */}
      <text x="60" y="118" textAnchor="middle" fontSize="18" fill="currentColor" stroke="none">-</text>
      <text x="85" y="118" textAnchor="middle" fontSize="18" fill="currentColor" stroke="none">-</text>
      <text x="110" y="118" textAnchor="middle" fontSize="18" fill="currentColor" stroke="none">-</text>
      <text x="135" y="118" textAnchor="middle" fontSize="18" fill="currentColor" stroke="none">-</text>

      {/* Conducting sphere */}
      <circle cx="310" cy="110" r="60" strokeWidth={2.5} />

      {/* + charges on near side (left of sphere) */}
      <text x="275" y="90" textAnchor="middle" fontSize="16" fill="currentColor" stroke="none">+</text>
      <text x="275" y="115" textAnchor="middle" fontSize="16" fill="currentColor" stroke="none">+</text>
      <text x="275" y="140" textAnchor="middle" fontSize="16" fill="currentColor" stroke="none">+</text>

      {/* - charges on far side (right of sphere) */}
      <text x="345" y="82" textAnchor="middle" fontSize="16" fill="currentColor" stroke="none">-</text>
      <text x="348" y="110" textAnchor="middle" fontSize="16" fill="currentColor" stroke="none">-</text>
      <text x="345" y="138" textAnchor="middle" fontSize="16" fill="currentColor" stroke="none">-</text>

      {/* Wire to earth */}
      <line x1="370" y1="110" x2="430" y2="110" strokeWidth={2} />
      <line x1="430" y1="110" x2="430" y2="170" strokeWidth={2} />

      {/* Earth symbol */}
      <line x1="415" y1="170" x2="445" y2="170" strokeWidth={2.5} />
      <line x1="420" y1="180" x2="440" y2="180" strokeWidth={2} />
      <line x1="425" y1="190" x2="435" y2="190" strokeWidth={1.5} />

      {/* "temporary earth" label */}
      <text x="430" y="50" textAnchor="start" fontSize="12" fill="currentColor" stroke="none" fontFamily="sans-serif">
        temporary earth
      </text>

      {/* "electrons" label + arrow */}
      <text x="430" y="68" textAnchor="start" fontSize="12" fill="currentColor" stroke="none" fontFamily="sans-serif">
        electrons
      </text>
      <Arrow x1={395} y1={80} x2={440} y2={80} strokeWidth={2} />
    </svg>
  );
}
