/**
 * Analytics trend chart component - shows percentage scores over time
 * Uses the same style as TimeScatterChart (pacing profile) from the mark page
 */

"use client";

import { useMemo, useState, useEffect } from "react";
import { PAPER_COLORS, PAPER_TYPE_COLORS, SECTION_COLORS, desaturateColor } from "@/config/colors";
import type { PaperType, PaperSection } from "@/types/papers";

interface TrendDataPoint {
  date: number;
  percentage: number;
  paperType?: PaperType;
  section?: PaperSection;
}

interface AnalyticsTrendChartProps {
  allSessions: Array<{ date: number; percentage: number; paperType?: PaperType; section?: PaperSection }>;
  filterMode: "all" | "paper" | "section";
  selectedFilters?: string[];
  className?: string;
}

export function AnalyticsTrendChart({ 
  allSessions, 
  filterMode, 
  selectedFilters = [],
  className 
}: AnalyticsTrendChartProps) {
  const [animate, setAnimate] = useState(false);
  const [hoverPoint, setHoverPoint] = useState<{ x: number; y: number; percentage: number; date: number } | null>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const width = 1200;
  const height = 260;
  const padding = 28;
  const pointMaxRadius = 6;
  const xPadding = padding + pointMaxRadius;

  // Calculate overall min/max for consistent scaling
  const allPercentages = allSessions.map(s => s.percentage);
  const minPct = Math.min(0, ...allPercentages);
  const maxPct = Math.max(100, ...allPercentages);
  const range = maxPct - minPct || 100;

  const scaleX = (index: number, total: number) => {
    if (total <= 1) return xPadding;
    return xPadding + (index / (total - 1)) * (width - 2 * xPadding);
  };

  const scaleY = (percentage: number) => {
    return height - padding - ((percentage - minPct) / range) * (height - 2 * padding);
  };

  const { lines, legend, allLineGroups } = useMemo(() => {
    // Group sessions for different lines based on filter mode
    let lineGroups: Record<string, TrendDataPoint[]> = {};

    if (filterMode === "all") {
      // Single line for all sessions
      lineGroups["All"] = allSessions.sort((a, b) => a.date - b.date);
    } else if (filterMode === "paper" && selectedFilters.length > 0) {
      // One line per selected paper type
      selectedFilters.forEach((paperType) => {
        const groupSessions = allSessions
          .filter(s => s.paperType === paperType)
          .sort((a, b) => a.date - b.date);
        if (groupSessions.length > 0) {
          lineGroups[paperType] = groupSessions;
        }
      });
    } else if (filterMode === "section" && selectedFilters.length > 0) {
      // One line per selected section
      selectedFilters.forEach((section) => {
        const groupSessions = allSessions
          .filter(s => s.section === section)
          .sort((a, b) => a.date - b.date);
        if (groupSessions.length > 0) {
          lineGroups[section] = groupSessions;
        }
      });
    }

    // Build smooth path using Catmull-Rom spline (same as TimeScatterChart)
    const buildSmoothPath = (points: TrendDataPoint[]): string | null => {
      if (points.length < 2) return null;
      
      const pts = points.map((p, i) => ({ 
        x: scaleX(i, points.length), 
        y: scaleY(p.percentage) 
      }));

      // Moving average for smoothing
      const window = Math.min(5, Math.max(3, Math.floor(pts.length / 12)));
      const avgPts: {x: number; y: number}[] = pts.map((p, i) => {
        const s = Math.max(0, i - Math.floor(window/2));
        const e = Math.min(pts.length - 1, i + Math.floor(window/2));
        const slice = pts.slice(s, e + 1);
        const y = slice.reduce((a, b) => a + b.y, 0) / slice.length;
        return { x: p.x, y };
      });

      // Catmull-Rom to Bezier conversion
      const cr = (p0: number, p1: number, p2: number, p3: number, t: number) => {
        const v0 = (p2 - p0) * 0.5;
        const v1 = (p3 - p1) * 0.5;
        return (2*(p1 - p2) + v0 + v1)*t*t*t + (-3*(p1 - p2) - 2*v0 - v1)*t*t + v0*t + p1;
      };

      if (avgPts.length < 2) return null;
      let d = `M ${avgPts[0].x} ${avgPts[0].y}`;
      for (let i = 0; i < avgPts.length - 1; i++) {
        const p0 = avgPts[i - 1] || avgPts[i];
        const p1 = avgPts[i];
        const p2 = avgPts[i + 1];
        const p3 = avgPts[i + 2] || p2;
        for (let t = 0.1; t <= 1.0; t += 0.1) {
          const x = cr(p0.x, p1.x, p2.x, p3.x, t);
          const y = cr(p0.y, p1.y, p2.y, p3.y, t);
          d += ` L ${x} ${y}`;
        }
      }
      return d;
    };

    // Build lines and legend
    const lines: Array<{ path: string; color: string; label: string }> = [];
    const legendItems: Array<{ label: string; color: string }> = [];

    const allKeys = Object.keys(lineGroups);
    const isAllMode = filterMode === "all";

    allKeys.forEach((key, index) => {
      const groupPoints = lineGroups[key];
      const path = buildSmoothPath(groupPoints);
      if (!path) return;

      let color: string;
      if (isAllMode) {
        // Main line is white
        color = "#ffffff";
      } else if (filterMode === "paper") {
        // Use desaturated paper type colors
        const paperColor = PAPER_TYPE_COLORS[key as PaperType] || PAPER_COLORS.mathematics;
        color = desaturateColor(paperColor, 0.7);
      } else {
        // Use desaturated section colors
        const sectionColor = SECTION_COLORS[key as PaperSection] || PAPER_COLORS.mathematics;
        color = desaturateColor(sectionColor, 0.7);
      }

      lines.push({ path, color, label: key });
      legendItems.push({ label: key, color });
    });

    return { lines, legend: legendItems, allLineGroups: lineGroups };
  }, [allSessions, filterMode, selectedFilters]);

  if (allSessions.length === 0 || lines.length === 0) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="rounded-md bg-neutral-900 p-2 flex justify-center items-center h-64">
          <div className="text-xs text-neutral-500">
            {allSessions.length === 0 
              ? "No data to display"
              : filterMode !== "all" && selectedFilters.length === 0
              ? "Please select filters to view trends"
              : "No data available for selected filters"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
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
            const y = padding + t * (height - 2 * padding);
            return (
              <line
                key={t}
                x1={padding + 6}
                y1={y}
                x2={width - padding - 6}
                y2={y}
                stroke="rgba(255, 255, 255, 0.05)"
                strokeWidth={1}
              />
            );
          })}

          {/* Axes */}
          <line
            x1={padding + 6}
            y1={height - padding}
            x2={width - padding - 6}
            y2={height - padding}
            stroke="rgba(255, 255, 255, 0.2)"
            strokeWidth={1}
          />
          <line
            x1={padding + 6}
            y1={padding}
            x2={padding + 6}
            y2={height - padding}
            stroke="rgba(255, 255, 255, 0.2)"
            strokeWidth={1}
          />

          {/* Y-axis labels */}
          {[0, 25, 50, 75, 100].map((pct) => {
            const y = height - padding - (pct / 100) * (height - 2 * padding);
            return (
              <text
                key={pct}
                x={padding}
                y={y + 3}
                textAnchor="end"
                fontSize={10}
                fill="rgba(255,255,255,0.2)"
              >
                {pct}%
              </text>
            );
          })}

          {/* Trend lines with points */}
          {lines.map((line, lineIndex) => {
            const lineGroup = allLineGroups[line.label] || [];
            
            return (
              <g key={lineIndex}>
                <path
                  d={line.path}
                  stroke={line.color}
                  strokeWidth={2}
                  fill="none"
                  pathLength={1}
                  style={{ 
                    strokeDasharray: 1, 
                    strokeDashoffset: animate ? 0 : 1, 
                    transition: 'stroke-dashoffset 900ms ease' 
                  }}
                  opacity={0.9}
                />
                {/* Interactive points */}
                {lineGroup.map((session, sessionIndex) => {
                  const x = scaleX(sessionIndex, lineGroup.length);
                  const y = scaleY(session.percentage);
                  const pointColor = filterMode === "all" ? "#ffffff" : line.color;
                  
                  return (
                    <circle
                      key={sessionIndex}
                      cx={x}
                      cy={y}
                      r={4}
                      fill={pointColor}
                      opacity={0.9}
                      className="cursor-pointer"
                      style={{ transition: 'r 0.2s' }}
                      onMouseEnter={() => setHoverPoint({ x, y, percentage: session.percentage, date: session.date })}
                      onMouseLeave={() => setHoverPoint(null)}
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {hoverPoint && (
          <div
            className="absolute px-2 py-1 rounded-md text-xs text-neutral-200 bg-black/80 border border-white/10 pointer-events-none z-10"
            style={{ 
              left: Math.min(hoverPoint.x, width - 160), 
              top: Math.max(hoverPoint.y - 32, 0) 
            }}
          >
            <div>Score: {Math.round(hoverPoint.percentage)}%</div>
            <div>Date: {new Date(hoverPoint.date).toLocaleDateString()}</div>
          </div>
        )}

        {/* Legend */}
        {legend.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-neutral-400">
            {legend.map((item, index) => (
              <div key={index} className="flex items-center gap-1">
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: item.color }} 
                />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

