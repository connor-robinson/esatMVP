import React from "react";

interface ArrowProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  strokeWidth?: number;
  dashed?: boolean;
  className?: string;
}

export function Arrow({
  x1,
  y1,
  x2,
  y2,
  strokeWidth = 2,
  dashed,
  className = "",
}: ArrowProps) {
  const id = `arrow-${x1}-${y1}-${x2}-${y2}`.replace(/\./g, "_");
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const headLen = Math.min(10, len * 0.3);
  const angle = Math.atan2(dy, dx);
  const ha1 = angle + Math.PI * 0.82;
  const ha2 = angle - Math.PI * 0.82;

  return (
    <g className={className} stroke="currentColor" fill="currentColor">
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        strokeWidth={strokeWidth}
        strokeDasharray={dashed ? "6 4" : undefined}
      />
      <polygon
        points={`${x2},${y2} ${x2 + headLen * Math.cos(ha1)},${y2 + headLen * Math.sin(ha1)} ${x2 + headLen * Math.cos(ha2)},${y2 + headLen * Math.sin(ha2)}`}
      />
    </g>
  );
}

interface DoubleArrowProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  strokeWidth?: number;
}

export function DoubleArrow({
  x1,
  y1,
  x2,
  y2,
  strokeWidth = 1.5,
}: DoubleArrowProps) {
  return (
    <g stroke="currentColor" fill="currentColor">
      <Arrow x1={(x1 + x2) / 2} y1={(y1 + y2) / 2} x2={x1} y2={y1} strokeWidth={strokeWidth} />
      <Arrow x1={(x1 + x2) / 2} y1={(y1 + y2) / 2} x2={x2} y2={y2} strokeWidth={strokeWidth} />
    </g>
  );
}

interface AxisProps {
  x: number;
  y: number;
  width: number;
  height: number;
  xLabel?: string;
  yLabel?: string;
  xTicks?: { value: number; label: string }[];
  yTicks?: { value: number; label: string }[];
  xMin?: number;
  xMax?: number;
  yMin?: number;
  yMax?: number;
}

export function Axes({
  x,
  y,
  width,
  height,
  xLabel,
  yLabel,
  xTicks = [],
  yTicks = [],
  xMin = 0,
  xMax = 1,
  yMin = 0,
  yMax = 1,
}: AxisProps) {
  const tickLen = 5;

  const scaleX = (val: number) =>
    x + ((val - xMin) / (xMax - xMin)) * width;
  const scaleY = (val: number) =>
    y + height - ((val - yMin) / (yMax - yMin)) * height;

  return (
    <g stroke="currentColor" fill="currentColor" fontSize="12" fontFamily="sans-serif">
      <line x1={x} y1={y} x2={x} y2={y + height} strokeWidth={2} />
      <line x1={x} y1={y + height} x2={x + width} y2={y + height} strokeWidth={2} />

      {xTicks.map((t) => {
        const tx = scaleX(t.value);
        return (
          <g key={`xt-${t.value}`}>
            <line x1={tx} y1={y + height} x2={tx} y2={y + height + tickLen} strokeWidth={1} />
            <text x={tx} y={y + height + 18} textAnchor="middle" stroke="none">
              {t.label}
            </text>
          </g>
        );
      })}

      {yTicks.map((t) => {
        const ty = scaleY(t.value);
        return (
          <g key={`yt-${t.value}`}>
            <line x1={x - tickLen} y1={ty} x2={x} y2={ty} strokeWidth={1} />
            <text x={x - 8} y={ty + 4} textAnchor="end" stroke="none">
              {t.label}
            </text>
          </g>
        );
      })}

      {xLabel && (
        <text x={x + width / 2} y={y + height + 35} textAnchor="middle" stroke="none" fontSize="13">
          {xLabel}
        </text>
      )}

      {yLabel && (
        <text
          x={x - 45}
          y={y + height / 2}
          textAnchor="middle"
          stroke="none"
          fontSize="13"
          transform={`rotate(-90, ${x - 45}, ${y + height / 2})`}
        >
          {yLabel}
        </text>
      )}
    </g>
  );
}

export function Cross({ cx, cy, size = 8 }: { cx: number; cy: number; size?: number }) {
  return (
    <g stroke="currentColor" strokeWidth={1.5}>
      <line x1={cx - size} y1={cy - size} x2={cx + size} y2={cy + size} />
      <line x1={cx + size} y1={cy - size} x2={cx - size} y2={cy + size} />
    </g>
  );
}

export function Battery({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g stroke="currentColor" strokeWidth={2} transform={`translate(${x},${y}) scale(${scale})`}>
      <line x1={-8} y1={-12} x2={-8} y2={12} strokeWidth={3} />
      <line x1={-2} y1={-6} x2={-2} y2={6} strokeWidth={1.5} />
      <line x1={4} y1={-12} x2={4} y2={12} strokeWidth={3} />
      <line x1={10} y1={-6} x2={10} y2={6} strokeWidth={1.5} />
      <text x={10} y={-16} textAnchor="middle" fontSize="11" stroke="none" fill="currentColor">+</text>
      <text x={-8} y={20} textAnchor="middle" fontSize="11" stroke="none" fill="currentColor">-</text>
    </g>
  );
}

export function Resistor({ x, y, width = 60, label }: { x: number; y: number; width?: number; label?: string }) {
  const h = 18;
  return (
    <g stroke="currentColor" fill="none" strokeWidth={2}>
      <rect x={x} y={y - h / 2} width={width} height={h} />
      {label && (
        <text x={x + width / 2} y={y - h / 2 - 6} textAnchor="middle" fill="currentColor" stroke="none" fontSize="12">
          {label}
        </text>
      )}
    </g>
  );
}
