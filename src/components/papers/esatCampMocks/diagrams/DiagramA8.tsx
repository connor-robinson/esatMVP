import React from "react";
import { Arrow } from "./_svg";

export default function DiagramA8() {
  return (
    <svg
      viewBox="0 0 520 200"
      className="h-auto w-full max-w-lg"
      role="img"
      aria-label="Two blocks P (2.0 kg) and Q (3.0 kg) on a surface. A 20 N force pushes right on P. Friction of 2 N acts on P and 3 N on Q, both pointing left."
      fill="none"
      stroke="currentColor"
    >
      {/* Surface line */}
      <line x1="30" y1="140" x2="490" y2="140" strokeWidth={2.5} />

      {/* Block P */}
      <rect x="170" y="65" width="110" height="75" strokeWidth={2} />
      <text x="225" y="95" textAnchor="middle" fontSize="16" fontWeight="bold" fill="currentColor" stroke="none" fontFamily="sans-serif">P</text>
      <text x="225" y="118" textAnchor="middle" fontSize="14" fill="currentColor" stroke="none" fontFamily="sans-serif">2.0 kg</text>

      {/* Block Q */}
      <rect x="280" y="65" width="120" height="75" strokeWidth={2} />
      <text x="340" y="95" textAnchor="middle" fontSize="16" fontWeight="bold" fill="currentColor" stroke="none" fontFamily="sans-serif">Q</text>
      <text x="340" y="118" textAnchor="middle" fontSize="14" fill="currentColor" stroke="none" fontFamily="sans-serif">3.0 kg</text>

      {/* 20 N force arrow (right) */}
      <Arrow x1={80} y1={100} x2={165} y2={100} strokeWidth={3} />
      <text x="60" y="90" textAnchor="end" fontSize="14" fill="currentColor" stroke="none" fontFamily="sans-serif">20 N</text>

      {/* Friction on P: 2 N left */}
      <Arrow x1={250} y1={160} x2={190} y2={160} strokeWidth={2.5} />
      <text x="220" y="182" textAnchor="middle" fontSize="13" fill="currentColor" stroke="none" fontFamily="sans-serif">2 N</text>

      {/* Friction on Q: 3 N left */}
      <Arrow x1={370} y1={160} x2={300} y2={160} strokeWidth={2.5} />
      <text x="335" y="182" textAnchor="middle" fontSize="13" fill="currentColor" stroke="none" fontFamily="sans-serif">3 N</text>
    </svg>
  );
}
