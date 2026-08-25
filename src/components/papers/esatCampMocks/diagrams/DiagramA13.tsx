import React from "react";

export default function DiagramA13() {
  return (
    <svg
      viewBox="0 0 500 280"
      className="h-auto w-full max-w-md"
      role="img"
      aria-label="Circuit with 12 V battery. Two parallel branches: top branch has 6.0 ohm resistor with forward biased diode, bottom branch has 3.0 ohm resistor with reverse biased diode."
      fill="none"
      stroke="currentColor"
    >
      {/* Battery left side */}
      <line x1="50" y1="50" x2="50" y2="110" strokeWidth={2} />
      <line x1="50" y1="170" x2="50" y2="230" strokeWidth={2} />
      {/* Battery symbol */}
      <line x1="38" y1="110" x2="62" y2="110" strokeWidth={3} />
      <line x1="42" y1="125" x2="58" y2="125" strokeWidth={1.5} />
      <line x1="38" y1="140" x2="62" y2="140" strokeWidth={3} />
      <line x1="42" y1="155" x2="58" y2="155" strokeWidth={1.5} />
      <line x1="50" y1="155" x2="50" y2="170" strokeWidth={2} />
      <text x="68" y="118" fontSize="11" fill="currentColor" stroke="none">+</text>
      <text x="68" y="158" fontSize="11" fill="currentColor" stroke="none">-</text>

      {/* Junction left */}
      <line x1="50" y1="50" x2="120" y2="50" strokeWidth={2} />
      <line x1="50" y1="230" x2="120" y2="230" strokeWidth={2} />

      {/* Top branch wire */}
      <line x1="120" y1="50" x2="120" y2="80" strokeWidth={2} />
      <line x1="120" y1="80" x2="450" y2="80" strokeWidth={2} />

      {/* Bottom branch wire */}
      <line x1="120" y1="230" x2="120" y2="200" strokeWidth={2} />
      <line x1="120" y1="200" x2="450" y2="200" strokeWidth={2} />

      {/* Right junction */}
      <line x1="450" y1="80" x2="450" y2="200" strokeWidth={2} />

      {/* 6.0 ohm resistor - top branch */}
      <rect x="170" y="68" width="80" height="24" strokeWidth={2} />
      <text x="210" y="60" textAnchor="middle" fontSize="12" fill="currentColor" stroke="none" fontFamily="sans-serif">
        6.0 ohm
      </text>

      {/* Forward biased diode - top branch (triangle + line, solid) */}
      <polygon points="320,68 320,92 350,80" strokeWidth={2} fill="none" />
      <line x1="350" y1="68" x2="350" y2="92" strokeWidth={2.5} />
      <text x="335" y="58" textAnchor="middle" fontSize="12" fill="currentColor" stroke="none" fontFamily="sans-serif">
        forward biased
      </text>

      {/* 3.0 ohm resistor - bottom branch */}
      <rect x="170" y="188" width="80" height="24" strokeWidth={2} />
      <text x="210" y="182" textAnchor="middle" fontSize="12" fill="currentColor" stroke="none" fontFamily="sans-serif">
        3.0 ohm
      </text>

      {/* Reverse biased diode - bottom branch (triangle pointing left + line) */}
      <line x1="320" y1="188" x2="320" y2="212" strokeWidth={2.5} />
      <polygon points="350,188 350,212 320,200" strokeWidth={2} fill="none" />
      <text x="340" y="178" textAnchor="middle" fontSize="12" fill="currentColor" stroke="none" fontFamily="sans-serif">
        reverse biased
      </text>

      {/* 12 V label */}
      <text x="50" y="260" textAnchor="middle" fontSize="14" fill="currentColor" stroke="none" fontFamily="sans-serif">
        12 V
      </text>
    </svg>
  );
}
