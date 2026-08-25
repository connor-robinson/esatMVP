import React from "react";
import { Arrow } from "./_svg";

export default function DiagramA23() {
  return (
    <svg
      viewBox="0 0 480 220"
      className="h-auto w-full max-w-md"
      role="img"
      aria-label="A coil on the left. A bar magnet labelled N and S approaches the coil at velocity v from the right. Below, an arrow shows the magnet returns at 2v past position X."
      fill="none"
      stroke="currentColor"
    >
      {/* "towards coil at v" label + arrow */}
      <text x="250" y="25" textAnchor="middle" fontSize="13" fill="currentColor" stroke="none" fontFamily="sans-serif">
        towards coil at v
      </text>
      <Arrow x1={350} y1={38} x2={140} y2={38} strokeWidth={2.5} />

      {/* Coil (series of loops) */}
      <ellipse cx="60" cy="100" rx="15" ry="55" strokeWidth={2} />
      <ellipse cx="70" cy="100" rx="15" ry="55" strokeWidth={2} />
      <ellipse cx="80" cy="100" rx="15" ry="55" strokeWidth={2} />
      <ellipse cx="90" cy="100" rx="15" ry="55" strokeWidth={2} />

      <text x="75" y="180" textAnchor="middle" fontSize="13" fontWeight="bold" fill="currentColor" stroke="none" fontFamily="sans-serif">
        coil
      </text>

      {/* Bar magnet */}
      <rect x="200" y="75" width="130" height="50" strokeWidth={2} />
      <line x1="265" y1="75" x2="265" y2="125" strokeWidth={1.5} />
      <text x="230" y="107" textAnchor="middle" fontSize="18" fontWeight="bold" fill="currentColor" stroke="none" fontFamily="sans-serif">
        N
      </text>
      <text x="300" y="107" textAnchor="middle" fontSize="18" fontWeight="bold" fill="currentColor" stroke="none" fontFamily="sans-serif">
        S
      </text>

      {/* "returns at 2v" arrow + label below */}
      <Arrow x1={140} y1={165} x2={290} y2={165} strokeWidth={2.5} />
      <text x="170" y="195" fontSize="13" fill="currentColor" stroke="none" fontFamily="sans-serif">
        returns at 2v
      </text>
      <text x="310" y="168" fontSize="14" fontWeight="bold" fill="currentColor" stroke="none" fontFamily="sans-serif">
        X
      </text>
    </svg>
  );
}
