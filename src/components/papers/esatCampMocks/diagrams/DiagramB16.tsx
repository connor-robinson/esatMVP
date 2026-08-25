import React from "react";

export default function DiagramB16() {
  const ox = 70;
  const oy = 260;
  const w = 370;
  const h = 220;

  const xMax = 16;
  const yMax = 0.04;

  const sx = (v: number) => ox + (v / xMax) * w;
  const sy = (v: number) => oy - (v / yMax) * h;

  return (
    <svg
      viewBox="0 0 490 320"
      className="h-auto w-full max-w-md"
      role="img"
      aria-label="Graph of stored energy E / J against extension squared x squared / cm squared. Linear relationship from origin (0, 0.00) to (16, 0.04). Dashed lines mark the point (16, 0.04)."
      fill="none"
      stroke="currentColor"
    >
      <g fontFamily="sans-serif" fontSize="12" fill="currentColor" stroke="none">
        {/* Axes */}
        <line x1={ox} y1={oy} x2={ox} y2={oy - h - 15} stroke="currentColor" strokeWidth={2} />
        <line x1={ox} y1={oy} x2={ox + w + 15} y2={oy} stroke="currentColor" strokeWidth={2} />

        {/* Y ticks */}
        {[
          { v: 0, l: "0.00" },
          { v: 0.04, l: "0.04" },
        ].map((t) => (
          <g key={`yt${t.v}`}>
            <line x1={ox - 5} y1={sy(t.v)} x2={ox} y2={sy(t.v)} stroke="currentColor" strokeWidth={1} />
            <text x={ox - 10} y={sy(t.v) + 4} textAnchor="end">{t.l}</text>
          </g>
        ))}

        {/* X ticks */}
        {[0, 16].map((v) => (
          <g key={`xt${v}`}>
            <line x1={sx(v)} y1={oy} x2={sx(v)} y2={oy + 5} stroke="currentColor" strokeWidth={1} />
            <text x={sx(v)} y={oy + 20} textAnchor="middle">{v}</text>
          </g>
        ))}

        {/* Axis labels */}
        <text
          x={ox - 45}
          y={oy - h / 2}
          textAnchor="middle"
          fontSize="12"
          transform={`rotate(-90, ${ox - 45}, ${oy - h / 2})`}
        >
          stored energy, E / J
        </text>
        <text x={ox + w / 2} y={oy + 42} textAnchor="middle" fontSize="12">
          {"extension squared, x\u00B2 / cm\u00B2"}
        </text>
      </g>

      {/* Linear line from origin to (16, 0.04) */}
      <line x1={sx(0)} y1={sy(0)} x2={sx(16)} y2={sy(0.04)} strokeWidth={2.5} />

      {/* Dashed lines at (16, 0.04) */}
      <line x1={sx(16)} y1={oy} x2={sx(16)} y2={sy(0.04)} strokeWidth={1.5} strokeDasharray="6 4" />
      <line x1={ox} y1={sy(0.04)} x2={sx(16)} y2={sy(0.04)} strokeWidth={1.5} strokeDasharray="6 4" />

      {/* Point at (16, 0.04) */}
      <circle cx={sx(16)} cy={sy(0.04)} r={5} fill="currentColor" stroke="none" />
    </svg>
  );
}
