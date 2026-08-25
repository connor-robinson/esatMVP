import React from "react";

export default function DiagramA25() {
  const ox = 60;
  const oy = 250;
  const w = 340;
  const h = 220;

  const xMax = 8;
  const yMax = 12;

  const sx = (v: number) => ox + (v / xMax) * w;
  const sy = (v: number) => oy - (v / yMax) * h;

  return (
    <svg
      viewBox="0 0 450 310"
      className="h-auto w-full max-w-sm"
      role="img"
      aria-label="Velocity-time graph. Velocity rises linearly from 0 to 12 m/s between t = 0 and t = 4 s, then decreases linearly to 4 m/s at t = 8 s. The area under the graph is shaded."
      fill="none"
      stroke="currentColor"
    >
      <g fontFamily="sans-serif" fontSize="12" fill="currentColor" stroke="none">
        {/* Axes */}
        <line x1={ox} y1={oy} x2={ox} y2={oy - h - 15} stroke="currentColor" strokeWidth={2} />
        <line x1={ox} y1={oy} x2={ox + w + 15} y2={oy} stroke="currentColor" strokeWidth={2} />

        {/* Grid lines */}
        {[4, 8, 12].map((v) => (
          <line key={`gy${v}`} x1={ox} y1={sy(v)} x2={ox + w} y2={sy(v)} stroke="currentColor" strokeWidth={0.3} />
        ))}
        {[4, 8].map((v) => (
          <line key={`gx${v}`} x1={sx(v)} y1={oy} x2={sx(v)} y2={oy - h} stroke="currentColor" strokeWidth={0.3} />
        ))}

        {/* Y ticks */}
        {[0, 4, 8, 12].map((v) => (
          <g key={`yt${v}`}>
            <line x1={ox - 5} y1={sy(v)} x2={ox} y2={sy(v)} stroke="currentColor" strokeWidth={1} />
            <text x={ox - 10} y={sy(v) + 4} textAnchor="end">{v}</text>
          </g>
        ))}

        {/* X ticks */}
        {[0, 4, 8].map((v) => (
          <g key={`xt${v}`}>
            <line x1={sx(v)} y1={oy} x2={sx(v)} y2={oy + 5} stroke="currentColor" strokeWidth={1} />
            <text x={sx(v)} y={oy + 20} textAnchor="middle">{v}</text>
          </g>
        ))}

        {/* Axis labels */}
        <text
          x={ox - 40}
          y={oy - h / 2}
          textAnchor="middle"
          fontSize="13"
          transform={`rotate(-90, ${ox - 40}, ${oy - h / 2})`}
        >
          {"velocity / m s\u207B\u00B9"}
        </text>
        <text x={ox + w / 2} y={oy + 40} textAnchor="middle" fontSize="13">
          time / s
        </text>
      </g>

      {/* Shaded area under curve */}
      <polygon
        points={`${sx(0)},${oy} ${sx(4)},${sy(12)} ${sx(8)},${sy(4)} ${sx(8)},${oy}`}
        fill="currentColor"
        opacity={0.08}
        stroke="none"
      />

      {/* Line: 0 to (4,12) */}
      <line x1={sx(0)} y1={sy(0)} x2={sx(4)} y2={sy(12)} strokeWidth={2.5} />
      {/* Line: (4,12) to (8,4) */}
      <line x1={sx(4)} y1={sy(12)} x2={sx(8)} y2={sy(4)} strokeWidth={2.5} />

      {/* Data points */}
      <circle cx={sx(0)} cy={sy(0)} r={3.5} fill="currentColor" stroke="none" />
      <circle cx={sx(4)} cy={sy(12)} r={3.5} fill="currentColor" stroke="none" />
      <circle cx={sx(8)} cy={sy(4)} r={3.5} fill="currentColor" stroke="none" />
    </svg>
  );
}
