import React from "react";

export default function DiagramB18() {
  const ox = 70;
  const oy = 150;
  const w = 400;
  const h = 120;

  const xMax = 40;
  const yMax = 6;

  const sx = (v: number) => ox + (v / xMax) * w;
  const sy = (v: number) => oy - (v / yMax) * h;

  const period = 20;
  const points: string[] = [];
  for (let t = 0; t <= xMax; t += 0.5) {
    const x = sx(t);
    const y = sy(yMax * Math.sin((2 * Math.PI * t) / period));
    points.push(`${t === 0 ? "M" : "L"} ${x} ${y}`);
  }
  const pathD = points.join(" ");

  return (
    <svg
      viewBox="0 0 520 300"
      className="h-auto w-full max-w-lg"
      role="img"
      aria-label="AC output voltage / V against time / ms. Sinusoidal wave with peak voltage 6 V and period 20 ms, shown over 0 to 40 ms (two complete cycles)."
      fill="none"
      stroke="currentColor"
    >
      <g fontFamily="sans-serif" fontSize="12" fill="currentColor" stroke="none">
        {/* X axis (at y=0 level) */}
        <line x1={ox} y1={oy} x2={ox + w + 15} y2={oy} stroke="currentColor" strokeWidth={2} />
        {/* Y axis */}
        <line x1={ox} y1={sy(yMax) - 10} x2={ox} y2={sy(-yMax) + 10} stroke="currentColor" strokeWidth={2} />

        {/* Grid lines */}
        {[10, 20, 30, 40].map((v) => (
          <line key={`gx${v}`} x1={sx(v)} y1={sy(yMax)} x2={sx(v)} y2={sy(-yMax)} stroke="currentColor" strokeWidth={0.3} />
        ))}
        {[-6, 6].map((v) => (
          <line key={`gy${v}`} x1={ox} y1={sy(v)} x2={ox + w} y2={sy(v)} stroke="currentColor" strokeWidth={0.3} />
        ))}

        {/* Y ticks */}
        {[
          { v: 6, l: "6" },
          { v: 0, l: "0" },
          { v: -6, l: "-6" },
        ].map((t) => (
          <g key={`yt${t.v}`}>
            <line x1={ox - 5} y1={sy(t.v)} x2={ox} y2={sy(t.v)} stroke="currentColor" strokeWidth={1} />
            <text x={ox - 10} y={sy(t.v) + 4} textAnchor="end">{t.l}</text>
          </g>
        ))}

        {/* X ticks */}
        {[0, 10, 20, 30, 40].map((v) => (
          <g key={`xt${v}`}>
            <line x1={sx(v)} y1={oy - 3} x2={sx(v)} y2={oy + 5} stroke="currentColor" strokeWidth={1} />
            <text x={sx(v)} y={oy + 20} textAnchor="middle">{v}</text>
          </g>
        ))}

        {/* Axis labels */}
        <text
          x={ox - 48}
          y={oy}
          textAnchor="middle"
          fontSize="12"
          transform={`rotate(-90, ${ox - 48}, ${oy})`}
        >
          output voltage / V
        </text>
        <text x={ox + w / 2} y={oy + 40} textAnchor="middle" fontSize="13">
          time / ms
        </text>
      </g>

      {/* Sine curve */}
      <path d={pathD} strokeWidth={2.5} />
    </svg>
  );
}
