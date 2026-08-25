import React from "react";

export default function DiagramB3() {
  const ox = 60;
  const oy = 260;
  const w = 360;
  const h = 230;

  const xMax = 10;
  const yMax = 60;

  const sx = (v: number) => ox + (v / xMax) * w;
  const sy = (v: number) => oy - (v / yMax) * h;

  const pathD = `M ${sx(0)} ${sy(0)} C ${sx(1)} ${sy(0.5)}, ${sx(2.5)} ${sy(8)}, ${sx(4)} ${sy(24)} S ${sx(8)} ${sy(52)}, ${sx(10)} ${sy(60)}`;

  return (
    <svg
      viewBox="0 0 470 320"
      className="h-auto w-full max-w-md"
      role="img"
      aria-label="Distance-time graph. Distance increases from 0 to 60 m as time goes from 0 to 10 s, with a curve that accelerates. Points marked at (4, 24) and (10, 60)."
      fill="none"
      stroke="currentColor"
    >
      <g fontFamily="sans-serif" fontSize="12" fill="currentColor" stroke="none">
        {/* Axes */}
        <line x1={ox} y1={oy} x2={ox} y2={oy - h - 15} stroke="currentColor" strokeWidth={2} />
        <line x1={ox} y1={oy} x2={ox + w + 15} y2={oy} stroke="currentColor" strokeWidth={2} />

        {/* Grid lines */}
        {[24, 60].map((v) => (
          <line key={`gy${v}`} x1={ox} y1={sy(v)} x2={ox + w} y2={sy(v)} stroke="currentColor" strokeWidth={0.3} />
        ))}
        {[4, 10].map((v) => (
          <line key={`gx${v}`} x1={sx(v)} y1={oy} x2={sx(v)} y2={oy - h} stroke="currentColor" strokeWidth={0.3} />
        ))}

        {/* Y ticks */}
        {[0, 24, 60].map((v) => (
          <g key={`yt${v}`}>
            <line x1={ox - 5} y1={sy(v)} x2={ox} y2={sy(v)} stroke="currentColor" strokeWidth={1} />
            <text x={ox - 10} y={sy(v) + 4} textAnchor="end">{v}</text>
          </g>
        ))}

        {/* X ticks */}
        {[0, 4, 10].map((v) => (
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
          distance / m
        </text>
        <text x={ox + w / 2} y={oy + 40} textAnchor="middle" fontSize="13">
          time / s
        </text>
      </g>

      {/* Curve */}
      <path d={pathD} strokeWidth={2.5} />

      {/* Data points */}
      <circle cx={sx(0)} cy={sy(0)} r={3.5} fill="currentColor" stroke="none" />
      <circle cx={sx(4)} cy={sy(24)} r={5} fill="currentColor" stroke="none" />
      <circle cx={sx(10)} cy={sy(60)} r={5} fill="currentColor" stroke="none" />
    </svg>
  );
}
