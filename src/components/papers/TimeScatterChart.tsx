/**
 * Time vs Question scatter chart component
 */

import { useMemo, useState, useEffect } from "react";
import { PAPER_COLORS } from "@/config/colors";

interface TimeScatterChartProps {
  questionNumbers: number[];
  perQuestionSec: number[];
  correctFlags: (boolean | null)[];
  guessedFlags: boolean[];
  className?: string;
}

export function TimeScatterChart({
  questionNumbers,
  perQuestionSec,
  correctFlags,
  guessedFlags,
  className
}: TimeScatterChartProps) {
  const chartData = useMemo(() => {
    return questionNumbers.map((questionNumber, index) => {
      const timeSec = perQuestionSec[index] || 0;
      const correct = correctFlags[index];
      const guessed = guessedFlags[index];
      const answered = correct !== null;
      
      return {
        questionNumber,
        timeSec,
        correct,
        guessed,
        answered
      };
    });
  }, [questionNumbers, perQuestionSec, correctFlags, guessedFlags]);

  const maxTime = Math.max(10, ...chartData.map(d => d.timeSec));
  // Use a large virtual width and responsive SVG to fill container width
  const width = 1200;
  const height = 260;
  const padding = 28;
  // Ensure points and rings at min/max aren't clipped at the edges
  const pointMaxRadius = 6; // ring r=5 with stroke ~2
  const xPadding = padding + pointMaxRadius;

  const scaleX = (questionNumber: number) => {
    const minQ = Math.min(...questionNumbers);
    const maxQ = Math.max(...questionNumbers);
    return xPadding + ((questionNumber - minQ) / Math.max(1, maxQ - minQ)) * (width - 2 * xPadding);
  };

  const scaleY = (timeSec: number) => {
    return height - padding - (timeSec / maxTime) * (height - 2 * padding);
  };

  const getPointColor = (data: typeof chartData[0]) => {
    if (!data.answered) return "#737373"; // unanswered neutral
    if (data.correct === true) return PAPER_COLORS.biology; // correct
    if (data.correct === false) return PAPER_COLORS.chemistry; // wrong
    return "#a3a3a3"; // unmarked
  };

  const [hover, setHover] = useState<null | { x: number; y: number; data: typeof chartData[0] }>(null);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Linear regression (y = m x + b)
  const linearLine = useMemo(() => {
    if (chartData.length < 2) return null;
    const xs = chartData.map(d => d.questionNumber);
    const ys = chartData.map(d => d.timeSec);
    const n = xs.length;
    const sumX = xs.reduce((a,b)=>a+b,0);
    const sumY = ys.reduce((a,b)=>a+b,0);
    const sumXY = xs.reduce((a, x, i) => a + x*ys[i], 0);
    const sumX2 = xs.reduce((a, x) => a + x*x, 0);
    const denom = n*sumX2 - sumX*sumX;
    if (denom === 0) return null;
    const m = (n*sumXY - sumX*sumY) / denom;
    const b = (sumY - m*sumX) / n;
    const minQ = Math.min(...xs);
    const maxQ = Math.max(...xs);
    const y1 = Math.max(0, Math.min(maxTime, m*minQ + b));
    const y2 = Math.max(0, Math.min(maxTime, m*maxQ + b));
    return { x1: scaleX(minQ), y1: scaleY(y1), x2: scaleX(maxQ), y2: scaleY(y2) };
  }, [chartData, maxTime]);

  // Smoothed pacing curve that goes through (or very near) most points.
  // We sort by question index, apply a light moving average, then draw a Catmull-Rom spline.
  const smoothPath = useMemo(() => {
    if (chartData.length < 2) return null;
    const pts = chartData
      .slice()
      .sort((a,b) => a.questionNumber - b.questionNumber)
      .map(d => ({ x: scaleX(d.questionNumber), y: scaleY(Math.max(0, Math.min(maxTime, d.timeSec))) }));

    // Moving average (window 3-5 depending on data size)
    const window = Math.min(5, Math.max(3, Math.floor(pts.length / 12)));
    const avgPts: {x:number;y:number}[] = pts.map((p, i) => {
      const s = Math.max(0, i - Math.floor(window/2));
      const e = Math.min(pts.length - 1, i + Math.floor(window/2));
      const slice = pts.slice(s, e+1);
      const y = slice.reduce((a,b)=>a+b.y,0)/slice.length;
      return { x: p.x, y };
    });

    // Catmull-Rom to Bezier conversion for smooth path
    const cr = (p0:any,p1:any,p2:any,p3:any,t:number) => {
      const v0 = (p2 - p0) * 0.5;
      const v1 = (p3 - p1) * 0.5;
      return (2*(p1 - p2) + v0 + v1)*t*t*t + (-3*(p1 - p2) - 2*v0 - v1)*t*t + v0*t + p1;
    };
    if (avgPts.length < 2) return null;
    let d = `M ${avgPts[0].x} ${avgPts[0].y}`;
    for (let i=0;i<avgPts.length-1;i++){
      const p0 = avgPts[i-1] || avgPts[i];
      const p1 = avgPts[i];
      const p2 = avgPts[i+1];
      const p3 = avgPts[i+2] || p2;
      // Sample between points for a smooth curve
      for (let t=0.1;t<=1.0;t+=0.1){
        const x = cr(p0.x,p1.x,p2.x,p3.x,t);
        const y = cr(p0.y,p1.y,p2.y,p3.y,t);
        d += ` L ${x} ${y}`;
      }
    }
    return d;
  }, [chartData, maxTime]);

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="text-sm font-medium text-neutral-200">Pacing Profile (Time per Question)</div>
      
      <div className="relative">
        <svg
          width={width}
          height={height}
          className="w-full"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const y = scaleY(t * maxTime);
            return (
              <line
                key={t}
                x1={xPadding}
                y1={y}
                x2={width - xPadding}
                y2={y}
                stroke="rgba(255, 255, 255, 0.05)"
                strokeWidth={1}
              />
            );
          })}

          {/* Axes */}
          <line
            x1={xPadding}
            y1={height - padding}
            x2={width - xPadding}
            y2={height - padding}
            stroke="rgba(255, 255, 255, 0.2)"
            strokeWidth={1}
          />
          <line
            x1={xPadding}
            y1={padding}
            x2={xPadding}
            y2={height - padding}
            stroke="rgba(255, 255, 255, 0.2)"
            strokeWidth={1}
          />

          {/* Axis ticks and labels */}
          {(() => {
            const minQ = Math.min(...questionNumbers);
            const maxQ = Math.max(...questionNumbers);
            const xTicks = Math.min(8, questionNumbers.length);
            const step = Math.max(1, Math.floor((maxQ - minQ) / Math.max(1, xTicks - 1)));
            const ticks: number[] = [];
            for (let q = minQ; q <= maxQ; q += step) ticks.push(q);
            if (ticks[ticks.length-1] !== maxQ) ticks.push(maxQ);
            return (
              <g>
                {ticks.map((q) => (
                  <g key={`xt-${q}`}>
                    <line x1={scaleX(q)} y1={height - padding} x2={scaleX(q)} y2={height - padding + 4} stroke="rgba(255,255,255,0.2)" />
                    <text x={scaleX(q)} y={height - padding + 16} textAnchor="middle" fontSize={10} fill="rgba(255,255,255,0.2)">{q}</text>
                  </g>
                ))}
              </g>
            );
          })()}
          {([0, 0.25, 0.5, 0.75, 1].map((t) => (
            <text key={`yt-${t}`} x={xPadding - 6} y={scaleY(t * maxTime) + 3} textAnchor="end" fontSize={10} fill="rgba(255,255,255,0.2)">{Math.round(t * maxTime)}</text>
          )))}

          {/* Axis titles */}
          <text x={width / 2} y={height - 4} textAnchor="middle" fontSize={11} fill="rgba(255,255,255,0.2)">Question Number</text>
          <text x={-height / 2} y={12} transform={`rotate(-90)`} textAnchor="middle" fontSize={11} fill="rgba(255,255,255,0.2)">Time (s)</text>

          {/* Points */}
          {chartData.map((data) => {
            const x = scaleX(data.questionNumber);
            const y = scaleY(data.timeSec);
            const color = getPointColor(data);

            if (!data.answered) {
              // Unanswered: small square
              return (
                <rect
                  key={data.questionNumber}
                  x={x - 3}
                  y={y - 3}
                  width={6}
                  height={6}
                  fill={color}
                  opacity={0.8}
                  rx={1}
                  onMouseEnter={() => setHover({ x, y, data })}
                  onMouseLeave={() => setHover(null)}
                />
              );
            }

            if (data.guessed) {
              // Guessed: hollow ring
              return (
                <g key={data.questionNumber}
                   onMouseEnter={() => setHover({ x, y, data })}
                   onMouseLeave={() => setHover(null)}>
                  <circle
                    cx={x}
                    cy={y}
                    r={5}
                    fill="none"
                    stroke={color}
                    strokeWidth={2}
                  />
                  <circle
                    cx={x}
                    cy={y}
                    r={2}
                    fill={color}
                    opacity={0.7}
                  />
                </g>
              );
            }

            // Normal: solid circle
            return (
              <circle
                key={data.questionNumber}
                cx={x}
                cy={y}
                r={4}
                fill={color}
                opacity={0.9}
                onMouseEnter={() => setHover({ x, y, data })}
                onMouseLeave={() => setHover(null)}
              />
            );
          })}

          {/* Trend lines */}
          {linearLine && (
            <line
              x1={linearLine.x1}
              y1={linearLine.y1}
              x2={linearLine.x2}
              y2={linearLine.y2}
              stroke="rgba(255,255,255,0.35)"
              strokeWidth={2}
              strokeDasharray="10 8"
              opacity={0.8}
            />
          )}
          {smoothPath && (
            <path
              d={smoothPath}
              fill="none"
              stroke="#ffffff"
              strokeWidth={2}
              pathLength={1}
              style={{ strokeDasharray: 1, strokeDashoffset: animate ? 0 : 1, transition: 'stroke-dashoffset 900ms ease' }}
              opacity={0.9}
            />
          )}
        </svg>

        {/* Tooltip */}
        {hover && (
          <div
            className="absolute px-2 py-1 rounded-md text-xs text-neutral-200 bg-black/80 border border-white/10 pointer-events-none"
            style={{ left: Math.min(hover.x, width - 160), top: Math.max(hover.y - 32, 0) }}
          >
            <div>Q{hover.data.questionNumber}</div>
            <div>Time: {Math.round(hover.data.timeSec)}s</div>
            <div>Status: {hover.data.answered ? (hover.data.correct ? 'Correct' : 'Wrong') : 'Unanswered'}{hover.data.guessed ? ' (Guess)' : ''}</div>
          </div>
        )}

        {/* Legend */}
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-neutral-400">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ background: PAPER_COLORS.biology }} />
            <span>Correct</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ background: PAPER_COLORS.chemistry }} />
            <span>Wrong</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full border-2 border-neutral-400" />
            <span>Guessed</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-neutral-600" />
            <span>Unanswered</span>
          </div>
        </div>
      </div>
    </div>
  );
}


