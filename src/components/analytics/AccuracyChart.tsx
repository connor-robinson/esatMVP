/**
 * Enhanced accuracy chart with drag, zoom, trend indicators, and improved animations
 */

"use client";

import { useState, useMemo, useEffect, memo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, ZoomIn, Maximize2 } from "lucide-react";
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

interface AccuracyChartProps {
  data: PerformanceDataPoint[];
}

// Custom cross marker - clean minimal design
const CustomCross = (props: any) => {
  const { cx, cy, payload } = props;
  
  // Don't render if no data
  if (!payload || payload.accuracy === null) {
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
        stroke="rgba(255,255,255,0.4)"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <line
        x1={cx - 5}
        y1={cy + 5}
        x2={cx + 5}
        y2={cy - 5}
        stroke="rgba(255,255,255,0.4)"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </g>
  );
};

// Glass morphism tooltip - updated for new color
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-background/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl"
      >
        <p className="text-white/90 font-semibold mb-3 text-sm">{data.fullDate}</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-6">
            <span className="text-white/50 text-xs">Accuracy</span>
            <span className="text-primary font-bold text-lg">
              {data.accuracy !== null ? `${data.accuracy.toFixed(1)}%` : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <span className="text-white/50 text-xs">Questions</span>
            <span className="text-white/70 font-medium">
              {data.questionsAnswered || 0}
            </span>
          </div>
        </div>
      </motion.div>
    );
  }
  return null;
};

// Calculate linear regression (line of best fit)
const calculateLinearRegression = (data: any[]) => {
  const validPoints = data.filter(d => d.accuracy !== null);
  const n = validPoints.length;
  
  if (n < 2) return null;
  
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  validPoints.forEach((point, index) => {
    sumX += index;
    sumY += point.accuracy;
    sumXY += index * point.accuracy;
    sumX2 += index * index;
  });
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  return { slope, intercept };
};

function AccuracyChartComponent({ data }: AccuracyChartProps) {
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

  // Calculate dynamic Y-axis domain with extra top padding
  const yDomain = useMemo(() => {
    const values = filteredData
      .filter(d => d.questionsAnswered > 0)
      .map(d => d.accuracy);
    
    if (values.length === 0) return [0, 100];
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min) * 0.25 || 12; // Increased padding
    
    return [
      Math.max(0, Math.floor(min - padding)),
      Math.min(100, Math.ceil(max + padding) + 8) // Extra padding at top to prevent clipping
    ];
  }, [filteredData]);

  // Format data for chart with linear regression
  const chartData = useMemo(() => {
    const formatted = filteredData.map((d) => {
      const date = new Date(d.date);
      const accuracy = d.questionsAnswered > 0 ? d.accuracy : null;
      
      return {
        date: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        fullDate: date.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        }),
        accuracy,
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

    // Implement zoom logic here if needed
    setRefAreaLeft(null);
    setRefAreaRight(null);
  };

  return (
    <div className="relative rounded-organic-lg overflow-hidden bg-white/5">
      <div className="p-6">
        {/* Header with animated icon and zoom controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ 
                rotate: [0, 5, -5, 0],
                scale: [1, 1.1, 1.1, 1]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                repeatDelay: 3
              }}
              className="text-primary"
            >
              <TrendingUp className="h-5 w-5" />
            </motion.div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/70">
              Accuracy Over Time
            </h3>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoomLevel('week')}
              className={`px-3 py-1.5 rounded-organic-md text-xs font-medium transition-all ${
                zoomLevel === 'week'
                  ? 'bg-primary/20 text-primary'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              <ZoomIn className="h-3 w-3" />
            </button>
            <button
              onClick={() => setZoomLevel('month')}
              className={`px-3 py-1.5 rounded-organic-md text-xs font-medium transition-all ${
                zoomLevel === 'month'
                  ? 'bg-primary/20 text-primary'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              30d
            </button>
            <button
              onClick={() => setZoomLevel('all')}
              className={`px-3 py-1.5 rounded-organic-md text-xs font-medium transition-all ${
                zoomLevel === 'all'
                  ? 'bg-primary/20 text-primary'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
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
              margin={{ top: 15, right: 5, left: -20, bottom: 5 }}
            >
            <defs>
              <linearGradient id="accuracyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(133, 188, 130, 0.1)" />
                <stop offset="100%" stopColor="rgba(133, 188, 130, 0)" />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.06)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              stroke="rgba(255,255,255,0.1)"
              style={{ fontSize: "10px", fontWeight: 500 }}
              tick={{ fill: "rgba(255,255,255,0.4)" }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
              interval={zoomLevel === 'week' ? 1 : zoomLevel === 'month' ? 4 : 'preserveStartEnd'}
            />
            <YAxis
              stroke="rgba(255,255,255,0.1)"
              style={{ fontSize: "10px", fontWeight: 500 }}
              tick={{ fill: "rgba(255,255,255,0.4)" }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
              domain={yDomain}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip 
              content={<CustomTooltip />} 
              cursor={{ stroke: "rgba(133, 188, 130, 0.2)", strokeWidth: 2 }}
            />
            
            {/* Grey straight line of best fit */}
            <Line
              type="monotone"
              dataKey="trend"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth={2}
              dot={false}
              activeDot={false}
            />
            
            {/* Smooth curved trend line - desaturated teal */}
            <Line
              type="natural"
              dataKey="accuracy"
              stroke="#85BC82"
              strokeWidth={2.5}
              dot={false}
              activeDot={false}
              connectNulls
            />
            
            {/* Data points with crosses */}
            <Line
              type="monotone"
              dataKey="accuracy"
              stroke="transparent"
              strokeWidth={0}
              dot={(props: any) => <CustomCross {...props} />}
              activeDot={(props: any) => {
                // Don't show active dot if no data
                if (!props.payload || props.payload.accuracy === null) {
                  return <g />;
                }
                return (
                  <g>
                    {/* Expanding ring animation */}
                    <motion.circle
                      cx={props.cx}
                      cy={props.cy}
                      r={0}
                      fill="none"
                      stroke="rgba(255,255,255,0.5)"
                      strokeWidth={2}
                      initial={{ r: 0, opacity: 1 }}
                      animate={{ r: 15, opacity: 0 }}
                      transition={{ duration: 0.6, repeat: Infinity }}
                    />
                    <circle
                      cx={props.cx}
                      cy={props.cy}
                      r={10}
                      fill="rgba(133, 188, 130, 0.2)"
                      stroke="rgba(255,255,255,0.8)"
                      strokeWidth={2}
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
      </div>
    </div>
  );
}

// Memoize to prevent unnecessary re-renders
export const AccuracyChart = memo(AccuracyChartComponent);
