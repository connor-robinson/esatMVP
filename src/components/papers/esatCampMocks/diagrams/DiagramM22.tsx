import React from "react";

/**
 * Speed-time graph for ESAT CAMP Maths 1 Mock 01 Q22.
 * Points: (0,0), (4,8), (10,8), (14,0).
 */
export default function DiagramM22() {
  const ox = 70;
  const oy = 250;
  const w = 380;
  const h = 200;

  const xMax = 14;
  const yMax = 8;

  const sx = (v: number) => ox + (v / xMax) * w;
  const sy = (v: number) => oy - (v / yMax) * h;

  const points: [number, number][] = [
    [0, 0],
    [4, 8],
    [10, 8],
    [14, 0],
  ];

  const pathD = points
    .map((p, i) => {
      const x = sx(p[0]);
      const y = sy(p[1]);
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox="0 0 500 320"
      className="h-auto w-full max-w-md"
      role="img"
      aria-label="Speed-time graph rising linearly from 0 to 8 m/s by 4 s, remaining at 8 m/s until 10 s, then falling linearly to 0 by 14 s."
      fill="none"
      stroke="currentColor"
    >
      <g fontFamily="sans-serif" fontSize="12" fill="currentColor" stroke="none">
        <line
          x1={ox}
          y1={oy}
          x2={ox}
          y2={oy - h - 10}
          stroke="currentColor"
          strokeWidth={2}
        />
        <line
          x1={ox}
          y1={oy}
          x2={ox + w + 10}
          y2={oy}
          stroke="currentColor"
          strokeWidth={2}
        />

        {[0, 8].map((v) => (
          <g key={`yt${v}`}>
            <line
              x1={ox - 5}
              y1={sy(v)}
              x2={ox}
              y2={sy(v)}
              stroke="currentColor"
              strokeWidth={1}
            />
            <text x={ox - 10} y={sy(v) + 4} textAnchor="end">
              {v}
            </text>
          </g>
        ))}

        {[0, 4, 10, 14].map((v) => (
          <g key={`xt${v}`}>
            <line
              x1={sx(v)}
              y1={oy}
              x2={sx(v)}
              y2={oy + 5}
              stroke="currentColor"
              strokeWidth={1}
            />
            <text x={sx(v)} y={oy + 20} textAnchor="middle">
              {v}
            </text>
          </g>
        ))}

        <text
          x={ox - 48}
          y={oy - h / 2}
          textAnchor="middle"
          fontSize="13"
          transform={`rotate(-90, ${ox - 48}, ${oy - h / 2})`}
        >
          {"speed (m s\u207B\u00B9)"}
        </text>
        <text x={ox + w / 2} y={oy + 42} textAnchor="middle" fontSize="13">
          time (s)
        </text>
      </g>

      <path d={pathD} strokeWidth={2.5} stroke="currentColor" />

      {points.map((p, i) => (
        <circle
          key={i}
          cx={sx(p[0])}
          cy={sy(p[1])}
          r={3.5}
          fill="currentColor"
          stroke="none"
        />
      ))}
    </svg>
  );
}
