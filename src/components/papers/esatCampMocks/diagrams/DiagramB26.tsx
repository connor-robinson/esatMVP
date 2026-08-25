import React from "react";

export default function DiagramB26() {
  const ox = 70;
  const oy = 250;
  const w = 380;
  const h = 210;

  const xMax = 14;
  const yMax = 80;

  const sx = (v: number) => ox + (v / xMax) * w;
  const sy = (v: number) => oy - (v / yMax) * h;

  const pathD = `M ${sx(0)} ${sy(20)} C ${sx(2)} ${sy(38)}, ${sx(4)} ${sy(55)}, ${sx(6)} ${sy(65)} C ${sx(8)} ${sy(72)}, ${sx(10)} ${sy(77)}, ${sx(14)} ${sy(79)}`;

  return (
    <svg
      viewBox="0 0 500 310"
      className="h-auto w-full max-w-md"
      role="img"
      aria-label="Graph of amount of stable Y / units against time / min. Curve rises from (0, 20) through (6, 65) and levels off approaching a dashed line at 80 units."
      fill="none"
      stroke="currentColor"
    >
      <g fontFamily="sans-serif" fontSize="12" fill="currentColor" stroke="none">
        {/* Axes */}
        <line x1={ox} y1={oy} x2={ox} y2={oy - h - 15} stroke="currentColor" strokeWidth={2} />
        <line x1={ox} y1={oy} x2={ox + w + 15} y2={oy} stroke="currentColor" strokeWidth={2} />

        {/* Grid lines */}
        {[20, 40, 60, 65, 80].map((v) => (
          <line key={`gy${v}`} x1={ox} y1={sy(v)} x2={ox + w} y2={sy(v)} stroke="currentColor" strokeWidth={0.2} />
        ))}
        {[3, 6, 9, 12].map((v) => (
          <line key={`gx${v}`} x1={sx(v)} y1={oy} x2={sx(v)} y2={oy - h} stroke="currentColor" strokeWidth={0.2} />
        ))}

        {/* Y ticks */}
        {[20, 40, 60, 65, 80].map((v) => (
          <g key={`yt${v}`}>
            <line x1={ox - 5} y1={sy(v)} x2={ox} y2={sy(v)} stroke="currentColor" strokeWidth={1} />
            <text x={ox - 10} y={sy(v) + 4} textAnchor="end">{v}</text>
          </g>
        ))}

        {/* X ticks */}
        {[0, 3, 6, 9, 12].map((v) => (
          <g key={`xt${v}`}>
            <line x1={sx(v)} y1={oy} x2={sx(v)} y2={oy + 5} stroke="currentColor" strokeWidth={1} />
            <text x={sx(v)} y={oy + 20} textAnchor="middle">{v}</text>
          </g>
        ))}

        {/* Axis labels */}
        <text
          x={ox - 48}
          y={oy - h / 2}
          textAnchor="middle"
          fontSize="12"
          transform={`rotate(-90, ${ox - 48}, ${oy - h / 2})`}
        >
          amount of stable Y / units
        </text>
        <text x={ox + w / 2} y={oy + 40} textAnchor="middle" fontSize="13">
          time / min
        </text>
      </g>

      {/* Asymptote dashed line at 80 */}
      <line x1={ox} y1={sy(80)} x2={ox + w} y2={sy(80)} strokeWidth={1.5} strokeDasharray="8 4" />

      {/* Curve */}
      <path d={pathD} strokeWidth={2.5} />

      {/* Data points */}
      <circle cx={sx(0)} cy={sy(20)} r={4.5} fill="currentColor" stroke="none" />
      <circle cx={sx(6)} cy={sy(65)} r={4.5} fill="currentColor" stroke="none" />

      {/* (6 min, 65) annotation */}
      <line x1={sx(6) - 5} y1={sy(65) + 5} x2={sx(6) - 30} y2={sy(65) + 25} strokeWidth={1.5} />
      <text x={sx(6) - 30} y={sy(65) + 40} textAnchor="middle" fontSize="12" fill="currentColor" stroke="none" fontFamily="sans-serif">
        (6 min, 65)
      </text>
    </svg>
  );
}
