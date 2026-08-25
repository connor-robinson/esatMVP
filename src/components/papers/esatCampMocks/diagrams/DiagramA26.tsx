import React from "react";

export default function DiagramA26() {
  return (
    <svg
      viewBox="0 0 460 320"
      className="h-auto w-full max-w-md"
      role="img"
      aria-label="Circuit with 12 V battery. P (6 ohm) in series with two parallel branches: Q (6 ohm) and R (6 ohm). R branch has a switch."
      fill="none"
      stroke="currentColor"
    >
      {/* Battery left side */}
      <line x1="50" y1="40" x2="50" y2="110" strokeWidth={2} />
      <line x1="50" y1="180" x2="50" y2="280" strokeWidth={2} />
      {/* Battery symbol */}
      <line x1="38" y1="110" x2="62" y2="110" strokeWidth={3.5} />
      <line x1="42" y1="125" x2="58" y2="125" strokeWidth={1.5} />
      <line x1="38" y1="140" x2="62" y2="140" strokeWidth={3.5} />
      <line x1="42" y1="155" x2="58" y2="155" strokeWidth={1.5} />
      <line x1="50" y1="155" x2="50" y2="180" strokeWidth={2} />
      <text x="68" y="118" fontSize="11" fill="currentColor" stroke="none">+</text>
      <text x="68" y="158" fontSize="11" fill="currentColor" stroke="none">-</text>

      {/* Top wire */}
      <line x1="50" y1="40" x2="420" y2="40" strokeWidth={2} />
      {/* Bottom wire */}
      <line x1="50" y1="280" x2="420" y2="280" strokeWidth={2} />

      {/* P 6 ohm - top branch series */}
      <line x1="130" y1="40" x2="130" y2="40" strokeWidth={2} />
      <rect x="130" y="28" width="80" height="24" strokeWidth={2} />
      <text x="170" y="20" textAnchor="middle" fontSize="12" fill="currentColor" stroke="none" fontFamily="sans-serif">
        P 6 ohm
      </text>

      {/* Junction for parallel */}
      <line x1="270" y1="40" x2="270" y2="120" strokeWidth={2} />
      <line x1="270" y1="40" x2="270" y2="40" strokeWidth={2} />

      {/* Q branch */}
      <line x1="270" y1="120" x2="300" y2="120" strokeWidth={2} />
      <rect x="300" y="108" width="80" height="24" strokeWidth={2} />
      <line x1="380" y1="120" x2="420" y2="120" strokeWidth={2} />
      <text x="340" y="100" textAnchor="middle" fontSize="12" fill="currentColor" stroke="none" fontFamily="sans-serif">
        Q 6 ohm
      </text>

      {/* R branch with switch */}
      <line x1="270" y1="120" x2="270" y2="210" strokeWidth={2} />
      <line x1="270" y1="210" x2="300" y2="210" strokeWidth={2} />
      <rect x="300" y="198" width="80" height="24" strokeWidth={2} />
      <line x1="380" y1="210" x2="420" y2="210" strokeWidth={2} />
      <text x="340" y="190" textAnchor="middle" fontSize="12" fill="currentColor" stroke="none" fontFamily="sans-serif">
        R 6 ohm
      </text>

      {/* Switch symbol on R branch */}
      <line x1="315" y1="225" x2="345" y2="240" strokeWidth={2.5} />
      <text x="340" y="258" textAnchor="middle" fontSize="12" fill="currentColor" stroke="none" fontFamily="sans-serif">
        switch
      </text>

      {/* Right junction */}
      <line x1="420" y1="120" x2="420" y2="210" strokeWidth={2} />
      <line x1="420" y1="40" x2="420" y2="120" strokeWidth={2} />
      <line x1="420" y1="210" x2="420" y2="280" strokeWidth={2} />

      {/* 12 V label */}
      <text x="50" y="300" textAnchor="middle" fontSize="14" fill="currentColor" stroke="none" fontFamily="sans-serif">
        12 V
      </text>
    </svg>
  );
}
