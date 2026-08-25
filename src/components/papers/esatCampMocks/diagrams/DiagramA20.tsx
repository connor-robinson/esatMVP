import React from "react";

export default function DiagramA20() {
  const ox = 60;
  const oy = 280;
  const w = 400;
  const h = 260;

  const xMax = 1.2;
  const yMax = 10;

  const sx = (v: number) => ox + (v / xMax) * w;
  const sy = (v: number) => oy - (v / yMax) * h;

  const points: [number, number][] = [
    [0, 0],
    [0.2, 1.1],
    [0.4, 2.5],
    [0.6, 4.0],
    [0.8, 6.0],
    [1.0, 8.4],
    [1.15, 10.0],
  ];

  const pathD = points
    .map((p, i) => {
      const x = sx(p[0]);
      const y = sy(p[1]);
      if (i === 0) return `M ${x} ${y}`;
      const prev = points[i - 1];
      const cpx1 = sx(prev[0]) + (sx(p[0]) - sx(prev[0])) * 0.5;
      const cpy1 = sy(prev[1]);
      const cpx2 = sx(p[0]) - (sx(p[0]) - sx(prev[0])) * 0.5;
      const cpy2 = sy(p[1]);
      return `C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${x} ${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox="0 0 500 340"
      className="h-auto w-full max-w-md"
      role="img"
      aria-label="Graph of lamp voltage / V against current / A. Curved IV characteristic from origin to about (1.15, 10). Dashed lines at current = 0.8 A and voltage = 6 V intersect at a highlighted point."
      fill="none"
      stroke="currentColor"
    >
      <g fontFamily="sans-serif" fontSize="12" fill="currentColor" stroke="none">
        {/* Y axis */}
        <line x1={ox} y1={oy} x2={ox} y2={oy - h - 10} stroke="currentColor" strokeWidth={2} />
        {/* X axis */}
        <line x1={ox} y1={oy} x2={ox + w + 10} y2={oy} stroke="currentColor" strokeWidth={2} />

        {/* Grid lines - light */}
        {[2, 4, 6, 8, 10].map((v) => (
          <line key={`gy${v}`} x1={ox} y1={sy(v)} x2={ox + w} y2={sy(v)} stroke="currentColor" strokeWidth={0.3} />
        ))}
        {[0.2, 0.4, 0.6, 0.8, 1.0, 1.2].map((v) => (
          <line key={`gx${v}`} x1={sx(v)} y1={oy} x2={sx(v)} y2={oy - h} stroke="currentColor" strokeWidth={0.3} />
        ))}

        {/* Y ticks and labels */}
        {[0, 2, 4, 6, 8, 10].map((v) => (
          <g key={`yt${v}`}>
            <line x1={ox - 5} y1={sy(v)} x2={ox} y2={sy(v)} stroke="currentColor" strokeWidth={1} />
            <text x={ox - 10} y={sy(v) + 4} textAnchor="end">{v}</text>
          </g>
        ))}

        {/* X ticks and labels */}
        {[0.0, 0.2, 0.4, 0.6, 0.8, 1.0, 1.2].map((v) => (
          <g key={`xt${v}`}>
            <line x1={sx(v)} y1={oy} x2={sx(v)} y2={oy + 5} stroke="currentColor" strokeWidth={1} />
            <text x={sx(v)} y={oy + 20} textAnchor="middle">{v.toFixed(1)}</text>
          </g>
        ))}

        {/* Axis labels */}
        <text
          x={ox - 45}
          y={oy - h / 2}
          textAnchor="middle"
          fontSize="13"
          transform={`rotate(-90, ${ox - 45}, ${oy - h / 2})`}
        >
          lamp voltage / V
        </text>
        <text x={ox + w / 2} y={oy + 40} textAnchor="middle" fontSize="13">
          current / A
        </text>
      </g>

      {/* Curve */}
      <path d={pathD} strokeWidth={2.5} stroke="currentColor" />

      {/* Data points */}
      {points.map((p, i) => (
        <circle key={i} cx={sx(p[0])} cy={sy(p[1])} r={3.5} fill="currentColor" stroke="none" />
      ))}

      {/* Dashed lines at (0.8, 6) */}
      <line x1={sx(0.8)} y1={oy} x2={sx(0.8)} y2={sy(6)} strokeWidth={1.5} strokeDasharray="6 4" />
      <line x1={ox} y1={sy(6)} x2={sx(0.8)} y2={sy(6)} strokeWidth={1.5} strokeDasharray="6 4" />

      {/* Highlight point at (0.8, 6) */}
      <circle cx={sx(0.8)} cy={sy(6)} r={5} fill="currentColor" stroke="none" />
    </svg>
  );
}
