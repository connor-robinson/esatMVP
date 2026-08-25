import React from "react";

export default function DiagramA9() {
  return (
    <svg
      viewBox="0 0 500 280"
      className="h-auto w-full max-w-md"
      role="img"
      aria-label="Circuit with a 12 V battery, a fixed 200 ohm resistor and an NTC thermistor in series. A voltmeter V is connected in parallel across the fixed resistor."
      fill="none"
      stroke="currentColor"
    >
      {/* Main loop */}
      {/* Battery on left side */}
      <line x1="60" y1="40" x2="60" y2="100" strokeWidth={2} />
      <line x1="60" y1="170" x2="60" y2="240" strokeWidth={2} />
      {/* Battery symbol */}
      <line x1="48" y1="100" x2="72" y2="100" strokeWidth={3} />
      <line x1="52" y1="115" x2="68" y2="115" strokeWidth={1.5} />
      <line x1="48" y1="130" x2="72" y2="130" strokeWidth={3} />
      <line x1="52" y1="145" x2="68" y2="145" strokeWidth={1.5} />
      <line x1="60" y1="145" x2="60" y2="170" strokeWidth={2} />
      <text x="78" y="108" fontSize="12" fill="currentColor" stroke="none" fontFamily="sans-serif">+</text>
      <text x="78" y="148" fontSize="12" fill="currentColor" stroke="none" fontFamily="sans-serif">-</text>

      {/* Top wire */}
      <line x1="60" y1="40" x2="440" y2="40" strokeWidth={2} />
      {/* Bottom wire */}
      <line x1="60" y1="240" x2="440" y2="240" strokeWidth={2} />
      {/* Right side wire */}
      <line x1="440" y1="40" x2="440" y2="240" strokeWidth={2} />

      {/* Fixed 200 ohm resistor - on top branch */}
      <rect x="160" y="28" width="80" height="24" strokeWidth={2} />
      <text x="200" y="20" textAnchor="middle" fontSize="12" fill="currentColor" stroke="none" fontFamily="sans-serif">
        fixed 200 ohm
      </text>

      {/* NTC thermistor - on right side top */}
      <rect x="340" y="28" width="60" height="24" strokeWidth={2} />
      <text x="370" y="20" textAnchor="middle" fontSize="12" fill="currentColor" stroke="none" fontFamily="sans-serif">
        NTC
      </text>

      {/* Voltmeter - connected across fixed resistor */}
      {/* Wires down from junction points */}
      <line x1="160" y1="40" x2="160" y2="80" strokeWidth={1.5} />
      <line x1="240" y1="40" x2="240" y2="80" strokeWidth={1.5} />
      <line x1="160" y1="80" x2="160" y2="150" strokeWidth={1.5} />
      <line x1="240" y1="80" x2="240" y2="150" strokeWidth={1.5} />
      <line x1="160" y1="150" x2="240" y2="150" strokeWidth={1.5} />
      <line x1="160" y1="80" x2="240" y2="80" strokeWidth={1.5} />
      {/* Voltmeter circle */}
      <circle cx="200" cy="130" r="20" strokeWidth={2} />
      <text x="200" y="136" textAnchor="middle" fontSize="16" fontWeight="bold" fill="currentColor" stroke="none" fontFamily="sans-serif">
        V
      </text>

      {/* 12 V battery label */}
      <text x="60" y="265" textAnchor="middle" fontSize="14" fill="currentColor" stroke="none" fontFamily="sans-serif">
        12 V battery
      </text>
    </svg>
  );
}
