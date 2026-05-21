/**
 * Enhanced speed chart with drag, zoom, trend indicators, and improved animations
 */

"use client";

import { useState, useMemo, useEffect, memo } from "react";
import { motion } from "framer-motion";
import { Zap, ZoomIn, Maximize2 } from "lucide-react";
import { PerformanceDataPoint } from "@/types/analytics";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from "recharts";

interface SpeedChartProps {
  data: PerformanceDataPoint[];
}

const CHART_GRID = "var(--color-border-subtle)";
const CHART_AXIS = "var(--color-border)";
const CHART_TICK = "var(--color-text-muted)";
const CHART_TICK_STRONG = "var(--color-text)";
const CHART_CURSOR = "var(--color-border)";
const TREND_LINE = "var(--color-text-subtle)";
const ACTIVE_DOT_FILL = "var(--color-text)";
const ACTIVE_DOT_STROKE = "var(--color-border)";

// Custom cross marker - clean minimal design
const CustomCross = (props: any) => {
  const { cx, cy, payload } = props;
  
  // Don't render if no data
  if (!payload || payload.speed === null) {
    return null;
  }
  
  return (
    <g className="transition-all duration-200 cursor-pointer">
      {/* Main cross lines - more transparent */}
      <line
        x1={cx - 5}
        y1={cy - 5}
        x2={cx + 5}
        y2={cy + 5}
        stroke={CHART_TICK}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <line
        x1={cx - 5}
        y1={cy + 5}
        x2={cx + 5}
        y2={cy - 5}
        stroke={CHART_TICK}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </g>
  );
};

// Static tooltip - no animation
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-organic-md border border-border bg-surface-elevated p-3 shadow-lg backdrop-blur-sm">
        <p className="mb-2 font-mono text-xs font-semibold text-text">{data.fullDate}</p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-6">
            <span className="font-mono text-xs text-text-muted">Avg speed</span>
            <span className="font-mono text-sm font-bold text-text">
              {data.speed !== null && data.speed > 0 ? `${data.speed.toFixed(1)} q/min` : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <span className="font-mono text-xs text-text-muted">Questions</span>
            <span className="font-mono text-sm text-text-muted">
              {data.questionsAnswered || 0}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// Calculate linear regression (line of best fit)
const calculateLinearRegression = (data: any[]) => {
  const validPoints = data.filter(d => d.speed !== null);
  const n = validPoints.length;
  
  if (n < 2) return null;
  
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  validPoints.forEach((point, index) => {
    sumX += index;
    sumY += point.speed;
    sumXY += index * point.speed;
    sumX2 += index * index;
  });
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  return { slope, intercept };
};

function SpeedChartComponent({ data }: SpeedChartProps) {
  const [zoomLevel, setZoomLevel] = useState<'week' | 'month' | 'all'>('month');
  const [refAreaLeft, setRefAreaLeft] = useState<string | null>(null);
  const [refAreaRight, setRefAreaRight] = useState<string | null>(null);
  const [startIndex, setStartIndex] = useState(0);
  const [endIndex, setEndIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);

  // Reset pan position when zoom level changes
  useEffect(() => {
    setStartIndex(0);
  }, [zoomLevel]);

  // Filter data based on zoom level and pan position
  const filteredData = useMemo(() => {
    const days = zoomLevel === 'week' ? 7 : zoomLevel === 'month' ? 30 : data.length;
    
    if (zoomLevel === 'all') {
      return data;
    }
    
    // Apply panning for zoomed views
    const end = data.length - startIndex;
    const start = Math.max(0, end - days);
    
    return data.slice(start, end);
  }, [data, zoomLevel, startIndex]);

  // Calculate dynamic Y-axis domain with extra padding
  const yDomain = useMemo(() => {
    const values = filteredData
      .filter(d => d.questionsAnswered > 0 && d.avgSpeed > 0)
      .map(d => 60000 / d.avgSpeed); // Convert to questions per minute
    
    if (values.length === 0) return [0, 60];
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min) * 0.25 || 5;
    
    return [
      Math.max(0, Math.floor((min - padding) * 10) / 10),
      Math.ceil((max + padding) * 10) / 10 + 5 // Extra padding at top
    ];
  }, [filteredData]);

  // Calculate dynamic X-axis interval based on data length
  const xAxisInterval = useMemo(() => {
    const dataLength = filteredData.length;
    if (zoomLevel === 'week') {
      return 0; // Show all dates for week view
    } else if (zoomLevel === 'month') {
      // For 30 days, show every 2-3 days
      return dataLength <= 15 ? 0 : 1; // Every other day if > 15 points
    } else {
      // For 'all' view, calculate based on total data points
      if (dataLength <= 14) return 0; // Show all
      if (dataLength <= 30) return 1; // Every other
      if (dataLength <= 60) return 2; // Every 3rd
      if (dataLength <= 90) return 4; // Every 5th
      return Math.floor(dataLength / 12); // ~12 ticks for longer periods
    }
  }, [filteredData.length, zoomLevel]);

  // Format data for chart with linear regression
  const chartData = useMemo(() => {
    const formatted = filteredData.map((d) => {
      const date = new Date(d.date);
      // Convert to questions per minute (higher is better)
      const speed = d.questionsAnswered > 0 && d.avgSpeed > 0 ? (60000 / d.avgSpeed) : null;
      
      return {
        date: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        fullDate: date.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        }),
        dateKey: date.toISOString().split("T")[0], // For better sorting/display
        speed,
        questionsAnswered: d.questionsAnswered,
      };
    });

    // Calculate line of best fit
    const regression = calculateLinearRegression(formatted);
    
    // Add trend line values
    if (regression) {
      return formatted.map((point, index) => ({
        ...point,
        trend: regression.intercept + regression.slope * index,
      }));
    }
    
    return formatted;
  }, [filteredData]);

  const zoom = () => {
    if (refAreaLeft === refAreaRight || refAreaRight === null) {
      setRefAreaLeft(null);
      setRefAreaRight(null);
      return;
    }

    setRefAreaLeft(null);
    setRefAreaRight(null);
  };

  return (
    <div className="relative overflow-hidden rounded-organic-lg bg-surface-mid">
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 10, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                repeatDelay: 4,
              }}
              className="text-warning"
            >
              <Zap className="h-5 w-5" />
            </motion.div>
            <h3 className="text-sm font-semibold tracking-tight text-text-muted">
              Speed Over Time
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setZoomLevel('week')}
              className={`rounded-organic-md px-3 py-1.5 text-xs font-medium transition-all ${
                zoomLevel === 'week'
                  ? 'bg-primary/20 text-primary'
                  : 'bg-surface-subtle text-text-muted hover:bg-surface-neutral'
              }`}
            >
              <ZoomIn className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel('month')}
              className={`rounded-organic-md px-3 py-1.5 text-xs font-medium transition-all ${
                zoomLevel === 'month'
                  ? 'bg-primary/20 text-primary'
                  : 'bg-surface-subtle text-text-muted hover:bg-surface-neutral'
              }`}
            >
              30d
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel('all')}
              className={`rounded-organic-md px-3 py-1.5 text-xs font-medium transition-all ${
                zoomLevel === 'all'
                  ? 'bg-primary/20 text-primary'
                  : 'bg-surface-subtle text-text-muted hover:bg-surface-neutral'
              }`}
            >
              <Maximize2 className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Chart */}
        <div 
          className="cursor-grab active:cursor-grabbing"
          onMouseDown={(e) => {
            setIsDragging(true);
            setDragStartX(e.clientX);
          }}
          onMouseMove={(e) => {
            if (isDragging && zoomLevel !== 'all') {
              const delta = dragStartX - e.clientX;
              const sensitivity = 0.1;
              const indexShift = Math.round(delta * sensitivity);
              
              if (Math.abs(indexShift) > 0) {
                const maxStart = Math.max(0, data.length - (zoomLevel === 'week' ? 7 : 30));
                const newStart = Math.max(0, Math.min(startIndex + indexShift, maxStart));
                setStartIndex(newStart);
                setDragStartX(e.clientX);
              }
            }
          }}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
        >
          <ResponsiveContainer width="100%" height={320}>
            <LineChart 
              data={chartData} 
              margin={{ top: 15, right: 5, left: 5, bottom: 0 }}
            >
            <defs>
              <linearGradient id="speedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-warning)" stopOpacity={0.12} />
                <stop offset="100%" stopColor="var(--color-warning)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={CHART_GRID}
              vertical={false}
            />
            <XAxis
              dataKey="date"
              stroke={CHART_AXIS}
              style={{ fontSize: "11px", fontWeight: 500 }}
              tick={{ fill: CHART_TICK_STRONG, fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: CHART_AXIS }}
              interval={xAxisInterval}
              angle={zoomLevel === 'month' || zoomLevel === 'all' ? -45 : 0}
              textAnchor={zoomLevel === 'month' || zoomLevel === 'all' ? "end" : "middle"}
              height={zoomLevel === 'month' || zoomLevel === 'all' ? 60 : 30}
            />
            <YAxis
              stroke={CHART_AXIS}
              style={{ fontSize: "10px", fontWeight: 500 }}
              tick={{ fill: CHART_TICK }}
              tickLine={false}
              axisLine={{ stroke: CHART_GRID }}
              domain={yDomain}
              tickFormatter={(value) => `${value.toFixed(1)} q/min`}
              width={55}
            />
            <Tooltip 
              content={<CustomTooltip />} 
              cursor={{ stroke: CHART_CURSOR, strokeWidth: 1.5 }}
            />
            
            {/* Grey straight line of best fit */}
            <Line
              type="monotone"
              dataKey="trend"
              stroke={TREND_LINE}
              strokeWidth={2}
              dot={false}
              activeDot={false}
            />
            
            <Line
              type="natural"
              dataKey="speed"
              stroke="var(--color-warning)"
              strokeWidth={2.5}
              dot={false}
              activeDot={false}
              connectNulls
            />
            
            {/* Data points with crosses */}
            <Line
              type="monotone"
              dataKey="speed"
              stroke="transparent"
              strokeWidth={0}
              dot={(props: any) => <CustomCross {...props} />}
              activeDot={(props: any) => {
                // Don't show active dot if no data
                if (!props.payload || props.payload.speed === null) {
                  return <g />;
                }
                // Static active dot - no animation
                return (
                  <g>
                    <circle
                      cx={props.cx}
                      cy={props.cy}
                      r={6}
                      fill={ACTIVE_DOT_FILL}
                      stroke={ACTIVE_DOT_STROKE}
                      strokeWidth={1.5}
                    />
                    <CustomCross {...props} />
                  </g>
                );
              }}
              connectNulls={false}
            />
            
          </LineChart>
        </ResponsiveContainer>
        </div>

        <p className="mt-4 text-center text-xs text-text-subtle">
          Higher is better • Questions per minute
        </p>
      </div>
    </div>
  );
}

// Memoize to prevent unnecessary re-renders
export const SpeedChart = memo(SpeedChartComponent);
