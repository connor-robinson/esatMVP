/**
 * Performance trend chart component - shows percentage scores over time
 * Uses the exact same style as the mark page performance trend graph
 */

"use client";

import { useMemo } from "react";
import { PAPER_COLORS } from "@/config/colors";
import { calculateTrend } from "@/lib/papers/analytics";

interface PerformanceTrendChartProps {
  dataPoints: Array<{ date: number; percentage: number }>;
  className?: string;
}

export function PerformanceTrendChart({ dataPoints, className }: PerformanceTrendChartProps) {
  const { path, strokeColor, trend } = useMemo(() => {
    if (dataPoints.length === 0) {
      return { path: '', strokeColor: 'rgba(255,255,255,0.5)', trend: 'flat' as const };
    }

    const w = 320; // svg width (same as mark page)
    const h = 64;  // svg height (same as mark page)
    const pad = 8;
    const total = dataPoints.length;

    // Calculate trend direction
    const percentages = dataPoints.map(d => d.percentage);
    const trend = calculateTrend(percentages);

    // Apply rolling window for smoothing (optional - can adjust window size)
    const windowSize = Math.max(3, Math.floor(total / 10));
    const smoothedValues: number[] = [];
    for (let i = 0; i < total; i++) {
      let sum = 0, count = 0;
      for (let j = Math.max(0, i - windowSize + 1); j <= i; j++) {
        sum += percentages[j];
        count += 1;
      }
      const avg = count > 0 ? sum / count : (smoothedValues.length > 0 ? smoothedValues[smoothedValues.length - 1] : 0);
      smoothedValues.push(avg);
    }

    // Determine stroke color based on trend
    const strokeColor = trend === 'improving' 
      ? PAPER_COLORS.biology 
      : trend === 'declining' 
        ? PAPER_COLORS.chemistry 
        : 'rgba(255,255,255,0.5)';

    // Helpers to create a smooth path
    const stepX = (w - pad * 2) / Math.max(1, total - 1);
    const toY = (v: number) => h - pad - (v / 100) * (h - pad * 2);
    const toPoint = (i: number, v: number) => ({ x: pad + i * stepX, y: toY(v) });

    function buildSmoothPath(values: number[]) {
      if (values.length === 0) return '';
      const pts = values.map((v, i) => toPoint(i, v));
      if (pts.length < 2) return `M ${pts[0].x} ${pts[0].y}`;
      let d = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 1; i < pts.length; i++) {
        const p0 = pts[i - 1];
        const p1 = pts[i];
        const cp1x = p0.x + (stepX * 0.5);
        const cp1y = p0.y;
        const cp2x = p1.x - (stepX * 0.5);
        const cp2y = p1.y;
        d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
      }
      return d;
    }

    const path = buildSmoothPath(smoothedValues);

    return { path, strokeColor, trend };
  }, [dataPoints]);

  const message = useMemo(() => {
    if (dataPoints.length === 0) return 'No data available';
    if (trend === 'improving') return 'Performance is improving over time.';
    if (trend === 'declining') return 'Performance has declined recently.';
    return 'Performance has remained relatively steady.';
  }, [trend, dataPoints.length]);

  if (dataPoints.length === 0) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="rounded-md bg-neutral-900 p-2 flex justify-center items-center h-16">
          <div className="text-xs text-neutral-500">No data to display</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="rounded-md bg-neutral-900 p-2 flex justify-center">
        <svg width={320} height={64} className="h-16 w-[320px] block">
          <path d={path} stroke={strokeColor} strokeWidth={2} fill="none" />
        </svg>
      </div>
      <div className="flex items-center justify-center gap-4 text-[11px] text-neutral-400">
        <div className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded" style={{ backgroundColor: strokeColor }} />
          Score Trend
        </div>
      </div>
      <div className="text-[11px] text-neutral-400 text-center">{message}</div>
    </div>
  );
}

