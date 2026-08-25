import React from "react";

export default function DiagramB15() {
  return (
    <svg
      viewBox="0 0 480 280"
      className="h-auto w-full max-w-md"
      role="img"
      aria-label="Circuit with battery. Two parallel branches: top branch has two resistors R in series with a voltmeter reading 3.0 V across the first R. Bottom branch has three resistors R in series."
      fill="none"
      stroke="currentColor"
    >
      {/* "voltmeter reads 3.0 V" label */}
      <text x="240" y="20" textAnchor="middle" fontSize="13" fill="currentColor" stroke="none" fontFamily="sans-serif">
        voltmeter reads 3.0 V
      </text>

      {/* Battery left side */}
      <line x1="40" y1="60" x2="40" y2="100" strokeWidth={2} />
      <line x1="40" y1="165" x2="40" y2="240" strokeWidth={2} />
      {/* Battery symbol */}
      <line x1="28" y1="100" x2="52" y2="100" strokeWidth={3.5} />
      <line x1="32" y1="112" x2="48" y2="112" strokeWidth={1.5} />
      <line x1="28" y1="124" x2="52" y2="124" strokeWidth={3.5} />
      <line x1="32" y1="136" x2="48" y2="136" strokeWidth={1.5} />
      <line x1="40" y1="136" x2="40" y2="165" strokeWidth={2} />
      <text x="58" y="108" fontSize="10" fill="currentColor" stroke="none">+</text>
      <text x="58" y="140" fontSize="10" fill="currentColor" stroke="none">-</text>

      {/* Top wire */}
      <line x1="40" y1="60" x2="445" y2="60" strokeWidth={2} />
      {/* Bottom wire */}
      <line x1="40" y1="240" x2="445" y2="240" strokeWidth={2} />
      {/* Right wire */}
      <line x1="445" y1="60" x2="445" y2="240" strokeWidth={2} />

      {/* Junction to split into two branches */}
      <line x1="100" y1="60" x2="100" y2="100" strokeWidth={2} />
      <line x1="100" y1="60" x2="100" y2="60" strokeWidth={2} />

      {/* Top branch: two R resistors in series */}
      {/* R1 */}
      <line x1="100" y1="100" x2="140" y2="100" strokeWidth={2} />
      <rect x="140" y="88" width="70" height="24" strokeWidth={2} />
      <text x="175" y="84" textAnchor="middle" fontSize="12" fill="currentColor" stroke="none" fontFamily="sans-serif">R</text>
      <line x1="210" y1="100" x2="260" y2="100" strokeWidth={2} />

      {/* R2 */}
      <rect x="280" y="88" width="80" height="24" strokeWidth={2} />
      <text x="320" y="84" textAnchor="middle" fontSize="12" fill="currentColor" stroke="none" fontFamily="sans-serif">R</text>
      <line x1="260" y1="100" x2="280" y2="100" strokeWidth={2} />
      <line x1="360" y1="100" x2="445" y2="100" strokeWidth={2} />

      {/* Voltmeter across first R (triangle shape with V) */}
      <line x1="175" y1="85" x2="155" y2="45" strokeWidth={1.5} />
      <line x1="175" y1="85" x2="195" y2="45" strokeWidth={1.5} />
      <line x1="155" y1="45" x2="195" y2="45" strokeWidth={1.5} />
      <circle cx="175" cy="42" r="12" strokeWidth={1.5} />
      <text x="175" y="47" textAnchor="middle" fontSize="11" fontWeight="bold" fill="currentColor" stroke="none" fontFamily="sans-serif">V</text>

      {/* Bottom branch: three R resistors in series */}
      <line x1="100" y1="100" x2="100" y2="190" strokeWidth={2} />
      <line x1="100" y1="190" x2="130" y2="190" strokeWidth={2} />

      <rect x="130" y="178" width="70" height="24" strokeWidth={2} />
      <text x="165" y="174" textAnchor="middle" fontSize="12" fill="currentColor" stroke="none" fontFamily="sans-serif">R</text>
      <line x1="200" y1="190" x2="220" y2="190" strokeWidth={2} />

      <rect x="220" y="178" width="70" height="24" strokeWidth={2} />
      <text x="255" y="174" textAnchor="middle" fontSize="12" fill="currentColor" stroke="none" fontFamily="sans-serif">R</text>
      <line x1="290" y1="190" x2="310" y2="190" strokeWidth={2} />

      <rect x="310" y="178" width="70" height="24" strokeWidth={2} />
      <text x="345" y="174" textAnchor="middle" fontSize="12" fill="currentColor" stroke="none" fontFamily="sans-serif">R</text>
      <line x1="380" y1="190" x2="445" y2="190" strokeWidth={2} />

      {/* Connect bottom branch to right junction */}
      <line x1="445" y1="190" x2="445" y2="190" strokeWidth={2} />
    </svg>
  );
}
